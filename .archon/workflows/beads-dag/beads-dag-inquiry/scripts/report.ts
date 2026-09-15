/**
 * The reading executor's last node: the run's report, and the release of its run lock.
 *
 * This is the one document a human reads first (the spec's "The two reports"), and it is written by the
 * node and never by a model: every number and every name in it is a store answer, a git answer, or the
 * run's own record of something a store and a git cannot answer - so a batch run is one file to read
 * instead of an archaeology exercise in the store. It is never consulted as
 * state (ADR-0005), and nothing in the pack reads it back. The bookkeeping it could have kept - a
 * `readings.json` caching what landed, a file listing what awaits the operator - is deliberately absent:
 * the store already holds both facts, and the report is a reading of it.
 *
 * Four things, in the order the spec lists them:
 *
 *   1. the questions this run read and landed - the note's path and the commit, read out of the draft
 *      comment the reading wrote (`landedDraft`, inquiry.ts), and the label the landing stamped;
 *   2. the questions it attempted and left failing - the store's own `attempt N failed:` comments, with
 *      the ordinal and the count the store holds, in the drain's failures block (`failuresBlock`);
 *   3. the frontier it left behind - the handles still eligible, recomputed with `pick`'s own rules over
 *      an empty attempted set, so the report describes what the next run would find and a run that did
 *      nothing says so;
 *   4. the draft answers now awaiting the operator, as handles - the sweep the tracker contract names
 *      (`bd list -t decision -s open -l answer:draft`), read from the store at report time, so it covers
 *      a reading an earlier run landed and a question whose leg label is gone.
 *
 * And one thing the spec's own module rule asks for, which belongs to none of the four: the paths the run
 * wrote that the flow does not name - a reading's working files, left uncommitted on purpose and named
 * here rather than committed (`UNNAMED_PATHS_FILE`, inquiry.ts). It comes last, so the four sections keep
 * the spec's order, and it says `none this run` like every other section rather than being left out.
 *
 * The one fact the store cannot answer is *which questions this run touched*: `attempted-ids.json` is the
 * run's own memory (the same file `pick` composes its frontier from), and the failures block names a
 * question an opening repair reopened from the repair's own record (`repairs.json`). The unnamed paths are
 * the same kind of fact - the working tree of the moment the reading ran is the only place they existed -
 * and they are the run's own record too (`unnamed-paths.jsonl`).
 *
 * Being the run's last node, this is also where the run lock is given back by a run that ends normally,
 * exactly as the drain's `summary` gives it back. A run killed before here leaves the file behind, and
 * the next run steals it by its dead holder's pid.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { readAttempted } from "../../beads-dag-drain/scripts/attempted.ts";
import { loadConfig, type PackConfig } from "../../beads-dag-drain/scripts/config.ts";
import { failuresBlock, type FailedIssue } from "../../beads-dag-drain/scripts/failures.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { nodeLine, REPORTED } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { releaseRunLock } from "../../beads-dag-drain/scripts/run-lock.ts";
import {
  allIssues,
  issueComments,
  preflightStore,
  recordedFailures,
  type Store,
  type StoreIssue,
} from "../../beads-dag-drain/scripts/store.ts";
import { compareHandles, handleOrId, readingFrontier } from "./frontier.ts";
import { DRAFT_LABEL, landedDraft, readUnnamedPaths, type UnnamedPaths } from "./inquiry.ts";
import { readReadingRepairs, type ReadingRepair } from "./leftovers.ts";

/** The run's report, relative to ARTIFACTS_DIR. The one document a reading run leaves to be read. */
export const REPORT_MD_REL = "report.md";

/** What one report is written from: where the run's artifacts are, and the Target's config. */
export type InquiryReportOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
};

/** One question this run read: where the reading landed, and the label the landing stamped. */
type LandedReading = {
  id: string;
  handle: string;
  /** The note the draft comment names, and the commit that carries it; both unset when no comment does. */
  noteRel?: string;
  commit?: string;
};

