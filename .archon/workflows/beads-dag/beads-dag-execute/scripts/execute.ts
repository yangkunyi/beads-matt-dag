/**
 * One issue, start to finish.
 *
 * Given a claimed issue, this node derives everything it needs from the issue's two metadata keys: the
 * worktree's path and branch, and the body's path. It creates the worktree from Main (or resumes the
 * one an earlier attempt left), brings Main into it, and hands the implementer the body's path as its
 * whole brief, under the implement role the role table declares - persona, session key, wall clock and
 * the worker's read-only environment included.
 *
 * The outcome this slice can honestly report is `failed`: the implementer's commits are in the worktree
 * and nothing is in Main, so the issue's work did not land. Reporting `merged` here would be the lie
 * ADR-0002 exists to forbid - a state running ahead of the merge it claims - and the merge and the
 * record that make an issue closed arrive with the settlement, in the next slice. The worktree is kept
 * either way: it holds the attempt, and a human - or that settlement - needs it.
 */
import { defaultAgent, type AgentRunner } from "../../beads-dag-drain/scripts/agent.ts";
import { loadConfig, type PackConfig } from "../../beads-dag-drain/scripts/config.ts";
import { bodyPath, issueNames } from "../../beads-dag-drain/scripts/naming.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { FAILED, nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { roleAgent } from "../../beads-dag-drain/scripts/roles.ts";
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
  const worktree = ensureWorktree(target, names);

  try {
    bringMainIn(worktree.path, mainBranch(target));
  } catch (e) {
    // A merge that conflicts is left standing, because the worktree's own git state is where this flow
    // records it and the conflict agent's turn reads it. Until that turn exists, the issue's work did
    // not land: the honest outcome, with the reason where every reason goes.
    console.error(`${names.handle}: ${e instanceof Error ? e.message : String(e)}`);
    return FAILED;
  }

  const runAgent = opts.runAgent ?? defaultAgent;
  const turn = await runAgent(
    roleAgent({
      role: "implement",
      args: { handle: names.handle, bodyPath: bodyPath(target, names) },
      cwd: worktree.path,
      artifactsDir: opts.artifactsDir,
      config,
    }),
  );

  // The turn's answer is the runner's to read and report; what this node can say about the issue is
  // that its work is in the worktree and not in Main.
  const reason =
    turn.answer.kind === "text"
      ? "the work is in the worktree, not in Main: the merge and its record arrive with the settlement"
      : turn.lastError ?? "the implementer produced no answer";
  console.error(`${names.handle}: ${reason}`);
  return FAILED;
}

if (import.meta.main) {
  await runNode({
    issue: true,
    artifacts: true,
    run: async ({ target, issueHandle, artifactsDir, config }) =>
      nodeLine(await executeIssue(target, issueHandle, { artifactsDir, config })),
  });
}
