/**
 * The experiment executor's last node: the run's close-out, and the release of its run lock.
 *
 * It is not the drain's review or summary and not the reading executor's draft report. Those nodes
 * spend a model, or they name a frontier and the drafts awaiting the operator. This one does neither.
 * It reads the run's own `attempted-ids.json` and the store, and writes three facts a later reader
 * can check without walking the store by hand:
 *
 *   1. attempted — the tickets this run claimed, resolved to handles;
 *   2. closed-on-record — which of those the store holds `closed`. In this domain that status is
 *      completeness of the record (ADR-0006), already written by the per-ticket node; this node
 *      does not close;
 *   3. failed — which of those the store holds `open` with an `attempt N failed:` comment, in the
 *      same failures-block shape the other two executors use.
 *
 * The experiment-run include stays out of this node: a last node that imported the per-ticket folder
 * would be a second home for record, claim, or tool spawn, and those belong to the include. Folders
 * stay split.
 *
 * Being the run's last node, this is also where the Target run lock this run's `open` took is given
 * back by a run that ends normally, exactly as the drain's `summary` and the reading executor's
 * `report` give it back. A run killed before here leaves the file behind, and the next run steals
 * it by its dead holder's pid.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { readAttempted } from "../../scripts/attempted.ts";
import { loadConfig, type PackConfig } from "../../scripts/config.ts";
import { failuresBlock, type FailedIssue } from "../../scripts/failures.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { nodeLine, REPORTED } from "../../scripts/node-outcomes.ts";
import { releaseRunLock } from "../../scripts/run-lock.ts";
import {
  allIssues,
  preflightStore,
  recordedFailures,
  type Store,
  type StoreIssue,
} from "../../scripts/store.ts";
import { READING_NONE_LABEL } from "./record.ts";

/** The run's close-out, relative to ARTIFACTS_DIR. */
export const REPORT_MD_REL = "report.md";

/** What one close-out is written from: where the run's artifacts are, and the Target's config. */
export type ExperimentReportOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
};

/** One ticket this run touched, named the way the close-out names it. */
type NamedTicket = {
  id: string;
  handle: string;
};

/** The facts one close-out is written from: attempted-ids, plus the store's answers for those ids. */
type ReportFacts = {
  /** The run: the basename of its artifacts directory, Archon's own per-run name for it. */
  runId: string;
  /** The tickets this run claimed, by handle. */
  attempted: NamedTicket[];
  /** The attempted tickets the store holds closed — completeness of record, already written. */
  closedOnRecord: NamedTicket[];
  /** The attempted tickets the store holds open with a failed-attempt comment. */
  failed: FailedIssue[];
};

/** What a close-out says where a section has nothing in it. */
const NONE_THIS_RUN = "none this run";

/** The handle a close-out names a ticket by, or the store's id when the tracker published none. */
function handleOrId(issue: { id: string; handle: string | undefined }): string {
  return issue.handle ?? issue.id;
}

