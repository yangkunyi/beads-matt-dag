/**
 * The Main-write seam: every function that changes the Target's branch goes through here, and every one
 * of them refuses to run unless the caller holds the Main-write lock (lock.ts). That refusal is what
 * makes the lock more than a convention: a caller cannot forget it, because the function will not move
 * Main without it.
 *
 * Two things live here that the rest of the flow composes from:
 *
 * - **the merge.** A real merge (no fast-forward) of the issue's branch into Main, so the merge commit
 *   exists to be found later - which is what the next drain's reconcile reads, and what makes
 *   "closed" a fact about Main rather than a claim about it. The subject is derived from the issue's
 *   names, so the lookup needs no directory listing and the bead's own id stays out of git.
 * - **the removal**, which is the merge's other half: it deletes the branch and its worktree, and it
 *   refuses to do either unless Main already carries the merge.
 *
 * It also carries the `.gitignore` rules Main needs to stay clean while the drain runs: the pack
 * writes them once per Target, idempotently, in the same lock as the rest of Main's writes, and it
 * also untracks the store's interaction log, which `bd init` commits and every command rewrites - a
 * Target's own spelling of a rule is respected, and a Target that already has both gains no commit.
 *
 * What is deliberately *not* here: the store. The lock guards git, not the store (ADR-0002), so the
 * recording path is settle.ts and runs outside this module's lock.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { branchExists, git, gitOrThrow, isAncestor, revParse } from "./git.ts";
import { isMainLockHeld } from "./lock.ts";
import type { IssueNames } from "./naming.ts";
import { mainBranch } from "./worktree.ts";

/**
 * The lines that keep the Target's tree clean while the drain runs: `git status` on Main has to be
 * empty for a merge to be trusted, so what the drain's own machinery leaves in the tree is ignored.
 */
export const WORKTREES_IGNORE_LINE = "/worktrees/";

/**
 * The store rewrites its interaction log on every command, and `bd init` starts it out tracked. A
 * tracked file that is rewritten is dirt, ignored or not, so the ignore line is only half the fix: the
 * step below also untracks it when it is tracked.
 */
export const INTERACTIONS_IGNORE_LINE = "/.beads/interactions.jsonl";

/** The interactions log's path in the Target, relative to its root. */
export const INTERACTIONS_REL = ".beads/interactions.jsonl";

/** Spellings a Target may already use for the worktrees rule. Any of them means the line is not needed. */
const IGNORE_ALIASES = [WORKTREES_IGNORE_LINE, "worktrees/", "worktrees", "/worktrees"];

/** Spellings a Target may already use for the interactions rule. */
const INTERACTIONS_ALIASES = [INTERACTIONS_IGNORE_LINE, INTERACTIONS_REL];

/** The ignore lines' commit message; also what a later reader (and the tests) can count. */
const IGNORE_COMMIT_SUBJECT = "chore(beads-dag): ignore runtime paths";

/** No function in this module may run without the lock; the reason names the function, not the caller. */
function assertMainLock(what: string): void {
  if (!isMainLockHeld()) {
    throw new Error(`${what} writes Main and must run inside withMainLock(target, …)`);
  }
}

/**
 * Make sure the drain's own runtime paths are ignored on Main, committing that when they are not.
 *
 * Two rules, both of them the drain's own machinery rather than the Target's content: `worktrees/`,
 * where the issue's worktrees are made, and `.beads/interactions.jsonl`, which every store command
 * rewrites. The second one is why this is not only a `.gitignore` edit: `bd init` commits that file,
 * and an ignored-but-tracked file still reads as modified, which would leave `git status` dirty on a
 * Target that just had its whole drain recorded successfully. So a tracked log is removed from the
 * index here, in the same commit as the line that ignores it - the file itself stays on disk.
 *
 * Idempotent: a Target that already carries both rules - in any of the spellings they are usually
 * written in - and does not track the log gains no commit, and neither does the second issue of a
 * drain.
 */
export function ensureWorktreesIgnored(target: string): boolean {
  assertMainLock("ensureWorktreesIgnored");
  const file = join(target, ".gitignore");
  const body = existsSync(file) ? readFileSync(file, "utf8") : "";
  const written = body.split(/\r?\n/).map((line) => line.trim());
  const missing = [
    written.some((line) => IGNORE_ALIASES.includes(line)) ? undefined : WORKTREES_IGNORE_LINE,
    written.some((line) => INTERACTIONS_ALIASES.includes(line)) ? undefined : INTERACTIONS_IGNORE_LINE,
  ].filter((line): line is string => line !== undefined);
  // Tracked-ness is read from the index, not from the file: an ignored-but-tracked log is exactly the
  // state this step exists to end, and a log deleted from the worktree but still in the index is too.
  const tracked = git(target, ["ls-files", "--error-unmatch", "--", INTERACTIONS_REL]).ok;
  if (missing.length === 0 && !tracked) return false;
  if (missing.length > 0) {
    writeFileSync(file, `${body}${body === "" || body.endsWith("\n") ? "" : "\n"}${missing.join("\n")}\n`);
    gitOrThrow(target, ["add", ".gitignore"]);
  }
  // Force on purpose: the log is expected to have been rewritten since the commit that tracked it, and
  // the caller's intent is to stop tracking it - the working copy is kept either way.
  if (tracked) gitOrThrow(target, ["rm", "--cached", "--force", "--quiet", "--", INTERACTIONS_REL]);
  gitOrThrow(target, ["commit", "-m", IGNORE_COMMIT_SUBJECT]);
  return true;
}

