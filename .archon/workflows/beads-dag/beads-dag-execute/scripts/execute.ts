/**
 * One issue, start to finish.
 *
 * Given a claimed issue, this node derives everything it needs from the issue's two metadata keys: the
 * worktree's path and branch, and the body's path. It creates the worktree from Main (or resumes the
 * one an earlier attempt left), brings Main into it, and hands the implementer the body's path as its
 * whole brief, under the implement role the role table declares - persona, session key, wall clock and
 * the worker's read-only environment included. It then brings Main in again, after the turn, and merges
 * the branch into Main in the same Main-lock transaction (settle.ts).
 *
 * A conflict there is not a state and not a second workflow: git leaves the merge standing in the
 * worktree's own git state, and this execution turns to the conflict role - the same execution, one turn
 * later - which resolves the hunks and commits the merge. Then the integration and the merge run again.
 * One conflict turn per execution, and it runs after the implementer, because a conflict is the
 * implementer's work meeting a Main that moved and the resolver should see both. A merge that is clean
 * starts no conflict turn at all.
 *
 * Then it settles, and the settlement has one order (settle.ts): a turn whose work is in the worktree
 * has its branch merged into Main first, and only then does the issue close; a turn that failed - or an
 * integration the conflict agent could not resolve - writes its reason as a comment and puts the issue
 * back to `open`, so nothing merged, nothing closed, and the next drain retries it. The node reports
 * `merged` or `failed`, and keeps the worktree on a failure because it holds the attempt.
 */
import { defaultAgent, type AgentRunner } from "../../beads-dag-drain/scripts/agent.ts";
import { loadConfig, type PackConfig } from "../../beads-dag-drain/scripts/config.ts";
import { isAncestor, revParse } from "../../beads-dag-drain/scripts/git.ts";
import { withMainLock } from "../../beads-dag-drain/scripts/lock.ts";
import { ensureWorktreesIgnored } from "../../beads-dag-drain/scripts/main-writes.ts";
import { bodyPath, issueNames } from "../../beads-dag-drain/scripts/naming.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { FAILED, MERGED, nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { roleAgent } from "../../beads-dag-drain/scripts/roles.ts";
import { settleFailed, settleMerged } from "../../beads-dag-drain/scripts/settle.ts";
import { issueByHandle, preflightStore } from "../../beads-dag-drain/scripts/store.ts";
import { abortMerge, bringMainIn, ensureWorktree, mainBranch, mergeUnderway } from "../../beads-dag-drain/scripts/worktree.ts";

export type ExecuteOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
  /** The runner this execution spends. A run takes the pack's own; a test hands in a stub. */
  runAgent?: AgentRunner;
};

