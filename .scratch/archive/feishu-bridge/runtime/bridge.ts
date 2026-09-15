#!/usr/bin/env bun
/**
 * feishu-pi bridge — Feishu (Lark) ⇄ pi.
 *
 * One long-lived pi session per project: a Feishu chat (or a topic thread inside it)
 * is bound to a project directory, and every message from that chat is fed into the
 * same `pi --session-id` session with that directory as cwd. That is what makes
 * grill → to-spec → to-tickets stay in ONE unbroken context window, which those
 * skills require.
 *
 * Commands (any message starting with "/"):
 *   /help              this text
 *   /projects          registered archon projects (codebases) + this chat's binding
 *   /use <name|path>   bind this chat to a project (by archon name, or an absolute path)
 *   /new               start a fresh pi session for the bound project
 *   /status            binding + active runs across all projects (archon)
 *   /runs              recent runs of the bound project
 *
 * Everything else is forwarded to pi verbatim.
 *
 * Usage:  bun bridge.ts [--check]
 */

import { spawn } from "bun";
import { PiRpc, type RpcEvent } from "./pi-rpc";
import { boardCfg } from "./board";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const HOME = process.env.HOME ?? "/root";
const DIR = join(HOME, ".local/share/feishu-pi-bridge");
const CONFIG_PATH = join(DIR, "config.json");
const STATE_PATH = join(DIR, "state.json");
const LOG_PATH = join(DIR, "bridge.log");
const ARCHON_DB = join(HOME, ".archon/archon.db");

type Config = {
  allowedSenders: string[]; // open_ids allowed to drive pi; empty = nobody (fail closed)
  defaultProject: string; // project name (archon codebase) or absolute path for new chats; "" = bind explicitly
  ackAfterMs: number; // send a "working on it" reply if pi takes longer than this
  piArgs: string[]; // extra args appended to every pi invocation
  maxReplyChars: number; // chunk replies larger than this
  hideTmpProjects: boolean; // keep throwaway /tmp lab codebases out of /projects
  profile: string; // lark-cli profile (a separate Feishu app); "" = default app
  trustProject: boolean; // pass --approve (otherwise a fresh project asks for trust at startup)
  progressEnabled: boolean; // stream progress into the chat while pi works
  progressIntervalMs: number; // min gap between progress edits (Feishu rate limits)
  progressPreviewChars: number; // how much of the streaming answer to preview
  watchIntervalMs: number; // run-watcher poll interval
  announceRunStart: boolean; // tell the chat when a watched run starts
  allowP2P: boolean; // respond in direct messages
  allowedChats: string[]; // if non-empty, respond ONLY in these chat ids (groups included)
  consoleChat?: string; // 单聊控制台：输入栏菜单事件落到哪个会话（菜单只在单聊有）
};
type Binding = {
  project: string;
  cwd: string;
  sessionId: string;
  updatedAt: string;
  /** (ticket 11) group topic this binding lives in, and a message inside it to reply into. */
  threadId?: string;
  threadAnchor?: string;
};
type CardBinding = { runId: string | null; cwd: string | null; workflow: string | null; chatId: string; created: string };

type State = {
  /** cwd (or topic key) → the pi session id that conversation uses. */
  sessions?: Record<string, string>;
  /** topic key → how to reach that topic (ticket 11) */
  topics?: Record<string, { threadId: string; anchor: string; at: string }>;
  /** our message id → the topic anchor it lives under (so replies don't spawn a new topic) */
  topicMsgs?: Record<string, string>;
  /** card message id → the conversation key it was sent into (topic-aware card clicks) */
  cardKeys?: Record<string, string>;
  /** 话题 → 它的头卡（消息 id），这样已有的话题也会长出那张卡，切项目时还能就地更新 */
  topicHeaders?: Record<string, string>;
  /** 一个话题认领项目之前说的话：认领完就把它当成第一轮跑掉，不用再打一遍 */
  pending?: Record<string, { text: string; messageId: string; at: string }>;
  bindings: Record<string, Binding>;
  /** card message_id → what that card is asking about (ticket 04/05) */
  cards?: Record<string, CardBinding>;
  /** dedupe key → when it was acted on, so a second click can't double-fire */
  decided?: Record<string, string>;
  /** runId → watch record (ticket 05) */
  runs?: Record<string, WatchedRun>;
  /** card message_id → the extension dialog that card is asking (ticket 06) */
  ui?: Record<string, UiRequest>;
};

type UiRequest = {
  /** (ticket 11) conversation key, so the answer goes back to the right resident pi */
  key?: string;
  requestId: string;
  method: string;
  cwd: string;
  chatId: string;
  options?: string[];
  created: string;
  timeoutMs?: number;
  answered?: boolean;
};

type WatchedRun = {
  /** (ticket 11) the conversation that started it — notifications go back into that topic */
  key?: string;
  runId: string;
  cwd: string;
  chatId: string;
  workflow: string;
  status: string;
  outcome?: string | null;
  userMessage?: string;
  created: string;
  notifiedStatus?: string;
  announcedStart?: boolean;
};

const DEFAULT_CONFIG: Config = {
  allowedSenders: [],
  defaultProject: "",
  ackAfterMs: 20000,
  piArgs: [],
  maxReplyChars: 4500,
  hideTmpProjects: true,
  profile: "",
  trustProject: true,
  progressEnabled: true,
  progressIntervalMs: 3000,
  progressPreviewChars: 600,
  watchIntervalMs: 15000,
  announceRunStart: false,
  allowP2P: true,
  allowedChats: [],
};

const cfg: Config = { ...DEFAULT_CONFIG, ...readJson(CONFIG_PATH, {}) };
let state: State = readJson(STATE_PATH, { bindings: {} });
if (!state.bindings) state.bindings = {};

mkdirSync(DIR, { recursive: true });

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function saveState() {
  const tmp = STATE_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STATE_PATH);
}

