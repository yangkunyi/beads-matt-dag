#!/usr/bin/env bun
/**
 * Repro: a range the pack wrote itself is not a review.
 *
 * A first drain on a fresh Target can leave a range holding only the pack's own housekeeping commit -
 * `chore(beads-dag): ignore runtime paths`, the write `ensureWorktreesIgnored` makes before the
 * worktree exists, which lands even when the attempt that follows fails. Step 1's acceptance observed
 * exactly that range and three reviewers and a summariser spent about ten minutes of wall clock on it.
 * Both readers now write the skip line naming the reason, spend no agent, and leave the recorded
 * position where the run opened it.
 *
 * The guard is **positive recognition of every commit in the range**, and never "no merge": a false
 * "ours" silently drops a review, a false "not ours" spends one session on a trivial range, so the
 * cheap mistake is the only one this may make. A commit is recognised only when all three facts hold -
 * the exact subject the pack's own write uses, a single parent (a merge brought work in, whoever wrote
 * its message), and a diff whose paths are all paths that write owns. Anything else - an operator's
 * commit, a branch's work, a commit that merely copies the subject - is unrecognised, and one
 * unrecognised commit means the range is reviewed.
 *
 * Neither reader advances the position on this skip: the position means "which Main tip a review has
 * looked at", and a bookkeeping range was not looked at. The cost is one cheap range probe per run and
 * no session; the benefit is that a range wrongly demoted stays inside every later run's report, named
 * by the same skip line, instead of vanishing behind the ref.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { AgentRunner } from "../scripts/agent.ts";
import { addAttempted } from "../scripts/attempted.ts";
import type { PackConfig } from "../scripts/config.ts";
import { FAILURES_HEADING } from "../scripts/failures.ts";
import { withMainLock } from "../scripts/lock.ts";
import { ensureWorktreesIgnored, IGNORE_COMMIT_SUBJECT, mergeSubject } from "../scripts/main-writes.ts";
import { issueNames } from "../scripts/naming.ts";
import { FAILED, MERGED, NOTHING_TO_REPORT, OPENED, REPORTED, nodeLine } from "../scripts/node-outcomes.ts";
import { REVIEW_AXES } from "../scripts/prompt.ts";
import { readReviewBase, REVIEW_MD_REL, skipLine, SUMMARY_MD_REL } from "../scripts/report-artifacts.ts";
import { rangeHoldsOnlyPackBookkeeping } from "../scripts/report-node.ts";
import { reviewedPosition } from "../scripts/review-position.ts";
import { reviewDrain } from "../scripts/review.ts";
import { summarizeDrain } from "../scripts/summary.ts";
import {
  GATE_LABEL,
  commitFile,
  drain,
  expect,
  expectEqual,
  gitC,
  publishIssue,
  runScript,
  storeBinary,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/** One artifact, read whole. */
function artifact(dir: string, rel: string): string {
  return readFileSync(join(dir, rel), "utf8");
}

type Stub = { run: AgentRunner; prompts: () => string[]; calls: () => number };

/** A stub agent: it answers the text it was built with and records every turn it was handed. */
function stubAgent(answer: string): Stub {
  const prompts: string[] = [];
  return {
    run: async (opts) => {
      prompts.push(opts.prompt);
      return { sessionFile: "", answer: { kind: "text", text: answer }, lastError: undefined };
    },
    prompts: () => prompts,
    calls: () => prompts.length,
  };
}

/** A runner that answers nothing and reports no error: the attempt that follows fails, as in the lab. */
function silentAgent(): AgentRunner {
  return async () => ({ sessionFile: "", answer: { kind: "none" }, lastError: undefined });
}

/** The implementer's stub: it commits in the worktree, so the executor can merge a real branch. */
function committingAgent(): AgentRunner {
  return async (opts) => {
    commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit");
    return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
  };
}

/** The config the in-process nodes read: the store override, as a Target without `bd` on PATH would. */
const CONFIG: PackConfig = {
  model: "some/model",
  thinkingLevel: "high",
  concurrency: 4,
  runner: "pi",
  store: storeBinary(),
};

/** Open one run the way the runner would, and return the base it recorded. */
function openRun(root: string, artifacts: string): string {
  const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
  expectEqual("open speaks the protocol", opened.stdout, nodeLine(OPENED));
  expectEqual("open exits clean", opened.status, 0);
  const base = readReviewBase(artifacts);
  if ("skip" in base) throw new Error(`open left no base: ${base.skip}`);
  return base.base;
}

/** Publish one issue and land its brief as a commit on Main, before the run that will work it opens. */
function publishAndCommit(root: string, handle: string, slug: string, title: string): ReturnType<typeof publishIssue> {
  const issue = publishIssue(root, { title, handle, slug, labels: [GATE_LABEL] });
  gitC(root, "add", "-A");
  gitC(root, "commit", "-m", `the published brief for ${handle}`);
  return issue;
}

/** The reason both readers name for a range they may skip: the pack's own bookkeeping, and the range. */
function bookkeepingSkip(base: string): string {
  return skipLine(`only the pack's own bookkeeping ${base}...main, skipped`);
}

