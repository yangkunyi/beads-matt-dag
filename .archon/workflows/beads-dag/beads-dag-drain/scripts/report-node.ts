/**
 * The skeleton both drain-end report nodes run: read review-base and stop with the owner's skip line
 * when it is not there, let the node read its own input (the range probe, review.md), read Main and the
 * range's commit menu, run the node's agents and take each answer off the runner (else the runner's
 * failure report, else the node's own fallback), write the artifact, and turn a throw from the report
 * into the node's own error line.
 *
 * Review and summary were two copies of those steps, differing only in the shape they produce (one
 * reviewer per axis, one summariser over review.md) and in the word their error line starts with. A node
 * states those two differences and nothing else, so a fourth report node is a shape rather than another
 * copy.
 *
 * The range is this run's, and its source is the base the opening node recorded: `base..Main` is what
 * the drain merged, and no run's report can reach past its own base. A run that merged nothing reads an
 * empty range, writes its skip line, spends no agent, and reports `nothing`.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultAgent, type AgentRunner } from "./agent.ts";
import { loadConfig, type PackConfig } from "./config.ts";
import { git } from "./git.ts";
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

/** What a node's own read gets: where it runs, and the base it reports on. */
type ReportInput = Pick<ReportRange, "target" | "artifactsDir" | "base">;

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
};

/** A reader node's whole outcome: it reported, or it had nothing to report. */
export type ReportOutcome = typeof REPORTED | typeof NOTHING_TO_REPORT;

/** Run one report node end to end: the ordering, the skips and the error handling live here. */
export async function runReportNode(node: ReportNode, target: string, opts: ReportOpts): Promise<ReportOutcome> {
  mkdirSync(opts.artifactsDir, { recursive: true });
  const outFile = join(opts.artifactsDir, node.rel);
  const baseR = readReviewBase(opts.artifactsDir);
  if ("skip" in baseR) {
    writeArtifact(outFile, baseR.skip);
    return NOTHING_TO_REPORT;
  }
  const read = await node.read({ target, artifactsDir: opts.artifactsDir, base: baseR.base });
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
  const config = opts.config ?? loadConfig(target);
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
