/**
 * The settlement: the one order in which an attempt's outcome becomes a fact.
 *
 * **Merge, then record** (ADR-0002). A successful turn's branch is merged into Main first - under the
 * Main-write lock - and only once that has landed is the issue closed in the store, outside the lock,
 * in the store's own transaction. So a recorded close always has its merge commit behind it, and the one
 * dangerous interleaving - a store saying "done" while Main lacks the work, releasing dependents against
 * a Main that is missing their blocker - cannot arise. The other interleaving is safe: a run killed
 * between the two leaves the issue `in_progress` while its work is in Main, which the next drain's
 * opening repair reads from git and closes. Nothing here closes an issue that a merge did not precede;
 * there is no second path to `closed`.
 *
 * Last, the worktree and its branch are dropped - after the merge, and after the record, so a crash
 * before the record leaves both the issue and its work where the repair can find them. A failure to drop
 * them is reported and does not rewrite the record: the work landed, and a leftover worktree is the
 * next drain's sweep, not a reason to say the attempt failed.
 *
 * **A failure records, and never closes.** The reason becomes a comment and the issue goes back to
 * `open`, so nothing was merged, its dependents stay exactly where they were, and the next drain's
 * `bd ready` offers it again.
 */
import { withMainLock } from "./lock.ts";
import { mergeIntoMain, removeMergedWorktree } from "./main-writes.ts";
import type { IssueNames } from "./naming.ts";
import { closeIssue, recordFailedAttempt, type Store, type StoreIssue } from "./store.ts";

/**
 * An attempt that did not land: the reason as a comment, the issue back to `open`, nothing closed. No
 * lock is needed, because this writes the store and not Main.
 */
export function settleFailed(store: Store, target: string, issue: StoreIssue, reason: string): void {
  recordFailedAttempt(store, target, issue.id, reason);
}

/**
 * An attempt that did: merge the issue's branch into Main, close the issue as merged, then drop the
 * worktree and branch.
 *
 * The merge is one lock transaction and the removal is another, with the store write between them and
 * outside both - that separation is the point of the order, not an accident of it. A branch whose merge
 * already landed (a repair) is not merged twice; `mergeIntoMain` finds the merge commit instead.
 *
 * `integrateMain`, when the caller passes it, runs inside the same lock transaction, immediately before
 * the merge: it is how the executor brings Main into the worktree (worktree.ts) so the branch being
 * merged contains the Main that is being merged into. One transaction, because a writer that landed a
 * change between the two could turn the merge into a conflict the caller has no turn left for. A
 * conflict in that step throws out of here, having closed nothing and left the merge standing in the
 * worktree - which is what the conflict turn reads.
 *
 * Throws only from the merge: a merge that cannot land is the attempt's failure, and the caller records
 * it as one. Once the close has been written, nothing here throws.
 */
export async function settleMerged(
  target: string,
  store: Store,
  issue: StoreIssue,
  names: IssueNames,
  integrateMain?: () => void,
): Promise<{ mergeCommit: string; created: boolean }> {
  const landed = await withMainLock(target, () => {
    integrateMain?.();
    return mergeIntoMain(target, names);
  });

  // The record. Outside the lock, on purpose: the store has its own transaction, and the lock is for
  // Main's git writes. `merged <branch>` is what this closure means, and it is checkable against git.
  closeIssue(store, target, issue.id, `merged ${names.branch}`);

  try {
    await withMainLock(target, () => removeMergedWorktree(target, names));
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(`${issue.handle ?? issue.id}: merged and recorded, but its worktree was left behind: ${reason}`);
  }
  return landed;
}
