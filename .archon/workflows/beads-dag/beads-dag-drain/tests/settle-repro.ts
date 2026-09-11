#!/usr/bin/env bun
/**
 * Repro: the merge lands before the record.
 *
 * One settlement and one order. A turn whose work is in the worktree has that branch merged into Main
 * first - a real merge, so the merge commit exists to be found later - and only then is the issue closed
 * in the store; the worktree and its branch are dropped last, and only once the merge is on Main. A
 * turn that failed writes its reason as a comment and puts the issue back to `open`: nothing merged, so
 * nothing closes, the issue's dependents stay exactly where they were, and the next drain's `bd ready`
 * offers it again - while the run that failed it, which already recorded the issue as attempted, does
 * not.
 *
 * The store is watched from outside the pack: a wrapper around the store binary records, on every
 * command, whether Main already carried a merge commit and whether this process held the Main lock. So
 * "the close came after the merge" and "the close was not inside the lock" are facts about the run, not
 * a reading of its source.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentResult } from "../scripts/agent.ts";
import { withMainLock } from "../scripts/lock.ts";
import { removeMergedWorktree } from "../scripts/main-writes.ts";
import { FAILED, MERGED, nodeLine } from "../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  drain,
  execute,
  expect,
  expectEqual,
  expectReject,
  fakePiSdk,
  gitC,
  mkTemp,
  packDir,
  probeLines,
  publishIssue,
  runScript,
  storeBlocked,
  storeComments,
  storeIssue,
  storeReady,
  withTarget,
  worktreeDirt,
  writeProbeStore,
  writeStoreConfig,
} from "./target.ts";

/** An issue's names, spelled the way the naming rule spells them: the fixture's own reading. */
function names(handle: string, slug: string): { branch: string; worktree: string; worktreeRel: string } {
  const [feature, number] = handle.split("/");
  return {
    branch: `beads/${feature}/${number}-${slug}`,
    worktreeRel: join("worktrees", `${feature}-${number}-${slug}`),
    worktree: join("worktrees", `${feature}-${number}-${slug}`),
  };
}

/** Every .ts in the pack outside tests/: both workflow folders' scripts, and the backup command. */
function packSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests") continue;
      out.push(...packSources(path));
    } else if (entry.name.endsWith(".ts")) {
      out.push(path);
    }
  }
  return out;
}

/** True iff git can see an ancestor relationship, which a failing `merge-base` is what says it cannot. */
function isAncestor(root: string, ancestor: string, descendant: string): boolean {
  try {
    gitC(root, "merge-base", "--is-ancestor", ancestor, descendant);
    return true;
  } catch {
    return false;
  }
}

/** The rule the pick report says excluded one issue, or undefined when it does not name it at all. */
function ruleFor(artifacts: string, id: string): string | undefined {
  const report = JSON.parse(readFileSync(join(artifacts, "pick-exclusions.json"), "utf8")) as {
    excluded: { id: string; rule: string }[];
  };
  return report.excluded.find((entry) => entry.id === id)?.rule;
}

