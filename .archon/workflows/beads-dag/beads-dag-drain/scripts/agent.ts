/**
 * The agent seam: one turn in, one session's report out.
 *
 * A node composes a role call (roles.ts) and hands it here; a runner starts the session and reports on
 * this one shape where the session lives, what the turn answered and what went wrong. Nothing else
 * crosses back: a node never parses a runner's own log, and one channel is the answer.
 *
 * The pi and dsh sessions arrive with the runner work. Until they do, the seam starts nothing: a turn
 * that answers nothing is the honest report for a slice with no runner, and the node that took the turn
 * keeps its own outcome (an issue whose work is not in Main did not land). When the sessions arrive they
 * replace `defaultAgent` and nothing else about this file changes - that is what the seam is for.
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

/** One runner: given a turn's options, open a session and report the turn. */
export type AgentRunner = (opts: PackAgentOpts) => Promise<PackAgentResult>;

/** The runner a node uses when its caller named none: nothing is built into this slice. */
export function defaultAgent(opts: PackAgentOpts): Promise<PackAgentResult> {
  return Promise.resolve({
    sessionFile: "",
    answer: { kind: "none" },
    lastError: `no ${opts.runner} session ran: this slice of the pack starts no runner yet`,
  });
}
