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
 *
 * Two things run immediately before each settle (verify.ts, worktree.ts). The Target's `verify`
 * command, when it configured one, gates the tree that would be merged - red is an ordinary failed
 * attempt, green lets the settle proceed - and a checkpoint commit first makes the gate's subject and
 * the merge's subject the same tree: the merge carries the branch's commits, never the bytes sitting
 * in the working tree. The same checkpoint runs before the resume path's integration, so a killed
 * turn's dirty worktree cannot make git refuse the merge and lock the issue out before any agent runs.
 */
import { defaultAgent, type AgentRunner } from "../../scripts/agent.ts";
import { loadConfig, type PackConfig } from "../../scripts/config.ts";
import { isAncestor, revParse } from "../../scripts/git.ts";
import { withMainLock } from "../../scripts/lock.ts";
import { ensureWorktreesIgnored } from "../../beads-dag-drain/scripts/main-writes.ts";
import { issueBrief, issueNames } from "../../scripts/naming.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { FAILED, MERGED, nodeLine } from "../../scripts/node-outcomes.ts";
import {
  POST_MERGE_TIMEOUT_MS,
  postMergeLogName,
  runPostMerge,
} from "../../beads-dag-drain/scripts/postmerge.ts";
import { roleAgent } from "../../scripts/roles.ts";
import { recordMainCommit } from "../../beads-dag-drain/scripts/run-record.ts";
import { settleFailed, settleMerged } from "../../beads-dag-drain/scripts/settle.ts";
import { issueByHandle, preflightStore } from "../../scripts/store.ts";
import { runVerify } from "../../beads-dag-drain/scripts/verify.ts";
import {
  abortMerge,
  bringMainIn,
  checkpointWorktree,
  ensureWorktree,
  mainBranch,
  mergeUnderway,
} from "../../beads-dag-drain/scripts/worktree.ts";
import { join } from "node:path";

export type ExecuteOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
  /** The runner this execution spends. A run takes the pack's own; a test hands in a stub. */
  runAgent?: AgentRunner;
};