/** The facts one report is written from, all of them read from the store or from the run's own record. */
type ReportFacts = {
  /** The run: the basename of its artifacts directory, Archon's own per-run name for it. */
  runId: string;
  /** The questions this run read and landed, by handle. */
  landed: LandedReading[];
  /** The questions this run attempted and left failing, store readings in the drain's own shape. */
  failed: FailedIssue[];
  /** The handles still eligible - the frontier a next run would find. */
  frontier: string[];
  /** The handles carrying a draft answer the operator has not answered yet. */
  awaiting: string[];
  /** The paths this run wrote that the flow does not name, per ticket, as the reading node recorded them. */
  unnamed: UnnamedPaths[];
};

/** What a report says where a section has nothing in it. */
const NONE_THIS_RUN = "none this run";
const NOTHING_ELIGIBLE = "nothing eligible";
const NONE = "none";

/**
 * The questions this run read and landed.
 *
 * The landing is a store fact and the store is where it is read from: a question this run attempted that
 * carries the draft label is one whose reading landed. So a question a killed run left claimed with the
 * draft label - repaired to `open` at this run's start, and never attempted by it - is not in this list;
 * it awaits the operator all the same, and the fourth section names it.
 */
function landedReadings(
  store: Store,
  target: string,
  issues: StoreIssue[],
  attempted: ReadonlySet<string>,
): LandedReading[] {
  const landed: LandedReading[] = [];
  for (const issue of issues) {
    if (!attempted.has(issue.id)) continue;
    if (!issue.labels.includes(DRAFT_LABEL)) continue;
    const draft = landedDraft(issueComments(store, target, issue.id));
    landed.push({ id: issue.id, handle: handleOrId(issue), ...(draft ?? {}) });
  }
  return landed.sort((a, b) => compareHandles(a.handle, b.handle));
}

/**
 * The questions this run attempted and left failing, in the drain's failures-block shape: the store's own
 * failure comments, with the ordinal and the count they carry.
 *
 * Two narrowings, both facts the store alone cannot give. A question with the draft label is not a
 * failure: its reading landed, its status is `open` again, and the failure comment under the draft is an
 * earlier attempt's. And a question this run never attempted is named only when an opening repair
 * reopened it - the repair's reason is a failure comment like any other, and this run's open is what
 * wrote it.
 */
function failedAttempts(
  store: Store,
  target: string,
  issues: StoreIssue[],
  attempted: ReadonlySet<string>,
  repairs: readonly ReadingRepair[],
): FailedIssue[] {
  const rows: FailedIssue[] = [];
  for (const issue of issues) {
    if (issue.labels.includes(DRAFT_LABEL)) continue;
    if (issue.status !== "open") continue;
    // The store's own cheap prefilter: only a commented issue can carry a failure record.
    if (issue.commentCount === 0) continue;
    const failures = recordedFailures(store, target, issue.id);
    if (failures.length === 0) continue;
    const attemptedHere = attempted.has(issue.id);
    const reopenedAtOpen = !attemptedHere && repairs.some((r) => r.id === issue.id && r.outcome === "failed");
    if (!attemptedHere && !reopenedAtOpen) continue;
    rows.push({ id: issue.id, handle: issue.handle, failures, attempted: attemptedHere, reopenedAtOpen });
  }
  return rows;
}

/** One section of the report: its heading, its body, and exactly one trailing newline. */
function section(heading: string, body: string): string {
  return `## ${heading}\n\n${body}\n`;
}

/** One handle on its own line, for the sections that name questions rather than report on them. */
function handleLine(handle: string): string {
  return `- ${handle}`;
}

/** One landed reading: what landed, where it is, and the label the landing stamped. */
function landedLine(reading: LandedReading): string {
  const where =
    reading.noteRel !== undefined && reading.commit !== undefined
      ? `note ${reading.noteRel} at commit ${reading.commit}`
      : "the draft label is on it, but no draft comment names its note and commit";
  return `- ${reading.handle} [${reading.id}] — ${where}; label ${DRAFT_LABEL}`;
}