/** The issue's outcome, as the drain's fan-out reads it. */
export async function executeIssue(target: string, issueHandle: string, opts: ExecuteOpts): Promise<string> {
  const config = opts.config ?? loadConfig(target);
  const store = preflightStore(target, config);
  // The issue itself, by the handle the drain named it with: the slug is half of every git name, and
  // the store is the only place it is. An issue whose metadata cannot name a worktree fails here,
  // before a worktree exists, rather than starting work nobody can point at.
  const issue = issueByHandle(store, target, issueHandle);
  const names = issueNames(issue);

  // Main has to stay clean while the issue's worktree sits under it, and the line that makes that true
  // is a Main write: it happens once per Target, idempotently, under the lock, before the worktree.
  await withMainLock(target, () => ensureWorktreesIgnored(target));

  const worktree = ensureWorktree(target, names);
  const runAgent = opts.runAgent ?? defaultAgent;

  /**
   * The attempt did not land. The reason is recorded on the issue - a comment, and the issue back to
   * `open` - so the next drain retries it knowingly; the node reports the failure and the worktree is
   * left where it is, because it holds the attempt.
   */
  const didNotLand = (reason: string): string => {
    settleFailed(store, target, issue, reason);
    console.error(`${names.handle}: ${reason}`);
    return FAILED;
  };

  /**
   * The conflict turn: the merge git left standing in the worktree is the turn's whole job. The
   * answer is not the resolution - git is - so the turn counts as done only when the merge is
   * concluded and the Main it was merging is in the branch. Returns the reason when it is not, after
   * rolling the merge back, so a failed attempt leaves the worktree resumable rather than mid-merge.
   */
  const resolveConflict = async (): Promise<string | undefined> => {
    // The tip that conflicted: what the conflict is against, and what a resolution has to have in it.
    const branch = mainBranch(target);
    const main = revParse(target, branch);
    const turn = await runAgent(
      roleAgent({
        role: "conflict",
        args: { handle: names.handle, bodyPath: bodyPath(target, names) },
        cwd: worktree.path,
        artifactsDir: opts.artifactsDir,
        config,
      }),
    );
    console.error(`${names.handle}: conflict session ${turn.sessionFile}`);
    if (turn.answer.kind !== "text") {
      abortMerge(worktree.path);
      return turn.lastError ?? "the conflict agent produced no answer";
    }
    if (mergeUnderway(worktree.path)) {
      abortMerge(worktree.path);
      return "the conflict agent left the merge unresolved";
    }
    if (!isAncestor(worktree.path, main, "HEAD")) {
      return `the conflict agent did not conclude the merge: ${branch} is not in the branch`;
    }
    return undefined;
  };

  // A resumed worktree works against Main, as it always has. A conflict here is rolled back instead of
  // resolved now: the execution has one conflict turn, it belongs after the implementer's work exists,
  // and the integration after the turn re-attempts this same merge and hands it to that turn.
  try {
    bringMainIn(worktree.path, mainBranch(target));
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    if (!mergeUnderway(worktree.path)) return didNotLand(reason);
    abortMerge(worktree.path);
    console.error(`${names.handle}: Main conflicts in the worktree; the conflict agent integrates it after the turn`);
  }

  const turn = await runAgent(
    roleAgent({
      role: "implement",
      args: { handle: names.handle, bodyPath: bodyPath(target, names) },
      cwd: worktree.path,
      artifactsDir: opts.artifactsDir,
      config,
    }),
  );

  // A turn that produced no answer did not happen: there is nothing in the worktree to merge, and the
  // runner's own reason is what the issue records.
  if (turn.answer.kind !== "text") {
    return didNotLand(turn.lastError ?? "the implementer produced no answer");
  }

  // The work is in the worktree. Bringing Main into it and merging the branch into Main is one lock
  // transaction, so no writer can land a change in between and turn the merge into a conflict the
  // execution has no turn left for. If that integration does conflict, the merge is left standing in
  // the worktree and the conflict turn resolves it; then both steps run again.
  const settle = () =>
    settleMerged(target, store, issue, names, () => bringMainIn(worktree.path, mainBranch(target)));

  try {
    await settle();
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    // Not a merge under way: nothing for a conflict agent to resolve, and the failure is the attempt's.
    if (!mergeUnderway(worktree.path)) return didNotLand(reason);
    const unresolved = await resolveConflict();
    if (unresolved !== undefined) return didNotLand(unresolved);
    try {
      await settle();
    } catch (e) {
      const second = e instanceof Error ? e.message : String(e);
      // Not a merge under way: the failure is the attempt's own, and there is no conflict left to
      // resolve. Main moved again while the conflict was being resolved: the merge is rolled back -
      // the resolution's own commit stays on the branch - and the reason says so.
      if (!mergeUnderway(worktree.path)) return didNotLand(second);
      abortMerge(worktree.path);
      return didNotLand(`the merge still conflicts after the conflict agent: ${second}`);
    }
  }
  return MERGED;
}

if (import.meta.main) {
  await runNode({
    issue: true,
    artifacts: true,
    run: async ({ target, issueHandle, artifactsDir, config }) =>
      nodeLine(await executeIssue(target, issueHandle, { artifactsDir, config })),
  });
}
