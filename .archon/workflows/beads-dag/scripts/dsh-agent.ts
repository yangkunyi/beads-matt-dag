/**
 * The pack's dsh policy: everything the pack asks of DeepSeek Harness, and nothing of its wire
 * protocol (that lives in dsh-runtime.ts).
 *
 * Where the two runners differ - whatever this adapter does that Pi's pi-session.ts does not:
 * - thinking levels: dsh's deepseek plugin knows exactly four efforts, so Pi's seven levels fold onto
 *   them through EFFORT below; Pi passes its thinking level straight through.
 * - the tool set: the minimal tree is fixed at one persistent bash tool and mounts no sandbox plugin,
 *   so a worker's contract here is instruction-only and enforced by the store's read-only mode in the
 *   environment this child is spawned with - not by a mounted tool allowlist. Pi enforces the same
 *   store rule structurally, through the spawn hook on its bash tool.
 * - abort: this dsh subset has no cancel, so the wall clock ends the process with SIGKILL; Pi calls
 *   session.abort().
 *
 * The harness carries the persona as the whole system prompt, so the persona travels as
 * DSH_SYSTEM_PROMPT and the issue's brief as the first message. The Target's `runner:` drives the
 * node; a node names its role and nothing else.
 *
 * The session log stays where the harness keeps it - under DSH_HOME, which is the harness's config
 * root (profiles live there), so this adapter does not redirect it the way Pi's contract-pinned
 * session file is redirected. What it does instead is copy, after the turn, the harness's own file
 * into the run's artifacts as a **view**: `sessions/<key>/<role>.jsonl`, the shape Pi's session file
 * has, so a run's artifacts hold one session file per role whichever runner ran it. The harness's
 * file is neither moved nor rewritten and nothing keeps the two in sync - the copy is an artifact the
 * run leaves behind, not a mirror of state (ADR-0005). The result reports the copy's path; a copy
 * that cannot happen says so on stderr and reports the harness's own path instead, because a turn
 * whose work already landed is not failed by its diagnostics.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { packAnswer, RunnerUnavailable, type PackAgentOpts, type PackAgentResult } from "./agent.ts";
import { DshRuntime } from "./dsh-runtime.ts";
import { roleSessionFile } from "./pi-session.ts";
import type { ThinkingLevel } from "./config.ts";

const PROFILE = "sdk-minimal";
const PROVIDER = "deepseek-official";
const DEFAULT_MODEL = "deepseek-flash";
/**
 * dsh's deepseek llm plugin knows exactly four efforts; Pi's seven levels fold onto them: off stays
 * off, minimal and low both mean low, medium/high/xhigh all mean high, max stays max. All seven rows
 * are asserted against this table by tests/runner-repro.ts.
 */
const EFFORT: Record<ThinkingLevel, string> = {
  off: "off",
  minimal: "low",
  low: "low",
  medium: "high",
  high: "high",
  xhigh: "high",
  max: "max",
};
const DEFAULT_DSH_HOME = join(homedir(), ".dsh-pack");

type Credentials = { baseUrl: string; apiKey: string; model: string | undefined };

/**
 * Endpoint, key and default model for the dsh runtime: the environment first, then the file the Pi
 * runner's model runtime reads, so both runners resolve the same gateway.
 */
function credentials(): Credentials {
  const baseUrl = process.env.DEEPSEEK_BASE_URL?.trim();
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (baseUrl && apiKey) return { baseUrl, apiKey, model: undefined };
  const file = join(homedir(), ".pi", "agent", "models.json");
  const packy = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as { providers?: Record<string, unknown> }).providers?.packy
    : undefined;
  const p = packy as { baseUrl?: unknown; apiKey?: unknown; models?: { id?: unknown }[] } | undefined;
  const models = Array.isArray(p?.models) ? p.models.map((m) => m?.id).filter((id): id is string => typeof id === "string") : [];
  if (typeof p?.baseUrl === "string" && typeof p.apiKey === "string") {
    return { baseUrl: p.baseUrl, apiKey: p.apiKey, model: models[0] };
  }
  throw new RunnerUnavailable(
    "the dsh runner needs DEEPSEEK_BASE_URL + DEEPSEEK_API_KEY, or a providers.packy entry in ~/.pi/agent/models.json",
  );
}

/** The harness logs one session per workspace root under DSH_HOME, encoded as `--path-with-dashes--`. */
function dshSessionFile(dshHome: string, cwd: string, sessionId: string): string {
  const slug = `--${cwd.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-")}--`;
  const dir = join(dshHome, "sessions", slug, sessionId);
  const file = join(dir, "session.v3.jsonl");
  return existsSync(file) ? file : existsSync(dir) ? dir : file;
}

