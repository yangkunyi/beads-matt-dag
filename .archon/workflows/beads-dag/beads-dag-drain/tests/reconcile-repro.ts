#!/usr/bin/env bun
/**
 * Repro: the opening step repairs what a killed drain left behind, and reads git to do it.
 *
 * A drain killed between the merge and the store write leaves an issue `in_progress` whose work *is* in
 * Main; one killed before its work landed leaves an issue `in_progress` whose work is not. The opening
 * node tells those apart from git alone - the store is the thing being repaired, so it is the input and
 * never the evidence - and resolves each to the resolution the flow already has: a merge that landed is
 * recorded (closed, with the merge commit it already has, and none made a second time), and work that
 * did not land goes back to `open` with its reason on it, its worktree and branch left for the report,
 * and no mark in this run's `attempted-ids.json` - so the same run's pick can offer it as a retry.
 *
 * The kills are staged directly: a leftover is a store state plus a git state, and both are made here
 * with the fixture's own store and git commands, so nothing in the lab stands in for the pack.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentResult } from "../../scripts/agent.ts";
import { MERGED, OPENED, nodeLine } from "../../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  drain,
  expect,
  expectEqual,
  gitC,
  publishIssue,
  runScript,
  storeBlocked,
  storeComments,
  storeIssue,
  storeReady,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/** An issue's names, spelled the way the naming rule spells them: the fixture's own reading. */
function names(handle: string, slug: string): { branch: string; worktree: string } {
  const [feature, number] = handle.split("/");
  return {
    branch: `beads/${feature}/${number}-${slug}`,
    worktree: join("worktrees", `${feature}-${number}-${slug}`),
  };
}

/** The merge commits Main carries, by subject: what a repair must not add a second one of. */
function merges(root: string): string[] {
  return gitC(root, "log", "--merges", "--format=%s", "main")
    .split("\n")
    .filter((line) => line !== "");
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

/** What this run has recorded as attempted, read the way pick writes it. */
function attemptedIds(artifacts: string): string[] {
  const path = join(artifacts, "attempted-ids.json");
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as string[]) : [];
}

