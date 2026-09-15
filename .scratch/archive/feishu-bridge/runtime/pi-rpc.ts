/**
 * PiRpc — a resident `pi --mode rpc` process, one per project.
 *
 * Ticket: .scratch/feishu-bridge/issues/02-rpc-client.md
 *
 * Why resident: `-p` per message buys nothing but a 5s cold start. RPC gives
 * streaming deltas (progress in Feishu), steer/abort (stop it from the phone),
 * extension_ui_request (the agent asking a structured question), session stats
 * and queue state.
 *
 * Protocol: JSONL both ways, LF only (`\r` tolerated). Every command may carry
 * an `id`; its response echoes it. Events carry no id.
 */

import { spawn, type Subprocess } from "bun";

export type RpcEvent = { type: string; [key: string]: any };
type Pending = { resolve: (r: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

export type PiRpcOptions = {
  cwd: string;
  sessionId: string;
  name?: string;
  extraArgs?: string[];
  onLog?: (obj: Record<string, unknown>) => void;
  /** Called for every event, after internal bookkeeping. */
  onEvent?: (ev: RpcEvent) => void;
};

export class PiRpc {
  readonly cwd: string;
  private readonly opts: PiRpcOptions;
  private proc?: Subprocess<"pipe", "pipe", "pipe">;
  private buf = "";
  private pending = new Map<string, Pending>();
  private seq = 0;
  private stopping = false;
  private backoffMs = 500;
  private startedAt = 0;

  /** Session state, refreshed by events and get_state. */
  isStreaming = false;
  /** False until the process has answered one command — i.e. its stdin reader is alive. */
  ready = false;
  sessionId: string;
  sessionFile?: string;
  messageCount = 0;

  constructor(opts: PiRpcOptions) {
    this.opts = opts;
    this.cwd = opts.cwd;
    this.sessionId = opts.sessionId;
  }

  private log(obj: Record<string, unknown>) {
    this.opts.onLog?.({ component: "pi-rpc", cwd: this.cwd, ...obj });
  }

  start(): void {
    this.stopping = false;
    const args = [
      "--mode", "rpc",
      "--session-id", this.opts.sessionId,
      "--name", this.opts.name ?? `feishu:${this.opts.sessionId}`,
      ...(this.opts.extraArgs ?? []),
    ];
    const proc = spawn(["pi", ...args], {
      cwd: this.cwd,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    });
    this.proc = proc;
    this.startedAt = Date.now();
    this.buf = "";
    this.ready = false;
    this.log({ msg: "spawned", pid: proc.pid, args });

    void this.readStdout(proc);
    void this.readStderr(proc);
    void proc.exited.then((code) => this.onExit(code));
  }

  private async readStdout(proc: Subprocess<"pipe", "pipe", "pipe">) {
    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      this.buf += decoder.decode(value, { stream: true });
      // Strict JSONL: LF only. Do not use readline (it splits on U+2028/29).
      let i: number;
      while ((i = this.buf.indexOf("\n")) !== -1) {
        let line = this.buf.slice(0, i);
        this.buf = this.buf.slice(i + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.trim()) continue;
        let obj: any;
        try {
          obj = JSON.parse(line);
        } catch {
          this.log({ level: "warn", msg: "unparsable_line", line: line.slice(0, 300) });
          continue;
        }
        this.dispatch(obj);
      }
    }
  }

  private async readStderr(proc: Subprocess<"pipe", "pipe", "pipe">) {
    const decoder = new TextDecoder();
    const reader = proc.stderr.getReader();
    let partial = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      partial += decoder.decode(value, { stream: true });
      const lines = partial.split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) this.log({ level: "info", msg: "stderr", line: line.slice(0, 400) });
    }
  }

  private dispatch(obj: any) {
    if (obj.type === "response") {
      if (!this.ready) {
        this.ready = true;
        this.log({ msg: "ready" });
      }
      const id = obj.id;
      if (id && this.pending.has(id)) {
        const p = this.pending.get(id)!;
        this.pending.delete(id);
        clearTimeout(p.timer);
        if (obj.success === false) p.reject(new Error(String(obj.error ?? "rpc command failed")));
        else p.resolve(obj.data ?? obj);
      } else if (obj.success === false) {
        this.log({ level: "warn", msg: "unsolicited_error_response", error: String(obj.error ?? "") });
      }
      return;
    }

    // Bookkeeping the bridge depends on.
    switch (obj.type) {
      case "agent_start":
        this.isStreaming = true;
        break;
      case "agent_settled":
      case "turn_end":
        this.isStreaming = false;
        break;
      case "message_end":
        this.messageCount++;
        break;
    }
    this.opts.onEvent?.(obj as RpcEvent);
  }

  private onExit(code: number | null) {
    const uptime = Date.now() - this.startedAt;
    // Fail every in-flight request: their responses died with the process.
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("pi rpc process exited"));
    }
    this.pending.clear();
    this.isStreaming = false;
    this.ready = false;
    this.log({ level: code === 0 ? "info" : "error", msg: "exited", code, uptimeMs: uptime });

    if (this.stopping) return;
    const delay = Math.min(this.backoffMs, 15_000);
    this.backoffMs = Math.min(this.backoffMs * 2, 15_000);
    this.log({ level: "warn", msg: "restarting", delay });
    setTimeout(() => {
      if (!this.stopping) this.start();
    }, delay);
  }

  /** Cheap liveness probe: a response proves the stdin reader is running. */
  async probeReady(timeoutMs = 8000): Promise<boolean> {
    try {
      await this.request({ type: "get_state" }, timeoutMs);
      this.ready = true;
    } catch {
      this.ready = false;
    }
    return this.ready;
  }

  private send(cmd: Record<string, unknown>): void {
    if (!this.proc?.stdin) throw new Error("pi rpc process is not running");
    this.proc.stdin.write(JSON.stringify(cmd) + "\n");
    this.proc.stdin.flush?.();
  }

  request(cmd: Record<string, unknown>, timeoutMs = 30_000): Promise<any> {
    const id = `req-${++this.seq}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`rpc timeout after ${timeoutMs}ms: ${String(cmd.type)}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send({ ...cmd, id });
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err as Error);
      }
    });
  }

  // ------------------------------------------------------------- operations

  /** Send a prompt; steer it into the current run when the agent is busy. */
  async say(text: string): Promise<"prompt" | "steer"> {
    const state = await this.getState().catch(() => null);
    const busy = state?.isStreaming ?? this.isStreaming;
    if (busy) await this.request({ type: "steer", message: text });
    else await this.request({ type: "prompt", message: text });
    this.backoffMs = 500;
    return busy ? "steer" : "prompt";
  }

  async steer(text: string) {
    return this.request({ type: "steer", message: text });
  }

  async followUp(text: string) {
    return this.request({ type: "follow_up", message: text });
  }

  async abort() {
    return this.request({ type: "abort", timeoutMs: 10_000 });
  }

  async getState(): Promise<any> {
    const data = await this.request({ type: "get_state" }, 10_000);
    if (data?.sessionFile) this.sessionFile = data.sessionFile;
    if (typeof data?.sessionId === "string") this.sessionId = data.sessionId;
    if (typeof data?.messageCount === "number") this.messageCount = data.messageCount;
    if (typeof data?.isStreaming === "boolean") this.isStreaming = data.isStreaming;
    return data;
  }

  async stats(): Promise<any> {
    return this.request({ type: "get_session_stats" }, 10_000);
  }

  async commands(): Promise<any[]> {
    const data = await this.request({ type: "get_commands" }, 10_000);
    return data?.commands ?? [];
  }

  async answerExtensionUi(id: string, payload: Record<string, unknown>) {
    this.send({ type: "extension_ui_response", id, ...payload });
  }

  async setModel(provider: string, modelId: string) {
    return this.request({ type: "set_model", provider, modelId }, 15_000);
  }

  async setThinkingLevel(level: string) {
    return this.request({ type: "set_thinking_level", level }, 10_000);
  }

  async newSession() {
    return this.request({ type: "new_session" }, 15_000);
  }

  stop(): void {
    this.stopping = true;
    try {
      this.proc?.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

// --------------------------------------------------------------------- selftest

if (import.meta.main && process.argv.includes("--selftest")) {
  const cwd = process.argv[process.argv.indexOf("--selftest") + 1] ?? "/tmp";
  const rpc = new PiRpc({
    cwd,
    sessionId: `rpc-selftest-${Date.now().toString(36)}`,
    name: "rpc-selftest",
    onLog: (o) => console.log("[log]", JSON.stringify(o)),
  });

  const t0 = Date.now();
  let deltas = 0;
  let firstDeltaAt = 0;
  let toolStarts: string[] = [];
  let uiRequests: any[] = [];

  rpc.start();
  rpc.opts.onEvent = (ev) => {
    if (ev.type === "message_update") {
      const d = ev.assistantMessageEvent ?? {};
      if (d.type === "text_delta") {
        deltas++;
        if (!firstDeltaAt) firstDeltaAt = Date.now() - t0;
      }
      if (d.type === "toolcall_start") toolStarts.push(d.toolName);
    }
    if (ev.type === "tool_execution_start") toolStarts.push(ev.toolName);
    const DIALOGS = new Set(["select", "confirm", "input", "editor"]);
    if (ev.type === "extension_ui_request" && DIALOGS.has(ev.method)) {
      uiRequests.push(ev);
      // auto-answer so a selftest never hangs on a question
      void rpc.answerExtensionUi(ev.id, ev.method === "confirm" ? { confirmed: true } : { value: "selftest" });
    }
  };

  const settled = new Promise<void>((resolve) => {
    const orig = rpc.opts.onEvent!;
    rpc.opts.onEvent = (ev) => {
      orig(ev);
      if (ev.type === "agent_settled") resolve();
    };
  });

  await Bun.sleep(1500); // let the process come up
  const state = await rpc.getState();
  console.log("state:", JSON.stringify({ sessionId: state?.sessionId, isStreaming: state?.isStreaming, model: state?.model?.id }));

  const mode = await rpc.say("用一句话回答：RPC 自检通过，你的 cwd 是哪里？");
  await settled;
  const totalMs = Date.now() - t0;
  console.log(JSON.stringify({ mode, deltas, firstDeltaMs: firstDeltaAt, totalMs, tools: toolStarts, uiRequests: uiRequests.length }, null, 2));

  const stats = await rpc.stats();
  console.log("stats:", JSON.stringify({ messages: stats?.totalMessages, tokens: stats?.tokens?.total, cost: stats?.cost, ctx: stats?.contextUsage?.percent }));

  // abort path: start something long, then cancel it
  const busy = rpc.say("数到一百万，一个一个数，不要用工具。");
  await Bun.sleep(2500);
  const midState = await rpc.getState();
  const tAbort = Date.now();
  await rpc.abort();
  await busy.catch(() => {});
  console.log(JSON.stringify({ midStreaming: midState?.isStreaming, abortMs: Date.now() - tAbort }));

  // steer path: a second message while the agent is busy must not be rejected
  let queueUpdates = 0;
  const prevHandler = rpc.opts.onEvent!;
  rpc.opts.onEvent = (ev) => {
    prevHandler(ev);
    if (ev.type === "queue_update") queueUpdates++;
  };
  const long = rpc.say("从 1 数到 200，每个数字单独一行，不要用工具。");
  await Bun.sleep(3000);
  const secondMode = await rpc.say("停，改成只回答两个字：收到");
  await Bun.sleep(4000);
  await rpc.abort();
  await long.catch(() => {});
  console.log(JSON.stringify({ secondMode, queueUpdates }));

  rpc.stop();
  await Bun.sleep(300);
  process.exit(0);
}