/** Session ids must be filename-safe: project names carry slashes (owner/repo). */
function sessionIdFor(project: string): string {
  return "feishu-" + project.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function log(obj: Record<string, unknown>) {
  try {
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
  } catch {
    /* logging must never break the bridge */
  }
}

async function run(
  cmd: string[],
  opts: { cwd?: string; stdin?: string; timeoutMs?: number } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = spawn(cmd, {
    cwd: opts.cwd ?? DIR,
    stdin: opts.stdin === undefined ? "ignore" : new TextEncoder().encode(opts.stdin),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (opts.timeoutMs) {
    timer = setTimeout(() => proc.kill("SIGTERM"), opts.timeoutMs);
  }
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (timer) clearTimeout(timer);
  return { code, stdout, stderr };
}

// ---------------------------------------------------------------- feishu side

const profileArgs = () => (cfg.profile ? ["--profile", cfg.profile] : []);

async function lark(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return run(["lark-cli", ...args, ...profileArgs()], { timeoutMs: 60_000 });
}

// ---------------------------------------------------------------- topics (ticket 11)

/**
 * A topic in a group chat is a thread: every outbound message must be a thread reply,
 * otherwise Feishu turns it into a brand-new topic. `anchor` is a message inside the topic.
 */
function topicOf(key: string): { threadId?: string; anchor?: string } {
  const b = state.bindings[key];
  const t = state.topics?.[key];
  return { threadId: b?.threadId ?? t?.threadId, anchor: b?.threadAnchor ?? t?.anchor };
}

/** Remember where a topic is, before it even has a binding (first @ in a fresh topic). */
function rememberTopic(key: string, chatId: string, threadId: string, anchor: string) {
  if (!threadId || !anchor) return;
  state.topics = state.topics ?? {};
  const prev = state.topics[key];
  const fixed = prev?.anchor ?? anchor;
  if (prev?.anchor === fixed && prev?.threadId === threadId && state.bindings[key]?.threadAnchor === fixed) return;
  state.topics[key] = { threadId, anchor: fixed, at: new Date().toISOString() };
  const b = state.bindings[key];
  if (b) state.bindings[key] = { ...b, threadId, threadAnchor: fixed };
  saveState();
  log({ level: "info", msg: "topic_remembered", key, chatId, threadId, anchor: fixed });
}

/** Which topic does a message of ours live in? (cards/pickers answer into it) */
function anchorOfMessage(messageId: string): string | undefined {
  if (!messageId) return undefined;
  const direct = state.topicMsgs?.[messageId];
  if (direct) return direct;
  // A card we sent by hand (e.g. the 🧭 控制台 card) only has cardKeys → use its topic's anchor,
  // otherwise the next send out of that card would start a brand-new topic.
  const key = state.cardKeys?.[messageId];
  return key ? state.topics?.[key]?.anchor : undefined;
}

/** Card clicks: which conversation was this card sent into? */
function keyOfCard(messageId: string, chatId: string): string {
  return state.cardKeys?.[messageId] ?? chatId;
}

function rememberTopicMessage(messageId: string | null | undefined, ctx?: { anchor?: string; key?: string }) {
  if (!messageId || (!ctx?.anchor && !ctx?.key)) return;
  if (ctx.key) {
    state.cardKeys = state.cardKeys ?? {};
    state.cardKeys[messageId] = ctx.key;
  }
  if (ctx.anchor) {
    state.topicMsgs = state.topicMsgs ?? {};
    state.topicMsgs[messageId] = ctx.anchor;
  }
  saveState();
}

/** Per-conversation session id: a topic gets its own, so two topics never share a session file. */
function sessionIdForBinding(key: string, cwd: string, project: string): string {
  if (!key.includes(":")) return sessionForCwd(cwd, project);
  state.sessions = state.sessions ?? {};
  const remembered = state.sessions[key];
  if (remembered) return remembered;
  const thread = key.split(":")[1] ?? "";
  const id = `${sessionIdFor(project)}-${thread.slice(-6)}`;
  state.sessions[key] = id;
  saveState();
  return id;
}

/** Set by --simulate so the pipeline can be exercised without touching Feishu. */
let replyOverride: ((messageId: string, chatId: string, text: string) => Promise<void>) | null = null;

/** Reply in the message's own context; fall back to a plain chat send. */
async function reply(messageId: string, chatId: string, text: string, anchor?: string) {
  if (replyOverride) {
    await replyOverride(messageId, chatId, text);
    return;
  }
  // In a topic, even a reply must be a thread reply (see topicOf).
  const anc = anchor ?? anchorOfMessage(messageId);
  log({ level: "info", msg: "reply", chatId, chars: text.length, head: text.slice(0, 160) });
  const chunks: string[] = [];
  const limit = cfg.maxReplyChars;
  for (let i = 0; i < text.length; i += limit) chunks.push(text.slice(i, i + limit));
  if (chunks.length === 0) chunks.push("(empty reply)");

  for (const [i, chunk] of chunks.entries()) {
    const body = chunks.length > 1 ? `${chunk}\n\n_(${i + 1}/${chunks.length})_` : chunk;
    const synthetic = messageId.startsWith("menu_") || messageId.startsWith("card_");
    const viaReply = synthetic
      ? { code: 1, stdout: "", stderr: "synthetic id" }
      : await lark([
      "im", "+messages-reply",
      "--message-id", messageId,
      "--markdown", body,
      ...(anc ? ["--reply-in-thread"] : []),
      "--as", "bot",
    ]);
    if (viaReply.code === 0) {
      let rid: string | null = null;
      try {
        rid = JSON.parse(viaReply.stdout)?.data?.message_id ?? null;
      } catch {
        /* ignore */
      }
      rememberTopicMessage(rid, { anchor: anc });
      log({ level: "info", msg: "reply_sent", chatId, messageId: rid, inThread: Boolean(anc) });
      continue;
    }
    const viaSend = anc
      ? await lark(["im", "+messages-reply", "--message-id", anc, "--markdown", body, "--reply-in-thread", "--as", "bot"])
      : await lark([
      "im", "+messages-send",
      "--chat-id", chatId,
      "--markdown", body,
      "--as", "bot",
    ]);
    if (viaSend.code !== 0) {
      log({ level: "error", msg: "reply_failed", replyErr: viaReply.stderr.trim(), sendErr: viaSend.stderr.trim() });
    }
  }
}

// ---------------------------------------------------------------- project side

async function codebases(includeTmp = false): Promise<{ name: string; cwd: string }[]> {
  const q = "select name, default_cwd as cwd from remote_agent_codebases order by updated_at desc";
  const res = await run(["sqlite3", "-json", `file:${ARCHON_DB}?mode=ro`, q], { timeoutMs: 15_000 });
  if (res.code !== 0) {
    log({ level: "warn", msg: "codebases_query_failed", stderr: res.stderr.trim() });
    return [];
  }
  try {
    const list: { name: string; cwd: string }[] = JSON.parse(res.stdout || "[]");
    return cfg.hideTmpProjects && !includeTmp ? list.filter((c) => !c.cwd.startsWith("/tmp/")) : list;
  } catch {
    return [];
  }
}

async function resolveProject(token: string): Promise<{ project: string; cwd: string } | null> {
  const t = token.trim();
  if (!t) return null;
  if (t.startsWith("/") || t.startsWith("~")) {
    const cwd = resolve(t.replace(/^~/, HOME));
    if (!existsSync(cwd)) return null;
    return { project: basename(cwd), cwd };
  }
  const list = await codebases();
  const exact = list.find((c) => c.name === t);
  if (exact) return { project: exact.name, cwd: exact.cwd };
  const ci = list.find((c) => c.name.toLowerCase() === t.toLowerCase());
  if (ci) return { project: ci.name, cwd: ci.cwd };
  const fuzzy = list.find((c) => c.name.toLowerCase().includes(t.toLowerCase()) || basename(c.cwd).toLowerCase().includes(t.toLowerCase()));
  if (fuzzy) return { project: fuzzy.name, cwd: fuzzy.cwd };
  return null;
}

async function bindingFor(key: string, chatId: string): Promise<Binding | null> {
  const existing = state.bindings[key];
  if (existing && existsSync(existing.cwd)) return existing;
  if (!cfg.defaultProject) return null;
  const def = await resolveProject(cfg.defaultProject);
  if (!def) return null;
  const fresh: Binding = { ...def, sessionId: sessionForCwd(def.cwd, def.project), updatedAt: new Date().toISOString() };
  state.bindings[key] = fresh;
  saveState();
  log({ level: "info", msg: "binding_defaulted", key, chatId, project: fresh.project });
  return fresh;
}

async function archonJson(args: string[], cwd: string): Promise<any | null> {
  const res = await run(["archon", ...args, "--json"], { cwd, timeoutMs: 60_000 });
  if (res.code !== 0) {
    log({ level: "warn", msg: "archon_failed", args, stderr: res.stderr.trim().slice(0, 400) });
    return null;
  }
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

function fmtRun(r: any): string {
  const short = String(r.id ?? "").slice(0, 8);
  const mins = r.started_at ? Math.round((Date.now() - Date.parse(r.started_at.replace(" ", "T") + "Z")) / 60000) : null;
  return `- \`${short}\` **${r.workflow_name}** — ${r.status}${mins !== null && !Number.isNaN(mins) ? ` (${mins}m)` : ""}`;
}

// ---------------------------------------------------------------- pi

/**
 * One resident pi RPC process per **conversation** (ticket 02/11): cwd is fixed at spawn but the
 * process is pinned to one session id, so the unit is the binding key — not the directory.
 * (Two topics in the same repo must not share a process: different sessions, different contexts.)
 */
const rpcByKey = new Map<string, PiRpc>();

type Turn = {
  key: string;
  binding: Binding;
  chatId: string;
  firstMessageId: string;
  text: string;
  tools: string[];
  currentTool?: string;
  /** e.g. "/skill:drain" — what this turn was launched by, shown in the progress line. */
  label?: string;
  /** topic anchor (ticket 11): every message of this turn lands inside that topic. */
  anchor?: string;
  /** set once the turn is being finalized — stops a late progress message from adding a 2nd msg */
  done?: boolean;
  startedAt: number;
  progress: { messageId: string | null; lastEditAt: number; lastBody: string; timer?: ReturnType<typeof setTimeout>; busy?: boolean };
  lastProgressAt: number;
  resolveSettled: () => void;
  settled: Promise<void>;
};

const turnByKey = new Map<string, Turn>();

function rpcFor(key: string, binding: Binding): PiRpc {
  const existing = rpcByKey.get(key);
  if (existing) return existing;
  const client = new PiRpc({
    cwd: binding.cwd,
    sessionId: binding.sessionId,
    name: `feishu:${binding.project}`,
    extraArgs: [...(cfg.trustProject ? ["--approve"] : []), ...cfg.piArgs],
    onLog: log,
    onEvent: (ev) => onRpcEvent(key, binding, ev),
  });
  rpcByKey.set(key, client);
  client.start();
  log({ level: "info", msg: "rpc_started", key, project: binding.project, cwd: binding.cwd });
  return client;
}

function dropRpc(key: string) {
  const client = rpcByKey.get(key);
  if (!client) return;
  client.stop();
  rpcByKey.delete(key);
  turnByKey.delete(key);
}

/** Last-resort lookup for records written before the key-based refactor. */
function rpcByCwdFallback(cwd: string | null | undefined): PiRpc | undefined {
  if (!cwd) return undefined;
  for (const [k, client] of rpcByKey.entries()) {
    if (state.bindings[k]?.cwd === cwd) return client;
  }
  return undefined;
}

const DIALOG_METHODS = new Set(["select", "confirm", "input", "editor"]);

function onRpcEvent(key: string, binding: Binding, ev: RpcEvent) {
  const turn = turnByKey.get(key);

  switch (ev.type) {
    case "message_update": {
      const d = ev.assistantMessageEvent ?? {};
      if (d.type === "text_delta" && turn) {
        turn.text += String(d.delta ?? "");
        scheduleProgress(turn);
      }
      break;
    }
    case "tool_execution_start": {
      if (!turn) break;
      const name = String(ev.toolName ?? "tool");
      if (!turn.tools.includes(name)) turn.tools.push(name);
      turn.currentTool = name;
      scheduleProgress(turn);
      const now = Date.now();
      if (!cfg.progressEnabled && now - turn.lastProgressAt > 8000) {
        turn.lastProgressAt = now;
        void reply(turn.firstMessageId, turn.chatId, `🔧 正在 \`${name}\`…`);
      }
      break;
    }
    case "agent_settled": {
      if (turn) turn.currentTool = undefined;
      turn?.resolveSettled();
      break;
    }
    case "compaction_end": {
      if (turn) void reply(turn.firstMessageId, turn.chatId, "📦 上下文压缩完成（上下文快满了）。");
      break;
    }
    case "auto_retry_start": {
      if (turn) void reply(turn.firstMessageId, turn.chatId, `♻️ 供应商抖动，第 ${String(ev.attempt)} 次重试…`);
      break;
    }
    case "extension_error": {
      log({ level: "error", msg: "extension_error", detail: String(ev.error ?? "").slice(0, 300) });
      break;
    }
    case "extension_ui_request": {
      const method = String(ev.method ?? "");
      if (DIALOG_METHODS.has(method)) {
        void handleExtensionDialog(key, binding, ev);
      } else if (method === "notify") {
        log({ level: "info", msg: "ui_notify", text: String(ev.message ?? "").slice(0, 200) });
      }
      break;
    }
  }
}

/**
 * 话题头卡：已有的话题第一次说话时补一张（新话题在认领那一步就有了）。
 * 记在 state.topicHeaders 里，切项目时用 refreshTopicHeader 就地更新。
 */
async function ensureTopicHeader(key: string, chatId: string, binding: Binding | null): Promise<void> {
  const topic = topicOf(key);
  if (!binding || !topic.threadId) return;
  state.topicHeaders = state.topicHeaders ?? {};
  const existing = state.topicHeaders[key];
  if (existing) return;
  const id = await sendCardJson(chatId, topicHeaderCard(binding, chatId), { anchor: topic.anchor, key });
  if (id) {
    state.topicHeaders[key] = id;
    saveState();
    log({ level: "info", msg: "topic_header_added", key, messageId: id });
  }
}

async function refreshTopicHeader(key: string, chatId: string, binding: Binding | null): Promise<void> {
  const id = state.topicHeaders?.[key];
  if (!id || !binding) return;
  const ok = await updateCardMessage(chatId, id, topicHeaderCard(binding, chatId));
  log({ level: ok ? "info" : "warn", msg: "topic_header_refreshed", key, messageId: id, ok });
}

/** Plain chat send that returns the message id (used by progress + cards). */
async function sendChatId(chatId: string, markdown: string, ctx?: { anchor?: string; key?: string }): Promise<string | null> {
  if (replyOverride) {
    await replyOverride("(send)", chatId, markdown);
    return `om_fake_${Math.random().toString(36).slice(2, 8)}`;
  }
  const res = ctx?.anchor
    ? await lark(["im", "+messages-reply", "--message-id", ctx.anchor, "--markdown", markdown, "--reply-in-thread", "--as", "bot"])
    : await lark(["im", "+messages-send", "--chat-id", chatId, "--markdown", markdown, "--as", "bot"]);
  let id: string | null = null;
  try {
    id = JSON.parse(res.stdout)?.data?.message_id ?? null;
  } catch {
    /* ignore */
  }
  log({ level: id ? "info" : "error", msg: "chat_send", chatId, chars: markdown.length, code: res.code, messageId: id, inThread: Boolean(ctx?.anchor), err: res.stderr.slice(0, 200) });
  rememberTopicMessage(id, ctx);
  return id;
}

/** Rewrite one of our own messages in place (rate-limit friendly: no new notification). */
async function editMessage(chatId: string, messageId: string, markdown: string): Promise<boolean> {
  if (replyOverride) {
    await replyOverride(messageId, chatId, markdown);
    return true;
  }
  const res = await lark(["im", "+messages-edit", "--message-id", messageId, "--markdown", markdown, "--as", "bot"]);
  const ok = res.code === 0 && !/"ok":\s*false/.test(res.stdout);
  log({ level: ok ? "info" : "warn", msg: "message_edit", messageId, chars: markdown.length, ok, err: (res.stderr || res.stdout).slice(0, 200) });
  return ok;
}

/** Plain chat send, no reply context (used by the watcher). */
async function sendChat(chatId: string, markdown: string, ctx?: { anchor?: string; key?: string }): Promise<void> {
  if (replyOverride) {
    await replyOverride("(watcher)", chatId, markdown);
    return;
  }
  const limit = cfg.maxReplyChars;
  const chunks: string[] = [];
  for (let i = 0; i < markdown.length; i += limit) chunks.push(markdown.slice(i, i + limit));
  if (!chunks.length) chunks.push("(empty)");
  for (const chunk of chunks) {
    const res = ctx?.anchor
      ? await lark(["im", "+messages-reply", "--message-id", ctx.anchor, "--markdown", chunk, "--reply-in-thread", "--as", "bot"])
      : await lark(["im", "+messages-send", "--chat-id", chatId, "--markdown", chunk, "--as", "bot"]);
    let id: string | null = null;
    try {
      id = JSON.parse(res.stdout)?.data?.message_id ?? null;
    } catch {
      /* ignore */
    }
    log({ level: res.code === 0 ? "info" : "error", msg: "chat_send", chatId, chars: chunk.length, code: res.code, inThread: Boolean(ctx?.anchor), err: res.stderr.slice(0, 200) });
    rememberTopicMessage(id, ctx);
  }
}

// ---------------------------------------------------------------- progress (ticket 03)

function progressBody(turn: Turn): string {
  const elapsed = Math.round((Date.now() - turn.startedAt) / 1000);
  const where = turn.label ? `${turn.label}` : `**${turn.binding.project}**`;
  const head = turn.currentTool ? `⏳ ${where} · \`${turn.currentTool}\` · ${elapsed}s` : `⏳ ${where} · 思考中 · ${elapsed}s`;
  const tail = turn.text.trim();
  if (!tail) return head;
  const preview = tail.length > cfg.progressPreviewChars ? "…" + tail.slice(-cfg.progressPreviewChars) : tail;
  return `${head}\n\n---\n\n${preview}`;
}

async function flushProgress(turn: Turn): Promise<void> {
  if (!cfg.progressEnabled || turn.done) return;
  turn.progress.busy = true;
  try {
    const body = progressBody(turn);
    if (body === turn.progress.lastBody) return;
    turn.progress.lastBody = body;
    turn.progress.lastEditAt = Date.now();
    if (!turn.progress.messageId) {
      turn.progress.messageId = await sendChatId(turn.chatId, body, { anchor: turn.anchor, key: turn.key });
      if (!turn.progress.messageId) {
        log({ level: "warn", msg: "progress_degraded", reason: "send failed" });
        cfg.progressEnabled = false; // once it fails, stop trying for this process
      }
      return;
    }
    const ok = await editMessage(turn.chatId, turn.progress.messageId, body);
    if (!ok) {
      // Editing is best-effort; a failure must never break the reply path.
      log({ level: "warn", msg: "progress_edit_failed", messageId: turn.progress.messageId });
    }
  } finally {
    turn.progress.busy = false;
  }
}

function scheduleProgress(turn: Turn): void {
  if (!cfg.progressEnabled || turn.progress.timer) return;
  const since = Date.now() - turn.progress.lastEditAt;
  const delay = Math.max(0, cfg.progressIntervalMs - since);
  turn.progress.timer = setTimeout(() => {
    turn.progress.timer = undefined;
    void flushProgress(turn);
  }, delay);
}

/** Final state of the progress message: the answer itself when it fits, else a summary. */
async function finalizeProgress(turn: Turn, text: string, ok: boolean): Promise<"inplace" | "separate"> {
  if (turn.progress.timer) {
    clearTimeout(turn.progress.timer);
    turn.progress.timer = undefined;
  }
  turn.done = true;
  // A fast turn can finalize while the first progress message is still being sent; wait for it,
  // otherwise the answer would be a second message and the progress line a stale duplicate.
  for (let i = 0; i < 40 && turn.progress.busy; i++) await Bun.sleep(50);
  if (!cfg.progressEnabled || !turn.progress.messageId) return "separate";
  const elapsed = Math.round((Date.now() - turn.startedAt) / 1000);
  const limit = Math.max(500, cfg.maxReplyChars - 400);
  if (ok && text.trim() && text.length <= limit) {
    await editMessage(turn.chatId, turn.progress.messageId, text);
    return "inplace";
  }
  const head = ok ? `✅ ${turn.binding.project} · ${elapsed}s` : `❌ ${turn.binding.project} · 出错`;
  const tools = turn.tools.length ? `（用过 ${turn.tools.join(", ")}）` : "";
  await editMessage(turn.chatId, turn.progress.messageId, `${head}${tools}`);
  return "separate";
}

/** Send text to the project's resident pi and wait for the turn to settle. */
async function piAsk(binding: Binding, turn: Turn, text: string): Promise<{ ok: boolean; text: string }> {
  const client = rpcFor(turn.key, binding);
  let mode: "prompt" | "steer" = "prompt";
  try {
    mode = await client.say(text);
  } catch (err) {
    return { ok: false, text: `pi RPC 调用失败：${String((err as Error).message)}` };
  }
  if (mode === "steer") {
    // It joined a run that is already in flight; that run's reply comes from its own turn.
    return { ok: true, text: "" };
  }

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 45 * 60_000));
  await Promise.race([turn.settled, timeout]);

  const streamed = turn.text.trim();
  if (streamed) return { ok: true, text: streamed };
  try {
    const last = await client.request({ type: "get_last_assistant_text" }, 10_000);
    const text2 = String(last?.text ?? "").trim();
    if (text2) return { ok: true, text: text2 };
    return { ok: true, text: turn.tools.length ? `（本轮只跑了工具：${turn.tools.join(", ")}，没有文字回复）` : "(pi returned nothing)" };
  } catch (err) {
    return { ok: false, text: `pi 没有返回文本：${String((err as Error).message)}` };
  }
}


// ---------------------------------------------------------------- board (Base mirror — ticket 12)

/**
 * Every Base call goes through a CHILD process (`bun board.ts …`), because board.ts drives
 * lark-cli with spawnSync: doing that in-process would block this bridge's event loop and
 * stall the Feishu event consumers (a card callback only has ~3s to be acked).
 */
async function boardRun(args: string[], timeoutMs = 240_000): Promise<{ ok: boolean; out: string; err: string; ms: number }> {
  const t0 = Date.now();
  const proc = Bun.spawn([process.execPath, join(DIR, "board.ts"), ...args], { stdout: "pipe", stderr: "pipe", env: { ...process.env } });
  const timer = setTimeout(() => {
    log({ level: "warn", msg: "board_killed", args: args.join(" "), ms: Date.now() - t0 });
    proc.kill();
  }, timeoutMs);
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  clearTimeout(timer);
  return { ok: code === 0, out: out.trim(), err: err.trim(), ms: Date.now() - t0 };
}

const boardFp = new Map<string, string>();

/** Fingerprint of the repo's `.scratch` issue files — only a changed board is worth ~100 API calls. */
function scratchFingerprint(cwd: string): string {
  const root = join(cwd, ".scratch");
  if (!existsSync(root)) return "";
  const parts: string[] = [];
  try {
    for (const feature of readdirSync(root)) {
      const dir = join(root, feature, "issues");
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".md")) continue;
        const st = statSync(join(dir, f));
        parts.push(`${feature}/${f}:${Math.round(st.mtimeMs)}:${st.size}`);
      }
    }
  } catch {
    /* directory is being rewritten — next turn will catch it */
  }
  return parts.sort().join("|");
}

/** Mirror the repo's `.scratch` into the Base. Skipped when nothing changed, unless forced. */
async function maybeSyncBoard(cwd: string, opts: { force?: boolean; why: string }): Promise<void> {
  const fp = scratchFingerprint(cwd);
  const known = boardFp.get(cwd);
  if (!opts.force && (!fp || fp === known)) return;
  boardFp.set(cwd, fp);
  const res = await boardRun(["--sync-all", cwd]);
  log({
    level: res.ok ? "info" : "warn",
    msg: "board_synced",
    cwd,
    why: opts.why,
    ms: res.ms,
    ok: res.ok,
    out: res.out.split("\n").filter((l) => l.trim()).slice(-3).join(" | ").slice(0, 300),
    err: res.err.slice(0, 200),
  });
}

/** Start a sync in the background and report the outcome as its own message. */
function startBoardSync(chatId: string, cwd: string, ctx?: { anchor?: string; key?: string }, label = "同步"): void {
  const t0 = Date.now();
  void (async () => {
    const res = await boardRun(["--sync-all", cwd]);
    boardFp.set(cwd, scratchFingerprint(cwd));
    const summary = res.out.split("\n").filter((l) => /票板|台账|✗/.test(l)).map((l) => l.trim()).join(" · ");
    const text = res.ok
      ? `🔄 ${label}完成（${Math.round((Date.now() - t0) / 1000)}s）${summary ? `：${summary}` : ""}`
      : `⚠️ ${label}失败：\n\`\`\`\n${(res.err || res.out).slice(0, 600)}\n\`\`\``;
    log({ level: res.ok ? "info" : "warn", msg: "board_sync_cmd", cwd, ms: Date.now() - t0, ok: res.ok });
    await sendChat(chatId, text, ctx);
  })();
}

type BoardSnap = {
  url: string;
  tickets: number;
  runs: number;
  byProject: Record<string, number>;
  byStatus: Record<string, number>;
  runStatus: Record<string, number>;
  gate: number;
};

const BOARD_STATUS_ORDER = ["BLOCKED", "READY", "RUNNING", "MERGING", "CONFLICT", "RESOLVING", "MERGED", "FAILED"];

function boardCard(snap: BoardSnap | null, binding: Binding | null): unknown {
  const b = boardCfg();
  const elements: unknown[] = [];

  if (!snap) {
    elements.push({ tag: "markdown", text_size: "body", content: "读不到票板（可能没开 Base 权限，或者表被删了）。" });
  } else {
    const statusLine = BOARD_STATUS_ORDER.filter((k) => snap.byStatus[k]).map((k) => `${k} ${snap.byStatus[k]}`).join(" · ");
    const runLine = Object.entries(snap.runStatus).map(([k, v]) => `${k} ${v}`).join(" · ");
    const projLine = Object.entries(snap.byProject).map(([k, v]) => `${k} ${v}`).join(" · ");
    elements.push({
      tag: "markdown",
      text_size: "body",
      content: [
        `**${snap.tickets} 张票** · 闸门 ready-for-agent **${snap.gate}** 张`,
        statusLine ? `<font color='grey'>${statusLine}</font>` : "",
        "",
        `**按项目**：${projLine || "（空）"}`,
        `**run 台账**：${snap.runs} 条${runLine ? ` · ${runLine}` : ""}`,
      ].filter(Boolean).join("\n"),
    });
    elements.push({
      tag: "markdown",
      text_size: "notation",
      content: binding
        ? `看的是 **${binding.project}** 的全部票（\`.scratch/<feature>/issues/<NN>.md\` 是唯一真相，这里是镜像）。`
        : "（这个会话还没绑项目 —— 同步会按绑定项目去读 `.scratch`。）",
    });
  }

  elements.push({
    tag: "column_set",
    flex_mode: "none",
    horizontal_spacing: "8px",
    columns: [
      {
        tag: "column",
        width: "weighted",
        weight: 1,
        elements: [{
          tag: "button",
          text: { tag: "plain_text", content: "🔄 同步" },
          type: "primary",
          width: "fill",
          size: "small",
          behaviors: [{ type: "callback", value: { board: "sync" } }],
        }],
      },
      {
        tag: "column",
        width: "weighted",
        weight: 1,
        elements: [{
          tag: "button",
          text: { tag: "plain_text", content: "🔗 打开看板" },
          type: "default",
          width: "fill",
          size: "small",
          behaviors: [{ type: "open_url", default_url: snap?.url ?? b.url }],
        }],
      },
    ],
  });

  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: "📋 票板" },
      subtitle: { tag: "plain_text", content: snap ? `${snap.tickets} 张票 · ${snap.gate} 张可开工` : "读不到" },
      template: "blue",
      icon: { tag: "standard_icon", token: "form_colorful" },
    },
    body: { direction: "vertical", padding: "12px 12px 20px 12px", elements },
  };
}

function boardFallbackText(snap: BoardSnap | null, binding: Binding | null): string {
  if (!snap) return `票板：${boardCfg().url}`;
  const statusLine = BOARD_STATUS_ORDER.filter((k) => snap.byStatus[k]).map((k) => `${k} ${snap.byStatus[k]}`).join(" · ");
  return [
    `**票板（${binding?.project ?? "未绑项目"}）**`,
    "",
    `- ${snap.tickets} 张票${statusLine ? `：${statusLine}` : ""}`,
    `- 闸门 \`ready-for-agent\`：**${snap.gate}** 张（下次 drain 会挑这些）`,
    `- run 台账：${snap.runs} 条`,
    "",
    snap.url,
  ].join("\n");
}

// ---------------------------------------------------------------- command handling

