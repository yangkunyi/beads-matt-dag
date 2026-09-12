/**
 * The skeleton both drain-end report nodes run: read review-base and stop with the owner's skip line
 * when it is not there, let the node read its own input (the range probe, review.md), read Main and the
 * range's commit menu, run the node's agents and take each answer off the runner (else the runner's
 * failure report, else the node's own fallback), write the artifact, run the node's after-step, and
 * turn a throw from the report into the node's own error line.
 *
 * Review and summary were two copies of those steps, differing only in the shape they produce (one
 * reviewer per axis, one summariser over review.md), in the word their error line starts with, and in
 * what the review does once its artifact is written (advance the recorded position). A node states
 * those differences and nothing else, so a fourth report node is a shape rather than another copy.
 *
 * The range is the run's, and its source is the base the opening node recorded: `base..Main` is what
 * the drain has left unviewed, and no run's report can reach past its own base. The base lives in the
 * run's artifact and not in the position ref, because the review advance moves the ref while the
 * summary still has to read the range the review covered: one run, one range, ref advanced once.
 * A run with no range reads an empty diff, writes its skip line, spends no agent, and reports `nothing`.
 * The skeleton also owns the recognition a reader may use to skip a range the pack wrote itself
 * (`rangeHoldsOnlyPackBookkeeping`): per-commit positive evidence, so one unrecognised commit means review.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultAgent, type AgentRunner } from "./agent.ts";
import { loadConfig, type PackConfig } from "./config.ts";
import { git } from "./git.ts";
import { PACK_BOOKKEEPING_PATHS, PACK_BOOKKEEPING_SUBJECTS } from "./main-writes.ts";
import { runNode } from "./node-entry.ts";
import { NOTHING_TO_REPORT, REPORTED } from "./node-outcomes.ts";
import { readReviewBase, writeArtifact } from "./report-artifacts.ts";
import { roleAgent, type AgentRole, type RoleShape } from "./roles.ts";
import { mainBranch } from "./worktree.ts";

/** What a reader node is called with: where to write, and the runner/seam a test replaces. */
export type ReportOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
  /** The runner this node spends. A run takes the pack's own; a test hands in a stub. */
  runAgent?: AgentRunner;
};

/** One agent a node asks for: the role and its own arguments, and the empty-answer text. */
type ReportAsk<R extends AgentRole> = {
  role: R;
  args: RoleShape[R];
  /** What a turn that answered no text and reported no error leaves behind. */
  fallback: string;
};

/** What a node's report step is handed once the range is readable. */
type ReportRange = {
  target: string;
  artifactsDir: string;
  config: PackConfig;
  base: string;
  /** The range's end: Main's tip when the node ran. */
  head: string;
  /** The range's commit menu: "" when git could not read it, which the personas take as "(none)". */
  log: string;
  /**
   * The one way a node runs an agent: builds the role's opts (session key, persona and wall clock all
   * come from roles.ts), runs it, and takes the answer - the runner's own answer, else its failure
   * report, else the caller's fallback. The runner's session file is not consulted: it is diagnostics
   * for a human, and a node that read it would only understand one runner's format.
   */
  ask: <R extends AgentRole>(call: ReportAsk<R>) => Promise<string>;
};

/** What a node's own read gets: where it runs, the base it reports on, and the Target's config. */
type ReportInput = Pick<ReportRange, "target" | "artifactsDir" | "base" | "config">;

/**
 * What a node's own read answers: the line to write and stop with (a skip or the node's own range
 * error, and no agent is spent), or the step that produces the artifact.
 */
type ReportPrep = { stop: string } | { report: (range: ReportRange) => Promise<string> };

/** One drain-end report node: the artifact it writes, how its failure line reads, and its own read. */
export type ReportNode = {
  /** The artifact the node writes, relative to ARTIFACTS_DIR (review.md / summary.md). */
  rel: string;
  /** The node's failure line for a detail the skeleton found: reviewErrorLine, `summary error: ...`. */
  errorLine: (detail: string) => string;
  /**
   * The node's own first step. A line to stop with is written as the whole artifact; the report step
   * runs only for a range git can read.
   */
  read: (input: ReportInput) => Promise<ReportPrep> | ReportPrep;
  /**
   * The node's step after its artifact is written, when it has one that depends on the artifact's
   * content: the review advances the recorded position past a review that holds findings, and does
   * nothing for a skip or a failure. A throw here fails the node - a position that could not be
   * written leaves the range to the next run, which is the safe side.
   */
  after?: (range: ReportRange, body: string) => void | Promise<void>;
};

/** A reader node's whole outcome: it reported, or it had nothing to report. */
export type ReportOutcome = typeof REPORTED | typeof NOTHING_TO_REPORT;