/** One ticket's unnamed paths: what the reading wrote, and the one thing the flow did not do with it. */
function unnamedLine(entry: UnnamedPaths): string {
  return `- ${entry.handle} — ${entry.paths.join(", ")} (not committed)`;
}

/**
 * The report, as the artifact carries it. The headline is the whole run in one line; the four sections are
 * the spec's own list, in its own order, and the fifth - the paths the run wrote that the flow does not
 * name - follows them. An empty section says so rather than being left out, so a run that did nothing is
 * readable as a run that did nothing.
 */
function reportBody(facts: ReportFacts): string {
  const headline =
    `${facts.landed.length} read and landed, ${facts.failed.length} failed, ` +
    `${facts.frontier.length} still eligible, ${facts.awaiting.length} awaiting the operator.`;
  return [
    `# beads-dag-inquiry — run ${facts.runId}\n\n${headline}\n`,
    section(
      "Read and landed",
      facts.landed.length === 0 ? NONE_THIS_RUN : facts.landed.map(landedLine).join("\n"),
    ),
    failuresBlock(facts.failed),
    section(
      "Frontier left behind",
      facts.frontier.length === 0 ? NOTHING_ELIGIBLE : facts.frontier.map(handleLine).join("\n"),
    ),
    section(
      "Draft answers awaiting the operator",
      facts.awaiting.length === 0 ? NONE : facts.awaiting.map(handleLine).join("\n"),
    ),
    section(
      "Left uncommitted",
      facts.unnamed.length === 0 ? NONE_THIS_RUN : facts.unnamed.map(unnamedLine).join("\n"),
    ),
  ].join("\n");
}

/**
 * Write the run's report, and give the run lock back. Returns the node's token.
 *
 * Synchronous on purpose: nothing here is an agent, and a report whose numbers are store and git answers
 * has no reason to be anything else. A Target whose store cannot be read fails this node loudly rather
 * than writing a report that says nothing happened: the report's whole value is that its numbers are the
 * store's answers, and a report built without them would be the one thing this document must never be -
 * a guess.
 */
export function reportInquiryRun(target: string, opts: InquiryReportOpts): string {
  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  const issues = allIssues(store, target);
  const attempted = readAttempted(opts.artifactsDir);
  const repairs = readReadingRepairs(opts.artifactsDir);
  // The frontier a NEXT run would find: `pick`'s own rules over the empty attempted set, because "what
  // this run already tried" is the run's memory and the report describes the store. A question this run
  // failed is eligible again by design - the retry channel is the frontier itself.
  const frontier = readingFrontier(store, target, new Set()).candidates.map(handleOrId);
  // The operator's sweep, and only the store answers it: every open decision question carrying a draft
  // answer, whoever's run landed it. Readiness is deliberately not part of it - a draft awaiting the
  // operator awaits him whether or not anything blocks its ticket.
  const awaiting = issues
    .filter(
      (issue) => issue.type === "decision" && issue.status === "open" && issue.labels.includes(DRAFT_LABEL),
    )
    .map(handleOrId)
    .sort(compareHandles);
  const body = reportBody({
    runId: basename(opts.artifactsDir),
    landed: landedReadings(store, target, issues, attempted),
    failed: failedAttempts(store, target, issues, attempted, repairs),
    frontier,
    awaiting,
    // The run's own record, ordered like every other list of questions the report names. The store cannot
    // answer this one: what a reading left half-written existed in a working tree, once.
    unnamed: readUnnamedPaths(opts.artifactsDir).sort((a, b) => compareHandles(a.handle, b.handle)),
  });
  mkdirSync(opts.artifactsDir, { recursive: true });
  writeFileSync(join(opts.artifactsDir, REPORT_MD_REL), body.endsWith("\n") ? body : `${body}\n`);
  releaseRunLock(target, opts.artifactsDir);
  return nodeLine(REPORTED);
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config }) => reportInquiryRun(target, { artifactsDir, config }),
  });
}
