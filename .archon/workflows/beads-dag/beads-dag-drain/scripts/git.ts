/**
 * Git plumbing: one home for the two calls every other module makes.
 *
 * Nothing here writes anything; the writers live in main-writes.ts, which is the module that insists
 * the Main-write lock is held. This split is what keeps "who may write Main" a question with one answer:
 * reading git is free, and a module that needs to write it imports the seam instead.
 */
import { spawnSync } from "node:child_process";

/** One git command, run where the caller says. Any failure comes back as a reason, never as a throw. */
export function git(cwd: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if (r.error) return { ok: false, out: r.error.message };
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

export function gitOrThrow(cwd: string, args: string[]): string {
  const r = git(cwd, args);
  if (!r.ok) throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${r.out}`);
  return r.out;
}

export function revParse(cwd: string, ref = "HEAD"): string {
  return gitOrThrow(cwd, ["rev-parse", ref]);
}

/** True iff git can see the ancestry; a failing `merge-base --is-ancestor` is what says it cannot. */
export function isAncestor(cwd: string, ancestor: string, descendant: string): boolean {
  return git(cwd, ["merge-base", "--is-ancestor", ancestor, descendant]).ok;
}

/** True iff the repository has a local branch of that name. */
export function branchExists(cwd: string, branch: string): boolean {
  return git(cwd, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]).ok;
}
