/**
 * The agent seam: one turn in, one session's report out.
 *
 * A node composes a role call (roles.ts) and hands it here; a runner starts the session and reports on
 * this one shape where the session lives, what the turn answered and what went wrong. Nothing else
 * crosses back: a node never parses a runner's own log, and the answer is read by the runner from the
 * one product it trusts - the session record it wrote - never from its terminal output.
 *
 * Two runners live behind this seam, chosen by the Target's `runner` key: the Pi session (in-process,
 * pi-session.ts; the default) and the dsh harness (a child process, dsh-agent.ts). Both are loaded by
 * dynamic import so the seam itself names no runner's path formula.
 */
import type { Runner, ThinkingLevel } from "./config.ts";
import type { AgentRole } from "./roles.ts";

/** One turn's answer, read from the runner's own product by the runner alone. */
export type PackAnswer =
  | { kind: "text"; text: string }
  /** The turn produced no assistant text at all: a turn that ended before it spoke. */
  | { kind: "none" };

export type PackAgentResult = {
  /**
   * Where this turn's session lives - the runner's to know, the node's only to report. It is
   * diagnostics, not the answer: a log is never read back for what the turn said.
   */
  sessionFile: string;
  /** The turn's answer. */
  answer: PackAnswer;
  /** The runner's own report of what went wrong on this turn, when something did. */
  lastError: string | undefined;
};

/** Everything a runner is handed for one turn. The role table says where each fact comes from. */
export type PackAgentOpts = {
  /** Where the turn runs: the issue's worktree, whose branch is the issue's. */
  cwd: string;
  /**
   * The environment the session's own process tree runs under, applied by the runner to whatever base
   * it already has. Required, because the read-only rule (worker-env.ts) is not a runner's choice.
   */
  env: (base: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  artifactsDir: string;
  /** The key this role's session lives under. */
  sessionKey: string;
  role: AgentRole;
  model: string | undefined;
  thinkingLevel: ThinkingLevel;
  runner: Runner;
  /** The contract this role runs under, as a whole system prompt. */
  persona: string;
  /** What the role is asked to do: the issue's brief, which is its body's path. */
  prompt: string;
  /** How long the turn may run. The role table declares it; the runner enforces it. */
  wallMs: number;
};

/**
 * One turn's answer from the text a runner read out of its own product. Blank text is no answer: a
 * node falls through to its own failure path rather than treating silence as work done. The text
 * itself is passed through byte for byte.
 */
export function packAnswer(text: string | undefined): PackAnswer {
  return text !== undefined && text.trim().length > 0 ? { kind: "text", text } : { kind: "none" };
}

/**
 * The runner never got to start - no credentials, no persona, a model it cannot resolve, a session
 * file it cannot open, an SDK it cannot reach - so no turn ever ran. A returned PackAgentResult says
 * something about a turn; this says the turn never happened, and the two need different answers: an
 * issue no agent saw is not an issue whose work failed.
 *
 * A node lets this one out, so the node exits non-zero and the drain fails loudly instead of recording
 * a failed attempt on an issue the runner never touched. An issue is never closed by this path.
 */
export class RunnerUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunnerUnavailable";
  }
}

/** One runner: given a turn's options, open a session and report the turn. */
export type AgentRunner = (opts: PackAgentOpts) => Promise<PackAgentResult>;

/**
 * The role's wall clock, enforced by the runner: after `wallMs` the session is aborted. The caller
 * gets the canceller back so a finished turn does not abort a later one, and the timer is unref'd so a
 * live session is the only thing keeping the node alive.
 */
export function armSessionAbort(session: { abort: () => Promise<void> }, wallMs: number): () => void {
  const timer = setTimeout(() => {
    void session.abort();
  }, wallMs);
  timer.unref();
  return () => clearTimeout(timer);
}

/**
 * The runner a node uses when its caller named none: the Target's configured runner, loaded on demand.
 *
 * The import is dynamic so neither runner's module is loaded - and neither runner's machine
 * requirements are consulted - unless a turn actually asks for it. A caller that hands in its own
 * `runAgent` (the tests, and any future caller with a stub) never reaches this function.
 */
export async function defaultAgent(opts: PackAgentOpts): Promise<PackAgentResult> {
  if (opts.runner === "dsh") {
    const { dshAgent } = await import("./dsh-agent.ts");
    return dshAgent(opts);
  }
  const { runPackPi } = await import("./pi-session.ts");
  return runPackPi(opts);
}