/**
 * The Main commit subject that names an issue's merge. It is derived from the issue's names - never from
 * a directory listing - and it is the one string the next drain's reconcile looks for; the bead's id is
 * not in it.
 */
export function mergeSubject(names: IssueNames): string {
  return `beads-dag: merge ${names.branch}`;
}

/**
 * The merge commit Main carries for this issue's branch, or undefined when no merge landed.
 *
 * A merge commit is one with a second parent, and that second parent has to **be the branch's tip**: a
 * `--no-ff` merge of a branch records exactly the commit it landed, and the flow never commits to a
 * branch after merging it. Requiring the tip to be an ancestor of that parent instead would accept two
 * states that are not this branch's work: a branch Main already carried that has since been re-created
 * from Main (it contains the merged commit without being it), and a branch an out-of-band commit moved
 * past the merge. Both belong to the same question - did *this* branch's work land - and getting it
 * wrong closes an issue whose work is not in Main, which is the one thing ADR-0002 forbids.
 *
 * The subject is the other half of the test: the branch's names are derived, the subject names them, and
 * a merge of some other branch will not match. This is the check the removal insists on, and the one
 * ticket 07's reconcile reads git for; a branch that is gone is recognised by neither half, which is
 * why a caller can ask about an issue whose branch was already dropped.
 */
export function mergedOnMain(target: string, names: IssueNames): string | undefined {
  const log = git(target, ["log", "--merges", "--format=%H%x00%P%x00%s", mainBranch(target)]);
  if (!log.ok) return undefined;
  for (const line of log.out.split("\n")) {
    const [commit, parentsRaw, subject] = line.split("\0");
    if (!commit || !parentsRaw || subject !== mergeSubject(names)) continue;
    const parents = parentsRaw.split(" ").filter(Boolean);
    if (parents.length < 2) continue;
    // Both directions of ancestry hold exactly when the branch tip is that second parent; a branch that
    // is gone fails the first, so no merge of it is ever recognised here.
    const landedTip = parents[1]!;
    if (!isAncestor(target, landedTip, names.branch)) continue;
    if (!isAncestor(target, names.branch, landedTip)) continue;
    return commit;
  }
  return undefined;
}

/**
 * Merge the issue's branch into Main, under the caller's lock, and report the merge commit.
 *
 * Two situations reach this. Normally there is something to merge, and `--no-ff` makes sure the result
 * is a merge commit even when git could have fast-forwarded: without it, Main would move to the branch
 * tip and there would be nothing for the next drain's reconcile - or for a reviewer - to find. The
 * second situation is a merge that already landed: the branch is on Main, so this is the repair path
 * (a run killed between the merge and the store write) and merging again would be wrong; the commit
 * that landed is returned with `created: false`.
 *
 * A branch that carries nothing Main does not have is not a merge at all: an attempt that committed
 * nothing did not land, and the caller has to record it as a failure.
 */
export function mergeIntoMain(target: string, names: IssueNames): { mergeCommit: string; created: boolean } {
  assertMainLock("mergeIntoMain");
  const main = mainBranch(target);
  const landed = mergedOnMain(target, names);
  if (landed !== undefined) return { mergeCommit: landed, created: false };
  if (!branchExists(target, names.branch)) {
    throw new Error(`cannot merge ${names.branch}: the Target has no such branch`);
  }
  const ahead = Number(gitOrThrow(target, ["rev-list", "--count", `${main}..${names.branch}`]));
  if (!Number.isFinite(ahead) || ahead === 0) {
    throw new Error(`nothing to merge: ${names.branch} carries no commit ${main} does not have`);
  }

  const before = revParse(target, main);
  const merged = git(target, ["merge", "--no-ff", "-m", mergeSubject(names), names.branch]);
  if (!merged.ok) {
    // Main is never left mid-merge: this slice records the conflict as the attempt's failure, and the
    // worktree's own git state is where a conflict under way is kept. (Ticket 08 resolves one there.)
    if (git(target, ["rev-parse", "-q", "--verify", "MERGE_HEAD"]).ok) git(target, ["merge", "--abort"]);
    throw new Error(`cannot merge ${names.branch} into ${main}: ${merged.out}`);
  }
  const after = revParse(target, main);
  if (after === before) throw new Error(`the merge of ${names.branch} produced no commit on ${main}`);
  return { mergeCommit: after, created: true };
}

/**
 * Drop the issue's worktree and branch, once its merge landed. Refuses while Main does not carry the
 * merge: the worktree holds the attempt, and deleting it before the work is in Main would delete the
 * only copy of it.
 *
 * Idempotent: a branch that is already gone (the removal ran, and a later pass is finishing the job) is
 * not an error, and a leftover registration whose directory went away is pruned first.
 */
export function removeMergedWorktree(target: string, names: IssueNames): void {
  assertMainLock("removeMergedWorktree");
  const there = branchExists(target, names.branch);
  if (there && mergedOnMain(target, names) === undefined) {
    throw new Error(
      `refusing to remove ${names.branch}: ${mainBranch(target)} carries no merge commit of it, so nothing landed`,
    );
  }
  const path = join(target, names.worktreeRel);
  gitOrThrow(target, ["worktree", "prune"]);
  if (existsSync(path)) gitOrThrow(target, ["worktree", "remove", "--force", path]);
  if (there) gitOrThrow(target, ["branch", "-D", names.branch]);
}
