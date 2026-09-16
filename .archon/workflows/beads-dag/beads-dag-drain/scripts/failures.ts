/**
 * The failures block: what the store records about the attempts a run left failing.
 *
 * A failure is an **event, not a status** (§10.3, ADR-0003): the reason is a comment and the issue goes
 * back to `open`, so "what failed here, and how many times has this issue burned" is a *reading* of the
 * store — `bd comments <id> --json`, counted over the `attempt N failed:` records — and never a counter
 * this pack keeps. Nothing new is written for it: no file, no store field, no artifact of its own. The
 * one thing the store cannot answer on its own is *which run* attempted an issue, and that is bookkeeping
 * the run already has (`attempted-ids.json`, the same file pick composes the frontier from).
 *
 * Two reports read it. The drain's summary narrows the rows with `failedIssues` below, whose repairs are
 * git facts; the reading executor's report (`beads-dag-inquiry/scripts/report.ts`) builds that half
 * itself, because a reading's repair is a store fact, and reads `failuresBlock` for the shape — one
 * format for one fact, whichever domain is reporting.
 *
 * The block is written by the node, never by a model: the numbers a reader sees are exactly the store's
 * answers, and the report's prose is left where it was, above the block.
 *
 * Two kinds of issue are named:
 *
 * - **the ones this run attempted and left failing** — the run claimed them, the store holds them `open`
 *   and their comments carry the reasons;
 * - **the ones an opening repair reopened** — a repair is the run's own first step, its reopen writes a
 *   failure comment with a reason only the repair writes (`leftoverReason`, or the naming failure), and
 *   an issue repaired that way is startable again: the report names it even when this run did not retry
 *   it. The reason text is the same on every run, so a row says an opening repair reopened it and never
 *   claims *this* run's open did — the store has no clock a run could be attributed by.
 *
 * A repair that **closed** an issue writes no failure comment at all: its close reason is exactly the
 * settlement's (`merged <branch>`, ticket 07's decision), so the store cannot tell the two apart and no
 * row could be honest. That half belongs to the range's report (a merge this run did not make), not here.
 */
import { issueNames } from "./naming.ts";
import { leftoverReason } from "./reconcile.ts";
import { allIssues, recordedFailures, type RecordedFailure, type Store, type StoreIssue } from "./store.ts";
import { mainBranch } from "./worktree.ts";

/** The heading the block carries in the artifact: one name, so the report and its readers agree. */
export const FAILURES_HEADING = "## Failed attempts";

/** What a run with nothing to say about failures writes: one line, never an empty section. */
const NO_FAILURES_LINE = "none this run";

/** One issue the report names: what the store records, and what this run knows about it. */
export type FailedIssue = {
  id: string;
  handle: string | undefined;
  /** The failures the store records on the issue, oldest first. */
  failures: RecordedFailure[];
  /** Whether this run claimed it. An issue repaired at open and not retried is not an attempt. */
  attempted: boolean;
  /** Whether the latest record is the reason the opening repair reopens a leftover with. */
  reopenedAtOpen: boolean;
};

/**
 * Whether one failure comment is the opening repair's reopen of this issue. It is an equality with the
 * two reasons that repair writes, not a guess at prose: the branch names the repair inspected, and - for
 * an issue that cannot be named in git at all - the naming failure itself. Nothing else ever writes a
 * failure comment on an issue that cannot be named, because nothing else can resolve such an issue.
 */
function isRepairReopen(target: string, issue: StoreIssue, failure: RecordedFailure): boolean {
  let branch: string;
  try {
    branch = issueNames(issue).branch;
  } catch (e) {
    const naming = e instanceof Error ? e.message : String(e);
    return failure.reason === naming;
  }
  return failure.reason === leftoverReason(mainBranch(target), branch);
}

/**
 * The issues the drain's report names: what the store holds `open` with a failure record, narrowed to the
 * ones this run touched - the ones it attempted, and the ones an opening repair reopened.
 *
 * One store query for the issues and one per issue that carries any comment at all (`commentCount` is
 * the store's own cheap prefilter; only a commented issue can carry a failure). Everything else is out: a
 * closed issue is not a failure to report, and an issue with no failure comment has nothing to say -
 * there are no zero-filled rows.
 */
export function failedIssues(target: string, store: Store, attempted: Set<string>): FailedIssue[] {
  const rows: FailedIssue[] = [];
  for (const issue of allIssues(store, target)) {
    if (issue.status !== "open") continue;
    if (issue.commentCount === 0) continue;
    const failures = recordedFailures(store, target, issue.id);
    if (failures.length === 0) continue;
    const reopenedAtOpen = isRepairReopen(target, issue, failures[failures.length - 1]!);
    if (!attempted.has(issue.id) && !reopenedAtOpen) continue;
    rows.push({
      id: issue.id,
      handle: issue.handle,
      failures,
      attempted: attempted.has(issue.id),
      reopenedAtOpen,
    });
  }
  return rows;
}

/** One row: the store's own count and status, and where the issue's latest record came from. */
function rowLine(row: FailedIssue): string {
  const label = row.handle !== undefined ? `${row.handle} [${row.id}]` : row.id;
  const count = `${row.failures.length} recorded failure${row.failures.length === 1 ? "" : "s"}, open`;
  const scope = row.attempted ? "attempted by this run" : "not attempted by this run";
  const latest = row.failures[row.failures.length - 1]!;
  const record = row.reopenedAtOpen
    ? `reopened by an opening repair: ${latest.reason}`
    : `latest: ${latest.text}`;
  return `- ${label} — ${count}; ${scope}; ${record}`;
}

/**
 * The block, as the artifact carries it: the heading, then one line per issue, or the one line that says
 * there is nothing to say. Ends with a newline, like every artifact this pack writes.
 */
export function failuresBlock(rows: FailedIssue[]): string {
  const body = rows.length === 0 ? NO_FAILURES_LINE : rows.map(rowLine).join("\n");
  return `${FAILURES_HEADING}\n\n${body}\n`;
}
