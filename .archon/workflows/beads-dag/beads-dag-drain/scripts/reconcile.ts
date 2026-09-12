/**
 * The repair: work a drain that was killed left claimed, resolved from git.
 *
 * A run killed between the merge and the store write leaves an issue `in_progress` whose work *is* in
 * Main; one killed before its work landed leaves an issue `in_progress` whose work is not. Only git can
 * tell those apart — the store is the thing being repaired, so its `in_progress` is the question and
 * never the answer — and each resolution is one the flow already has (settle.ts):
 *
 *   a merge commit of the issue's branch on Main   → record the close the killed run never wrote, and
 *                                                    drop the worktree and branch the settled path
 *                                                    would have dropped
 *   no merge commit of that branch                 → back to `open`, with the reason recorded as a
 *                                                    comment, worktree and branch left for the report
 *
 * The repair is not an attempt by this run. A reopened issue is deliberately left out of
 * `attempted-ids.json`, so the same run's pick offers it as a retry: the work never landed, and the run
 * that would have retried it is the one that died. That is why this runs in the opening node, before
 * pick — an issue repaired here is a candidate in the same drain, and an issue repaired to `closed` is
 * out of the frontier before pick ever sees it.
 *
 * One lookup decides, and it is 05's: `mergedOnMain` finds a merge commit on Main whose subject names
 * the issue's branch *and* whose second parent is that branch's own tip. A branch carrying only history
 * Main already had — an attempt killed before its first commit, or one re-created from Main after an
 * earlier attempt of the same issue merged — is therefore never read as landed, and neither is a merge
 * commit that merely mentions the branch in its subject.
 *
 * Decision issues are skipped, not repaired: nothing in this flow ever claims one, so an `in_progress`
 * decision issue belongs to whoever did claim it (the wayfinder operator), and reopening or closing it
 * would fight them — and a close would release implementation work across the domain boundary that
 * ADR-0004 exists to keep closed. The repair reports each one it left alone instead.
 */
import { DECISION_TYPE } from "./domains.ts";
import { mergedOnMain } from "./main-writes.ts";
import { issueNames, type IssueNames } from "./naming.ts";
import { settleFailed, settleMerged } from "./settle.ts";
import { inProgressIssues, type Store, type StoreIssue } from "./store.ts";
import { mainBranch } from "./worktree.ts";

/** What one leftover was resolved to: a close a merge had already earned, a recorded failure, or a
 * decision issue the drain leaves where it found it. */
export type Repair =
  | { id: string; handle: string | undefined; outcome: "merged"; mergeCommit: string }
  | { id: string; handle: string | undefined; outcome: "failed"; reason: string }
  | { id: string; handle: string | undefined; outcome: "left-alone"; reason: string };

/**
 * The reason a leftover whose work never landed is put back to `open` with, from the two facts git gave
 * the repair. One builder, so the repair and the drain-end report cannot spell it differently: the
 * report reads a failure comment and has to recognise this one as the repair's reopen.
 */
export function leftoverReason(main: string, branch: string): string {
  return `leftover in progress and ${main} carries no merge commit of ${branch}`;
}

/**
 * A leftover whose work did not land: the reason as a comment, the issue back to `open`, nothing
 * closed. It is one function because both of the repair's unlanded outcomes are the same write — the
 * work never landed because Main has no merge of it, and the work never landed because the issue could
 * not even be named in git. Failing the drain on the second would trade one unresolvable issue for a
 * drain that never runs.
 */
function reopen(store: Store, target: string, issue: StoreIssue, reason: string): Repair {
  settleFailed(store, target, issue, reason);
  console.error(`${issue.handle ?? issue.id}: ${reason}`);
  return { id: issue.id, handle: issue.handle, outcome: "failed", reason };
}

/**
 * Resolve every implementation issue the store holds `in_progress`: close it when git shows its work
 * landed, otherwise put it back to `open` with the reason recorded. A decision issue is left alone and
 * reported instead. Returns what each leftover was resolved to, in the store's order.
 */
export async function reconcileLeftovers(target: string, store: Store): Promise<Repair[]> {
  const repairs: Repair[] = [];
  for (const issue of inProgressIssues(store, target)) {
    const label = issue.handle ?? issue.id;
    if (issue.type === DECISION_TYPE) {
      const reason = "a decision issue's status is not this drain's to repair: nothing in this flow claims one";
      console.error(`${label}: left alone: ${reason}`);
      repairs.push({ id: issue.id, handle: issue.handle, outcome: "left-alone", reason });
      continue;
    }
    let names: IssueNames | undefined;
    try {
      names = issueNames(issue);
    } catch (e) {
      repairs.push(reopen(store, target, issue, e instanceof Error ? e.message : String(e)));
      continue;
    }

    const landed = mergedOnMain(target, names);
    if (landed !== undefined) {
      // `settleMerged` finds this merge rather than making a second one, records the close, and drops
      // the worktree and branch — exactly the state the killed run was interrupted before reaching.
      const { mergeCommit } = await settleMerged(target, store, issue, names);
      console.error(`${label}: repaired: ${mergeCommit} had already landed, so the issue is closed`);
      repairs.push({ id: issue.id, handle: issue.handle, outcome: "merged", mergeCommit });
      continue;
    }

    const reason = leftoverReason(mainBranch(target), names.branch);
    repairs.push(reopen(store, target, issue, reason));
  }
  return repairs;
}