async function helpText(binding: Binding | null): Promise<string> {
  const projects = await codebases();
  const lines = [
    "**feishu-pi bridge** — 消息直接进 pi 会话（一个项目一个上下文窗口）",
    "",
    "| 命令 | 作用 |",
    "|---|---|",
    "| `/use <名称\\|路径>` | 切项目（不带参数＝弹出**选择卡**） |",
    "| `/projects` | 📁 **项目选择卡**：点一下切换，或粘绝对路径绑定 |",
    "| `/new` | 当前项目开一个全新 pi 会话 |",
    "| `/status` | 当前绑定 + 全局在跑的 archon run |",
    "| `/runs` | 当前项目最近的 run |",
    "| `/watch <run-id\|last>` | 盯一个 run：门开/结束/失败都推给你 |",
    "| `/watching` | 在盯哪些 run |",
    "| `/unwatch <run-id>` | 不盯了 |",
    "| `/skills` | 🧩 **技能选择卡**：点一下＝替你敲 `/skill:<名字>`，可搜索 |",
    "| `/board` | 📋 **票板卡**：`.scratch/*/issues/*.md` 的镜像（票、状态、闸门、run 台账）|",
    "| `/sync` | 立刻把当前项目的 ticket 同步进票板（平时自动同步）|",
    "| `/sessions` | 🕘 **历史会话卡**：这个项目的旧会话，点「接回」就把上下文接回来 |",
    "| `/resume <序号\|id\|last>` | 接回某段历史会话（不重开、不丢上下文） |",
    "| `/recap [条数]` | 把**这个飞书聊天**之前的记录喂给 pi，让它接着聊 |",
    "| `/help` | 这张表 |",
    "",
    "**技能**：`/skills` 开卡片点选（也能搜）。技能命令是 pi 展开的，带 ⚠️ 的只能人显式触发 —— 点按钮就等于显式打。",
    "",
    `当前绑定：${binding ? `**${binding.project}** (\`${binding.cwd}\`, session \`${binding.sessionId}\`)` : "无 —— 先 `/use <项目>`"}`,
    "",
    `已注册项目（${projects.length}）：${projects.map((p) => p.name).join(", ") || "（无）"}`,
  ];
  return lines.join("\n");
}

/** Returns the reply text, or null when the command is not ours (→ forward to pi). */
type CommandResult =
  | string
  | { card: unknown; fallback?: string }
  | { runTurn: { text: string; label: string } }
  | null;

async function handleCommand(command: string, arg: string, key: string, binding: Binding | null): Promise<CommandResult> {
  switch (command) {
    case "/help":
      return helpText(binding);

    case "/projects": {
      const projects = await codebases();
      return {
        card: projectsCard(1, projects, binding),
        fallback: [
          "**已注册项目**",
          "",
          ...(projects.length
            ? projects.map((p) => `- **${p.name}** — \`${p.cwd}\`${binding?.cwd === p.cwd ? "  ← 当前" : ""}`)
            : ["（没有 —— 用 `/use /绝对/路径` 也能直接绑一个目录）"]),
        ].join("\n"),
      };
    }

    case "/use": {
      if (!arg) {
        return {
          card: projectsCard(1, await codebases(), binding),
          fallback: "用法：`/use <项目名>` 或 `/use /绝对/路径`\n\n先看看 `/projects`。",
        };
      }
      if (arg.startsWith("/") || arg.startsWith("~")) {
        const out = await bindPathAction(key, key, arg);
        return out.text;
      }
      const target = await resolveProject(arg);
      if (!target) return `没找到项目 \`${arg}\`。用 \`/projects\` 看已注册的，或直接给绝对路径。`;
      const fresh = bindChat(key, key, target);
      // 话题里换了项目，头卡跟着换（fire and forget：这行只负责回话）
      void refreshTopicHeader(key, key.split(":")[0], state.bindings[key] ?? fresh);
      return `已切到 **${target.project}**\n\n\`${target.cwd}\`\n\nsession \`${fresh.sessionId}\` —— 这是这个项目**独立**的上下文窗口。`;
    }

    case "/new": {
      if (!binding) return "还没绑项目，先 `/use <项目>`。";
      const next = { ...binding, sessionId: `${sessionIdFor(binding.project)}-${Date.now().toString(36)}`, updatedAt: new Date().toISOString() };
      state.bindings[key] = next;
      state.sessions = state.sessions ?? {};
      state.sessions[binding.cwd] = next.sessionId;
      saveState();
      dropRpc(key); // the resident process is pinned to the old session id
      const fresh = { ...next };
      if (key.includes(":")) {
        state.sessions = state.sessions ?? {};
        state.sessions[key] = fresh.sessionId;
        saveState();
      }
      return `**${binding.project}** 开了新会话：\`${next.sessionId}\`\n\n（grill → spec → 拆票 期间别用这个命令。）`;
    }

    case "/status": {
      // The archon CLI refuses to run outside a git repository, so never fall back to DIR.
      const statusCwd = binding?.cwd ?? (await anyRepoCwd());
      const all = await archonJson(["workflow", "status", "--all"], statusCwd);
      const runs: any[] = all?.runs ?? [];
      const head = binding
        ? `**绑定**：${binding.project} — \`${binding.cwd}\`\n**session**：\`${binding.sessionId}\``
        : "**绑定**：无（先 `/use <项目>`）";
      const active = runs.length ? runs.map(fmtRun).join("\n") : "（没有在跑的 run）";
      return [head, "", `**全局在跑（${runs.length}）**`, active].join("\n");
    }

    case "/runs": {
      if (!binding) return "还没绑项目，先 `/use <项目>`。";
      const res = await archonJson(["workflow", "runs", "--limit", "10"], binding.cwd);
      const runs: any[] = res?.runs ?? [];
      return [`**${binding.project}** 最近 ${runs.length} 条 run`, "", ...(runs.length ? runs.map(fmtRun) : ["（没有）"])].join("\n");
    }

    case "/skills": {
      // Skill PICKER card (ticket 08); the plain list stays as the fallback text.
      const rows = skillRows(binding);
      if (!rows.length) return "没找到技能目录（~/.agents/skills）。";
      return {
        card: skillsCard(1, arg.trim(), binding),
        fallback: [
          `**可用技能（${rows.length}）** —— 必须显式打给 pi 的排在前面：`,
          ...rows.map((r) => `- \`/skill:${r.name}\`${r.explicit ? " ⚠️" : ""} — ${r.desc}`),
          "",
          "_⚠️ = 带 `disable-model-invocation`，只能人显式打，模型自己不会想起来用。_",
        ].join("\n"),
      };
    }
    case "/sessions": {
      if (!binding) return "先 `/use <项目>`，再看它的历史会话。";
      const list = sessionFiles(binding.cwd, binding.sessionId);
      if (!list.length) return `\`${binding.cwd}\` 下还没有 pi 会话文件。`;
      return {
        card: sessionsCard(binding.cwd, binding.sessionId, Number(arg.trim() || "1")),
        fallback: [
          `**历史会话（${list.length}，新的在上面）** —— 用 \`/resume <序号|id>\` 接回：`,
          "",
          ...list.slice(0, 20).map((sc, i) => `- ${fmtSession(i + 1, sc)}`),
        ].join("\n"),
      };
    }
    case "/resume": {
      const chatId = key.split(":")[0];
      return resumeSession(key, binding, arg.trim() || "last").then((t) => t);
    }
    case "/recap": {
      const chatId = key.split(":")[0];
      const n = Math.min(Math.max(Number(arg.trim() || "24") || 24, 4), 50);
      const { rows, skipped } = await chatTranscript(chatId, n);
      if (rows.length < 2) return "这个聊天里没拉到能用的历史（可能都被撤回了）。";
      const text = [
        `下面是这个飞书聊天之前的对话记录（时间正序；已过滤 ${skipped} 条进度/卡片类消息，长回答可能截断）。`,
        "把这些当作我们已经聊过的上下文，不要逐条回复。",
        "",
        ...rows,
        "",
        "请用中文回答：1) 我们到哪一步了；2) 接下来该做什么。",
      ].join("\n");
      log({ level: "info", msg: "recap_requested", key, rows: rows.length, skipped });
      return { runTurn: { text, label: `/recap（${rows.length} 条聊天记录）` } };
    }
    case "/watch": {
      const target = arg.trim();
      if (!target) return "用法：`/watch <run-id|last>` —— 盯一个 run，它门开/结束/失败都会推给你。\n`/watching` 看在盯哪些。";
      const cwdForRuns = binding?.cwd ?? process.cwd();
      let runId = target;
      if (target === "last") {
        const res = await run(["archon", "workflow", "runs", "--limit", "1", "--json"], { cwd: cwdForRuns, timeoutMs: 60_000 });
        try {
          const list = JSON.parse(res.stdout.trim())?.runs ?? [];
          runId = String(list[0]?.id ?? "");
        } catch {
          runId = "";
        }
        if (!runId) return "没找到最近的 run。";
      }
      const obj = await archonGet(cwdForRuns, runId);
      if (!obj) return `读不到 run \`${runId}\`（要在 git 仓库里读，且 id 要对）。`;
      const rec = await watchRun(runId, cwdForRuns, key.split(":")[0], { key,
        workflow: String(obj.workflow_name ?? "run"),
        userMessage: String(obj.user_message ?? ""),
      });
      return `👀 开始盯 \`${runId.slice(0, 8)}\`（${rec.workflow}，当前 ${obj.status}）。状态一变我就推给你。`;
    }
    case "/watching": {
      const list = trackedRuns();
      if (!list.length) return "没在盯任何 run。`/watch last` 盯最近的。";
      return ["**在盯的 run**", ...list.map((r) => `- \`${r.runId.slice(0, 8)}\` · ${r.workflow} · ${r.status}`)].join("\n");
    }
    case "/unwatch": {
      const id = arg.trim();
      const hit = trackedRuns().find((r) => r.runId.startsWith(id) && id.length > 0);
      if (!hit) return `不在盯的列表里：\`${id}\``;
      unwatchRun(hit.runId);
      return `不再盯 \`${hit.runId.slice(0, 8)}\`。`;
    }
    case "/board": {
      const res = await boardRun(["--snapshot"], 90_000);
      let snap: BoardSnap | null = null;
      try {
        snap = JSON.parse(res.out.split("\n").pop() ?? "null");
      } catch {
        snap = null;
      }
      log({ level: "info", msg: "board_cmd", key, ok: Boolean(snap), ms: res.ms });
      return { card: boardCard(snap, binding), fallback: boardFallbackText(snap, binding) };
    }

    case "/sync": {
      if (!binding) return "先 `/use <项目>`，再同步它的票板。";
      const chatId = key.split(":")[0];
      startBoardSync(chatId, binding.cwd, { anchor: topicOf(key).anchor, key }, "同步");
      return `🔄 正在把 \`${basename(binding.cwd)}/.scratch\` 同步到票板…`;
    }

    default:
      // Anything else — /skill:grill-me, /skill:to-tickets, /templates… — belongs to pi.
      return null;
  }
}

// ---------------------------------------------------------------- message pipeline

const queues = new Map<string, Promise<unknown>>();

function enqueue(key: string, job: () => Promise<unknown>): Promise<any> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(job).catch((err) => log({ level: "error", msg: "job_threw", key, err: String(err) }));
  queues.set(key, next);
  return next;
}

async function handleMessage(ev: any, opts: { label?: string } = {}) {
  if (ev.sender_type === "bot") return;
  let text = String(ev.content ?? "").trim();
  if (!text) return;
  const chatId = String(ev.chat_id ?? "");
  // In a group the bot is usually @-ed: "@Archon-Bridge /skills" must still parse as a command.
  if (String(ev.chat_type ?? "") === "group") {
    const stripped = text.replace(/^(@[^\s]{1,40}[\s\u2005]+)+/, "").trim();
    if (stripped) text = stripped;
  }
  const messageId = String(ev.message_id ?? ev.id ?? "");
  const sender = String(ev.sender_id ?? "");
  const threadId = ev.thread_id ? String(ev.thread_id) : "";
  const key = threadId ? `${chatId}:${threadId}` : chatId;

  const chatType = String(ev.chat_type ?? "");
  const explicitlyAllowed = cfg.allowedChats.includes(chatId);
  if (!explicitlyAllowed) {
    if (chatType === "group") {
      log({ level: "info", msg: "group_ignored", chatId, threadId, messageId, sender });
      return;
    }
    if (chatType === "p2p" && !cfg.allowP2P) {
      log({ level: "warn", msg: "p2p_disabled", chatId });
      return;
    }
  }

  if (cfg.allowedSenders.length > 0 && !cfg.allowedSenders.includes(sender)) {
    log({ level: "warn", msg: "sender_rejected", sender, chatId });
    return;
  }

  log({ level: "info", msg: "message_in", chatId, threadId, sender, chatType, chars: text.length, head: text.slice(0, 120) });
  // In a group topic every outbound message must be a thread reply — pin the topic right away,
  // even before anyone picked a project for it.
  if (threadId && messageId) rememberTopic(key, chatId, threadId, messageId);

  const follow = await enqueue(key, async () => {
    const binding = await bindingFor(key, chatId);
    const anchor = topicOf(key).anchor;

    if (text.startsWith("/")) {
      const [cmdRaw, ...rest] = text.split(/\s+/);
      const cmd = cmdRaw.toLowerCase().split("@")[0];
      const out = await handleCommand(cmd, rest.join(" "), key, binding);
      if (out !== null) {
        if (typeof out === "string") {
          await reply(messageId, chatId, out, anchor);
        } else if ("runTurn" in out) {
          // A command that needs a pi turn (e.g. /recap) — hand it to the caller so it runs
          // *after* this queue slot is released.
          return out;
        } else {
          const sent = await sendCardJson(chatId, out.card, { anchor, key });
          log({ level: sent ? "info" : "warn", msg: "command_card", command: cmd, messageId: sent });
          if (!sent && out.fallback) await reply(messageId, chatId, out.fallback, anchor);
        }
        return;
      }
      // not a bridge command → fall through and let pi handle it (/skill:name etc.)
    }

    if (!binding) {
      if (threadId) {
        // Fresh topic in the workbench group: claim a project with one tap.
        // The message that opened the topic is kept and replayed as the first turn after the claim,
        // so "@bot 帮我修 X" + one tap already does the work.
        state.pending = state.pending ?? {};
        state.pending[key] = { text, messageId, at: new Date().toISOString() };
        saveState();
        const cardId = await sendCardJson(chatId, projectsCard(1, await codebases(), null), { anchor, key });
        await reply(messageId, chatId, "点一个项目我就开工 —— 你刚才那句话会直接在那个项目里跑，不用重打。", anchor);
        log({ level: "info", msg: "topic_claim_offered", key, chatId, cardId });
        return;
      }
      await reply(messageId, chatId, "还没绑项目。先 `/use <项目名>`（`/projects` 看有哪些，或 `/use /绝对/路径`）。");
      return;
    }

    // 已有的话题也补一张头卡（新话题在认领那一步就有了）；已经有就什么都不做。
    await ensureTopicHeader(key, chatId, binding);

    // One turn per project at a time. A message that arrives mid-turn is steered
    // into the running one instead of waiting behind it.
    const client = rpcFor(key, binding);
    let busy = client.isStreaming;
    try {
      const st = await client.getState();
      busy = Boolean(st?.isStreaming);
    } catch {
      /* keep the cached value */
    }

    if (busy && turnByKey.has(key)) {
      const t0 = Date.now();
      const result = await piAsk(binding, turnByKey.get(key)!, text);
      log({ level: "info", msg: "pi_steered", project: binding.project, ms: Date.now() - t0, ok: result.ok });
      await reply(messageId, chatId, "➡️ 已插入当前这一轮（它跑完会一起回复）。");
      return;
    }

    let resolveSettled: () => void = () => {};
    const settled = new Promise<void>((resolve) => {
      resolveSettled = resolve;
    });
    const turn: Turn = {
      key,
      binding,
      chatId,
      firstMessageId: messageId,
      label: opts.label,
      anchor,
      text: "",
      tools: [],
      startedAt: Date.now(),
      progress: { messageId: null, lastEditAt: 0, lastBody: "" },
      lastProgressAt: 0,
      resolveSettled,
      settled,
    };
    turnByKey.set(key, turn);
    // A picker/menu launch has no "your message" in the chat, so post the progress line right away.
    if (opts.label) void flushProgress(turn);

    const ackTimer = setTimeout(() => {
      void reply(messageId, chatId, `⏳ 收到，pi 在处理（\`${binding.project}\`）…`);
    }, cfg.ackAfterMs);

    const t0 = Date.now();
    const result = await piAsk(binding, turn, text);
    clearTimeout(ackTimer);
    turnByKey.delete(key);
    log({
      level: result.ok ? "info" : "error",
      msg: "pi_done",
      project: binding.project,
      sessionId: binding.sessionId,
      ms: Date.now() - t0,
      ok: result.ok,
      chars: result.text.length,
      tools: turn.tools,
    });
    const placement = await finalizeProgress(turn, result.text, result.ok);
    if (result.text && placement === "separate") await reply(messageId, chatId, result.text, turn.anchor);
    // The agent may have launched a run (drain / execute) during this turn — watch it.
    const added = await discoverRuns(binding, chatId, t0, key);
    if (added > 0) log({ level: "info", msg: "runs_discovered", project: binding.project, added });
    // /to-tickets or /implement may have rewritten .scratch — mirror it into the Base.
    await maybeSyncBoard(binding.cwd, { why: "turn" });
  });

  if (follow && typeof follow === "object" && "runTurn" in follow) {
    const rt = (follow as { runTurn: { text: string; label: string } }).runTurn;
    await handleMessage(
      { ...ev, message_id: `card_${Date.now()}`, content: rt.text },
      { label: rt.label },
    );
  }
}