/** Handle order, the same order a batch of tickets is picked in. */
function compareHandles(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The tickets this run claimed, in handle order. An id the store no longer holds is still named: the
 * run's memory is the source, and a missing issue is a fact about the store, not a reason to drop it.
 */
function attemptedTickets(issues: readonly StoreIssue[], attempted: ReadonlySet<string>): NamedTicket[] {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const rows: NamedTicket[] = [];
  for (const id of attempted) {
    const issue = byId.get(id);
    rows.push(issue === undefined ? { id, handle: id } : { id, handle: handleOrId(issue) });
  }
  return rows.sort((a, b) => compareHandles(a.handle, b.handle));
}

/**
 * The attempted tickets the store holds `closed`. Closed here is completeness of the record
 * (ADR-0006): the per-ticket node already made that check and wrote the status. This reading does
 * not look at the document, and it does not close.
 */
function closedOnRecord(issues: readonly StoreIssue[], attempted: ReadonlySet<string>): NamedTicket[] {
  return issues
    .filter((issue) => attempted.has(issue.id) && issue.status === "closed")
    .map((issue) => ({ id: issue.id, handle: handleOrId(issue) }))
    .sort((a, b) => compareHandles(a.handle, b.handle));
}

/**
 * The attempted tickets this run left failing: `open` in the store, with the store's own
 * `attempt N failed:` comments. A closed ticket is not a failure even when earlier attempts sit
 * under the close; those belong to closed-on-record. A ticket this run never attempted is out,
 * because the close-out is this run's reading of its own `attempted-ids.json`.
 */
function failedAttempts(
  store: Store,
  target: string,
  issues: readonly StoreIssue[],
  attempted: ReadonlySet<string>,
): FailedIssue[] {
  const rows: FailedIssue[] = [];
  for (const issue of issues) {
    if (!attempted.has(issue.id)) continue;
    if (issue.status !== "open") continue;
    if (issue.commentCount === 0) continue;
    const failures = recordedFailures(store, target, issue.id);
    if (failures.length === 0) continue;
    rows.push({
      id: issue.id,
      handle: issue.handle,
      failures,
      attempted: true,
      reopenedAtOpen: false,
    });
  }
  return rows;
}

/** One section of the close-out: its heading, its body, and exactly one trailing newline. */
function section(heading: string, body: string): string {
  return `## ${heading}\n\n${body}\n`;
}

/** One ticket on its own line. */
function ticketLine(ticket: NamedTicket): string {
  return `- ${ticket.handle} [${ticket.id}]`;
}

/**
 * One closed-on-record ticket: the store's close, and the unread marker the completeness close
 * stamps in the same act, when it is still on the ticket.
 */
function closedLine(issue: StoreIssue): string {
  const unread = issue.labels.includes(READING_NONE_LABEL) ? `; label ${READING_NONE_LABEL}` : "";
  return `- ${handleOrId(issue)} [${issue.id}] — closed${unread}`;
}

/**
 * The close-out, as the artifact carries it. The headline is the whole run in one line; the three
 * sections are attempted, closed-on-record, and failed, in that order. An empty section says so
 * rather than being left out, so a run that did nothing is readable as a run that did nothing.
 */
function reportBody(facts: ReportFacts, closedIssues: readonly StoreIssue[]): string {
  const headline =
    `${facts.attempted.length} attempted, ${facts.closedOnRecord.length} closed on record, ` +
    `${facts.failed.length} failed.`;
  const closedById = new Map(closedIssues.map((issue) => [issue.id, issue]));
  return [
    `# beads-dag-experiment — run ${facts.runId}\n\n${headline}\n`,
    section(
      "Attempted",
      facts.attempted.length === 0 ? NONE_THIS_RUN : facts.attempted.map(ticketLine).join("\n"),
    ),
    section(
      "Closed on record",
      facts.closedOnRecord.length === 0
        ? NONE_THIS_RUN
        : facts.closedOnRecord
            .map((ticket) => {
              const issue = closedById.get(ticket.id);
              return issue === undefined ? ticketLine(ticket) : closedLine(issue);
            })
            .join("\n"),
    ),
    failuresBlock(facts.failed),
  ].join("\n");
}

/**
 * Write the run's close-out, and give the run lock back. Returns the node's token.
 *
 * Synchronous on purpose: nothing here is an agent, and a close-out whose numbers are store answers
 * has no reason to be anything else. A Target whose store cannot be read fails this node loudly
 * rather than writing a document that says nothing happened: the close-out's whole value is that
 * its numbers are the store's answers, and a document built without them would be a guess.
 *
 * The lock is released after the write, deliberately: whatever the close-out says, the run is over
 * when this returns, and a release that cannot happen leaves a file whose holder pid the next run
 * finds dead and steals. No node after this one exists, and none before it may end the run, so the
 * release has exactly one home.
 */
export function reportExperimentRun(target: string, opts: ExperimentReportOpts): string {
  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  const issues = allIssues(store, target);
  const attempted = readAttempted(opts.artifactsDir);
  const closed = closedOnRecord(issues, attempted);
  const closedIssues = issues.filter((issue) => closed.some((row) => row.id === issue.id));
  const body = reportBody(
    {
      runId: basename(opts.artifactsDir),
      attempted: attemptedTickets(issues, attempted),
      closedOnRecord: closed,
      failed: failedAttempts(store, target, issues, attempted),
    },
    closedIssues,
  );
  mkdirSync(opts.artifactsDir, { recursive: true });
  writeFileSync(join(opts.artifactsDir, REPORT_MD_REL), body.endsWith("\n") ? body : `${body}\n`);
  releaseRunLock(target, opts.artifactsDir);
  return nodeLine(REPORTED);
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config }) => reportExperimentRun(target, { artifactsDir, config }),
  });
}
