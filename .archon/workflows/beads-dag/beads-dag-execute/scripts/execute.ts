/**
 * One issue, start to finish.
 *
 * Given a claimed issue, this node derives everything it needs from the issue's two metadata keys: the
 * worktree's path and branch, and the body's path. It creates the worktree from Main (or resumes the
 * one an earlier attempt left), brings Main into it, and hands the implementer the body's path as its
 * whole brief, under the implement role the role table declares - persona, session key, wall clock and
 * the worker's read-only environment included.
 *
 * Then it settles, and the settlement has one order (settle.ts): a turn whose work is in the worktree
 * has its branch merged into Main first, and only then does the issue close; a turn that failed - or a
 * merge that could not land - writes its reason as a comment and puts the issue back to `open`, so
 * nothing merged, nothing closed, and the next drain retries it. The node reports `merged` or `failed`,
 * and keeps the worktree on a failure because it holds the attempt.
 */
import { defaultAgent, type AgentRunner } from "../../beads-dag-drain/scripts/agent.ts";
import { loadConfig, type PackConfig } from "../../beads-dag-drain/scripts/config.ts";
import { withMainLock } from "../../beads-dag-drain/scripts/lock.ts";
import { ensureWorktreesIgnored } from "../../beads-dag-drain/scripts/main-writes.ts";
import { bodyPath, issueNames } from "../../beads-dag-drain/scripts/naming.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { FAILED, MERGED, nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { roleAgent } from "../../beads-dag-drain/scripts/roles.ts";
import { settleFailed, settleMerged } from "../../beads-dag-drain/scripts/settle.ts";
import { issueByHandle, preflightStore } from "../../beads-dag-drain/scripts/store.ts";
import { bringMainIn, ensureWorktree, mainBranch } from "../../beads-dag-drain/scripts/worktree.ts";

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

  try {
    bringMainIn(worktree.path, mainBranch(target));
  } catch (e) {
    // A merge that conflicts is left standing in the worktree, because its own git state is where this
    // flow records it. Until the conflict turn arrives (08), the attempt did not land.
    return didNotLand(e instanceof Error ? e.message : String(e));
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

  // The work is in the worktree. It lands in Main here, or the attempt failed - and either way the
  // outcome is recorded, in that order, before this node reports it.
  try {
    await settleMerged(target, store, issue, names);
  } catch (e) {
    return didNotLand(e instanceof Error ? e.message : String(e));
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