try {
  // A kill between the merge and the record. The work is in Main and the store was never told, so the
  // repair records the close the killed run never wrote - finding the merge that landed, never making a
  // second one - and drops the worktree and branch exactly as a settled merge would have.
  await withTarget(async (root, artifacts) => {
    const issue = publishIssue(root, {
      title: "merged then killed",
      handle: "feat/01",
      slug: "merged-then-killed",
      labels: [GATE_LABEL],
    });
    const dependent = publishIssue(root, {
      title: "waiting on the merged one",
      handle: "feat/02",
      slug: "waiting-on-the-merged-one",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", dependent.id, issue.id);
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/01", "merged-then-killed");

    // The kill point: the branch was merged into Main under the subject the flow writes, and the store
    // was never told. Everything after this line is the state the next drain's open has to repair.
    gitC(root, "worktree", "add", "-b", branch, join(root, worktree), "main");
    commitFile(join(root, worktree), "work.txt", "the work\n", "the implementer's commit");
    gitC(root, "merge", "--no-ff", "-m", `beads-dag: merge ${branch}`, branch);
    const landed = gitC(root, "rev-parse", "main");

    expectEqual("staged: the issue is still claimed", storeIssue(root, issue.id).status, "in_progress");
    expectEqual("staged: its worktree and branch are still there", existsSync(join(root, worktree)), true);
    expectEqual("staged: its dependent is blocked", storeBlocked(root), [dependent.id]);

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open speaks the protocol", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);

    expectEqual("the merged leftover is closed", storeIssue(root, issue.id).status, "closed");
    expectEqual(
      "and the record names the branch that landed",
      storeIssue(root, issue.id).close_reason,
      `merged ${branch}`,
    );
    expectEqual("Main did not move: the repair made no second merge commit", gitC(root, "rev-parse", "main"), landed);
    expectEqual("Main carries exactly the merge that landed", merges(root), [`beads-dag: merge ${branch}`]);
    expectEqual("the worktree is gone, as after a settled merge", existsSync(join(root, worktree)), false);
    expectEqual("and so is the branch", gitC(root, "branch", "--list", branch), "");
    expectEqual("the work is in Main", gitC(root, "show", "main:work.txt"), "the work");
    expectEqual("and the close released the dependent", storeReady(root), [dependent.id]);
  });

  // A kill before the work landed. Nothing merged, so nothing closes: the issue goes back to `open`
  // with the reason recorded, its worktree and branch stay for the report, and - because the repair is
  // not an attempt by this run - the same run's pick offers it as a retry.
  await withTarget(async (root, artifacts) => {
    const issue = publishIssue(root, {
      title: "killed before landing",
      handle: "feat/03",
      slug: "killed-before-landing",
      labels: [GATE_LABEL],
    });
    const dependent = publishIssue(root, {
      title: "waiting on the unlanded one",
      handle: "feat/04",
      slug: "waiting-on-the-unlanded-one",
      labels: [GATE_LABEL],
    });
    bd(root, "dep", "add", dependent.id, issue.id);
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/03", "killed-before-landing");

    // The kill point: an attempt committed in the worktree, and Main never saw the merge.
    gitC(root, "worktree", "add", "-b", branch, join(root, worktree), "main");
    commitFile(join(root, worktree), "attempt.txt", "an attempt\n", "the attempt's commit");
    const attempt = gitC(join(root, worktree), "rev-parse", "HEAD");
    const mainBefore = gitC(root, "rev-parse", "main");

    // While it is claimed the store hides it from pick, so the repair is the only way back in - and the
    // repair is what runs before pick in a drain.
    const invisible = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a claimed leftover is not offered while it stays claimed", JSON.parse(invisible.stdout), []);

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open speaks the protocol", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);

    expectEqual("the unlanded leftover goes back to open", storeIssue(root, issue.id).status, "open");
    const reason = storeComments(root, issue.id)[0]?.text ?? "";
    expect("the reason is a failed-attempt comment", reason.startsWith("attempt 1 failed: "), reason);
    expect(
      "and it says the work never landed, naming the branch",
      reason.includes(`carries no merge commit of ${branch}`),
      reason,
    );
    expectEqual("nothing was closed", storeIssue(root, issue.id).close_reason ?? null, null);
    expectEqual("Main carries no merge commit", merges(root), []);
    expectEqual("and did not move", gitC(root, "rev-parse", "main"), mainBefore);
    expectEqual("the attempt's branch stays for the report", gitC(root, "rev-parse", branch), attempt);
    expectEqual("and its worktree with it", existsSync(join(root, worktree)), true);
    expectEqual("the dependent stays blocked", storeBlocked(root), [dependent.id]);

    // The repair is not an attempt: this run never tried the issue, so the same run's pick offers it.
    expectEqual("the repair marked nothing as attempted", attemptedIds(artifacts), []);
    const offered = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("so the same run offers the repaired failure", JSON.parse(offered.stdout), ["feat/03"]);
    expectEqual("and claims it", storeIssue(root, issue.id).status, "in_progress");
    expectEqual("the dependent is still blocked behind the retried issue", storeBlocked(root), [dependent.id]);
  });

  // A branch that carries only history Main already had is not merged work, and neither a matching
  // merge subject nor an earlier attempt's merge on Main makes it so. Two stagings, both a claimed
  // issue whose branch is entirely Main's history:
  //
  //   feat/05: a merge on Main whose subject is the flow's own, but whose second parent is a commit the
  //            branch does not carry;
  //   feat/06: an *earlier attempt of the same issue* really did merge, and the re-claim then re-created
  //            the branch from Main - whose tip is that merge - and died before committing. That merge's
  //            second parent is in the re-created branch's history, so both the subject and the
  //            parent's being on the branch hold; only the branch tip being that merge's own second
  //            parent tells the two apart.
  await withTarget(async (root, artifacts) => {
    const decoyed = publishIssue(root, {
      title: "only ancestor history",
      handle: "feat/05",
      slug: "only-ancestor-history",
      labels: [GATE_LABEL],
    });
    const recreated = publishIssue(root, {
      title: "re-created branch",
      handle: "feat/06",
      slug: "re-created-branch",
      labels: [GATE_LABEL],
    });
    bd(root, "update", decoyed.id, "-s", "in_progress");
    bd(root, "update", recreated.id, "-s", "in_progress");
    const first = names("feat/05", "only-ancestor-history");
    const second = names("feat/06", "re-created-branch");

    // feat/05: the branch, cut from Main with nothing of its own; a decoy commit Main does not have; and
    // a merge commit on Main whose subject is the flow's own but whose second parent is the decoy.
    const base = gitC(root, "rev-parse", "main");
    gitC(root, "branch", first.branch, base);
    gitC(root, "worktree", "add", join(root, first.worktree), first.branch);
    commitFile(root, "decoy.txt", "not this attempt\n", "a decoy commit");
    const decoy = gitC(root, "rev-parse", "main");
    gitC(root, "reset", "--hard", base);
    gitC(root, "merge", "--no-ff", "-m", `beads-dag: merge ${first.branch}`, decoy);

    // feat/06: the earlier attempt merges for real, then the worktree and branch are dropped the way a
    // settled merge drops them, and the branch is created from Main again - the re-claim, killed before
    // its first commit.
    const earlierWorktree = join(root, "worktrees", "earlier-attempt");
    gitC(root, "worktree", "add", "-b", second.branch, earlierWorktree, "main");
    commitFile(earlierWorktree, "earlier.txt", "the earlier attempt\n", "the earlier attempt's commit");
    gitC(root, "merge", "--no-ff", "-m", `beads-dag: merge ${second.branch}`, second.branch);
    gitC(root, "worktree", "remove", "--force", earlierWorktree);
    const earlierMerge = gitC(root, "rev-parse", "main");
    gitC(root, "branch", "-D", second.branch);
    gitC(root, "branch", second.branch, earlierMerge);
    gitC(root, "worktree", "add", join(root, second.worktree), second.branch);

    expectEqual(
      "staged: the decoyed branch carries nothing Main does not have",
      gitC(root, "rev-list", "--count", `main..${first.branch}`),
      "0",
    );
    expectEqual(
      "staged: the re-created branch carries nothing Main does not have either",
      gitC(root, "rev-list", "--count", `main..${second.branch}`),
      "0",
    );
    expect(
      "staged: the earlier merge's second parent is in the re-created branch's history",
      isAncestor(root, `${earlierMerge}^2`, second.branch),
      gitC(root, "log", "-1", "--format=%H %P %s", earlierMerge),
    );

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open speaks the protocol", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);

    for (const [issue, name] of [
      [decoyed, first],
      [recreated, second],
    ] as const) {
      expectEqual(`${name.branch} is not mistaken for merged`, storeIssue(root, issue.id).status, "open");
      const reason = storeComments(root, issue.id)[0]?.text ?? "";
      expect(
        `${name.branch}'s reason says the work never landed`,
        reason.includes(`carries no merge commit of ${name.branch}`),
        reason,
      );
      expectEqual(`${name.branch} was not closed`, storeIssue(root, issue.id).close_reason ?? null, null);
      expectEqual(`${name.branch}'s worktree is left where it was`, existsSync(join(root, name.worktree)), true);
    }
    expectEqual("Main did not move for either", gitC(root, "rev-parse", "main"), earlierMerge);
    expectEqual("and carries only the merges it already had", merges(root), [
      `beads-dag: merge ${second.branch}`,
      `beads-dag: merge ${first.branch}`,
    ]);
    expectEqual("the decoyed branch keeps pointing where it did", gitC(root, "rev-parse", first.branch), base);
    expectEqual(
      "and so does the re-created one",
      gitC(root, "rev-parse", second.branch),
      earlierMerge,
    );
  });

  // The same state on the retry side: a branch re-created from Main after an earlier attempt of the
  // issue merged. The retry's own commit must be merged into Main - taking the earlier attempt's merge
  // for it would close the issue and drop the branch, losing the work.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "retry after an earlier merge",
      handle: "feat/07",
      slug: "retry-after-an-earlier-merge",
      labels: [GATE_LABEL],
    });
    const { branch, worktree } = names("feat/07", "retry-after-an-earlier-merge");

    // The earlier attempt: work, a merge under the flow's own subject, then the drop a settled merge
    // does. The issue is claimed again afterwards, which is what re-creates the branch from Main.
    const earlierWorktree = join(root, "worktrees", "earlier-attempt");
    gitC(root, "worktree", "add", "-b", branch, earlierWorktree, "main");
    commitFile(earlierWorktree, "earlier.txt", "the earlier attempt\n", "the earlier attempt's commit");
    gitC(root, "merge", "--no-ff", "-m", `beads-dag: merge ${branch}`, branch);
    gitC(root, "worktree", "remove", "--force", earlierWorktree);
    gitC(root, "branch", "-D", branch);
    const earlierMerge = gitC(root, "rev-parse", "main");
    bd(root, "update", issue.id, "-s", "in_progress");
    expectEqual("staged: Main carries the earlier attempt's merge already", merges(root), [
      `beads-dag: merge ${branch}`,
    ]);

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        commitFile(opts.cwd, "retry.txt", "the retry's work\n", "the retry's commit");
        return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
      },
    });

    expectEqual("the retry lands", outcome, MERGED);
    expectEqual("the retry's work is in Main", gitC(root, "show", "main:retry.txt"), "the retry's work");
    expectEqual("the issue closes", storeIssue(root, issue.id).status, "closed");
    expectEqual("Main's tip is the retry's own merge", gitC(root, "log", "-1", "--format=%s", "main"), `beads-dag: merge ${branch}`);
    expect(
      "which is a second merge, not the earlier attempt's",
      gitC(root, "rev-parse", "main") !== earlierMerge,
      earlierMerge,
    );
    expectEqual("whose second parent is the retry's commit", gitC(root, "log", "-1", "--format=%s", "main^2"), "the retry's commit");
    expectEqual("and the worktree and branch are dropped", existsSync(join(root, worktree)), false);
    expectEqual("so the branch", gitC(root, "branch", "--list", branch), "");
  });

  // Leftovers whose git side is gone, or cannot be named at all: a branch whose worktree directory was
  // deleted, an issue claimed before any worktree existed, and an issue the tracker published without
  // the two metadata keys every git name derives from. None is merged, all go back to open, and the
  // branch that exists stays for the report - the repair needs no branch to answer.
  await withTarget(async (root, artifacts) => {
    const worktreeGone = publishIssue(root, {
      title: "worktree gone",
      handle: "feat/08",
      slug: "worktree-gone",
      labels: [GATE_LABEL],
    });
    const branchGone = publishIssue(root, {
      title: "branch gone",
      handle: "feat/09",
      slug: "branch-gone",
      labels: [GATE_LABEL],
    });
    const unnameable = bd(root, "create", "unnameable", "--type", "task", "--silent", "--labels", GATE_LABEL);
    bd(root, "update", worktreeGone.id, "-s", "in_progress");
    bd(root, "update", branchGone.id, "-s", "in_progress");
    bd(root, "update", unnameable, "-s", "in_progress");
    const first = names("feat/08", "worktree-gone");
    const second = names("feat/09", "branch-gone");

    gitC(root, "worktree", "add", "-b", first.branch, join(root, first.worktree), "main");
    commitFile(join(root, first.worktree), "attempt.txt", "an attempt\n", "the attempt's commit");
    const attempt = gitC(join(root, first.worktree), "rev-parse", "HEAD");
    rmSync(join(root, first.worktree), { recursive: true, force: true });

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expect("open exits clean", opened.status === 0, opened.stderr);
    expectEqual("open speaks the protocol", opened.stdout, nodeLine(OPENED));

    for (const [issue, name] of [
      [worktreeGone, first],
      [branchGone, second],
    ] as const) {
      expectEqual(`${name.branch} goes back to open`, storeIssue(root, issue.id).status, "open");
      const reason = storeComments(root, issue.id)[0]?.text ?? "";
      expect(`${name.branch}'s reason names it`, reason.includes(name.branch), reason);
    }
    expectEqual(
      "the branch whose worktree went away is still there, with its commit",
      gitC(root, "rev-parse", first.branch),
      attempt,
    );
    expectEqual(
      "and the issue whose branch never existed stays without one",
      gitC(root, "branch", "--list", second.branch),
      "",
    );
    expectEqual("no merge landed for either", merges(root), []);

    // An issue that cannot be named in git cannot be checked against git: it still goes back to open,
    // with the naming failure as its reason, rather than failing the opening node.
    expectEqual("a leftover with no metadata goes back to open too", storeIssue(root, unnameable).status, "open");
    const unnameableReason = storeComments(root, unnameable)[0]?.text ?? "";
    expect(
      "with the naming failure as its reason",
      unnameableReason.includes("carries no handle metadata"),
      unnameableReason,
    );
  });

  // The structural half: the repair is the always-run node's, it decides from 05's git lookup and
  // resolves through 05's two settlements, and it never reaches for the merge itself - a repair records
  // what landed, it does not land anything.
  const openSource = readFileSync(drain.script("open"), "utf8");
  expect("the opening node runs the repair", /reconcileLeftovers\(/.test(openSource), openSource.slice(0, 200));
  const reconcileSource = readFileSync(join(drain.dir, "scripts", "reconcile.ts"), "utf8");
  for (const call of ["mergedOnMain", "settleMerged", "settleFailed"]) {
    expect(`the repair goes through ${call}`, new RegExp(`\\b${call}\\s*\\(`).test(reconcileSource), call);
  }
  const mergesOfItsOwn = /\bmergeIntoMain\s*\(/.exec(reconcileSource);
  expect("and merges nothing of its own", mergesOfItsOwn === null, mergesOfItsOwn?.[0]);

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