/**
 * The harness's session file, copied into the run's artifacts as a view.
 *
 * The destination is Pi's own session path (`roleSessionFile`), imported rather than derived a second
 * time: one run's artifacts hold one session file per key per role, and which runner wrote it is the
 * only difference. Nothing here moves the harness's file, and nothing keeps the view in sync with it:
 * the copy is an artifact this turn leaves behind, and a harness that writes again afterwards is not
 * seen here (ADR-0005).
 *
 * A copy that cannot happen is diagnostics, not the turn: the work the turn did has already landed,
 * and a node reads the result's answer, not this path. So it is a line on stderr - the channel open.ts
 * writes the configuration line on - and the harness's own path comes back, which is where the session
 * log really is. The caller never sees an exception from here.
 */
function sessionView(opts: PackAgentOpts, harnessFile: string): string {
  const viewFile = roleSessionFile(opts.artifactsDir, opts.sessionKey, opts.role);
  try {
    if (!existsSync(harnessFile)) throw new Error("the harness left no session file there");
    mkdirSync(dirname(viewFile), { recursive: true });
    copyFileSync(harnessFile, viewFile);
    return viewFile;
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(
      `beads-dag: dsh session view not written: ${reason}: ${harnessFile} -> ${viewFile}; ` +
        "the result reports the harness's own path",
    );
    return harnessFile;
  }
}

export async function dshAgent(opts: PackAgentOpts): Promise<PackAgentResult> {
  const persona = opts.persona;
  if (!persona) {
    throw new RunnerUnavailable("the dsh runner needs opts.persona: the contract for its system prompt");
  }
  const creds = credentials();
  const dshHome = process.env.DSH_HOME?.trim() || DEFAULT_DSH_HOME;
  const rt = new DshRuntime({
    cwd: opts.cwd,
    // The same seam transform Pi applies, on this adapter's own base: DSH_* stay, and the store's
    // read-only mode joins whatever the caller's environment already carries.
    env: opts.env({
      ...process.env,
      DSH_HOME: dshHome,
      DEEPSEEK_BASE_URL: creds.baseUrl,
      DEEPSEEK_API_KEY: creds.apiKey,
      DSH_SYSTEM_PROMPT: persona,
    }),
    argv: ["--profile", PROFILE],
    provider: PROVIDER,
    model: opts.model?.trim() || creds.model || DEFAULT_MODEL,
    effort: EFFORT[opts.thinkingLevel],
  });
  const wallMs = opts.wallMs;
  let aborted = false;
  let wall: ReturnType<typeof setTimeout> | undefined;
  /** The turn's own report, held until the harness is closed and its log can be copied. */
  let turn: Pick<PackAgentResult, "answer" | "lastError">;
  try {
    await Promise.race([
      rt.run(opts.prompt),
      new Promise<never>((_, reject) => {
        wall = setTimeout(() => {
          aborted = true;
          rt.kill(); // dsh has no cancel in this subset: the wall clock ends the process
          reject(new Error("agent aborted after wall clock"));
        }, wallMs);
      }),
    ]);
    const reason = rt.finishReason();
    turn = {
      answer: packAnswer(rt.lastMessage()),
      lastError: reason && reason !== "completed" ? `turn ended: ${reason}` : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (aborted) {
      turn = { answer: packAnswer(rt.lastMessage()), lastError: "agent aborted after wall clock" };
    } else if (!rt.hasStarted()) {
      // A failure before the handshake is not a turn: the harness never came up (no `dsh` on PATH, a
      // profile that cannot boot, a child that exits early). The caller has to hear that as a runner
      // that could not start, or it blames an issue for a runner nobody configured.
      throw new RunnerUnavailable(`the dsh runner could not start: ${msg}`);
    } else {
      turn = { answer: packAnswer(rt.lastMessage()), lastError: msg };
    }
  } finally {
    clearTimeout(wall);
    await rt.close();
  }
  // The view is taken with the harness closed, because the harness finishes writing its log after it
  // reports the turn idle: measured live, the turn's own `assistant/message` and `turn/end` rows land
  // a few hundred ms later, and a copy taken at idle misses them. Nothing appends after close, so this
  // is the complete turn - and still a view: the harness's file stays where it is, unsynced.
  return {
    sessionFile: sessionView(opts, dshSessionFile(dshHome, opts.cwd, rt.sessionId)),
    ...turn,
  };
}
