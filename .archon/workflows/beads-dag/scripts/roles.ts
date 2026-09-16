/**
 * The role protocol: the one declaration of each agent role.
 *
 * A role is what a turn is: the arguments it takes, the key its session lives under, the persona it
 * runs under, the brief it is handed, and how long it may run. A node names its role and hands it the
 * role's own arguments; it spells no persona, no prompt and no wall clock of its own, so a node cannot
 * disagree with the role it runs. The workflow's own timeout is the other half of that agreement: it
 * has to outlast the wall clock declared here or the runner kills a turn the agent is still on.
 *
 * `role` here is an agent role (implement, conflict, read, experiment, and the two drain-end readers,
 * review and summary). It is not a triage label: different axis, different word.
 */
import type { PackAgentOpts } from "./agent.ts";
import type { PackConfig } from "./config.ts";
import {
  conflictPersona,
  experimentPersona,
  experimentTask,
  implementPersona,
  readPersona,
  readTask,
  reviewPersona,
  reviewTask,
  summaryPersona,
  summaryTask,
} from "./prompt.ts";
import { workerEnv } from "./worker-env.ts";

/**
 * How long one agent turn may run, whichever turn it is. The executor runs at most two of them - the
 * implementer, and the conflict resolver if the merge conflicted - so the workflow's timeout covers
 * two of these. Named so the workflow's timeout can be read against it.
 */
export const AGENT_WALL_MS = 2 * 60 * 60 * 1000;

/**
 * The drain-end readers share one clock: review and summary read one range and report on it, and
 * neither has work of its own to run past it. It is its own constant because a reader's turn is not an
 * implementation turn - and the drain YAML's review/summary timeouts are read against it.
 */
export const REVIEW_WALL_MS = 30 * 60 * 1000;

/**
 * How long one reading may run. A reading is one turn - the reader fetches, writes the note and answers
 * with the draft - and it is its own constant because a reading turn is neither an implementation turn
 * (two hours of code and gates) nor a drain-end reader's review. The inquiry loop's node timeout is read
 * against it.
 */
export const READ_WALL_MS = 60 * 60 * 1000;

/**
 * How long one experiment turn may run. An experiment is one turn - the experimenter runs the ticket's
 * plan through the Target's thin script and writes the record - and it is its own constant because a
 * run turn is neither an implementation turn nor a reading. The experiment loop's node timeout is read
 * against it.
 */
export const EXPERIMENT_WALL_MS = 4 * 60 * 60 * 1000;

/**
 * What each role is called with: the role's own arguments and nothing else. The handle keys the issue
 * roles' sessions; the body's path is the issue roles' whole brief. The reading role's arguments add the
 * two paths its brief carries, and the drain-end readers' arguments are what their brief is built from -
 * the range, its commit menu, and, for the summary, the review to merge.
 */
export type RoleShape = {
  implement: { handle: string; bodyPath: string };
  /** The same issue, the same brief: a conflict is the implementer's work meeting a Main that moved. */
  conflict: { handle: string; bodyPath: string };
  /**
   * One question's reading. The body's path is the issue roles' whole brief; the reading's own two
   * paths are what this role's arguments add - the corpus it writes and the note the node commits.
   */
  read: { handle: string; bodyPath: string; corpusRel: string; noteRel: string };
  /**
   * One experiment's run turn. The body's path is the ticket's plan; the record path is what this
   * role's arguments add - the document the node checks and commits.
   */
  experiment: { handle: string; bodyPath: string; recordRel: string };
  /** One axis of the drain-end review, over the range this run merged. */
  review: { axisIndex: number; base: string; axis: string; head: string; log: string };
  /** The one report over the review, for the human who reads the run afterwards. */
  summary: { base: string; head: string; log: string; reviewMd: string };
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
  read: {
    // One question, one session: the handle keys it, so a resumed attempt on the same question continues
    // the reading it started, and two questions never share a conversation.
    sessionKey: (args) => args.handle,
    persona: () => readPersona(),
    prompt: (args) => readTask(args.bodyPath, args.corpusRel, args.noteRel),
    wallMs: READ_WALL_MS,
  },
  experiment: {
    // One ticket, one session: the handle keys it, so a resumed attempt on the same experiment continues
    // the turn it started, and two tickets never share a conversation.
    sessionKey: (args) => args.handle,
    persona: () => experimentPersona(),
    prompt: (args) => experimentTask(args.bodyPath, args.recordRel),
    wallMs: EXPERIMENT_WALL_MS,
  },
  review: {
    // One session per axis and per run's artifacts: a fresh run's review does not resume a previous
    // run's session, so an axis' answer is always this run's range's answer.
    sessionKey: (args) => `drain-review-${args.axisIndex + 1}`,
    persona: (args) => reviewPersona(args.base, args.axis),
    prompt: (args) => reviewTask(args.base, args.head, args.log),
    wallMs: REVIEW_WALL_MS,
  },
  summary: {
    sessionKey: () => "drain-summary",
    persona: (args) => summaryPersona(args.base),
    prompt: (args) => summaryTask(args.base, args.head, args.log, args.reviewMd),
    wallMs: REVIEW_WALL_MS,
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