try {
  // A clean merge: the branch lands on Main, the issue closes, the worktree and branch are dropped -
  // in that order, and with the store write outside the lock.
  await withTarget(async (root, artifacts) => {
    const { probe } = writeProbeStore(root, artifacts);
    const issue = publishIssue(root, {
      title: "a clean merge",
      handle: "feat/01",
      slug: "a-clean-merge",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/01", "a-clean-merge");
    const before = gitC(root, "rev-parse", "main");
    let statusWhileTheWorktreeExisted = "";
    let turnCwd = "";

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        turnCwd = opts.cwd;
        statusWhileTheWorktreeExisted = worktreeDirt(root);
        commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit");
        return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
      },
    });

    expectEqual("a clean merge settles the issue", outcome, MERGED);
    expectEqual("the turn ran in the issue's worktree", turnCwd, join(root, worktree));
    expectEqual("Main carried no worktree dirt while it existed", statusWhileTheWorktreeExisted, "");
    expectEqual("the issue is closed in the store", storeIssue(root, issue.id).status, "closed");
    expectEqual("and the close names the merge", storeIssue(root, issue.id).close_reason, `merged ${branch}`);

    // A real merge, not a fast-forward: two parents, the second one what the implementer committed.
    const tip = gitC(root, "rev-parse", "main");
    expect("Main moved", tip !== before, tip);
    expectEqual(
      "Main's tip is a merge commit with two parents",
      gitC(root, "rev-list", "--parents", "-1", "main").split(/\s+/).length,
      3,
    );
    expectEqual(
      "whose second parent is the implementer's commit",
      gitC(root, "log", "-1", "--format=%s", `${tip}^2`),
      "the implementer's commit",
    );
    expect("the merge commit names the issue's branch", gitC(root, "log", "-1", "--format=%s", tip).includes(branch));
    expectEqual("so the work is in Main", gitC(root, "show", "main:work.txt"), "the work");

    // Removed only after the merge landed.
    expectEqual("the worktree is gone once the merge landed", existsSync(join(root, worktree)), false);
    expectEqual("and so is the branch", gitC(root, "branch", "--list", branch), "");
    expectEqual("and Main carries no worktree dirt afterwards", worktreeDirt(root), "");

    // What the store saw: the close ran once, after Main carried the merge, with no Main lock held.
    const closings = probeLines(probe).filter((line) => line.command === "close");
    expectEqual("the store was asked to close exactly once", closings.length, 1);
    expectEqual("and then Main already carried the merge", closings[0]?.parents, 3);
    expectEqual("with this process holding no Main lock", closings[0]?.mine, false);
  });

  // A turn that did not land: the reason is a comment, the issue goes back to open, and nothing closes.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "a turn that never started",
      handle: "feat/02",
      slug: "a-turn-that-answered-nothing",
      labels: [GATE_LABEL],
    });
    const dependent = publishIssue(root, {
      title: "waiting on it",
      handle: "feat/03",
      slug: "waiting-on-it",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", dependent.id, issue.id);
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/02", "a-turn-that-answered-nothing");

    // A turn the runner started and that answered nothing: there is nothing in the worktree to merge,
    // and the runner's own reason is what the issue records.
    const noAnswer = async (): Promise<PackAgentResult> => ({
      sessionFile: "",
      answer: { kind: "none" },
      lastError: "the session produced no answer",
    });
    const outcome = await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: noAnswer });

    expectEqual("a turn that did not land is a failure", outcome, FAILED);
    expectEqual("the issue is never closed", storeIssue(root, issue.id).status, "open");
    const reason = storeComments(root, issue.id)[0]?.text ?? "";
    expect("the reason is a comment on the issue", reason.startsWith("attempt 1 failed: "), reason);
    expect("and it is the runner's own reason", reason.includes("the session produced no answer"), reason);
    expectEqual("nothing merged: Main carries no merge commit at all", gitC(root, "log", "--merges", "--format=%s", "main"), "");
    expectEqual("and the branch carries nothing Main does not have", gitC(root, "rev-list", "--count", `main..${branch}`), "0");
    expect("the worktree is left for the report", existsSync(join(root, worktree)));
    expectEqual("and its branch with it", gitC(root, "branch", "--list", branch).includes(branch), true);
    expectEqual("Main carries no worktree dirt while it sits there", worktreeDirt(root), "");
    expectEqual("the issue's dependent is still blocked", storeBlocked(root), [dependent.id]);
    expect("and not the store's answer", !storeReady(root).includes(dependent.id));

    // The next attempt of the same issue records the next ordinal.
    bd(root, "update", issue.id, "-s", "in_progress");
    const second = await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: noAnswer });
    expectEqual("the second attempt fails the same way", second, FAILED);
    expectEqual(
      "and its reason says which attempt it was",
      storeComments(root, issue.id).map((comment) => comment.text.slice(0, 9)),
      ["attempt 1", "attempt 2"],
    );
  });

  // A merge that cannot land: the attempt carries nothing Main does not have, so there is nothing to
  // merge. Nothing closes, Main is not left torn, and the reason says what happened. (A conflict is no
  // longer this path's cause: since 08 it is the conflict agent's route, tested in conflict-repro.)
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    commitFile(root, "shared.txt", "the base\n", "the base");
    const issue = publishIssue(root, {
      title: "an attempt with nothing to merge",
      handle: "feat/04",
      slug: "nothing-to-merge",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/04", "nothing-to-merge");

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (): Promise<PackAgentResult> => ({
        sessionFile: "",
        answer: { kind: "text", text: "done" },
        lastError: undefined,
      }),
    });

    expectEqual("a merge that cannot land is a failure", outcome, FAILED);
    expectEqual("and it closes nothing", storeIssue(root, issue.id).status, "open");
    const reason = storeComments(root, issue.id)[0]?.text ?? "";
    expect("the reason names the merge that could not happen", reason.includes(`nothing to merge: ${branch}`), reason);
    expectEqual("Main is not left mid-merge", existsSync(join(root, ".git", "MERGE_HEAD")), false);
    expectEqual("nor carrying worktree dirt", worktreeDirt(root), "");
    expectEqual("and no merge landed on Main at all", gitC(root, "log", "--merges", "--format=%s", "main"), "");
    expect("the worktree is left for the report", existsSync(join(root, worktree)));
    expectEqual("and its branch", gitC(root, "branch", "--list", branch).includes(branch), true);
  });

  // Removal refuses while the merge has not landed: the worktree and branch stay where the report can
  // find them, and a Main write is what tells the difference.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "an unmerged attempt",
      handle: "feat/05",
      slug: "an-unmerged-attempt",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree, worktreeRel } = names("feat/05", "an-unmerged-attempt");

    await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        commitFile(opts.cwd, "attempt.txt", "an attempt\n", "an attempt's commit");
        return { sessionFile: "", answer: { kind: "none" }, lastError: "the attempt did not land" };
      },
    });

    await expectReject(
      "removal before the merge landed",
      () =>
        withMainLock(root, () =>
          removeMergedWorktree(root, {
            handle: "feat/05",
            branch,
            worktreeRel,
            bodyRel: join(".scratch", "feat", "issues", "05-an-unmerged-attempt.md"),
          }),
        ),
      /refusing to remove/,
    );
    expect("the worktree is still there", existsSync(join(root, worktree)));
    expectEqual("and its branch", gitC(root, "branch", "--list", branch).includes(branch), true);
  });

  // The run that failed the issue does not offer it again; the next drain does.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "the retried issue",
      handle: "feat/06",
      slug: "the-retried-issue",
      labels: [GATE_LABEL],
    });
    const dependent = publishIssue(root, {
      title: "the dependent",
      handle: "feat/07",
      slug: "the-dependent",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", dependent.id, issue.id);

    const first = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("pick offers the eligible issue", JSON.parse(first.stdout), ["feat/06"]);

    const executed = runScript(execute.script("execute"), root, {
      ARTIFACTS_DIR: artifacts,
      INPUTS_ISSUE: "feat/06",
      PI_SDK_PATH: fakePiSdk(artifacts, "none"),
    });
    expectEqual("the turn failed", executed.stdout, nodeLine(FAILED));
    expectEqual("and a failed attempt is a result, not an error", executed.status, 0);
    expectEqual("the issue is back to open", storeIssue(root, issue.id).status, "open");
    expectEqual("its dependent is still blocked", storeBlocked(root), [dependent.id]);

    const sameRun = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run that failed it offers it no more", JSON.parse(sameRun.stdout), []);
    expectEqual("and its report says why", ruleFor(artifacts, issue.id), "attempted-by-this-run");

    const nextRun = mkTemp("artifacts-next-");
    try {
      const next = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: nextRun });
      expectEqual("the next drain offers it again", JSON.parse(next.stdout), ["feat/06"]);
      expectEqual("and claims it", storeIssue(root, issue.id).status, "in_progress");
    } finally {
      rmSync(nextRun, { recursive: true, force: true });
    }
    expectEqual("the dependent never moved", storeBlocked(root), [dependent.id]);
  });

  // The Target's .gitignore: the pack writes the one line Main needs, once, and respects a Target that
  // already has it.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const first = publishIssue(root, { title: "one", handle: "feat/08", slug: "one", labels: [GATE_LABEL] });
    const second = publishIssue(root, { title: "two", handle: "feat/09", slug: "two", labels: [GATE_LABEL] });
    const failing = async (opts: { cwd: string }): Promise<PackAgentResult> => {
      commitFile(opts.cwd, "attempt.txt", "an attempt\n", "an attempt's commit");
      return { sessionFile: "", answer: { kind: "none" }, lastError: "did not land" };
    };
    for (const issue of [first, second]) {
      bd(root, "update", issue.id, "-s", "in_progress");
      await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: failing });
    }
    const ignoreCommits = gitC(root, "log", "--format=%s", "main")
      .split("\n")
      .filter((subject) => subject === "chore(beads-dag): ignore runtime paths");
    expectEqual("the ignore lines are one commit for the Target", ignoreCommits.length, 1);
    expect("worktrees/ is ignored", gitC(root, "check-ignore", "-v", "worktrees/feat-08-one").includes("/worktrees/"));
    expect(
      "the store's interaction log is ignored too",
      gitC(root, "check-ignore", "-v", ".beads/interactions.jsonl").includes("interactions.jsonl"),
    );
    expectEqual("and untracked", gitC(root, "ls-files", "--", ".beads/interactions.jsonl"), "");
    expectEqual("and Main carries no worktree dirt", worktreeDirt(root), "");
    expectEqual("nor any store dirt", gitC(root, "status", "--porcelain", "--", ".beads"), "");
  });

  // A Target that already carries both rules, in its own spelling, keeps them: no commit is made.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    writeFileSync(join(root, ".gitignore"), "node_modules/\nworktrees/\n/.beads/interactions.jsonl\n");
    gitC(root, "add", ".gitignore");
    // The Target untracked the store's log itself; the pack's job is only to make that true when it is not.
    gitC(root, "rm", "--cached", "--quiet", "--", ".beads/interactions.jsonl");
    gitC(root, "commit", "-m", "the Target's own ignore rules");
    const issue = publishIssue(root, { title: "already ignored", handle: "feat/10", slug: "already-ignored", labels: [GATE_LABEL] });
    bd(root, "update", issue.id, "-s", "in_progress");
    const before = gitC(root, "rev-parse", "main");
    await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        commitFile(opts.cwd, "attempt.txt", "an attempt\n", "an attempt's commit");
        return { sessionFile: "", answer: { kind: "none" }, lastError: "did not land" };
      },
    });
    expectEqual("the Target's own rules are enough: no commit was made", gitC(root, "rev-parse", "main"), before);
    expectEqual("Main carries no worktree dirt", worktreeDirt(root), "");
    expectEqual("nor any store dirt", gitC(root, "status", "--porcelain", "--", ".beads"), "");
  });

  // The one close in the pack, and where it sits: everything above pins the behaviour, and this pins
  // that there is no second path to `closed` for a later ticket to reach for.
  const closing = packSources(packDir)
    .filter((file) => /\bcloseIssue\s*\(/.test(readFileSync(file, "utf8")))
    .map((file) => file.slice(packDir.length + 1))
    .sort();
  expectEqual("the only module that closes an issue is the settlement", closing, [
    "beads-dag-drain/scripts/settle.ts",
    "beads-dag-drain/scripts/store.ts",
  ]);
  const settlement = readFileSync(join(packDir, "beads-dag-drain", "scripts", "settle.ts"), "utf8");
  expect(
    "and there it runs after the merge",
    settlement.indexOf("mergeIntoMain(") < settlement.indexOf("closeIssue("),
    settlement.slice(0, 120),
  );

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
