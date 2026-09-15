/**
 * The post-merge act: one command, in the Target, after a merge has landed.
 *
 * `verify` guards the tree on its way in; nothing used to happen after. A merge that changed `skills/`
 * - or a generated document, or an index - left every copy of it outside the Target's git tree stale,
 * and what refreshed them was somebody remembering to. On 2026-09-15 that remembering failed twice in
 * one afternoon: the implementer of ticket 21 refreshed the machine's skill copy out of a worktree whose
 * branch had not merged, so the copy described a gate Main did not contain until a session ran the
 * install by hand; and the design repo's own skill copies had sat about a day behind before that.
 *
 * **One command, the Target's own.** `postMerge` in the Target's config is a shell command string, run
 * as `sh -c <command>` with cwd set to the Target: the branch a merge just landed on, not the worktree -
 * which no longer exists at this point. Empty means no process and no record. It is deliberately not
 * conditioned on which paths merged: a Target's refresh is expected to be idempotent and cheap (the
 * design repo's is a byte-compare and a copy), and a path filter would be a second thing to declare and
 * to get wrong.
 *
 * **A failure cannot un-land a merge.** By the time this runs the work is in Main and the issue is
 * closed. A red act is a fact about the Target's own bookkeeping, not about the issue, so it is written
 * to `ARTIFACTS_DIR/post-merge-<handle>.log`, said on stderr, and nothing else: reopening the issue
 * would say its work had not landed, which is false.
 *
 * **The mechanism is the gate's.** `runVerify` spawns one shell command in a directory of its own, kills
 * its whole process group when the clock runs out, and streams the full output to a log while keeping a
 * bounded tail of it. That is exactly what this act needs, so it is reused rather than copied - two
 * spawn implementations would be two places for the kill-on-timeout rule to drift. Only the moment, the
 * cwd and the meaning differ.
 *
 * **The clock is short on purpose.** Two agent turns of two hours and two gate runs of fifteen minutes
 * already fill the execute node's budget; this is a Target's own small act beside them, so it gets
 * `POST_MERGE_TIMEOUT_MS` and no config key of its own.
 */
import { runVerify, type VerifyResult } from "./verify.ts";

/** The one-name bound on this act. It cannot meaningfully need more: it is not a test suite. */
export const POST_MERGE_TIMEOUT_MS = 2 * 60 * 1000;

/** What one post-merge act says about itself: green or red, the tail of its output, and whether it timed out. */
export type PostMergeResult = VerifyResult;

/**
 * The act's own artifact, one per issue: which ticket's merge it followed is the only thing that varies
 * between two acts in one run. The handle is flattened because it carries a slash (`beads-dag/27`) and
 * the name is a file's.
 */
export function postMergeLogName(handle: string): string {
  return `post-merge-${handle.replace(/\W+/g, "-")}.log`;
}

/**
 * Run the Target's post-merge act and report what happened. Never throws: this call has nothing it could
 * refuse, and its caller has a merge to keep.
 *
 * An empty command spawns nothing and writes nothing - not even an empty log - so a Target without a
 * post-merge act is byte-for-byte the Target it was before this module existed.
 */
export async function runPostMerge(
  target: string,
  command: string,
  logFile: string,
  timeoutMs: number = POST_MERGE_TIMEOUT_MS,
): Promise<PostMergeResult> {
  if (command.trim() === "") return { ok: true, tail: "", timedOut: false };
  return runVerify(target, command, timeoutMs, logFile);
}
