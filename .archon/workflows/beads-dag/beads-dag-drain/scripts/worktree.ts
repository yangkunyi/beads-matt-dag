/**
 * The worktree helper: one issue, one worktree, created from Main and kept current with it.
 *
 * The path and the branch are the issue's names (naming.ts), so nothing lists `worktrees/` looking for
 * something that looks right and nothing chooses between candidates: an issue's worktree is at the
 * issue's own path or it does not exist. A second attempt on the same issue resumes that same worktree,
 * because the branch is the issue's - re-creating it would throw the first attempt's commits away - and
 * what a resumed attempt needs is Main brought into it.
 *
 * This module writes no part of Main. It creates a branch and a working tree, and merges Main *into*
 * that working tree; merging the issue's branch into Main is the settlement's step and lives in
 * main-writes.ts, where the Main-write lock is.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { git, gitOrThrow, revParse } from "./git.ts";
import type { IssueNames } from "./naming.ts";

/**
 * The Target's main branch: what merges land on. The drain runs in the Target's own checkout, so the
 * checked-out branch is Main; resolving it here means a Target that calls its main branch something
 * else is not a special case.
 */
export function mainBranch(target: string): string {
  return gitOrThrow(target, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

export type Worktree = {
  /** The worktree's directory: absolute, and on disk once ensureWorktree returns. */
  path: string;
  /** The issue's branch, which is what that worktree has checked out. */
  branch: string;
  /** False when this call resumed a worktree an earlier attempt left behind. */
  created: boolean;
};

/**
 * The issue's worktree, created off Main or resumed, and with that branch checked out. Creating and
 * resuming are one operation because a caller never wants one without the other: given an issue, the
 * work happens in one place, and it is the issue's own path.
 */
export function ensureWorktree(target: string, names: IssueNames): Worktree {
  // A registration whose directory is gone is a killed run's leftover, not a worktree; without this,
  // git refuses to create anything at a path it still has registered.
  gitOrThrow(target, ["worktree", "prune"]);

  const path = join(target, names.worktreeRel);
  if (existsSync(path)) {
    const branch = gitOrThrow(path, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branch !== names.branch) {
      throw new Error(`${path} is a worktree on ${branch}, not on ${names.branch}: it is not this issue's`);
    }
    return { path, branch: names.branch, created: false };
  }

  const branchExists = git(target, ["show-ref", "--verify", "--quiet", `refs/heads/${names.branch}`]).ok;
  if (branchExists) gitOrThrow(target, ["worktree", "add", path, names.branch]);
  else gitOrThrow(target, ["worktree", "add", "-b", names.branch, path, mainBranch(target)]);

  return { path, branch: names.branch, created: true };
}

/**
 * Bring Main into the worktree. At creation there is nothing to bring and git says so; on a resumed
 * worktree, and again after the implementer's turn, this is what stops an attempt from landing against
 * a Main that moved underneath it.
 *
 * A conflict is left standing, deliberately: the worktree's own git state (MERGE_HEAD, unmerged paths)
 * is where this flow records "a merge is under way", and that is what the conflict agent reads. The
 * throw names the branch and Main so a caller can tell a conflict from any other failure.
 */
export function bringMainIn(worktree: string, main: string): void {
  const r = git(worktree, ["merge", "--no-edit", main]);
  if (!r.ok) throw new Error(`cannot bring ${main} into the worktree at ${worktree}: ${r.out}`);
}

/**
 * True while a merge is standing in this worktree: git holds MERGE_HEAD. That is true for the conflict
 * `bringMainIn` leaves behind - MERGE_HEAD plus unmerged paths, the conflict agent's inbox - and still
 * true when the agent has staged a resolution but not yet committed it. It is false for every failure
 * that is not a merge under way, which is how a caller tells the conflict route from a plain one.
 */
export function mergeUnderway(worktree: string): boolean {
  return git(worktree, ["rev-parse", "-q", "--verify", "MERGE_HEAD"]).ok;
}

/**
 * Roll back a merge standing in this worktree, leaving the branch at its last commit. A no-op when
 * there is none: an attempt that failed to resolve a conflict is left exactly as it was before the
 * merge, so the next attempt resumes it instead of finding an unfinished merge in its way.
 */
export function abortMerge(worktree: string): void {
  if (!mergeUnderway(worktree)) return;
  gitOrThrow(worktree, ["merge", "--abort"]);
}

/**
 * The checkpoint: one commit on the issue's branch holding whatever the worktree has uncommitted, so
 * the tree a gate tests and the tree a merge carries are the same tree, and a killed turn's half-work
 * cannot stand between a later attempt and the agent it would run.
 *
 * The merge carries the branch's commits, never the bytes sitting in the working tree. Two things
 * follow. Before a gate, an uncommitted tree would mean gating something the merge will not carry - so
 * the checkpoint makes the subject of both the same commit. And before the resume path's integration,
 * git refuses a merge over uncommitted changes to files the merge touches; that refusal is not a
 * conflicted merge (MERGE_HEAD is never written, so `mergeUnderway` is false and the executor records a
 * plain failure), which would lock an issue out permanently: every later attempt failing at the same
 * line before any agent runs, and only a human able to unstick it. Committing the tree first is what
 * removes that latch.
 *
 * Nothing is discarded, and the pack's own runtime paths are never part of the commit: `.beads/` and
 * `worktrees/` are excluded from the add, the same paths `main-writes.ts` ignores on Main (a store or a
 * second worktree that appears inside this one is not this issue's work). An already-clean worktree
 * gains no commit - the answer is undefined - and so does one whose only changes are those excluded
 * paths. A merge standing in the worktree gains none either: its unmerged paths are the conflict turn's
 * inbox, not a tree to commit, and `bringMainIn`/the executor's own rollback own that state.
 *
 * `callSite` names what the checkpoint precedes (`before verify`, `before integration`), so the commit
 * subject says which call made it: a checkpoint is visible on the branch and in the review range, and a
 * reader can tell the two homes apart.
 */
export function checkpointWorktree(worktree: string, handle: string, callSite: string): string | undefined {
  if (mergeUnderway(worktree)) return undefined;
  const dirty = git(worktree, ["status", "--porcelain"]);
  if (!dirty.ok || dirty.out.trim() === "") return undefined;
  gitOrThrow(worktree, ["add", "-A", "--", ".", ":(exclude).beads", ":(exclude)worktrees"]);
  // Everything dirty was an excluded path: nothing staged, so there is no checkpoint to make.
  if (git(worktree, ["diff", "--cached", "--quiet"]).ok) return undefined;
  gitOrThrow(worktree, ["commit", "-m", `wip(beads-dag): ${handle} checkpoint ${callSite}`]);
  return revParse(worktree, "HEAD");
}
