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
 * that working tree; merging the issue's branch into Main is the settlement's step and belongs where
 * the Main-write lock lives.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { IssueNames } from "./naming.ts";

/** One git command, run where the caller says. Any failure comes back as a reason, never as a throw. */
function git(cwd: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if (r.error) return { ok: false, out: r.error.message };
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

function gitOrThrow(cwd: string, args: string[]): string {
  const r = git(cwd, args);
  if (!r.ok) throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${r.out}`);
  return r.out;
}

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
 * worktree this is what stops an attempt from working against a Main that moved while the issue waited.
 *
 * A conflict is left standing, deliberately: the worktree's own git state (MERGE_HEAD, unmerged paths)
 * is where this flow records "a merge is under way", and that is what the conflict agent reads. The
 * throw names the branch and Main so a caller can tell a conflict from any other failure.
 */
export function bringMainIn(worktree: string, main: string): void {
  const r = git(worktree, ["merge", "--no-edit", main]);
  if (!r.ok) throw new Error(`cannot bring ${main} into the worktree at ${worktree}: ${r.out}`);
}
