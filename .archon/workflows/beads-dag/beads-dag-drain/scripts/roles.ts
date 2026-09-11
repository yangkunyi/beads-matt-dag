/**
 * The role protocol: the one declaration of each agent role.
 *
 * A role is what a turn is: the arguments it takes, the key its session lives under, the persona it
 * runs under, the brief it is handed, and how long it may run. A node names its role and hands it the
 * role's own arguments; it spells no persona, no prompt and no wall clock of its own, so a node cannot
 * disagree with the role it runs. The workflow's own timeout is the other half of that agreement: it
 * has to outlast the wall clock declared here or the runner kills a turn the agent is still on.
 *
 * `role` here is an agent role (implement and conflict today; the review turn to come). It is not a
 * triage label: different axis, different word.
 */
import type { PackAgentOpts } from "./agent.ts";
import type { PackConfig } from "./config.ts";
import { conflictPersona, implementPersona } from "./prompt.ts";
import { workerEnv } from "./worker-env.ts";

/**
 * How long one agent turn may run, whichever turn it is. The executor runs at most two of them - the
 * implementer, and the conflict resolver if the merge conflicted - so the workflow's timeout covers
 * two of these. Named so the workflow's timeout can be read against it.
 */
export const AGENT_WALL_MS = 2 * 60 * 60 * 1000;

/**
 * What each role is called with: the role's own arguments and nothing else. The handle keys the role's
 * session; the body's path is the role's whole brief.
 */
export type RoleShape = {
  implement: { handle: string; bodyPath: string };
  /** The same issue, the same brief: a conflict is the implementer's work meeting a Main that moved. */
  conflict: { handle: string; bodyPath: string };
};

/** The pack's agent-role vocabulary. */
export type AgentRole = keyof RoleShape;

/**
 * Everything about one role that is the same wherever the role runs. This is the only declaration of a
 * persona and a wall clock - a role's own arguments are what its builders read, so the arguments, the
 * persona and the clock cannot drift apart by hand.
 */
type RoleSpec<A> = {
  sessionKey: (args: A) => string;
  persona: (args: A) => string;
  prompt: (args: A) => string;
  wallMs: number;
};

export const ROLES: { [K in AgentRole]: RoleSpec<RoleShape[K]> } = {
  implement: {
    sessionKey: (args) => args.handle,
    persona: () => implementPersona(),
    prompt: (args) => args.bodyPath,
    wallMs: AGENT_WALL_MS,
  },
  conflict: {
    // The same key as the implementer: one issue, one session directory. The pack's session path is
    // `<key>/<role>.jsonl` (pi-session.ts), so the conflict turn writes its own file beside the
    // implementer's rather than continuing its conversation - the intent it needs is in the worktree
    // (both sides of the merge, the commits, the body), and a conflict turn a later attempt resumes is
    // its own file resumed.
    sessionKey: (args) => args.handle,
    persona: () => conflictPersona(),
    prompt: (args) => args.bodyPath,
    wallMs: AGENT_WALL_MS,
  },
};

/** One node's role call: which role, the role's own arguments, where it runs, what it leaves behind. */
export type RoleCall<R extends AgentRole> = {
  role: R;
  args: RoleShape[R];
  /** Where the turn runs: the worktree the issue's names put it in. */
  cwd: string;
  artifactsDir: string;
  config: PackConfig;
};

/** The agent opts for one role call: the table's facts, plus the config and the caller's own. */
export function roleAgent<R extends AgentRole>(call: RoleCall<R>): PackAgentOpts {
  const spec = ROLES[call.role];
  return {
    cwd: call.cwd,
    artifactsDir: call.artifactsDir,
    sessionKey: spec.sessionKey(call.args),
    // The worker's environment travels with the call, not with an adapter's memory of it: whichever
    // runner runs this turn applies it, so no runner can quietly drop the read-only rule.
    env: (base) => workerEnv(base),
    role: call.role,
    model: call.config.model,
    thinkingLevel: call.config.thinkingLevel,
    runner: call.config.runner,
    persona: spec.persona(call.args),
    prompt: spec.prompt(call.args),
    wallMs: spec.wallMs,
  };
}