// ---------------------------------------------------------------- consumer lifecycle

const consumerProcs: ReturnType<typeof spawn>[] = [];

async function startEventConsumer(
  eventKey: string,
  onEvent: (ev: any) => void,
): Promise<ReturnType<typeof spawn>> {
  const proc = spawn(
    ["lark-cli", "event", "consume", eventKey, "--as", "bot", ...profileArgs()],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe", env: { ...process.env } },
  );

  consumerProcs.push(proc);

  // stderr: wait for the ready marker, then keep logging anything else.
  void (async () => {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let sawReady = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!sawReady && trimmed.includes("[event] ready")) {
          sawReady = true;
          log({ level: "info", msg: "consumer_ready", eventKey });
          if (eventKey === "im.message.receive_v1") onConsumerReady();
        } else {
          log({ level: sawReady ? "info" : "warn", msg: "consumer_stderr", line: trimmed.slice(0, 400) });
        }
      }
    }
    log({ level: "info", msg: "consumer_stderr_closed" });
  })();

  // stdout: NDJSON, one event per line.
  void (async () => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let ev: any;
        try {
          ev = JSON.parse(trimmed);
        } catch {
          log({ level: "warn", msg: "event_unparsable", line: trimmed.slice(0, 300) });
          continue;
        }
        try {
          onEvent(ev);
        } catch (err) {
          log({ level: "error", msg: "event_handler_threw", eventKey, detail: String((err as Error).message) });
        }
      }
    }
    log({ level: "info", msg: "consumer_stdout_closed" });
  })();

  const code = await Promise.race([
    proc.exited.then((c) => c),
    new Promise<number>((r) => setTimeout(() => r(-1), 1500)), // give it a moment before deciding
  ]);
  if (code !== -1) {
    log({ level: "error", msg: "consumer_died_early", code });
  }
  return proc;
}

/** A consumer can die early (console event not subscribed yet, bus held by a stale consumer). */
async function startConsumerWithRetry(eventKey: string, onEvent: (ev: any) => void, retryMs = 90_000): Promise<void> {
  const worker = async (): Promise<void> => {
    const proc = await startEventConsumer(eventKey, onEvent);
    if (proc.exitCode === null) return; // survived the probe window → good
    log({ level: "warn", msg: "consumer_retry_scheduled", eventKey, retryMs });
    setTimeout(() => void worker(), retryMs);
  };
  await worker();
}

let announced = false;
async function onConsumerReady() {
  if (announced) return;
  announced = true;
  log({ level: "info", msg: "bridge_up" });
}

// ---------------------------------------------------------------- cards (ticket 04)