/**
 * Whether `base..head` holds nothing but commits the pack wrote as its own bookkeeping - the one
 * positive recognition that lets a reader skip a range it would otherwise spend a session on.
 *
 * The asymmetry is the whole argument: a false "ours" silently drops a review, a false "not ours"
 * spends one session on a trivial range, so the guard may only make the cheap mistake. Every commit
 * must therefore be recognised on its own evidence, and one unrecognised commit - an operator's work,
 * a branch that arrived in a merge, a message that merely copies the pack's - means the range is
 * reviewed. `base..head` is the whole reachable range, branch commits inside merges included, so
 * nothing can hide behind a merge.
 *
 * A commit is recognised only when all three facts hold, each measured against the real commits a
 * Target's Main carries (`git log --format=%H%n%s%n%an%n%ae%n%b` plus `--name-only`):
 *
 * - **the exact subject the pack's write uses** (`main-writes.ts`'s `PACK_BOOKKEEPING_SUBJECTS`, shared
 *   with the writer so the message cannot drift from what the guard accepts). The pack's other Main
 *   write - the `beads-dag: merge <branch>` merge - is deliberately not among them: it is work.
 * - **at most one parent.** A merge brought a branch's work into Main, whoever wrote its subject; the
 *   measured merge commit is the pack's own and is still not bookkeeping.
 * - **a diff whose paths are all paths that write owns** (`PACK_BOOKKEEPING_PATHS`). The subject is a
 *   message anyone could copy; the housekeeping commit's content is the pack's own runtime paths, and
 *   requiring it makes a commit that only reuses the subject unrecognised. The measured author of every
 *   commit is the operator's own git identity, so no author or email field could serve here at all.
 *
 * Git is the only source and a failure is never a skip: an unreadable log or diff, an empty range (the
 * empty-diff skip's case, not this one), a merge, or a malformed record all answer false, and the
 * caller reviews the range.
 */
export async function rangeHoldsOnlyPackBookkeeping(target: string, base: string, head: string): Promise<boolean> {
  const log = await git(target, ["log", "--format=%H%x00%P%x00%s", `${base}..${head}`]);
  if (!log.ok) return false;
  const commits = log.out.split("\n").filter((line) => line !== "");
  if (commits.length === 0) return false;
  for (const line of commits) {
    const [commit, parents, subject] = line.split("\0");
    if (commit === undefined || parents === undefined || subject === undefined) return false;
    if (parents.split(" ").filter(Boolean).length > 1) return false;
    if (!PACK_BOOKKEEPING_SUBJECTS.includes(subject)) return false;
    const touched = await git(target, ["show", "--no-renames", "--name-only", "--format=", commit]);
    if (!touched.ok) return false;
    const paths = touched.out
      .split("\n")
      .map((path) => path.trim())
      .filter((path) => path !== "");
    if (paths.length === 0) return false;
    if (!paths.every((path) => PACK_BOOKKEEPING_PATHS.includes(path))) return false;
  }
  return true;
}

/** Run one report node end to end: the ordering, the skips and the error handling live here. */
export async function runReportNode(node: ReportNode, target: string, opts: ReportOpts): Promise<ReportOutcome> {
  mkdirSync(opts.artifactsDir, { recursive: true });
  const outFile = join(opts.artifactsDir, node.rel);
  const baseR = readReviewBase(opts.artifactsDir);
  if ("skip" in baseR) {
    writeArtifact(outFile, baseR.skip);
    return NOTHING_TO_REPORT;
  }
  // Read after the base, so a run with no range still skips without touching the Target's config.
  const config = opts.config ?? loadConfig(target).config;
  const read = await node.read({
    target,
    artifactsDir: opts.artifactsDir,
    base: baseR.base,
    config,
  });
  if ("stop" in read) {
    writeArtifact(outFile, read.stop);
    return NOTHING_TO_REPORT;
  }
  const main = mainBranch(target);
  const headR = await git(target, ["rev-parse", main]);
  if (!headR.ok) {
    writeArtifact(outFile, node.errorLine(`git rev-parse ${main}: ${headR.out}`));
    return NOTHING_TO_REPORT;
  }
  const head = headR.out.trim();
  const logR = await git(target, ["log", `${baseR.base}..${head}`, "--oneline"]);
  const runAgent: AgentRunner = opts.runAgent ?? defaultAgent;
  const ask = async <R extends AgentRole>({ role, args, fallback }: ReportAsk<R>): Promise<string> => {
    const agentOpts = roleAgent({ role, args, cwd: target, artifactsDir: opts.artifactsDir, config });
    const r = await runAgent(agentOpts);
    // One answer channel: the runner reads its own product and hands the answer over. Its failure
    // report is the reason a turn answered no text; the caller's fallback is the last resort.
    return r.answer.kind === "text" ? r.answer.text : r.lastError ?? fallback;
  };
  const range: ReportRange = {
    target,
    artifactsDir: opts.artifactsDir,
    config,
    base: baseR.base,
    head,
    log: logR.ok ? logR.out : "",
    ask,
  };
  let body: string;
  try {
    body = await read.report(range);
  } catch (e) {
    body = node.errorLine(e instanceof Error ? e.message : String(e));
  }
  writeArtifact(outFile, body);
  await node.after?.(range, body);
  return REPORTED;
}

/** The node's Script-node entry: env in, one token out (the reader's own function). */
export function reportNodeCli(drain: (target: string, opts: ReportOpts) => Promise<string>): () => Promise<void> {
  return async () => {
    await runNode({
      artifacts: true,
      run: ({ target, artifactsDir, config }) => drain(target, { artifactsDir, config }),
    });
  };
}