try {
  // The predicate's unit facts, against commits this fixture makes through the pack's own writer: the
  // exact write is recognised; anything the pack did not write defeats the whole range.
  await withTarget(async (root) => {
    const empty = gitC(root, "rev-parse", "main");
    expectEqual("an empty range is the empty-diff skip's, not a bookkeeping range", await rangeHoldsOnlyPackBookkeeping(root, empty, empty), false);
    expectEqual("a base git cannot read is reviewed, never skipped", await rangeHoldsOnlyPackBookkeeping(root, "0".repeat(40), empty), false);

    expectEqual("the pack's own write makes a commit", await withMainLock(root, () => ensureWorktreesIgnored(root)), true);
    const packWrite = gitC(root, "rev-parse", "main");
    expectEqual("and is recognised, alone", await rangeHoldsOnlyPackBookkeeping(root, empty, packWrite), true);

    commitFile(root, "OP.md", "the operator's own work\n", "the operator's own commit");
    const operator = gitC(root, "rev-parse", "main");
    expectEqual("one operator commit defeats the whole range", await rangeHoldsOnlyPackBookkeeping(root, empty, operator), false);

    commitFile(root, "src.txt", "not the pack's write\n", IGNORE_COMMIT_SUBJECT);
    const forged = gitC(root, "rev-parse", "main");
    expectEqual(
      "the subject alone is not enough: the write itself has to be the pack's",
      await rangeHoldsOnlyPackBookkeeping(root, operator, forged),
      false,
    );

    commitFile(root, ".gitignore", "*.tmp\n", "the operator edits .gitignore");
    const ignoreEdit = gitC(root, "rev-parse", "main");
    expectEqual(
      "the pack's paths alone are not enough: the subject has to be the pack's",
      await rangeHoldsOnlyPackBookkeeping(root, forged, ignoreEdit),
      false,
    );

    // A merge commit has two parents; work arrived with it whatever its message says. Every ancestor in
    // the range is a recognised write here (a `.gitignore` commit carrying the pack's subject, one per
    // side), so only the merge's own shape can make the predicate say no.
    const beforeMerge = gitC(root, "rev-parse", "main");
    gitC(root, "checkout", "-q", "-b", "the-side", beforeMerge);
    commitFile(root, ".gitignore", "pack\n", IGNORE_COMMIT_SUBJECT);
    gitC(root, "checkout", "-q", beforeMerge);
    commitFile(root, ".beads/interactions.jsonl", "pack\n", IGNORE_COMMIT_SUBJECT);
    gitC(root, "merge", "--no-ff", "-m", IGNORE_COMMIT_SUBJECT, "the-side");
    const merge = gitC(root, "rev-parse", "HEAD");
    expectEqual("a merge is work, whoever wrote its subject", await rangeHoldsOnlyPackBookkeeping(root, beforeMerge, merge), false);
  });

  // A fresh Target whose first drain made only the pack's own write: the readers skip, naming why, and
  // spend no agent. The existing empty-range skip comes first, unchanged, and prints the same token.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const failing = publishAndCommit(root, "feat/01", "the-failing-issue", "the failing issue");
    const base = openRun(root, artifacts);

    const emptyReviewer = stubAgent("should not run");
    expectEqual(
      "an empty range still reports nothing",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: emptyReviewer.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("with no reviewer", emptyReviewer.calls(), 0);
    expectEqual(
      "and the skip line unchanged",
      artifact(artifacts, REVIEW_MD_REL),
      skipLine(`empty diff ${base}...main, skipped`),
    );

    // The failing attempt is what lands the pack's own write: ensureWorktreesIgnored commits before the
    // worktree exists, and the attempt's failure leaves that commit as the range's only content.
    expectEqual(
      "the failing attempt lands the pack's own write",
      await executeIssue(root, failing.handle, { artifactsDir: artifacts, config: CONFIG, runAgent: silentAgent() }),
      FAILED,
    );
    const head = gitC(root, "rev-parse", "main");
    expectEqual("and nothing else", gitC(root, "log", "--format=%s", `${base}..${head}`), IGNORE_COMMIT_SUBJECT);

    const reviewer = stubAgent("should not run");
    expectEqual(
      "the review skips the pack's own range",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewer.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("and spends no reviewer", reviewer.calls(), 0);
    const line = bookkeepingSkip(base);
    expectEqual("review.md is the skip line naming why", artifact(artifacts, REVIEW_MD_REL), line);
    expectEqual("the recorded position is where the run opened", reviewedPosition(root), base);

    const summariser = stubAgent("should not run");
    expectEqual(
      "the summary skips too",
      await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("and spends no summariser", summariser.calls(), 0);
    expectEqual(
      "summary.md names the review's reason",
      artifact(artifacts, SUMMARY_MD_REL),
      skipLine(`review.md: ${line.trim()}`),
    );

    // A second run over the same Target: the position stayed, so the same range is probed and skipped
    // again - one cheap probe and no session, which is the cost of not advancing on a skip.
    const run2 = join(artifacts, "run-2");
    expectEqual("a second run opens on the same position", openRun(root, run2), base);
    const reviewer2 = stubAgent("should not run");
    expectEqual(
      "and skips the same range",
      await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer2.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("still spending no reviewer", reviewer2.calls(), 0);
    expectEqual("with the same reason", artifact(run2, REVIEW_MD_REL), line);

    // Now an operator's own commit beside the pack's write: the range is reviewed, the operator's work
    // included, and only now does the position advance.
    commitFile(root, "OP.md", "the operator's own work\n", "the operator's own commit");
    const operatorHead = gitC(root, "rev-parse", "main");
    const reviewer3 = stubAgent("a finding");
    expectEqual(
      "an operator commit beside the pack's write is reviewed",
      await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer3.run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    expectEqual("with one reviewer per axis", reviewer3.calls(), REVIEW_AXES.length);
    expect(
      "over the range that holds both",
      reviewer3.prompts()[0]!.includes("the operator's own commit") && reviewer3.prompts()[0]!.includes(IGNORE_COMMIT_SUBJECT),
      reviewer3.prompts()[0],
    );
    expectEqual("the position advances past the reviewed range", reviewedPosition(root), operatorHead);
    expectEqual("and review.md holds findings", artifact(run2, REVIEW_MD_REL).startsWith("skip:"), false);
  });

  // A range holding the pack's own write and a real issue merge is reviewed normally, the pack's own
  // commit included: the guard is "nothing but our own bookkeeping", never "no merge".
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const failing = publishAndCommit(root, "feat/01", "the-failing-issue", "the failing issue");
    const second = publishAndCommit(root, "feat/02", "the-second-issue", "the second issue");
    const base = openRun(root, artifacts);

    expectEqual(
      "the failing attempt lands the pack's own write",
      await executeIssue(root, failing.handle, { artifactsDir: artifacts, config: CONFIG, runAgent: silentAgent() }),
      FAILED,
    );
    const names = issueNames(second);
    expectEqual(
      "the second issue merges",
      await executeIssue(root, second.handle, { artifactsDir: artifacts, config: CONFIG, runAgent: committingAgent() }),
      MERGED,
    );
    const head = gitC(root, "rev-parse", "main");
    const menu = gitC(root, "log", "--format=%s", `${base}..${head}`);
    expect("the range holds the pack's write", menu.includes(IGNORE_COMMIT_SUBJECT), menu);
    expect("and the merge", menu.includes(mergeSubject(names)), menu);

    const reviewer = stubAgent("a finding");
    expectEqual(
      "the review reports over the whole range",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewer.run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    expectEqual("with one reviewer per axis", reviewer.calls(), REVIEW_AXES.length);
    const brief = reviewer.prompts()[0]!;
    expect("the pack's own commit is in the reviewers' menu", brief.includes(IGNORE_COMMIT_SUBJECT), brief);
    expect("and so is the merge", brief.includes(mergeSubject(names)), brief);
    expectEqual("the position advances", reviewedPosition(root), head);

    const summariser = stubAgent("the report");
    expectEqual(
      "the summary reports too",
      await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    expect(
      "the summary's range counts both of the run's own writes",
      artifact(artifacts, SUMMARY_MD_REL).includes("2 commits on Main, 2 made by this run, 0 not made by this run"),
      artifact(artifacts, SUMMARY_MD_REL),
    );
    expect(
      "and no commit is named as not this run's",
      !artifact(artifacts, SUMMARY_MD_REL).includes("## Commits this run did not make"),
      artifact(artifacts, SUMMARY_MD_REL),
    );
  });

  // A bookkeeping-only range still reports the run's failures: the skip line stays, and the block is
  // written under it. The guard is in the review's read, not the shared skeleton, precisely so the
  // summary's own store reading and its block cannot be short-circuited by a range it will not review.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const failing = publishAndCommit(root, "feat/01", "the-failing-issue", "the failing issue");
    const base = openRun(root, artifacts);
    expectEqual(
      "the failing attempt lands the pack's own write",
      await executeIssue(root, failing.handle, { artifactsDir: artifacts, config: CONFIG, runAgent: silentAgent() }),
      FAILED,
    );
    addAttempted(artifacts, [failing.id]);

    const reviewer = stubAgent("should not run");
    expectEqual(
      "the review skips",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewer.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("and spends no reviewer", reviewer.calls(), 0);

    const summariser = stubAgent("should not run");
    expectEqual(
      "the summary still reports the failure",
      await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    expectEqual("and spends no summariser", summariser.calls(), 0);
    expectEqual(
      "the artifact is the skip line and then the block",
      artifact(artifacts, SUMMARY_MD_REL),
      `${skipLine(`review.md: ${bookkeepingSkip(base).trim()}`)}\n${FAILURES_HEADING}\n\n` +
        `- ${failing.handle} [${failing.id}] — 1 recorded failure, open; attempted by this run; ` +
        `latest: attempt 1 failed: the implementer produced no answer\n`,
    );
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