/** `form_value` arrives as a JSON string keyed by component `name`. */
function parseFormValue(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Which of our decisions does this interaction mean? */
function decisionOf(actionName: string, actionValue: unknown): "approve" | "reject" | null {
  const words = [actionName, typeof actionValue === "string" ? actionValue : JSON.stringify(actionValue ?? null)]
    .join(" ")
    .toLowerCase();
  if (/approve|批准|通过/.test(words)) return "approve";
  if (/reject|打回|拒绝/.test(words)) return "reject";
  return null;
}

/** Update a card we sent: `im messages patch` (14 days, no token) first, delay-token fallback. */
async function updateCardMessage(chatId: string, messageId: string, card: unknown, token?: string | null): Promise<boolean> {
  if (replyOverride) {
    await replyOverride(messageId, chatId, `(card-update) ${JSON.stringify(card).slice(0, 200)}`);
    return true;
  }
  const patched = await lark([
    "im", "messages", "patch",
    "--message-id", messageId,
    "--data", JSON.stringify({ content: JSON.stringify(card) }),
    "--as", "bot",
  ]);
  const okPatch = patched.code === 0 && !/"ok":\s*false/.test(patched.stdout);
  log({ level: okPatch ? "info" : "warn", msg: "card_patch", messageId, ok: okPatch, err: (patched.stderr || patched.stdout).slice(0, 200) });
  if (okPatch) return true;
  if (!token) return false;
  return updateCard(token, card);
}

/** Replace a sent card in place (delayed-update token: 30 min, max 2 uses). */
async function updateCard(token: string, card: unknown): Promise<boolean> {
  const attempt = async (payload: unknown): Promise<{ ok: boolean; parseErr: boolean }> => {
    const child = spawn(["lark-cli", "api", "POST", "/open-apis/interactive/v1/card/update", "--data", "-", ...profileArgs()], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    child.stdin.write(JSON.stringify({ token, card: payload }));
    child.stdin.end();
    const [out, err, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    // Success is `{"ok": true, "data": {}}` — the shape differs from the raw API envelope.
    const ok = code === 0 && !/"ok":\s*false/.test(out) && (/"ok":\s*true/.test(out) || /"code":\s*0/.test(out));
    const parseErr = /parse card json err|invalid card|200621/.test(out + err);
    log({ level: ok ? "info" : "warn", msg: "card_update", shape: typeof payload, code, ok, parseErr, err: err.slice(0, 200), out: out.slice(0, 200) });
    return { ok, parseErr };
  };
  const first = await attempt(card);
  if (first.ok || !first.parseErr) return first.ok;
  // Only a shape complaint justifies the older "card as a JSON string" form — anything else
  // (expired token, exhausted uses) must not burn the token's remaining use on a retry.
  return (await attempt(JSON.stringify(card))).ok;
}

/** The card shown after a decision; built from our own data (card_content is userDSL, not JSON). */
function decidedCard(
  decision: "approve" | "reject",
  note: string,
  about: { runId: string | null; cwd: string | null; workflow: string | null },
  outcome: string,
): unknown {
  const when = new Date().toISOString().slice(0, 16).replace("T", " ");
  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: decision === "approve" ? "已批准" : "已打回" },
      subtitle: { tag: "plain_text", content: `${about.workflow ?? "workflow"} · run ${about.runId?.slice(0, 8) ?? "—"} · ${when}` },
      template: decision === "approve" ? "green" : "red",
      icon: { tag: "standard_icon", token: decision === "approve" ? "approval_colorful" : "todo_colorful" },
    },
    body: {
      direction: "vertical",
      padding: "12px 12px 20px 12px",
      vertical_spacing: "8px",
      elements: [
        { tag: "markdown", text_size: "body", content: outcome },
        {
          tag: "column_set",
          flex_mode: "none",
          columns: [
            {
              tag: "column",
              width: "weighted",
              weight: 1,
              background_style: decision === "approve" ? "green-50" : "red-50",
              padding: "8px 12px 8px 12px",
              elements: [
                {
                  tag: "markdown",
                  text_size: "caption",
                  content: note ? `**你的原话（已回传，非摘要）**\n${note}` : "_没有留言。_",
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

/** Low-level card send; returns the message id. */
async function sendCardJson(chatId: string, card: unknown, ctx?: { anchor?: string; key?: string }): Promise<string | null> {
  if (replyOverride) {
    await replyOverride("(card)", chatId, JSON.stringify(card).slice(0, 200));
    return `om_fakecard_${Math.random().toString(36).slice(2, 8)}`;
  }
  const res = ctx?.anchor
    ? await lark(["im", "+messages-reply", "--message-id", ctx.anchor, "--msg-type", "interactive", "--content", JSON.stringify(card), "--reply-in-thread", "--as", "bot"])
    : await lark(["im", "+messages-send", "--chat-id", chatId, "--msg-type", "interactive", "--content", JSON.stringify(card), "--as", "bot"]);
  let messageId: string | null = null;
  try {
    messageId = JSON.parse(res.stdout)?.data?.message_id ?? null;
  } catch {
    /* leave null */
  }
  if (!messageId) log({ level: "error", msg: "card_send_failed", code: res.code, inThread: Boolean(ctx?.anchor), err: (res.stderr || res.stdout).slice(0, 900) });
  else log({ level: "info", msg: "card_sent", messageId, chatId, inThread: Boolean(ctx?.anchor), key: ctx?.key });
  rememberTopicMessage(messageId, ctx);
  return messageId;
}

/** Send an approval card and remember what it is about, so the click can act. */
async function sendApprovalCard(
  chatId: string,
  about: { runId: string | null; cwd: string | null; workflow: string | null; question: string; demo?: boolean },
  ctx?: { anchor?: string; key?: string },
): Promise<string | null> {
  const short = about.runId ? about.runId.slice(0, 8) : "—";
  const card = {
    schema: "2.0",
    config: {
      update_multi: true,
      width_mode: "default",
      style: {
        text_size: {
          title: { default: "heading-2", pc: "heading-2", mobile: "heading-3" },
          body: { default: "normal", pc: "normal", mobile: "normal" },
          caption: { default: "notation", pc: "notation", mobile: "notation" },
        },
      },
    },
    header: {
      title: { tag: "plain_text", content: "需要你决策" },
      subtitle: { tag: "plain_text", content: `${about.workflow ?? "workflow"} · run ${short}${about.cwd ? ` · ${about.cwd.split("/").pop()}` : ""}` },
      template: "blue",
      icon: { tag: "standard_icon", token: "approval_colorful" },
      ...(about.demo ? { text_tag_list: [{ tag: "text_tag", text: { tag: "plain_text", content: "演示" }, color: "blue" }] } : {}),
    },
    body: {
      direction: "vertical",
      padding: "12px 12px 20px 12px",
      vertical_spacing: "8px",
      elements: [
        {
          tag: "markdown",
          text_size: "body",
          content: about.question.slice(0, 1200),
        },
        {
          tag: "column_set",
          flex_mode: "none",
          horizontal_spacing: "8px",
          columns: [
            {
              tag: "column",
              width: "weighted",
              weight: 1,
              background_style: "grey-50",
              padding: "8px 12px 8px 12px",
              elements: [
                {
                  tag: "markdown",
                  text_size: "caption",
                  content: `**run**  ${about.runId ?? "(未绑定)"}\n**目录**  ${about.cwd ?? "—"}`,
                },
              ],
            },
          ],
        },
        {
          tag: "form",
          name: "decision",
          elements: [
            {
              tag: "input",
              name: "note",
              label: { tag: "plain_text", content: "你的话（可选，原话回传，不是摘要）" },
              placeholder: { tag: "plain_text", content: "比如：先补测试再继续 / 方案改成 X" },
              input_type: "multiline_text",
              rows: 3,
              max_length: 500,
              width: "fill",
            },
            {
              tag: "column_set",
              flex_mode: "none",
              horizontal_spacing: "8px",
              columns: [
                {
                  tag: "column",
                  width: "weighted",
                  weight: 1,
                  elements: [
                    { tag: "button", text: { tag: "plain_text", content: "批准并继续" }, type: "primary_filled", width: "fill", name: "approve", form_action_type: "submit" },
                  ],
                },
                {
                  tag: "column",
                  width: "weighted",
                  weight: 1,
                  elements: [
                    { tag: "button", text: { tag: "plain_text", content: "打回" }, type: "danger", width: "fill", name: "reject", form_action_type: "submit" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const messageId = await sendCardJson(chatId, card, ctx);
  if (!messageId) return null;
  state.cards = state.cards ?? {};
  state.cards[messageId] = { runId: about.runId, cwd: about.cwd, workflow: about.workflow, chatId, created: new Date().toISOString() };
  saveState();
  log({ level: "info", msg: "card_sent", messageId, runId: about.runId, chatId });
  return messageId;
}

async function handleCardAction(ev: any) {
  const operator = String(ev.operator_id ?? "");
  const tag = String(ev.action_tag ?? "");
  const name = String(ev.action_name ?? "");
  const form = parseFormValue(ev.form_value);
  const note = String(form.note ?? "").trim();
  const decision = decisionOf(name, ev.action_value);

  log({
    level: "info",
    msg: "card_action",
    operator,
    tag,
    name,
    actionValue: String(ev.action_value ?? "").slice(0, 120),
    note,
    decision,
    messageId: ev.message_id,
    chatId: ev.chat_id,
    hasToken: Boolean(ev.token),
  });

  if (cfg.allowedSenders.length > 0 && !cfg.allowedSenders.includes(operator)) {
    log({ level: "warn", msg: "card_operator_rejected", operator });
    return;
  }
  const actionMessageId = String(ev.message_id ?? "");
  const actionAnchor = anchorOfMessage(actionMessageId);
  // (ticket 06) A card that carries an agent question answers the RPC, not archon.
  const uiRec = state.ui?.[String(ev.message_id ?? "")];
  if (uiRec) {
    if (uiRec.answered) {
      log({ level: "warn", msg: "ui_card_already_answered", messageId: ev.message_id });
      await reply(String(ev.message_id ?? ""), String(ev.chat_id ?? ""), "这张问题卡已经处理过了（或者桥重启把它作废了）。要它重问就再发一条消息。", actionAnchor);
      return;
    }
    const given = (() => {
      try {
        return JSON.parse(String(ev.action_value ?? "null"));
      } catch {
        return null;
      }
    })();
    const fromForm = String(form.value ?? form.note ?? "").trim();
    let payload: Record<string, unknown> = { cancelled: true };
    let echo = "取消";
    if (uiRec.method === "confirm") {
      const yes = String(ev.action_name ?? "").includes("yes") || given?.ui === "yes";
      payload = { confirmed: yes };
      echo = yes ? "是" : "否";
    } else if (uiRec.method === "select") {
      const picked = typeof given?.ui === "string" ? given.ui : fromForm;
      if (!picked) {
        log({ level: "warn", msg: "ui_select_no_value", actionName: ev.action_name, actionValue: String(ev.action_value ?? "") });
        return;
      }
      payload = { value: picked };
      echo = picked;
    } else {
      if (!fromForm) {
        log({ level: "warn", msg: "ui_input_empty" });
        return;
      }
      payload = { value: fromForm };
      echo = fromForm.slice(0, 120);
    }
    const said = await answerUiCard(String(ev.message_id ?? ""), uiRec, payload, echo);
    await reply(String(ev.message_id ?? ""), String(ev.chat_id ?? ""), said, actionAnchor);
    return;
  }

  // (ticket 08) picker cards: skill buttons, paging, project switching
  const pick = parsePickerAction(ev);
  if (pick) {
    await handlePickerAction(pick, ev);
    return;
  }


  if (tag !== "button" || !decision) {
    log({ level: "warn", msg: "card_action_ignored", tag, name });
    return;
  }

  const dedupe = `${ev.message_id}:${operator}:${decision}`;
  state.decided = state.decided ?? {};
  if (state.decided[dedupe]) {
    log({ level: "warn", msg: "card_action_duplicate", dedupe });
    return;
  }
  state.decided[dedupe] = new Date().toISOString();
  saveState();

  const binding = state.cards?.[String(ev.message_id ?? "")];

  // Act on the run when the card is bound to one.
  let outcome = "";
  if (binding?.runId && binding.cwd) {
    const verb = decision === "approve" ? "approve" : "reject";
    const words = decision === "approve" ? note || "approved from Feishu" : note || "rejected from Feishu";
    const res = await run(["archon", `--cwd`, binding.cwd, "workflow", verb, binding.runId, words, "--detach"], {
      cwd: binding.cwd,
      timeoutMs: 120_000,
    });
    outcome = res.code === 0 ? `已${decision === "approve" ? "批准" : "打回"}并交给 archon 继续。` : `archon ${verb} 失败：${(res.stderr || res.stdout).trim().slice(0, 300)}`;
    log({ level: res.code === 0 ? "info" : "error", msg: "card_run_decision", runId: binding.runId, verb, code: res.code, err: res.stderr.slice(0, 300) });
  } else {
    outcome = "这张卡没有绑定 run（演示通道），决策只回显给你。";
  }

  const head = decision === "approve" ? "✅ 批准" : "🛑 打回";
  const lines = [`${head}`, outcome];
  if (note) lines.push("", `你的原话：> ${note}`);

  if (ev.token) {
    const target = binding ?? { runId: null, cwd: null, workflow: null };
    const ok = await updateCardMessage(String(ev.chat_id ?? ""), String(ev.message_id ?? ""), decidedCard(decision, note, target, outcome), String(ev.token ?? ""));
    if (!ok) lines.push("", "_卡片没能原地更新（延迟更新 token 可能已过期/用完），你看到的旧卡片以这条消息为准。_");
  }
  await reply(String(ev.message_id ?? ""), String(ev.chat_id ?? ""), lines.join("\n"));
}

// ---------------------------------------------------------------- pickers (ticket 08)

type SkillRow = { name: string; desc: string; explicit: boolean };

type PickerAction =
  | { kind: "skills"; page: number; q: string }
  | { kind: "projects"; page: number }
  | { kind: "skill"; name: string; note: string }
  | { kind: "bind"; cwd: string; name: string }
  | { kind: "bindPath"; path: string }
  | { kind: "resume"; id: string }
  | { kind: "sessions"; page: number }
  | { kind: "board"; what: "sync" | "show" }
  | { kind: "help" }
  | { kind: "deck"; name: string };

const SKILL_PAGE = 6;
const PROJECT_PAGE = 8;
/** The flow skills first — these are the ones a human taps most often. */
const SKILL_FAVOURITES = [
  "ask-matt",
  "grill-me",
  "grill-with-docs",
  "to-spec",
  "to-tickets",
  "implement",
  "drain",
  "triage",
  "code-review",
  "diagnosing-bugs",
];

/** Global + project skills, favourites first, then the ones only a human can trigger. */
function skillRows(binding: Binding | null): SkillRow[] {
  const roots = [join(HOME, ".agents/skills"), join(HOME, ".pi/agent/skills"), ...(binding ? [join(binding.cwd, ".agents/skills")] : [])];
  const rows: SkillRow[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const file = join(root, entry, "SKILL.md");
      if (!existsSync(file)) continue;
      let raw = "";
      try {
        raw = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const fm = raw.startsWith("---") ? raw.slice(3, raw.indexOf("\n---", 3)) : "";
      const name = /^name:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? entry;
      const desc = (/^description:\s*(.+)$/m.exec(fm)?.[1] ?? "").replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
      const explicit = /^disable-model-invocation:\s*true$/m.test(fm);
      if (!rows.some((r) => r.name === name)) rows.push({ name, desc, explicit });
    }
  }
  const rank = (r: SkillRow) => {
    const fav = SKILL_FAVOURITES.indexOf(r.name);
    return fav >= 0 ? fav : 100 + Number(!r.explicit);
  };
  return rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** A ‹ 1/7 › row of callback buttons. */
function pagerRow(page: number, pages: number, make: (p: number) => unknown): unknown {
  const cell = (label: string, value: unknown, disabled: boolean) => ({
    tag: "column",
    width: "weighted",
    weight: 1,
    vertical_align: "center",
    elements: [
      {
        tag: "button",
        size: "small",
        width: "fill",
        type: "default",
        disabled,
        text: { tag: "plain_text", content: label },
        behaviors: [{ type: "callback", value }],
      },
    ],
  });
  return {
    tag: "column_set",
    flex_mode: "stretch",
    horizontal_spacing: "8px",
    margin: "8px 0px 0px 0px",
    columns: [
      cell("‹ 上一页", make(page - 1), page <= 1),
      {
        tag: "column",
        width: "weighted",
        weight: 1,
        vertical_align: "center",
        elements: [
          { tag: "markdown", text_size: "notation", text_align: "center", content: `<font color='grey'>${page} / ${pages}</font>` },
        ],
      },
      cell("下一页 ›", make(page + 1), page >= pages),
    ],
  };
}

/**
 * Skill picker. One form holds the keyword box and one button per skill, so tapping a
 * skill sends `/skill:<name>` exactly as if it had been typed (with the box as extra words).
 */
function skillsCard(page: number, q: string, binding: Binding | null): unknown {
  const all = skillRows(binding);
  const query = q.trim().toLowerCase();
  const rows = query ? all.filter((r) => r.name.toLowerCase().includes(query) || r.desc.toLowerCase().includes(query)) : all;
  const pages = Math.max(1, Math.ceil(rows.length / SKILL_PAGE));
  const p = Math.min(Math.max(1, Math.round(page)), pages);
  const slice = rows.slice((p - 1) * SKILL_PAGE, p * SKILL_PAGE);

  const buttons = slice.map((r, i) => ({
    tag: "button",
    name: `sk_${r.name.replace(/[^A-Za-z0-9_-]/g, "_")}`,
    form_action_type: "submit",
    type: i === 0 ? "primary_filled" : "default",
    width: "fill",
    text: { tag: "plain_text", content: `▶ ${r.name}${r.explicit ? " ⚠️" : ""} — ${r.desc.slice(0, 44)}` },
  }));

  const elements: unknown[] = [
    {
      tag: "markdown",
      text_size: "notation",
      content: binding
        ? `当前项目 **${binding.project}** · 点技能＝替你敲 \`/skill:<名字>\``
        : `还没绑项目（先 \`/projects\`）；先看全局技能`,
    },
  ];

  if (slice.length) {
    elements.push({
      tag: "form",
      name: "skill_pick",
      direction: "vertical",
      vertical_spacing: "8px",
      elements: [
        {
          tag: "input",
          name: "note",
          label: { tag: "plain_text", content: "补充说明（可选）" },
          placeholder: { tag: "plain_text", content: "点技能时附在技能名后面，例如：聚焦手机端" },
        },
        ...buttons,
        {
          tag: "input",
          name: "q",
          label: { tag: "plain_text", content: "搜技能" },
          default_value: q,
          placeholder: { tag: "plain_text", content: "关键词，比如 grill / drain / lark" },
        },
        {
          tag: "button",
          name: "skill_search",
          form_action_type: "submit",
          type: "default",
          width: "fill",
          text: { tag: "plain_text", content: "🔍 搜索" },
        },
      ],
    });
  } else {
    elements.push({ tag: "markdown", content: `没匹配到 \`${q}\` 的技能。` });
  }

  elements.push(pagerRow(p, pages, (n) => ({ skillsPage: n, q })));
  elements.push({
    tag: "markdown",
    text_size: "notation",
    content: "_⚠️ = `disable-model-invocation`：模型自己不会想起来用，只能人显式触发 —— 所以这类技能最值得点按钮。_",
  });

  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: query ? `🧩 技能 · “${q.slice(0, 20)}”` : "🧩 选技能" },
      subtitle: { tag: "plain_text", content: `${rows.length} 个${query ? "（匹配结果）" : ""}` },
      template: "indigo",
      icon: { tag: "standard_icon", token: "myai_colorful" },
    },
    body: { direction: "vertical", padding: "12px 12px 20px 12px", elements },
  };
}

/** Project picker: tap to switch, or paste an absolute path to bind one. */
/**
 * 「话题头卡」：每个话题自己的一张常驻卡片（不是外挂的控制台话题）。
 * 飞书里话题群唯一能放"会干活的按钮"的载体就是卡片 —— 机器人自定义菜单只在单聊有，
 * 群菜单 chat_menu_tree 只支持普通群（话题群报 232001 type: Topic）而且只能放链接。
 */
function topicHeaderCard(binding: Binding | null, chatId: string): unknown {
  const btn = (label: string, value: Record<string, unknown>) => ({
    tag: "button",
    text: { tag: "plain_text", content: label },
    type: "default",
    width: "fill",
    size: "small",
    behaviors: [{ type: "callback", value }],
  });
  const row = (a: unknown, b: unknown) => ({
    tag: "column_set",
    flex_mode: "none",
    horizontal_spacing: "8px",
    columns: [
      { tag: "column", width: "weighted", weight: 1, elements: [a] },
      { tag: "column", width: "weighted", weight: 1, elements: [b] },
    ],
  });
  const body: unknown[] = [];
  if (binding) {
    body.push({
      tag: "markdown",
      text_size: "notation",
      content: `**${binding.project}**\n<font color='grey'>${binding.cwd}</font>`,
    });
  } else {
    body.push({ tag: "markdown", text_size: "notation", content: "点下面的项目就绑上了（点错了点另一个）。" });
  }
  body.push(row(btn("📁 换项目", { projectsPage: 1 }), btn("🧩 技能", { skillsPage: 1, q: "" })));
  body.push(row(btn("📋 看板", { board: "show" }), btn("🔄 同步", { board: "sync" })));
  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: binding ? `📌 ${binding.project}` : "📌 认领项目" },
      subtitle: { tag: "plain_text", content: binding ? "这个话题就是它" : "一个话题一个项目" },
      template: binding ? "blue" : "orange",
      icon: { tag: "standard_icon", token: binding ? "common_colorful" : "vote_colorful" },
    },
    body: { direction: "vertical", padding: "12px 12px 20px 12px", elements: body },
  };
}

function projectsCard(page: number, projects: { name: string; cwd: string }[], binding: Binding | null): unknown {
  const pages = Math.max(1, Math.ceil(projects.length / PROJECT_PAGE));
  const p = Math.min(Math.max(1, Math.round(page)), pages);
  const slice = projects.slice((p - 1) * PROJECT_PAGE, p * PROJECT_PAGE);

  const rows = slice.map((c) => {
    const current = binding?.cwd === c.cwd;
    return {
      tag: "column_set",
      flex_mode: "stretch",
      horizontal_spacing: "8px",
      columns: [
        {
          tag: "column",
          width: "weighted",
          weight: 5,
          vertical_align: "center",
          elements: [
            {
              tag: "markdown",
              text_size: "notation",
              content: `**${c.name}**${current ? " · 当前" : ""}\n<font color='grey'>${c.cwd}</font>`,
            },
          ],
        },
        {
          tag: "column",
          width: "weighted",
          weight: 2,
          vertical_align: "center",
          elements: [
            {
              tag: "button",
              size: "small",
              width: "fill",
              type: current ? "default" : "primary",
              disabled: current,
              text: { tag: "plain_text", content: current ? "已绑定" : "切到这个" },
              behaviors: [{ type: "callback", value: { bind: c.cwd, name: c.name } }],
            },
          ],
        },
      ],
    };
  });

  const elements: unknown[] = [
    {
      tag: "markdown",
      text_size: "notation",
      content: binding ? `当前：**${binding.project}**\n<font color='grey'>${binding.cwd}</font>` : "当前：还没绑项目",
    },
    ...(rows.length ? rows : [{ tag: "markdown", content: "（还没有已注册项目 —— 下面粘个路径就行）" }]),
    pagerRow(p, pages, (n) => ({ projectsPage: n })),
    {
      tag: "form",
      name: "project_path",
      direction: "vertical",
      vertical_spacing: "8px",
      margin: "8px 0px 0px 0px",
      elements: [
        {
          tag: "input",
          name: "path",
          placeholder: { tag: "plain_text", content: "/绝对/路径（git 仓库会自动取仓库根）" },
        },
        {
          tag: "button",
          name: "add_path",
          form_action_type: "submit",
          type: "primary_filled",
          width: "fill",
          text: { tag: "plain_text", content: "➕ 绑定这个路径" },
        },
      ],
    },
  ];

  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: "📁 选项目" },
      subtitle: { tag: "plain_text", content: `${projects.length} 个已注册` },
      template: "blue",
      icon: { tag: "standard_icon", token: "common_colorful" },
    },
    body: { direction: "vertical", padding: "12px 12px 20px 12px", elements },
  };
}

function parsePickerAction(ev: any): PickerAction | null {
  const name = String(ev.action_name ?? "");
  const form = parseFormValue(ev.form_value);
  let av: any = null;
  try {
    av = JSON.parse(String(ev.action_value ?? "null"));
  } catch {
    av = null;
  }
  if (av && typeof av === "object" && (av.board === "sync" || av.board === "show")) return { kind: "board", what: av.board };
  if (av && typeof av === "object" && av.help) return { kind: "help" };
  if (av && typeof av === "object" && av.deck) return { kind: "deck", name: String(av.deck) };
  if (name === "skill_search") return { kind: "skills", page: 1, q: String(form.q ?? "") };
  if (name.startsWith("sk_")) return { kind: "skill", name: name.slice(3), note: String(form.note ?? "").trim() };
  if (name === "add_path") return { kind: "bindPath", path: String(form.path ?? "").trim() };
  if (av && typeof av === "object") {
    if (av.resume) return { kind: "resume", id: String(av.resume) };
    if (av.sessionsPage) return { kind: "sessions", page: Number(av.sessionsPage) };
    if (av.skillsPage) return { kind: "skills", page: Number(av.skillsPage), q: String(av.q ?? "") };
    if (av.projectsPage) return { kind: "projects", page: Number(av.projectsPage) };
    if (av.bind) return { kind: "bind", cwd: String(av.bind), name: String(av.name ?? "") };
  }
  return null;
}

/** Bind a chat to a project directory and give it that project's own pi session. */
function bindChat(key: string, chatId: string, target: { project: string; cwd: string }): Binding {
  const fresh: Binding = {
    project: target.project,
    cwd: target.cwd,
    sessionId: sessionIdForBinding(key, target.cwd, target.project),
    updatedAt: new Date().toISOString(),
    ...(key.includes(":") ? { threadId: state.topics?.[key]?.threadId, threadAnchor: state.topics?.[key]?.anchor } : {}),
  };
  state.bindings[key] = fresh;
  saveState();
  log({ level: "info", msg: "project_bound", key, chatId, project: fresh.project, cwd: fresh.cwd });
  return fresh;
}

/** Paste-a-path binding: resolves ~, checks existence, walks up to the git root. */
async function bindPathAction(
  key: string,
  chatId: string,
  raw: string,
): Promise<{ ok: boolean; binding?: Binding; text: string }> {
  if (!raw) return { ok: false, text: "给一个绝对路径，比如 `/data3/yky/beads-matt-dag`。" };
  const abs = resolve(raw.replace(/^~/, HOME));
  if (!existsSync(abs)) return { ok: false, text: `路径不存在：\`${abs}\`` };
  const git = await run(["git", "-C", abs, "rev-parse", "--show-toplevel"], { timeoutMs: 15_000 });
  const isRepo = git.code === 0 && git.stdout.trim().length > 0;
  const cwd = isRepo ? git.stdout.trim() : abs;
  const fresh = bindChat(key, chatId, { project: basename(cwd), cwd });
  const moved = cwd !== abs ? `\n\n（给了 \`${abs}\`，取仓库根 \`${cwd}\`）` : "";
  const warn = isRepo ? "" : "\n\n_⚠️ 不是 git 仓库：pi 对话没问题，但 archon 工作流（drain 等）在这里跑不了。_";
  return { ok: true, binding: fresh, text: `✅ 已绑到 **${fresh.project}**\n\n\`${cwd}\`${moved}${warn}\n\nsession \`${fresh.sessionId}\`` };
}

async function handlePickerAction(act: PickerAction, ev: any): Promise<void> {
  const chatId = String(ev.chat_id ?? "");
  const messageId = String(ev.message_id ?? "");
  // A card sent into a group topic must act on that topic's binding, not on the chat.
  const key = keyOfCard(messageId, chatId);
  const anchor = anchorOfMessage(messageId);
  const binding = state.bindings[key] ?? null;

  switch (act.kind) {
    case "help": {
      await reply(messageId, chatId, await helpText(binding));
      return;
    }
    case "deck": {
      // The deck stays where it is; whatever it launches arrives as its own card or message.
      if (act.name === "projects") {
        const sent = await sendCardJson(chatId, projectsCard(1, await codebases(), binding), { key });
        if (!sent) await sendChat(chatId, "项目卡没发出去，先 `/projects` 试试。");
      } else if (act.name === "skills") {
        const sent = await sendCardJson(chatId, skillsCard(1, "", binding), { key });
        if (!sent) await sendChat(chatId, "技能卡没发出去，先 `/skills` 试试。");
      } else if (act.name === "board") {
        let snap: BoardSnap | null = null;
        try {
          const snapRes = await boardRun(["--snapshot"], 90_000);
          snap = JSON.parse(snapRes.out.split("\n").pop() ?? "null");
        } catch {
          snap = null;
        }
        const sent = await sendCardJson(chatId, boardCard(snap, binding), { key });
        if (!sent) await reply(messageId, chatId, boardFallbackText(snap, binding));
      } else if (act.name === "sync") {
        if (!binding) await reply(messageId, chatId, "先点「📁 项目」挑一个项目，再同步它的票板。");
        else {
          await reply(messageId, chatId, `正在把 ${basename(binding.cwd)}/.scratch 同步到票板…`);
          startBoardSync(chatId, binding.cwd, { key }, "同步");
        }
      } else if (act.name === "status") {
        await handleMessage({
          sender_type: "user",
          sender_id: cfg.allowedSenders[0] ?? "cli",
          chat_type: "p2p",
          chat_id: chatId,
          message_id: `card_deck_status_${Date.now()}`,
          content: "/status",
        });
      } else if (act.name === "help") {
        await reply(messageId, chatId, await helpText(binding));
      }
      log({ level: "info", msg: "deck_action", key, name: act.name, chatId });
      return;
    }
    case "board": {
      if (!binding) {
        await reply(messageId, chatId, "这个会话还没绑项目，先点上面的「📁 项目」选一个。");
        return;
      }
      if (act.what === "show") {
        let snap: BoardSnap | null = null;
        try {
          const snapRes = await boardRun(["--snapshot"], 90_000);
          snap = JSON.parse(snapRes.out.split("\n").pop() ?? "null");
        } catch {
          snap = null;
        }
        const sent = await sendCardJson(chatId, boardCard(snap, binding), { anchor, key });
        log({ level: sent ? "info" : "warn", msg: "board_card", key, messageId: sent, ok: Boolean(snap) });
        if (!sent) await reply(messageId, chatId, boardFallbackText(snap, binding));
        return;
      }
      const res = await boardRun(["--sync-all", binding.cwd]);
      boardFp.set(binding.cwd, scratchFingerprint(binding.cwd));
      let snap: BoardSnap | null = null;
      try {
        const snapRes = await boardRun(["--snapshot"], 90_000);
        snap = JSON.parse(snapRes.out.split("\n").pop() ?? "null");
      } catch {
        snap = null;
      }
      const ok = await updateCardMessage(chatId, messageId, boardCard(snap, binding));
      log({ level: ok ? "info" : "warn", msg: "board_sync_card", key, ok, syncOk: res.ok, ms: res.ms });
      return;
    }
    case "skills": {
      const ok = await updateCardMessage(chatId, messageId, skillsCard(act.page, act.q, binding));
      log({ level: ok ? "info" : "warn", msg: "picker_skills", page: act.page, q: act.q.slice(0, 40), ok });
      return;
    }
    case "projects": {
      const ok = await updateCardMessage(chatId, messageId, projectsCard(act.page, await codebases(), binding));
      log({ level: ok ? "info" : "warn", msg: "picker_projects", page: act.page, ok });
      return;
    }
    case "bind": {
      const fresh = bindChat(key, chatId, { project: act.name || basename(act.cwd), cwd: act.cwd });
      const topic = topicOf(key);
      if (topic.threadId) state.bindings[key] = { ...fresh, threadId: topic.threadId, threadAnchor: topic.anchor };
      saveState();
      log({ level: "info", msg: "card_bind", key, chatId, project: fresh.project, cwd: fresh.cwd, inTopic: Boolean(topic.threadId) });
      const bound = state.bindings[key] ?? fresh;
      if (topic.threadId) {
        // In a topic the claim card becomes the topic's header (project + the buttons you reach for).
        await updateCardMessage(chatId, messageId, topicHeaderCard(bound, chatId));
        state.topicHeaders = state.topicHeaders ?? {};
        state.topicHeaders[key] = messageId;
        saveState();
      } else {
        await updateCardMessage(chatId, messageId, projectsCard(1, await codebases(), bound));
        await reply(messageId, chatId, `✅ 已切到 **${fresh.project}** · \`${fresh.cwd}\``);
      }
      // The message that opened the topic never ran — run it now, in this project.
      const pend = state.pending?.[key];
      if (pend && topic.threadId) {
        delete state.pending![key];
        saveState();
        log({ level: "info", msg: "pending_replayed", key, project: fresh.project, chars: pend.text.length });
        await handleMessage(
          { sender_type: "user", sender_id: cfg.allowedSenders[0] ?? "cli", chat_type: "group",
            chat_id: chatId, thread_id: topic.threadId, message_id: pend.messageId, content: pend.text },
          { label: `第一条（${fresh.project}）` },
        );
      }
      return;
    }
    case "sessions": {
      const ok = await updateCardMessage(chatId, messageId, sessionsCard(binding?.cwd ?? process.cwd(), binding?.sessionId ?? "", act.page));
      log({ level: ok ? "info" : "warn", msg: "picker_sessions", page: act.page, ok });
      return;
    }
    case "resume": {
      const text = await resumeSession(key, binding, act.id);
      if (binding) await updateCardMessage(chatId, messageId, sessionsCard(binding.cwd, state.bindings[chatId]?.sessionId ?? binding.sessionId, 1));
      await reply(messageId, chatId, text);
      return;
    }
    case "bindPath": {
      const out = await bindPathAction(chatId, chatId, act.path);
      if (out.ok && out.binding) await updateCardMessage(chatId, messageId, projectsCard(1, await codebases(), out.binding));
      await reply(messageId, chatId, out.text);
      return;
    }
    case "skill": {
      const text = `/skill:${act.name}${act.note ? ` ${act.note}` : ""}`;
      log({ level: "info", msg: "picker_skill_run", skill: act.name, note: act.note.slice(0, 60) });
      // Same pipeline as a typed message (same session/queue/progress), labelled so the single
      // progress message says which skill is running — no separate ack message.
      await handleMessage(
        {
          sender_type: "user",
          sender_id: cfg.allowedSenders[0] ?? "cli",
          // Carry the topic through, or the synthesized turn would resolve to the bare chat
          // (= "还没绑项目") and its progress message would start a brand-new topic.
          chat_type: anchor ? "group" : "p2p",
          chat_id: chatId,
          ...(anchor ? { thread_id: topicOf(key).threadId } : {}),
          message_id: `card_${messageId}`,
          content: text,
        },
        { label: `/skill:${act.name}${act.note ? ` ${act.note}` : ""}` },
      );
      return;
    }
  }
}

// ---------------------------------------------------------------- sessions & history (ticket 10)

const SESSION_ROOT = join(HOME, ".pi/agent/sessions");
const SESSION_PAGE = 6;

/** pi stores sessions per working directory: ~/.pi/agent/sessions/--<cwd with / → ->--/ */
function sessionDirFor(cwd: string): string {
  return join(SESSION_ROOT, `--${cwd.replace(/^\/+|\/+$/g, "").replace(/\//g, "-")}--`);
}

type SessionFile = {
  id: string;
  when: string;
  bytes: number;
  label: string;
  current: boolean;
  live: boolean;
};

function readHead(path: string, bytes = 128 * 1024): string {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

/** First real user message in the session file, as a readable label. */
function sessionLabel(head: string): string {
  for (const line of head.split("\n")) {
    if (!line.includes('"type":"message"')) continue;
    let d: any;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const msg = d?.message;
    if (msg?.role !== "user") continue;
    const parts = Array.isArray(msg.content) ? msg.content : [];
    const text = parts
      .filter((p: any) => p?.type === "text")
      .map((p: any) => String(p.text ?? ""))
      .join(" ");
    const clean = text.replace(/<skill[\s\S]*?<\/skill>/g, "").replace(/\s+/g, " ").trim();
    if (clean) return clean.slice(0, 56);
  }
  return "(没有用户消息)";
}

function sessionFiles(cwd: string, currentId: string): SessionFile[] {
  const dir = sessionDirFor(cwd);
  if (!existsSync(dir)) return [];
  const out: SessionFile[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".jsonl")) continue;
    const path = join(dir, f);
    let st: ReturnType<typeof statSync>;
    let head = "";
    try {
      st = statSync(path);
      head = readHead(path);
    } catch {
      continue;
    }
    let id = "";
    try {
      id = String(JSON.parse(head.split("\n")[0] ?? "{}")?.id ?? "");
    } catch {
      /* fall back to the file name */
    }
    if (!id) id = f.replace(/\.jsonl$/, "").split("_").slice(1).join("_");
    out.push({
      id,
      when: st.mtime.toISOString(),
      bytes: st.size,
      label: sessionLabel(head),
      current: id === currentId,
      // A file written seconds ago probably belongs to a live pi (terminal), don't fight over it.
      live: Date.now() - st.mtimeMs < 120_000,
    });
  }
  return out.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0));
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtSession(i: number, s: SessionFile): string {
  const kb = Math.round(s.bytes / 1024);
  return `${s.current ? "✅" : `\`${i}\``} ${fmtWhen(s.when)} · ${kb}KB${s.live ? " · ⚠️刚还在写" : ""} · ${s.label}`;
}

/** Which pi session this cwd uses. Remembered per directory so switching by name ≠ new context. */
function sessionForCwd(cwd: string, project: string): string {
  state.sessions = state.sessions ?? {};
  const remembered = state.sessions[cwd];
  if (remembered) return remembered;
  // Migrate: adopt whatever a binding for this directory was already using.
  const fromBinding = Object.values(state.bindings).find((b) => b.cwd === cwd)?.sessionId;
  const id = fromBinding ?? sessionIdFor(project);
  state.sessions[cwd] = id;
  saveState();
  return id;
}

async function resumeSession(key: string, binding: Binding | null, token: string): Promise<string> {
  if (!binding) return "先 `/use <项目>`，再挑会话。";
  const list = sessionFiles(binding.cwd, binding.sessionId);
  if (!list.length) return `\`${binding.cwd}\` 下还没有 pi 会话文件（这个项目还没聊过）。`;
  const t = token.trim();
  let pick: SessionFile | undefined;
  if (!t || t === "last") pick = list[0];
  else if (/^\d+$/.test(t)) pick = list[Number(t) - 1];
  else pick = list.find((s) => s.id === t) ?? list.find((s) => s.id.startsWith(t));
  if (!pick) return `没找到会话 \`${t}\`。/sessions 看列表（序号或完整 id 都行）。`;
  if (pick.id === binding.sessionId) return `现在用的就是它：\n\n${fmtSession(1, pick)}`;

  state.bindings[key] = { ...binding, sessionId: pick.id, updatedAt: new Date().toISOString() };
  state.sessions = state.sessions ?? {};
  state.sessions[key.includes(":") ? key : binding.cwd] = pick.id;
  if (!key.includes(":")) state.sessions[binding.cwd] = pick.id;
  saveState();
  dropRpc(key); // the resident process is pinned to the old session id
  log({ level: "info", msg: "session_resumed", key, project: binding.project, sessionId: pick.id, label: pick.label });
  const warn = pick.live ? "\n\n⚠️ 这个会话文件刚刚还在被写（可能有另一个 pi 在用），两个进程同时写会串。" : "";
  return `⏪ 已接回 **${pick.id}**\n\n${fmtWhen(pick.when)} · ${Math.round(pick.bytes / 1024)}KB · ${pick.label}${warn}\n\n下一条消息就接着这段上下文聊。`;
}

/** The Feishu chat's own history, cleaned up for re-feeding into pi. */
async function chatTranscript(chatId: string, limit: number): Promise<{ rows: string[]; skipped: number }> {
  const res = await lark(["im", "+chat-messages-list", "--chat-id", chatId, "--page-size", String(limit), "--as", "bot"]);
  let msgs: any[] = [];
  try {
    msgs = JSON.parse(res.stdout)?.data?.messages ?? [];
  } catch {
    /* leave empty */
  }
  const rows: string[] = [];
  let skipped = 0;
  for (const m of [...msgs].reverse()) {
    const content = String(m.content ?? "").trim();
    const noisy =
      !content ||
      /^⏳ /.test(content) ||
      /^\[(Invalid|nonsupport)/.test(content) ||
      m.msg_type === "interactive" ||
      m.deleted === true;
    if (noisy) {
      skipped += 1;
      continue;
    }
    const who = (m.sender?.sender_type === "app") ? "pi" : "我";
    const time = String(m.create_time ?? "").slice(-5);
    const body = content.length > 700 ? `${content.slice(0, 700)}…（截断）` : content;
    rows.push(`[${time}] ${who}: ${body}`);
  }
  return { rows, skipped };
}

function sessionsCard(cwd: string, currentId: string, page: number): unknown {
  const list = sessionFiles(cwd, currentId);
  const pages = Math.max(1, Math.ceil(list.length / SESSION_PAGE));
  const p = Math.min(Math.max(1, Math.round(page)), pages);
  const slice = list.slice((p - 1) * SESSION_PAGE, p * SESSION_PAGE);

  const rows = slice.map((s, i) => {
    const idx = (p - 1) * SESSION_PAGE + i + 1;
    return {
      tag: "column_set",
      flex_mode: "stretch",
      horizontal_spacing: "8px",
      columns: [
        {
          tag: "column",
          width: "weighted",
          weight: 5,
          vertical_align: "center",
          elements: [
            {
              tag: "markdown",
              text_size: "notation",
              content: `**${idx}. ${fmtWhen(s.when)} · ${Math.round(s.bytes / 1024)}KB**${s.current ? " · 当前" : ""}${s.live ? " · ⚠️刚还在写" : ""}\n<font color='grey'>${s.label}</font>`,
            },
          ],
        },
        {
          tag: "column",
          width: "weighted",
          weight: 2,
          vertical_align: "center",
          elements: [
            {
              tag: "button",
              size: "small",
              width: "fill",
              type: s.current ? "default" : "primary",
              disabled: s.current,
              text: { tag: "plain_text", content: s.current ? "在用" : "接回" },
              behaviors: [{ type: "callback", value: { resume: s.id } }],
            },
          ],
        },
      ],
    };
  });

  const elements: unknown[] = [
    {
      tag: "markdown",
      text_size: "notation",
      content: `\`${cwd}\` 下的 pi 会话（${list.length} 个，新的在上面）。**接回**＝把上下文切回那段对话，不重开。`,
    },
    ...(rows.length ? rows : [{ tag: "markdown", content: "（这个目录还没有会话文件）" }]),
    pagerRow(p, pages, (n) => ({ sessionsPage: n })),
  ];

  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: "🕘 历史会话" },
      subtitle: { tag: "plain_text", content: `${list.length} 个 · ${basename(cwd)}` },
      template: "turquoise",
      icon: { tag: "standard_icon", token: "minutes_colorful" },
    },
    body: { direction: "vertical", padding: "12px 12px 20px 12px", elements },
  };
}

/**
 * 单聊「🧭 控制台」卡片（A 方案）。
 * 飞书的输入栏菜单只在单聊有，而且要在开发后台配 + 发版；这张卡是同一个控制台的卡片版：
 * 常驻、可置顶，点它不消失（结果另发一条），所以点错了不用找回来。
 */
function deckCard(binding: Binding | null): unknown {
  const btn = (label: string, value: Record<string, unknown>) => ({
    tag: "button",
    text: { tag: "plain_text", content: label },
    type: "default",
    width: "fill",
    size: "small",
    behaviors: [{ type: "callback", value }],
  });
  const row = (a: unknown, b: unknown) => ({
    tag: "column_set",
    flex_mode: "none",
    horizontal_spacing: "8px",
    columns: [
      { tag: "column", width: "weighted", weight: 1, elements: [a] },
      { tag: "column", width: "weighted", weight: 1, elements: [b] },
    ],
  });
  const info = binding
    ? `**${binding.project}**\n<font color='grey'>${binding.cwd}</font>`
    : "<font color='grey'>还没绑项目 —— 点「📁 项目」挑一个，之后在这里说的每句话都在那个项目里跑。</font>";
  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: "🧭 控制台" },
      subtitle: { tag: "plain_text", content: binding ? "单聊＝控制台 · 群里每个话题＝一个项目" : "先挑一个项目" },
      template: binding ? "blue" : "orange",
      icon: { tag: "standard_icon", token: "common_colorful" },
    },
    body: {
      direction: "vertical",
      padding: "12px 12px 20px 12px",
      elements: [
        { tag: "markdown", text_size: "notation", content: info },
        row(btn("📁 项目", { deck: "projects" }), btn("🧩 技能", { deck: "skills" })),
        row(btn("📋 看板", { deck: "board" }), btn("🔄 同步票板", { deck: "sync" })),
        row(btn("📊 状态", { deck: "status" }), btn("❓ 帮助", { deck: "help" })),
      ],
    },
  };
}

// ---------------------------------------------------------------- input-box menu (ticket 09)

/**
 * The bot's custom menu (开发者后台 → 机器人 → 机器人自定义菜单) pins these items above the
 * input box, p2p chats only. Every item must be configured with action 「回传事件」 and the
 * event_key below; clicking then arrives as an application.bot.menu_v6 event (no chat message).
 * `bun bridge.ts --menu-plan` prints this table for the console.
 */
const MENU_PLAN: { group: string; items: { label: string; key: string; hint: string }[] }[] = [
  {
    group: "🧩 技能",
    items: [
      { label: "选技能（卡片）", key: "skills", hint: "技能选择卡：可搜、可翻页，点一下就等于手打 /skill:<名字>" },
      { label: "grill-me", key: "skill_grill-me", hint: "直接开 grill（等于 /skill:grill-me）" },
      { label: "grill-with-docs", key: "skill_grill-with-docs", hint: "有工作目录时的 grill（会写 CONTEXT.md/ADR）" },
      { label: "to-spec", key: "skill_to-spec", hint: "把结论落成 spec 文档" },
      { label: "to-tickets", key: "skill_to-tickets", hint: "把 spec 拆成票" },
    ],
  },
  {
    group: "📁 项目",
    items: [
      { label: "选项目（卡片）", key: "projects", hint: "项目选择卡：点一下切换，或粘绝对路径绑定" },
      { label: "新建会话", key: "new", hint: "等于 /new（当前项目开一个干净上下文）" },
      { label: "项目状态", key: "status", hint: "等于 /status" },
      { label: "最近 run", key: "runs", hint: "等于 /runs" },
      { label: "盯最近 run", key: "watch_last", hint: "等于 /watch last" },
    ],
  },
  {
    group: "⚡ 干活",
    items: [
      { label: "implement", key: "skill_implement", hint: "等于 /skill:implement" },
      { label: "drain", key: "skill_drain", hint: "等于 /skill:drain" },
      { label: "代码审查", key: "skill_code-review", hint: "等于 /skill:code-review" },
      { label: "在盯的 run", key: "watching", hint: "等于 /watching" },
      { label: "帮助", key: "help", hint: "等于 /help" },
    ],
  },
];

const MENU_TEXTS: Record<string, string> = {
  new: "/new",
  status: "/status",
  runs: "/runs",
  watching: "/watching",
  help: "/help",
  watch_last: "/watch last",
};

function menuPlanText(): string {
  const lines = [
    "机器人自定义菜单（开发者后台 → 应用能力 → 机器人 → 机器人自定义菜单）",
    "每个菜单项的动作都选「回传事件」，事件 key 填下面第二列：",
    "",
  ];
  for (const g of MENU_PLAN) {
    lines.push(`## ${g.group}`);
    for (const it of g.items) lines.push(`- 菜单名称：${it.label}\n  事件 key：\`${it.key}\`\n  ${it.hint}`);
    lines.push("");
  }
  lines.push("配好后：创建应用版本并发布（发布后约 5 分钟生效）。");
  return lines.join("\n");
}

/** p2p-only feature, so a click belongs to the operator's 1:1 chat with the bot. */
function menuChatId(): string | null {
  if (cfg.consoleChat) return cfg.consoleChat;
  const chats = cfg.allowedChats.length ? cfg.allowedChats : Object.keys(state.bindings);
  return chats[0] ?? null;
}

async function handleMenuEvent(ev: any): Promise<void> {
  const key = String(ev.event_key ?? "");
  const operator = String(ev.operator_open_id ?? ev.operator_id ?? "");
  const chatId = menuChatId();
  log({ level: "info", msg: "menu_click", key, operator, chatId, eventId: ev.event_id });
  if (!key) return;
  if (cfg.allowedSenders.length > 0 && operator && !cfg.allowedSenders.includes(operator)) {
    log({ level: "warn", msg: "menu_operator_rejected", operator, key });
    return;
  }
  if (!chatId) {
    log({ level: "warn", msg: "menu_no_chat", key });
    return;
  }
  if (!MENU_PLAN.some((g) => g.items.some((i) => i.key === key))) {
    log({ level: "warn", msg: "menu_key_unknown", key });
  }
  const binding = state.bindings[chatId] ?? null;

  if (key === "skills") {
    const sent = await sendCardJson(chatId, skillsCard(1, "", binding), { key: chatId });
    if (!sent) await sendChat(chatId, "技能卡没发出去，先 `/skills` 试试。");
    return;
  }
  if (key === "projects") {
    const sent = await sendCardJson(chatId, projectsCard(1, await codebases(), binding), { key: chatId });
    if (!sent) await sendChat(chatId, "项目卡没发出去，先 `/projects` 试试。");
    return;
  }
  if (key.startsWith("skill_")) {
    const name = key.slice("skill_".length);
    await handleMessage(
      {
        sender_type: "user",
        sender_id: operator || cfg.allowedSenders[0] || "cli",
        chat_type: "p2p",
        chat_id: chatId,
        message_id: `menu_${key}_${Date.now()}`,
        content: `/skill:${name}`,
      },
      { label: `/skill:${name}` },
    );
    return;
  }
  const text = MENU_TEXTS[key];
  if (!text) return;
  const [cmd, ...rest] = text.slice(1).split(" ");
  const out = await handleCommand(`/${cmd}`, rest.join(" "), chatId, binding);
  if (out === null) return;
  if (typeof out === "string") {
    await sendChat(chatId, out);
    return;
  }
  const sent = await sendCardJson(chatId, out.card);
  if (!sent && out.fallback) await sendChat(chatId, out.fallback);
}

// ---------------------------------------------------------------- agent questions (ticket 06)

const DIALOG_ICON: Record<string, string> = {
  select: "vote_colorful",
  confirm: "approval_colorful",
  input: "file-form_colorful",
  editor: "file-form_colorful",
};

const DIALOG_LABEL: Record<string, string> = {
  select: "选一个",
  confirm: "要你确认",
  input: "要你填一句",
  editor: "要你写一段",
};

/**
 * `ctx.ui.select/confirm/input/editor` in the agent becomes a card here, and the
 * answer goes back as `extension_ui_response` with the request id.
 */
async function handleExtensionDialog(key: string, binding: Binding, ev: any): Promise<void> {
  const method = String(ev.method);
  const requestId = String(ev.id);
  const turn = turnByKey.get(key);
  const chatId = turn?.chatId ?? bindingChatId(binding, key);
  const anchor = topicOf(key).anchor;
  if (!chatId) {
    log({ level: "warn", msg: "ui_no_chat", requestId, method });
    return;
  }

  const options: string[] = method === "select" ? (Array.isArray(ev.options) ? ev.options.map(String) : []) : [];
  const timeoutMs = typeof ev.timeout === "number" ? ev.timeout : undefined;
  const bodyText = [String(ev.message ?? ""), ev.placeholder ? `_${String(ev.placeholder)}_` : ""].filter(Boolean).join("\n\n");

  const elements: any[] = [];
  if (ev.title) elements.push({ tag: "markdown", text_size: "body", content: `**${String(ev.title)}**` });
  if (bodyText) elements.push({ tag: "markdown", text_size: "body", content: bodyText.slice(0, 1500) });
  if (timeoutMs) {
    elements.push({
      tag: "markdown",
      text_size: "caption",
      content: `_${Math.round(timeoutMs / 1000)} 秒不回答的话，pi 会自己用默认值继续。_`,
    });
  }

  if (method === "confirm") {
    elements.push({
      tag: "column_set",
      flex_mode: "none",
      horizontal_spacing: "8px",
      columns: [
        {
          tag: "column",
          width: "weighted",
          weight: 1,
          elements: [{ tag: "button", text: { tag: "plain_text", content: "是" }, type: "primary_filled", width: "fill", name: "ui_yes", behaviors: [{ type: "callback", value: { ui: "yes" } }] }],
        },
        {
          tag: "column",
          width: "weighted",
          weight: 1,
          elements: [{ tag: "button", text: { tag: "plain_text", content: "否" }, type: "default", width: "fill", name: "ui_no", behaviors: [{ type: "callback", value: { ui: "no" } }] }],
        },
      ],
    });
  } else if (method === "select") {
    const shown = options.slice(0, 6);
    elements.push({
      tag: "column_set",
      flex_mode: "flow",
      horizontal_spacing: "8px",
      columns: shown.map((opt, i) => ({
        tag: "column",
        width: "weighted",
        weight: 1,
        elements: [
          {
            tag: "button",
            text: { tag: "plain_text", content: String(opt).slice(0, 40) },
            type: i === 0 ? "primary_filled" : "default",
            width: "fill",
            name: `ui_opt_${i}`,
            behaviors: [{ type: "callback", value: { ui: String(opt) } }],
          },
        ],
      })),
    });
    if (options.length > shown.length) {
      elements.push({ tag: "markdown", text_size: "caption", content: `_（选项太多，只显示了前 ${shown.length} 个；要选其它的就回消息说明。）_` });
    }
  } else {
    elements.push({
      tag: "form",
      name: "ui_form",
      elements: [
        {
          tag: "input",
          name: "value",
          input_type: method === "editor" ? "multiline_text" : "text",
          rows: 4,
          max_length: 1000,
          width: "fill",
          ...(ev.placeholder ? { placeholder: { tag: "plain_text", content: String(ev.placeholder).slice(0, 100) } } : {}),
          ...(ev.defaultValue ? { default_value: String(ev.defaultValue) } : {}),
        },
        { tag: "button", text: { tag: "plain_text", content: "提交" }, type: "primary_filled", width: "fill", name: "ui_submit", form_action_type: "submit" },
      ],
    });
  }

  const card = {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: DIALOG_LABEL[method] ?? "pi 在问你" },
      subtitle: { tag: "plain_text", content: `${binding.project} · ${method}` },
      template: method === "confirm" ? "orange" : "blue",
      icon: { tag: "standard_icon", token: DIALOG_ICON[method] ?? "ai-common_colorful" },
    },
    body: { direction: "vertical", padding: "12px 12px 20px 12px", vertical_spacing: "8px", elements },
  };

  const client = rpcByKey.get(key);
  const live = client?.ready ?? false;
  const messageId = await sendCardJson(chatId, card, { anchor, key });
  if (!messageId) return;

  if (!live) {
    // pi only starts reading stdin once session startup finished, so a question asked during
    // startup cannot be answered remotely — the answer would sit unread. Say so, don't pretend.
    log({ level: "warn", msg: "ui_card_startup_unanswerable", requestId, method });
    await updateCardMessage(chatId, messageId, noticeCard(
      "⚠️ 启动期提问（答不了）",
      `${String(ev.title ?? method)} —— 这个提问发生在 pi 会话启动阶段，此时 pi 还没开始读它的输入流，` +
        `所以任何回答都送不进去，只能等它超时/用默认值继续。\n\n` +
        `_桥会给 pi 传 \`--approve\`，正常情况下不会出现这类询问。_`,
      method,
      "orange",
    ));
    return;
  }

  state.ui = state.ui ?? {};
  state.ui[messageId] = {
    key,
    requestId,
    method,
    cwd: binding.cwd,
    chatId,
    ...(options.length ? { options } : {}),
    created: new Date().toISOString(),
    ...(timeoutMs ? { timeoutMs } : {}),
  };
  saveState();
  log({ level: "info", msg: "ui_card_sent", requestId, method, messageId, timeoutMs });

  if (timeoutMs) {
    setTimeout(() => void expireUiCard(messageId), timeoutMs + 5000);
  }
}

/** pi resolved it on its own (timeout) — mark the card so nobody thinks it is still waiting. */
async function expireUiCard(messageId: string): Promise<void> {
  const rec = state.ui?.[messageId];
  if (!rec || rec.answered) return;
  rec.answered = true;
  saveState();
  await updateCardMessage(rec.chatId, messageId, noticeCard("⏰ 超时", "pi 用默认值继续跑了。", rec.method, "orange"));
  log({ level: "info", msg: "ui_card_expired", messageId, requestId: rec.requestId });
}

/** Minimal terminal-state card for a dialog we are done with. */
function noticeCard(title: string, body: string, method: string, template: string): unknown {
  return {
    schema: "2.0",
    config: { update_multi: true, width_mode: "default" },
    header: {
      title: { tag: "plain_text", content: title },
      subtitle: { tag: "plain_text", content: `pi · ${method}` },
      template,
      icon: { tag: "standard_icon", token: DIALOG_ICON[method] ?? "ai-common_colorful" },
    },
    body: {
      direction: "vertical",
      padding: "12px 12px 20px 12px",
      elements: [{ tag: "markdown", text_size: "body", content: body }],
    },
  };
}

/** Answer a dialog card: the value goes back into the RPC process that asked. */
async function answerUiCard(messageId: string, rec: UiRequest, payload: Record<string, unknown>, echo: string): Promise<string> {
  const client = rpcByKey.get(rec.key ?? "") ?? rpcByCwdFallback(rec.cwd);
  if (!client) {
    return `这张卡对应的问题来自 \`${rec.cwd}\`，但那个项目现在没有常驻 pi 进程了，答不了（pi 那边会用默认值）。`;
  }
  await client.answerExtensionUi(rec.requestId, payload);
  rec.answered = true;
  saveState();
  await updateCardMessage(rec.chatId, messageId, noticeCard("✅ 已回答", `${echo} —— 已回填给 pi。`, rec.method, "green"));
  log({ level: "info", msg: "ui_card_answered", messageId, requestId: rec.requestId, echo });
  return `✅ 已回答 pi 的 ${rec.method}：${echo}`;
}

// ---------------------------------------------------------------- run watcher (ticket 05)

const TERMINAL = new Set(["completed", "failed", "cancelled", "canceled"]);
let pollInFlight = false;

/** Somewhere the archon CLI will accept: a watched run's repo, else any registered project. */
/** Reverse lookup: which chat is this binding driven from? */
function bindingChatId(binding: Binding, key?: string): string | null {
  if (key && key.includes(":")) return key.split(":")[0];
  for (const [key, b] of Object.entries(state.bindings ?? {})) {
    if (b.cwd === binding.cwd && b.sessionId === binding.sessionId) return key.split(":")[0] ?? key;
  }
  return null;
}

async function anyRepoCwd(): Promise<string> {
  const watching = trackedRuns()[0]?.cwd;
  if (watching) return watching;
  for (const c of await codebases(true)) {
    if (!c.cwd.startsWith("/tmp/") && existsSync(c.cwd)) return c.cwd;
  }
  return DIR;
}

async function archonGet(cwd: string, runId: string): Promise<any | null> {
  // `archon workflow get` refuses to run outside a git repository → always pass --cwd.
  const res = await run(["archon", "--cwd", cwd, "workflow", "get", runId, "--json"], { cwd, timeoutMs: 60_000 });
  if (res.code !== 0) {
    log({ level: "warn", msg: "archon_get_failed", runId, cwd, code: res.code, err: (res.stderr || res.stdout).slice(0, 200) });
    return null;
  }
  const trimmed = res.stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Older builds wrap the object; be forgiving.
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function trackedRuns(): WatchedRun[] {
  return Object.values(state.runs ?? {});
}

async function watchRun(
  runId: string,
  cwd: string,
  chatId: string,
  extra: { workflow?: string; userMessage?: string; key?: string } = {},
): Promise<WatchedRun> {
  state.runs = state.runs ?? {};
  const existing = state.runs[runId];
  if (existing) {
    existing.chatId = chatId;
    existing.cwd = cwd;
    if (extra.key) existing.key = extra.key;
    saveState();
    return existing;
  }
  const rec: WatchedRun = {
    runId,
    cwd,
    chatId,
    ...(extra.key ? { key: extra.key } : {}),
    workflow: extra.workflow ?? "run",
    status: "unknown",
    created: new Date().toISOString(),
  };
  if (extra.userMessage) rec.userMessage = extra.userMessage;
  state.runs[runId] = rec;
  saveState();
  log({ level: "info", msg: "watch_added", runId, cwd, chatId });
  return rec;
}

/** Where a watched run's notifications go (inside its topic, when it has one). */
function watcherCtx(rec: WatchedRun): { anchor?: string; key?: string } {
  const k = rec.key;
  return k ? { anchor: topicOf(k).anchor, key: k } : {};
}

function unwatchRun(runId: string): boolean {
  if (!state.runs?.[runId]) return false;
  delete state.runs[runId];
  saveState();
  return true;
}

/** Pull the gate's own wording out of the run's metadata — never a summary of it. */
function gateQuestion(runObj: any): string {
  const md = runObj?.metadata ?? {};
  const approval = md.approval ?? md.pending_gate ?? null;
  const bits: string[] = [];
  if (approval?.message) bits.push(String(approval.message));
  if (approval?.prompt) bits.push(String(approval.prompt));
  if (md.current_step || md.currentStep) bits.push(`_节点：${md.current_step ?? md.currentStep}_`);
  if (!bits.length && runObj?.user_message) bits.push(String(runObj.user_message).slice(0, 800));
  return bits.length ? bits.join("\n\n") : "run 停下来等你决定。";
}

async function pollRuns(): Promise<void> {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    for (const rec of trackedRuns()) {
      const obj = await archonGet(rec.cwd, rec.runId);
      if (!obj) continue;

      const status = String(obj.status ?? "unknown");
      const outcome = obj.outcome ?? null;
      const changed = status !== rec.status;
      rec.status = status;
      if (outcome) rec.outcome = String(outcome);
      if (obj.workflow_name) rec.workflow = String(obj.workflow_name);
      if (obj.user_message) rec.userMessage = String(obj.user_message);

      if (!changed && rec.notifiedStatus === status) continue;

      if (status === "paused") {
        rec.notifiedStatus = status;
        const question = gateQuestion(obj);
        const id = await sendApprovalCard(
          rec.chatId,
          { runId: rec.runId, cwd: rec.cwd, workflow: rec.workflow, question },
          watcherCtx(rec),
        );
        if (!id) await sendChat(rec.chatId, `⏸ run \`${rec.runId.slice(0, 8)}\` 停在门上了（要你决定），但卡片没发出去：${question.slice(0, 400)}`, watcherCtx(rec));
      } else if (TERMINAL.has(status)) {
        rec.notifiedStatus = status;
        const icon = status === "completed" ? "✅" : status === "cancelled" ? "🚫" : "❌";
        const lines = [
          `${icon} **${rec.workflow}** · \`${rec.runId.slice(0, 8)}\` · ${status}${outcome ? ` (${outcome})` : ""}`,
        ];
        if (rec.userMessage) lines.push("", `> ${String(rec.userMessage).slice(0, 300)}`);
        if (obj.output_root) lines.push("", `产物根目录：\`${obj.output_root}\``);
        if (obj.working_path) lines.push(`工作目录：\`${obj.working_path}\``);
        await sendChat(rec.chatId, lines.join("\n"), watcherCtx(rec));
        unwatchRun(rec.runId);
        // The run's own report may have rewritten .scratch; force a mirror so the board is current.
        void maybeSyncBoard(rec.cwd, { force: true, why: "run_terminal" });
      } else if (changed && !rec.announcedStart && cfg.announceRunStart) {
        rec.announcedStart = true;
        rec.notifiedStatus = status;
        await sendChat(rec.chatId, `▶️ **${rec.workflow}** · \`${rec.runId.slice(0, 8)}\` 开始跑了（${rec.cwd}）`, watcherCtx(rec));
      } else {
        rec.notifiedStatus = status;
      }
      saveState();
    }
  } catch (err) {
    log({ level: "error", msg: "poll_failed", detail: String((err as Error).message) });
  } finally {
    pollInFlight = false;
  }
}

/** After a pi turn, pick up any run the agent just launched in this project. */
async function discoverRuns(binding: Binding, chatId: string, sinceMs: number, key?: string): Promise<number> {
  const res = await run(["archon", "workflow", "runs", "--limit", "20", "--json"], { cwd: binding.cwd, timeoutMs: 60_000 });
  if (res.code !== 0) return 0;
  let parsed: any;
  try {
    parsed = JSON.parse(res.stdout.trim());
  } catch {
    return 0;
  }
  const list: any[] = parsed?.runs ?? parsed?.data?.runs ?? [];
  let added = 0;
  for (const r of list) {
    const id = String(r.id ?? "");
    if (!id || state.runs?.[id]) continue;
    const started = Date.parse(String(r.started_at ?? r.created_at ?? "")) || 0;
    if (started && started < sinceMs - 60_000) continue; // not from this turn
    const path = String(r.working_path ?? "");
    const mine = path === binding.cwd || path.startsWith(binding.cwd + "/") ||
      (!path && String(r.codebase_id ?? "") === String(binding.codebaseId ?? ""));
    if (!mine && list.length > 1) continue;
    await watchRun(id, binding.cwd, chatId, { workflow: String(r.workflow_name ?? "run"), userMessage: String(r.user_message ?? ""), key });
    added++;
  }
  return added;
}

function startWatcher(): void {
  const every = cfg.watchIntervalMs ?? 15000;
  setInterval(() => void pollRuns(), every);
  log({ level: "info", msg: "watcher_started", everyMs: every, tracking: trackedRuns().length });
}

// ---------------------------------------------------------------- check mode

async function check() {
  const results: string[] = [];
  const push = (name: string, ok: boolean, detail: string) => results.push(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(28)} ${detail}`);

  const auth = await lark(["auth", "status"]);
  push("lark-cli auth", auth.code === 0 && /"bot"[\s\S]{0,80}"status": "ready"/.test(auth.stdout), auth.code === 0 ? "bot ready" : auth.stderr.trim().slice(0, 80));

  const which = await run(["which", "pi"]);
  push("pi on PATH", which.code === 0, which.stdout.trim());

  const cb = await codebases();
  push("archon codebases", cb.length > 0, `${cb.length} registered: ${cb.slice(0, 6).map((c) => c.name).join(", ")}`);

  const def = cfg.defaultProject ? await resolveProject(cfg.defaultProject) : null;
  push("defaultProject", Boolean(def), def ? `${def.project} → ${def.cwd}` : `"${cfg.defaultProject}" not resolvable`);
  push("allowedSenders", cfg.allowedSenders.length > 0, cfg.allowedSenders.join(", ") || "EMPTY — every sender would be rejected");

  // Can the event stream actually come up? (bounded probe; does not consume real events for long)
  const probe = spawn(["lark-cli", "event", "consume", "card.action.trigger", "--as", "bot", "--max-events", "1", "--timeout", "8s"], {
    stdout: "ignore", stderr: "pipe",
  });
  const probeErr = await new Response(probe.stderr).text();
  await probe.exited;
  const ready = probeErr.includes("[event] ready");
  push("event consume probe", ready, ready ? "bus connected" : probeErr.trim().split("\n").slice(-2).join(" | ").slice(0, 160));

  console.log(results.join("\n"));
  console.log("");
  console.log(existsSync(CONFIG_PATH) ? `config: ${CONFIG_PATH}` : `config: (missing — using defaults) ${CONFIG_PATH}`);
  console.log(`state:  ${STATE_PATH}`);
  console.log(`log:    ${LOG_PATH}`);
}

// ---------------------------------------------------------------- main

if (process.argv.includes("--simulate")) {
  // bun bridge.ts --simulate "<chatKey>" "<text>"  → runs the real pipeline, sends nothing
  const idx = process.argv.indexOf("--simulate");
  const chatKey = process.argv[idx + 1] ?? "sim-chat";
  const text = process.argv.slice(idx + 2).join(" ") || "ping";
  const sent: string[] = [];
  replyOverride = async (_messageId, _chatId, body) => {
    sent.push(body);
    console.log("--> " + body.replace(/\n/g, "\n").slice(0, 400));
  };
  await handleMessage({
    sender_type: "user",
    sender_id: cfg.allowedSenders[0] ?? "sim",
    chat_type: "p2p",
    chat_id: chatKey,
    message_id: "om_simulate",
    content: text,
  });
  console.log(JSON.stringify({ simulated: true, chatKey, replies: sent.length }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--ask")) {
  // bun bridge.ts --ask <chatKey> <text>  → real pipeline, real sends (diagnostics for a human)
  const idx = process.argv.indexOf("--ask");
  const chatKey = process.argv[idx + 1] ?? cfg.allowedChats[0];
  const text = process.argv.slice(idx + 2).join(" ");
  await handleMessage({
    sender_type: "user",
    sender_id: cfg.allowedSenders[0] ?? "cli",
    chat_type: "p2p",
    chat_id: chatKey,
    message_id: "om_cli_ask",
    content: text,
  });
  console.log(JSON.stringify({ ok: true, asked: text.slice(0, 80) }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--group-selftest")) {
  // bun bridge.ts --group-selftest <chatId> <anchorMessageId> [threadId] [text]
  // Feeds a synthetic topic message through the REAL pipeline (real sends into that topic),
  // so "does everything stay inside the topic" can be checked without waiting for a human.
  const i = process.argv.indexOf("--group-selftest");
  const chatId = process.argv[i + 1];
  const anchor = process.argv[i + 2];
  const threadId = process.argv[i + 3] ?? `omt_selftest_${Date.now().toString(36)}`;
  const text = process.argv[i + 4] ?? "/help";
  log({ level: "info", msg: "group_selftest", chatId, anchor, threadId, text });
  await handleMessage({
    event_id: `selftest_${Date.now()}`,
    chat_id: chatId,
    chat_type: "group",
    thread_id: threadId,
    message_id: anchor,
    sender_type: "user",
    sender_id: cfg.allowedSenders[0] ?? "",
    content: text,
    create_time: String(Date.now()),
  });
  await Bun.sleep(25000);
  console.log(JSON.stringify({ ok: true, chatId, threadId, text, topic: state.topics?.[`${chatId}:${threadId}`] ?? null }));
  process.exit(0);
}

if (process.argv.includes("--recap-dry")) {
  // bun bridge.ts --recap-dry <chatId> [n] → print exactly what /recap would feed pi
  const i = process.argv.indexOf("--recap-dry");
  const chatId = process.argv[i + 1] ?? cfg.allowedChats[0];
  const n = Number(process.argv[i + 2] ?? "24");
  const { rows, skipped } = await chatTranscript(chatId, n);
  console.log(`rows=${rows.length} skipped=${skipped}`);
  console.log(rows.join("\n"));
  process.exit(0);
}

if (process.argv.includes("--menu-fire")) {
  // bun bridge.ts --menu-fire <event_key> → what a menu tap does once the console is configured
  const i = process.argv.indexOf("--menu-fire");
  const key = process.argv[i + 1] ?? "help";
  await handleMenuEvent({ event_key: key, operator_open_id: cfg.allowedSenders[0] ?? "ou_cli", event_id: `cli-${Date.now()}` });
  await Bun.sleep(6000);
  console.log(JSON.stringify({ ok: true, fired: key }));
  process.exit(0);
}

if (process.argv.includes("--deck")) {
  // bun bridge.ts --deck [chatId]: post the p2p console card and pin it
  const i = process.argv.indexOf("--deck");
  const chatId = process.argv[i + 1] ?? menuChatId() ?? "";
  const binding = state.bindings[chatId] ?? null;
  const messageId = await sendCardJson(chatId, deckCard(binding), { key: chatId });
  let pinned = false;
  if (messageId) {
    const res = await lark(["api", "POST", "/open-apis/im/v1/pins", "--data", JSON.stringify({ message_id: messageId }), "--as", "bot"]);
    pinned = /"ok"\s*:\s*true/.test(res.stdout);
  }
  console.log(JSON.stringify({ ok: Boolean(messageId), chatId, messageId, pinned, project: binding?.project ?? null }, null, 2));
  process.exit(messageId ? 0 : 1);
}

if (process.argv.includes("--menu-selftest")) {
  // bun bridge.ts --menu-selftest <event_key>: synthesize an input-bar menu click
  const i = process.argv.indexOf("--menu-selftest");
  const key = process.argv[i + 1];
  await handleMenuEvent({
    event_id: `selftest_${Date.now()}`,
    event_key: key,
    operator_open_id: cfg.allowedSenders[0] ?? "",
    timestamp: String(Date.now()),
  });
  await Bun.sleep(20000);
  console.log(JSON.stringify({ ok: true, key, chatId: menuChatId() }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--menu-plan")) {
  console.log(menuPlanText());
  process.exit(0);
}

if (process.argv.includes("--click")) {
  // bun bridge.ts --click <messageId> <chatId> <actionName> ['{"form":"json"}'] ['{"value":...}']
  const i = process.argv.indexOf("--click");
  const [, messageId, chatId, actionName, formJson, valueJson] = process.argv.slice(i);
  await handleCardAction({
    type: "card.action.trigger",
    event_id: `click-${Date.now()}`,
    operator_id: cfg.allowedSenders[0] ?? "ou_cli",
    message_id: messageId,
    chat_id: chatId,
    token: "",
    action_tag: "button",
    action_name: actionName ?? "",
    form_value: formJson ?? "",
    action_value: valueJson ?? "",
  });
  // A click can kick off real work (e.g. a card-launched turn); give it room before we exit.
  await Bun.sleep(Number(process.env.PI_BRIDGE_CLICK_WAIT_MS ?? 1500));
  console.log(JSON.stringify({ ok: true, actionName }));
  process.exit(0);
}

if (process.argv.includes("--dump-card")) {
  // bun bridge.ts --dump-card skills|projects [q] → print the card JSON (debug)
  const idx = process.argv.indexOf("--dump-card");
  const which = process.argv[idx + 1] ?? "skills";
  const q = process.argv[idx + 2] ?? "";
  const binding = state.bindings[cfg.allowedChats[0] ?? ""] ?? null;
  const card = which === "projects" ? projectsCard(1, await codebases(), binding) : skillsCard(1, q, binding);
  console.log(JSON.stringify(card));
  process.exit(0);
}

if (process.argv.includes("--card-projects") || process.argv.includes("--card-skills")) {
  const skills = process.argv.includes("--card-skills");
  const idx = process.argv.indexOf(skills ? "--card-skills" : "--card-projects");
  const chatId = process.argv[idx + 1] ?? cfg.allowedChats[0];
  const q = skills ? (process.argv[idx + 2] ?? "") : "";
  const binding = state.bindings[chatId] ?? null;
  const card = skills ? skillsCard(1, q, binding) : projectsCard(1, await codebases(), binding);
  const id = await sendCardJson(chatId, card);
  console.log(JSON.stringify({ ok: Boolean(id), card: skills ? "skills" : "projects", messageId: id }));
  process.exit(id ? 0 : 1);
}

if (process.argv.includes("--picker-selftest")) {
  // Send both pickers for real, then feed handleCardAction the exact events Feishu sends.
  const idx = process.argv.indexOf("--picker-selftest");
  const chatId = process.argv[idx + 1] ?? cfg.allowedChats[0];
  const click = async (messageId: string, p: { name?: string; value?: unknown; form?: Record<string, unknown> }) => {
    await handleCardAction({
      type: "card.action.trigger",
      event_id: `selftest-${Date.now()}`,
      operator_id: cfg.allowedSenders[0] ?? "ou_selftest",
      message_id: messageId,
      chat_id: chatId,
      token: "",
      action_tag: "button",
      action_name: p.name ?? "selftest",
      action_value: p.value ? JSON.stringify(p.value) : "",
      form_value: p.form ? JSON.stringify(p.form) : "",
    });
    await Bun.sleep(1000);
  };

  const binding = state.bindings[chatId] ?? null;
  const pCard = await sendCardJson(chatId, projectsCard(1, await codebases(), binding));
  console.log(JSON.stringify({ step: "projects_card", messageId: pCard, bound: binding?.cwd ?? null }));
  if (pCard) {
    await click(pCard, { name: "add_path", form: { path: "/no/such/dir" } });
    await click(pCard, { name: "add_path", form: { path: binding?.cwd ?? "/tmp/pi-uiprobe" } });
    await click(pCard, { value: { projectsPage: 2 } });
  }

  const sCard = await sendCardJson(chatId, skillsCard(1, "", binding));
  console.log(JSON.stringify({ step: "skills_card", messageId: sCard }));
  if (sCard) {
    await click(sCard, { value: { skillsPage: 2, q: "" } });
    await click(sCard, { name: "skill_search", form: { q: "grill" } });
    await click(sCard, { name: "sk_caveman", form: { q: "按钮自测" } });
  }
  await Bun.sleep(12_000);
  console.log(JSON.stringify({ ok: true, step: "done" }));
  process.exit(0);
}

if (process.argv.includes("--ui-selftest")) {
  // bun bridge.ts --ui-selftest <chatId> [answerLabel]
  // Drives the real dialog path: spawn pi in /tmp/pi-uiprobe → the probe asks → card goes out →
  // a synthetic click (same shape Feishu sends) is fed to handleCardAction → value must reach pi.
  const idx = process.argv.indexOf("--ui-selftest");
  const chatId = process.argv[idx + 1] ?? cfg.allowedChats[0];
  const answer = process.argv[idx + 2] ?? "B 选项";
  const binding: Binding = {
    project: "pi-uiprobe",
    cwd: "/tmp/pi-uiprobe",
    sessionId: `ui-selftest-${Date.now().toString(36)}`,
    updatedAt: new Date().toISOString(),
  };
  state.bindings[chatId] = binding; // keyed by chat, exactly like a real binding
  saveState();

  const client = rpcFor(chatId, binding);
  const answered: Record<string, string> = {};
  void client.say("请用 bash 工具执行：echo probe");

  // Answer up to three questions in a row, using the right shape for each method.
  for (let round = 0; round < 3; round++) {
    const deadline = Date.now() + 60_000;
    let messageId: string | null = null;
    while (Date.now() < deadline && !messageId) {
      await Bun.sleep(400);
      messageId = Object.keys(state.ui ?? {}).find((id) => state.ui![id].cwd === binding.cwd && !state.ui![id].answered) ?? null;
    }
    if (!messageId) break;
    const rec = state.ui![messageId];
    const value = rec.method === "confirm" ? "yes" : rec.method === "select" ? answer : "selftest-value";
    console.log(JSON.stringify({ ok: true, step: "card_sent", round, messageId, method: rec.method, requestId: rec.requestId }));

    // Exactly what Feishu delivers for a `behaviors: callback` button: action_name is empty,
    // the developer value rides in action_value as a JSON string.
    await handleCardAction({
      type: "card.action.trigger",
      event_id: `selftest-${round}`,
      operator_id: cfg.allowedSenders[0] ?? "ou_selftest",
      message_id: messageId,
      chat_id: chatId,
      token: "",
      action_tag: "button",
      action_name: "",
      action_value: JSON.stringify({ ui: value }),
    });
    await Bun.sleep(2500);
    answered[rec.method] = String(state.ui![messageId]?.answered ?? false);
    console.log(JSON.stringify({ ok: true, step: "clicked", round, method: rec.method, answer: value, answered: state.ui![messageId]?.answered ?? false }));
  }

  console.log(JSON.stringify({ ok: true, step: "done", answered }));
  client.stop();
  process.exit(0);
}

if (process.argv.includes("--watch")) {
  // bun bridge.ts --watch <runId> <cwd> <chatId>  → register a run without going through Feishu
  const i = process.argv.indexOf("--watch");
  const [runId, cwd, chatId] = [process.argv[i + 1], process.argv[i + 2], process.argv[i + 3] ?? cfg.allowedChats[0]];
  const obj = await archonGet(cwd, runId);
  if (!obj) {
    console.log(JSON.stringify({ ok: false, error: "run not readable", runId, cwd }, null, 2));
    process.exit(1);
  }
  await watchRun(runId, cwd, chatId, { workflow: String(obj.workflow_name ?? "run"), userMessage: String(obj.user_message ?? ""), key: chatId });
  const rec = state.runs?.[runId];
  console.log(JSON.stringify({ ok: true, runId, status: obj.status, workflow: obj.workflow_name, tracking: Object.keys(state.runs ?? {}).length, rec }, null, 2));
  process.exit(0);
}

/** One poll, no interval — lets a human (or a test) drive the watcher deterministically. */
if (process.argv.includes("--poll-once")) {
  const before = trackedRuns().map((r) => `${r.runId.slice(0, 8)}:${r.status}`).join(" ");
  await pollRuns();
  console.log(JSON.stringify({ before, after: trackedRuns().map((r) => `${r.runId.slice(0, 8)}:${r.status}`).join(" ") }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--card-demo")) {
  // bun bridge.ts --card-demo <chatId> [question...]  → exercises the real card path
  const idx = process.argv.indexOf("--card-demo");
  const chatId = process.argv[idx + 1] ?? cfg.allowedChats[0];
  const question = process.argv.slice(idx + 2).join(" ") ||
    "**这是一张演示卡**：点按钮试试卡片回调链路（按钮 → 桥 → 回答）。\n\n绑定关系、幂等、延迟更新都会走真实代码路径。";
  const id = await sendApprovalCard(chatId, { runId: null, cwd: null, workflow: "beads-dag-drain", question, demo: true });
  console.log(JSON.stringify({ sent: id, chatId }, null, 2));
  process.exit(id ? 0 : 1);
}

if (process.argv.includes("--check")) {
  await check();
  process.exit(0);
}

const shutdown = (signal: string) => {
  log({ level: "info", msg: "shutdown", signal, rpcProcesses: rpcByKey.size, watched: trackedRuns().length });
  // Resident pi children are not systemd's business — take them down ourselves, or they
  // survive as orphans holding their session files.
  for (const client of rpcByKey.values()) {
    try {
      client.stop();
    } catch {
      /* already gone */
    }
  }
  rpcByKey.clear();
  // Same reason for the event consumers: a leftover one holds the per-key bus.
  for (const proc of consumerProcs) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => process.exit(0), 250);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// A restart kills the resident pi processes, so any question they were waiting on is gone.
// Say so on the card instead of leaving a dead button behind.
for (const [messageId, rec] of Object.entries(state.ui ?? {})) {
  if (rec.answered) continue;
  rec.answered = true;
  await updateCardMessage(rec.chatId, messageId, noticeCard("♻️ 已作废", "桥重启了，这个问题随进程作废（pi 那边会用默认值/新会话继续）。要它重问就再发一条消息。", rec.method, "grey"));
}
if (Object.keys(state.ui ?? {}).length) {
  saveState();
  log({ level: "info", msg: "stale_ui_cards_closed", count: Object.keys(state.ui ?? {}).length });
}

startWatcher();
const consumer = await startConsumerWithRetry("im.message.receive_v1", (ev) => void handleMessage(ev));
const cardConsumer = await startConsumerWithRetry("card.action.trigger", (ev) => void handleCardAction(ev));
const menuConsumer = await startConsumerWithRetry("application.bot.menu_v6", (ev) => void handleMenuEvent(ev));
log({ level: "info", msg: "bridge_started", pid: process.pid, defaultProject: cfg.defaultProject });
void consumer;
void cardConsumer;
