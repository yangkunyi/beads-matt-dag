#!/usr/bin/env bun
/**
 * Repro: one issue, one worktree, named from the issue.
 *
 * The worktree's path, its branch and the body's path are derived from the issue's two metadata keys -
 * `handle` (`<feature>/<NN>`) and `slug` - and from nothing else. Nothing lists a directory and guesses
 * between candidates, and an issue whose metadata cannot name a worktree fails the node loudly instead
 * of starting work in a place nobody can name.
 *
 * The executor is driven the way a run drives it. The turn itself is the fixture's stub agent: it
 * records the options it was handed and commits the way an implementer would. The live session arrives
 * with the runner work; everything before and after the turn is this ticket's - and after it, the
 * settlement merges the branch into Main, records it, and drops the worktree (ticket 05).
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { FAILED, MERGED } from "../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  execute,
  expect,
  expectEqual,
  gitC,
  publishIssue,
  runScript,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/** The stub agent: it records what it was handed, observes where it is, and commits what an implementer would. */
function recorder(
  turns: PackAgentOpts[],
  commits: { file: string; content: string; message: string }[] = [],
  observe?: (opts: PackAgentOpts) => void,
): (opts: PackAgentOpts) => Promise<PackAgentResult> {
  return async (opts) => {
    turns.push(opts);
    observe?.(opts);
    for (const c of commits) commitFile(opts.cwd, c.file, c.content, c.message);
    return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
  };
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

try {
  // The worktree and its branch are named from the issue, the implementer's commits are made there,
  // and the settlement lands them in Main and drops the worktree.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "one issue, one worktree",
      handle: "feat/07",
      slug: "one-worktree",
      labels: [GATE_LABEL],
    });
    const turns: PackAgentOpts[] = [];
    let atTurn = { branch: "", main: "" };

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: recorder(
        turns,
        [{ file: "work.txt", content: "the work\n", message: "the implementer's commit" }],
        (opts) => {
          atTurn = {
            branch: gitC(opts.cwd, "rev-parse", "--abbrev-ref", "HEAD"),
            main: gitC(root, "rev-parse", "main"),
          };
        },
      ),
    });

    const worktree = join(root, "worktrees", "feat-07-one-worktree");
    const branch = "beads/feat/07-one-worktree";
    expectEqual("the turn ran in the issue's own worktree", turns[0]?.cwd, worktree);
    expectEqual("which had the issue's branch checked out", atTurn.branch, branch);
    expectEqual("and was created off Main", atTurn.main.length > 0, true);
    expectEqual("a clean merge settles the issue", outcome, MERGED);
    const tip = gitC(root, "rev-parse", "main");
    expectEqual(
      "the implementer's commit became Main's second parent",
      gitC(root, "log", "-1", "--format=%s", `${tip}^2`),
      "the implementer's commit",
    );
    expectEqual("made on a branch that came off Main", gitC(root, "rev-parse", `${tip}^2^`), atTurn.main);
    expectEqual("so the work is in Main now", gitC(root, "show", "main:work.txt"), "the work");
    expect("the merge commit names the issue's branch", gitC(root, "log", "-1", "--format=%s", tip).includes(branch));
    expectEqual("the worktree is dropped once the merge landed", existsSync(worktree), false);
    expectEqual("and its branch with it", gitC(root, "branch", "--list", branch), "");
  });

  // A worktree is not found by listing a directory: an issue's own names decide, whatever is there.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "one issue, one worktree",
      handle: "feat/07",
      slug: "one-worktree",
      labels: [GATE_LABEL],
    });
    // A real worktree of another branch, sitting where a listing by feature and number would find it
    // first (and where one by slug would not): the issue's own names are what decide.
    mkdirSync(join(root, "worktrees"), { recursive: true });
    const decoy = join(root, "worktrees", "feat-07-elsewhere");
    gitC(root, "worktree", "add", "-b", "decoy", decoy, "main");

    await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: recorder([]) });

    const worktree = join(root, "worktrees", "feat-07-one-worktree");
    expect("the issue's own worktree was created beside the decoy", existsSync(worktree), readdirSync(join(root, "worktrees")));
    expectEqual("the issue's branch is the one checked out there", gitC(worktree, "rev-parse", "--abbrev-ref", "HEAD"), "beads/feat/07-one-worktree");
    expectEqual("the decoy still carries its own branch", gitC(decoy, "rev-parse", "--abbrev-ref", "HEAD"), "decoy");
  });

  // A second attempt on the same issue: one worktree, Main brought into it, no directory listing.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "an issue that is worked twice",
      handle: "feat/08",
      slug: "worked-twice",
      labels: [GATE_LABEL],
    });
    const branch = "beads/feat/08-worked-twice";
    const worktree = join(root, "worktrees", "feat-08-worked-twice");

    // The first attempt commits, then fails: its work stays on the issue's branch, in its worktree,
    // which is what a resumed attempt has to build on rather than throw away.
    const first = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        commitFile(opts.cwd, "first.txt", "1\n", "the first attempt");
        return { sessionFile: "", answer: { kind: "none" }, lastError: "the first attempt did not land" };
      },
    });
    expectEqual("the first attempt did not land", first, FAILED);
    expectEqual("its worktree is left where it was", existsSync(worktree), true);
    expectEqual("holding its commit", gitC(root, "log", "-1", "--format=%s", branch), "the first attempt");
    expectEqual("which Main has not got", gitC(root, "rev-list", "--count", `main..${branch}`), "1");

    // While the issue waits, something else lands on Main.
    commitFile(root, "landed.txt", "a dependency\n", "a dependency landed");
    const mainTip = gitC(root, "rev-parse", "main");
    let sawMainInTheWorktree = false;
    let oneWorktree = false;

    const second = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        sawMainInTheWorktree = isAncestor(opts.cwd, mainTip, "HEAD");
        oneWorktree = readdirSync(join(root, "worktrees")).length === 1;
        expectEqual("the second attempt runs in the issue's own worktree", opts.cwd, worktree);
        commitFile(opts.cwd, "second.txt", "2\n", "the second attempt");
        return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
      },
    });

    expectEqual("there was still one worktree to resume", oneWorktree, true);
    expectEqual("Main was brought into it", sawMainInTheWorktree, true);
    expectEqual("the second attempt settles the issue", second, MERGED);
    const subjects = gitC(root, "log", "--format=%s", "main");
    expect(
      "both attempts are in Main",
      subjects.includes("the first attempt") && subjects.includes("the second attempt"),
      subjects,
    );
    expect("and so is what landed while it waited", subjects.includes("a dependency landed"), subjects);
    expectEqual("the worktree is dropped after the merge", existsSync(worktree), false);
    expectEqual("and the branch with it", gitC(root, "branch", "--list", branch), "");
  });

  // An issue the store cannot name in git fails the node loudly, naming what was missing.
  await withTarget(async (root, artifacts) => {
    // A handle no issue carries.
    const unknown = runScript(execute.script("execute"), root, { ARTIFACTS_DIR: artifacts, INPUTS_ISSUE: "feat/99" });
    expectEqual("an unknown handle prints no token", unknown.stdout, "");
    expect("an unknown handle fails the node", unknown.status !== 0, unknown.status);
    expect("the reason names the handle", unknown.stderr.includes("feat/99"), unknown.stderr);
    expectEqual("and no worktree was created", existsSync(join(root, "worktrees")), false);

    // A published issue with no slug: half of an issue's git name is missing.
    const noSlug = bd(
      root,
      "create",
      "an issue with no slug",
      "--type",
      "task",
      "--silent",
      "--labels",
      GATE_LABEL,
      "--metadata",
      JSON.stringify({ handle: "feat/09" }),
    );
    const missing = runScript(execute.script("execute"), root, { ARTIFACTS_DIR: artifacts, INPUTS_ISSUE: "feat/09" });
    expectEqual("an issue with no slug prints no token", missing.stdout, "");
    expect("an issue with no slug fails the node", missing.status !== 0, missing.status);
    expect("the reason names the slug", missing.stderr.includes("slug"), missing.stderr);
    expectEqual("the store still holds the issue", bd(root, "show", noSlug, "--json").includes("feat/09"), true);

    // Two issues carrying one handle: there is no candidate to guess between.
    publishIssue(root, { title: "one of two", handle: "feat/10", slug: "one-of-two", labels: [GATE_LABEL] });
    bd(
      root,
      "create",
      "the other of two",
      "--type",
      "task",
      "--silent",
      "--labels",
      GATE_LABEL,
      "--metadata",
      JSON.stringify({ handle: "feat/10", slug: "the-other-of-two" }),
    );
    const ambiguous = runScript(execute.script("execute"), root, { ARTIFACTS_DIR: artifacts, INPUTS_ISSUE: "feat/10" });
    expectEqual("a shared handle prints no token", ambiguous.stdout, "");
    expect("a shared handle fails the node", ambiguous.status !== 0, ambiguous.status);
    expect("the reason names the handle", ambiguous.stderr.includes("feat/10"), ambiguous.stderr);
    expectEqual("and no worktree was created for it", existsSync(join(root, "worktrees", "feat-10-one-of-two")), false);

    // A handle that cannot name a place: `..` as a segment would climb out of the Target's own
    // directories, so it is refused rather than pasted into a branch, a path and a body file.
    bd(
      root,
      "create",
      "a handle that climbs",
      "--type",
      "task",
      "--silent",
      "--labels",
      GATE_LABEL,
      "--metadata",
      JSON.stringify({ handle: "../01", slug: "climbs" }),
    );
    const climbing = runScript(execute.script("execute"), root, { ARTIFACTS_DIR: artifacts, INPUTS_ISSUE: "../01" });
    expectEqual("a climbing handle prints no token", climbing.stdout, "");
    expect("a climbing handle fails the node", climbing.status !== 0, climbing.status);
    expect("the reason names the handle", climbing.stderr.includes("../01"), climbing.stderr);
  });

  // The node protocol still holds: a node that cannot run prints no token and says what was missing.
  await withTarget(async (root) => {
    const missing = runScript(execute.script("execute"), root, {});
    expectEqual("a node with no inputs prints no token", missing.stdout, "");
    expect("a node with no inputs exits non-zero", missing.status !== 0, missing.status);
    expect("the reason names the input", /INPUTS_ISSUE is required/.test(missing.stderr), missing.stderr);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