/** The issue's outcome, as the drain's fan-out reads it. */
export async function executeIssue(target: string, issueHandle: string, opts: ExecuteOpts): Promise<string> {
  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  // The issue itself, by the handle the drain named it with: the slug is half of every git name, and
  // the store is the only place it is. An issue whose metadata cannot name a worktree fails here,
  // before a worktree exists, rather than starting work nobody can point at.
  const issue = issueByHandle(store, target, issueHandle);
  const names = issueNames(issue);

  // Main has to stay clean while the issue's worktree sits under it, and the line that makes that true
  // is a Main write: it happens once per Target, idempotently, under the lock, before the worktree.
  // Its commit, when it makes one, is this run's Main write too, and the report can only tell it from
  // an earlier run's by the run's own record - so it is recorded in the same lock.
  await withMainLock(target, () => {
    if (ensureWorktreesIgnored(target)) {
      recordMainCommit(opts.artifactsDir, revParse(target, mainBranch(target)));
    }
  });

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
        args: { handle: names.handle, brief: issueBrief(issue) },
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

  // A resumed worktree works against Main, as it always has. The checkpoint comes first: a killed
  // predecessor can leave the tree dirty, and git refuses a merge over uncommitted changes to files the
  // merge touches - a refusal that is not a conflicted merge (MERGE_HEAD is never written, so
  // `mergeUnderway` is false) and would otherwise fail every later attempt at this same line before any
  // agent runs, with nothing but a human able to unstick it. Committing the tree first removes the latch,
  // and the killed turn's half-work is visible on the branch, where the next implementer turn resumes
  // its own session against exactly that tree.
  const resumed = checkpointWorktree(worktree.path, names.handle, "before integration");
  if (resumed !== undefined) console.error(`${names.handle}: checkpoint ${resumed} before integration`);

  // A conflict here is rolled back instead of resolved now: the execution has one conflict turn, it
  // belongs after the implementer's work exists, and the integration after the turn re-attempts this
  // same merge and hands it to that turn.
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
      args: { handle: names.handle, brief: issueBrief(issue) },
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

  // The work is in the worktree. The gate runs before each settle attempt, because the tree that would
  // merge is the tree that matters: once after the implementer's turn, and once after the conflict turn,
  // which changed the tree. A conflicting settle is a distinct outcome the executor can answer with a
  // conflict turn, so it is thrown on to the caller; a red gate is only ever a failed attempt, so the
  // gate answers with the reason and the caller records it exactly as any other failure.
  //
  // The post-merge act runs after the settlement, inside the same call, and never in a failure path:
  // there is nothing merged to act on there. It cannot throw and it cannot un-land the merge - by the
  // time it runs the work is in Main and the issue is closed - so a red act is named on stderr and left
  // in its log, and the attempt stays exactly as merged as it was (postmerge.ts).
  const settle = async () => {
    const landed = await settleMerged(target, store, issue, names, opts.artifactsDir, () =>
      bringMainIn(worktree.path, mainBranch(target)),
    );
    const act = await runPostMerge(
      target,
      config.postMerge,
      join(opts.artifactsDir, postMergeLogName(names.handle)),
      POST_MERGE_TIMEOUT_MS,
    );
    if (!act.ok) {
      const tail = act.tail === "" ? "(no output)" : act.tail;
      console.error(
        `${names.handle}: merged and recorded, but the Target's post-merge command failed` +
          (act.timedOut ? ` (timed out after ${POST_MERGE_TIMEOUT_MS}ms): ` : ": ") +
          tail,
      );
    }
    return landed;
  };

  /**
   * The Target's configured gate, over the tree that would be merged. `n` is 1 for the gate after the
   * implementer's turn and 2 for the one after the conflict turn, which is also which artifact the full
   * output goes to (`verify-<n>.log`). Returns the failure reason, or undefined when it is green or the
   * Target configured no gate at all - an empty command means no process and no record, exactly as if
   * the gate did not exist. The command comes from the Target's config and never from the issue body.
   */
  const gate = async (n: 1 | 2): Promise<string | undefined> => {
    if (config.verify.trim() === "") return undefined;
    const checkpoint = checkpointWorktree(worktree.path, names.handle, "before verify");
    if (checkpoint !== undefined) console.error(`${names.handle}: checkpoint ${checkpoint} before verify ${n}`);
    const result = await runVerify(
      worktree.path,
      config.verify,
      config.verifyTimeoutMs,
      join(opts.artifactsDir, `verify-${n}.log`),
    );
    if (result.ok) return undefined;
    const tail = result.tail === "" ? "(no output)" : result.tail;
    return result.timedOut
      ? `verify failed: timed out after ${config.verifyTimeoutMs}ms: ${tail}`
      : `verify failed: ${tail}`;
  };

  const first = await gate(1);
  if (first !== undefined) return didNotLand(first);
  try {
    await settle();
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    // Not a merge under way: nothing for a conflict agent to resolve, and the failure is the attempt's.
    if (!mergeUnderway(worktree.path)) return didNotLand(reason);
    const unresolved = await resolveConflict();
    if (unresolved !== undefined) return didNotLand(unresolved);
    // The conflict turn changed the tree - its resolution commit, if nothing else - so the gate the
    // settlement is about to run over has to see that tree, not the one it saw before the turn.
    const second = await gate(2);
    if (second !== undefined) return didNotLand(second);
    try {
      await settle();
    } catch (e) {
      const secondReason = e instanceof Error ? e.message : String(e);
      // Not a merge under way: the failure is the attempt's own, and there is no conflict left to
      // resolve. Main moved again while the conflict was being resolved: the merge is rolled back -
      // the resolution's own commit stays on the branch - and the reason says so.
      if (!mergeUnderway(worktree.path)) return didNotLand(secondReason);
      abortMerge(worktree.path);
      return didNotLand(`the merge still conflicts after the conflict agent: ${secondReason}`);
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
