#!/usr/bin/env bun
/**
 * Repro: the review range is what nobody has looked at yet.
 *
 * The range's base is the Target's recorded position (a local git ref, `refs/beads-dag/reviewed`), not
 * Main's tip at open. The opening node records Main's tip as the first position on a Target that has
 * none - so the first run behaves as before - and the review advances it only once it wrote findings.
 * A run killed between its merge and its review therefore leaves its merge inside the next run's
 * range, and a review that was skipped or failed leaves the position where the run opened, so the next
 * run covers the same range again.
 *
 * Both readers read one base - the run's review-base artifact - so the review's advance cannot hide the
 * range from the summary that follows it. That is the failure this ticket exists for: a review that
 * advances the ref and a summary that then reads an empty range.
 *
 * The report also names what it did not make and what the opening step repaired, from the run's own
 * bookkeeping (`main-commits.json`, `repairs.json`) and not from prose: a merge subject looks the same
 * whichever run wrote it, and a repair that closed an issue left no store record at all (ticket 12
 * measured that).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { AgentRunner, PackAgentResult } from "../scripts/agent.ts";
import type { PackConfig } from "../scripts/config.ts";
import { mergeSubject } from "../scripts/main-writes.ts";
import { issueNames } from "../scripts/naming.ts";
import { MERGED, NOTHING_TO_REPORT, OPENED, REPORTED, nodeLine } from "../scripts/node-outcomes.ts";
import {
  isReviewError,
  readReviewBase,
  REVIEW_BASE_REL,
  REVIEW_MD_REL,
  reviewErrorDetail,
  reviewErrorLine,
  reviewWroteFindings,
  skipLine,
  SUMMARY_MD_REL,
} from "../scripts/report-artifacts.ts";
import { reviewedPosition, advanceReviewed } from "../scripts/review-position.ts";
import { reviewDrain } from "../scripts/review.ts";
import { summarizeDrain } from "../scripts/summary.ts";
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
  storeBinary,
  storeIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/** One artifact, read whole. */
function artifact(dir: string, rel: string): string {
  return readFileSync(join(dir, rel), "utf8");
}

type Stub = { run: AgentRunner; prompts: () => string[]; keys: () => string[] };

/** A stub agent: it answers the text it was built with and records every turn it was handed. */
function stubAgent(answer: string): Stub {
  const prompts: string[] = [];
  const keys: string[] = [];
  return {
    run: async (opts) => {
      prompts.push(opts.prompt);
      keys.push(opts.sessionKey);
      return { sessionFile: "", answer: { kind: "text", text: answer }, lastError: undefined };
    },
    prompts: () => prompts,
    keys: () => keys,
  };
}

/** A runner that cannot start: every turn throws, as a runner with no session to open does. */
function throwingAgent(reason: string): Stub {
  const keys: string[] = [];
  return {
    run: async (opts) => {
      keys.push(opts.sessionKey);
      throw new Error(reason);
    },
    prompts: () => [],
    keys: () => keys,
  };
}

/** A runner that answers nothing and reports no error: a turn that completed without speaking. */
function silentAgent(): AgentRunner {
  return async (): Promise<PackAgentResult> => ({
    sessionFile: "",
    answer: { kind: "none" },
    lastError: undefined,
  });
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

/** One issue merged the way a run merges it, for a range the run itself made. */
async function mergeIssue(root: string, artifacts: string, handle: string, slug: string, title: string): Promise<string> {
  const issue = publishIssue(root, { title, handle, slug, labels: [GATE_LABEL] });
  expectEqual(
    "the executor merges the issue",
    await executeIssue(root, issue.handle, { artifactsDir: artifacts, config: CONFIG, runAgent: committingAgent() }),
    MERGED,
  );
  return issue.id;
}

try {
  // The readback the advance rule is decided by: only an artifact that holds findings may move the
  // position. A skip and a failure are the protocol's own two no-finding shapes.
  await withTarget(async () => {
    expectEqual("an empty artifact is no review", reviewWroteFindings(""), false);
    expectEqual("a skip holds no findings", reviewWroteFindings(skipLine("empty diff a...main, skipped")), false);
    expectEqual("a failed review holds no findings", reviewWroteFindings(reviewErrorLine("git diff said no")), false);
    expectEqual("a mixed review is findings", reviewWroteFindings("## 1. x\n\nsomething\n\n## 2. y\n\nreview error: died\n"), true);
    expectEqual("and sections are findings", reviewWroteFindings("## 1. x\n\nsomething\n"), true);
    expectEqual("one axis' error is recognised", isReviewError("review error: died"), true);
    expectEqual("with its reason", reviewErrorDetail("review error: died"), "died");
    expectEqual("and a review is not an error", isReviewError("all good"), false);
  });

  // The position only ever moves forward: a review cannot walk it back to an older head, so a range a
  // later run already reviewed cannot be re-opened.
  await withTarget(async (root) => {
    const older = gitC(root, "rev-parse", "main");
    commitFile(root, "newer.txt", "x\n", "the newer commit");
    const newer = gitC(root, "rev-parse", "main");
    advanceReviewed(root, newer);
    expectEqual("the position advances", reviewedPosition(root), newer);
    advanceReviewed(root, older);
    expectEqual("and an older head does not move it back", reviewedPosition(root), newer);
  });

  // A fresh Target has no position. The first run records Main's tip and uses it as its base - the
  // behavior every run had before the position existed - so its report covers its own merges only.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const tip = gitC(root, "rev-parse", "main");
    expectEqual("a fresh Target records no position", reviewedPosition(root), undefined);

    const base = openRun(root, artifacts);
    expectEqual("the first run's base is Main's tip it opened on", base, tip);
    expectEqual("and the position is now that commit", reviewedPosition(root), tip);
    expectEqual("the base artifact carries it", artifact(artifacts, REVIEW_BASE_REL).trim(), tip);

    // The run merges and reviews: the range is its own work, and the position advances past it.
    await mergeIssue(root, artifacts, "feat/01", "the-first-issue", "the first issue");
    const head = gitC(root, "rev-parse", "main");
    expect("the merge moved Main", head !== base, { base, head });

    const reviewer = stubAgent("a finding");
    expectEqual("the review reports", await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewer.run, config: CONFIG }), nodeLine(REPORTED));
    expectEqual("the reviewer read the run's range", reviewer.prompts()[0]!.includes(`${base}...HEAD`), true);
    expectEqual("the review advanced the position to the range's end", reviewedPosition(root), head);

    // The summary reads the run's base artifact, not the advanced ref: same range, one run, one range,
    // ref advanced once. This is the failure the criterion names.
    const summariser = stubAgent("the report");
    expectEqual("the summary reports", await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config: CONFIG }), nodeLine(REPORTED));
    const summaryPrompt = summariser.prompts()[0]!;
    expect("the summary still reads the run's range", summaryPrompt.includes(`Git range ${base}...HEAD (HEAD = ${head})`), summaryPrompt);
    const summary = artifact(artifacts, SUMMARY_MD_REL);
    expectEqual("the artifact states that range", summary.includes(`\`${base}..${head}\``), true);
    expectEqual("with the run's own commits counted as its own", summary.includes("2 commits on Main, 2 made by this run, 0 not made by this run"), true);
    expectEqual("and no commits named as not this run's", summary.includes("## Commits this run did not make"), false);
    expectEqual("the summary did not move the position again", reviewedPosition(root), head);
  });

  // A review whose node failed leaves the position where it was: the artifact is the protocol's own
  // `review error:` line (all three axes failed), the position stays at the base the run opened, and
  // the next run reports the same range.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const base = openRun(root, artifacts);
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    const failing = throwingAgent("the reviewer could not start");
    expectEqual("the review node reports (its artifact is the failure)", await reviewDrain(root, { artifactsDir: artifacts, runAgent: failing.run, config: CONFIG }), nodeLine(REPORTED));
    expectEqual("every axis was asked", failing.keys().length, 3);
    expectEqual(
      "review.md is one whole-artifact failure",
      artifact(artifacts, REVIEW_MD_REL),
      reviewErrorLine("all 3 review axes failed: the reviewer could not start"),
    );
    expectEqual("the position did not move", reviewedPosition(root), base);

    // The next run opens on the same commit and reports that range again.
    const run2 = join(artifacts, "run-2");
    expectEqual("the next run's base is the same range", openRun(root, run2), base);
    const reviewer = stubAgent("a finding");
    expectEqual("and its review covers it", await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer.run, config: CONFIG }), nodeLine(REPORTED));
    expectEqual("the reviewer read the same range", reviewer.prompts()[0]!.includes(`${base}...HEAD`), true);
  });

  // A review that answered nothing is a failed review too - an axis with no answer has not reviewed
  // anything - so it is normalised to the same failure line and does not move the position.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const base = openRun(root, artifacts);
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    expectEqual("the silent review reports", await reviewDrain(root, { artifactsDir: artifacts, runAgent: silentAgent(), config: CONFIG }), nodeLine(REPORTED));
    expectEqual(
      "review.md says every axis produced no answer",
      artifact(artifacts, REVIEW_MD_REL),
      reviewErrorLine("all 3 review axes failed: the reviewer produced no answer"),
    );
    expectEqual("and the position stays", reviewedPosition(root), base);
  });

  // One failed axis is not a failed review: the other axes reviewed the range, the artifact says which
  // axis failed, and the position advances - the range has been looked at.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const base = openRun(root, artifacts);
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");
    const head = gitC(root, "rev-parse", "main");

    const twoOfThree: AgentRunner = async (opts) => {
      if (opts.sessionKey === "drain-review-2") throw new Error("axis two died");
      return { sessionFile: "", answer: { kind: "text", text: "a finding" }, lastError: undefined };
    };
    expectEqual("the review reports", await reviewDrain(root, { artifactsDir: artifacts, runAgent: twoOfThree, config: CONFIG }), nodeLine(REPORTED));
    const reviewMd = artifact(artifacts, REVIEW_MD_REL);
    expect(`the artifact keeps the failed axis`, reviewMd.includes("review error: axis two died"), reviewMd);
    expect(`and the other axes' findings`, reviewMd.includes("a finding"), reviewMd);
    expectEqual("so the position advanced", reviewedPosition(root), head);
  });

  // A skipped review leaves the position too: nothing was looked at, so nothing advances.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const base = openRun(root, artifacts);
    const reviewer = stubAgent("should not run");
    expectEqual("a run with nothing unviewed reports nothing", await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewer.run, config: CONFIG }), nodeLine(NOTHING_TO_REPORT));
    expectEqual("and spends no reviewer", reviewer.prompts().length, 0);
    expectEqual("the position is where the run opened", reviewedPosition(root), base);
  });

  // A range holding an earlier run's merge and an operator's own commit: the report names both as
  // commits it did not make, from its own record and not from the subjects.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    // Run 1 opens the Target and records the position; its review has nothing else to look at.
    const run1 = join(artifacts, "run-1");
    const base = openRun(root, run1);

    // An earlier run's merge: staged exactly as a run's own merge looks on Main.
    const earlier = publishIssue(root, { title: "the earlier issue", handle: "feat/02", slug: "the-earlier-issue", labels: [GATE_LABEL] });
    const names = issueNames(earlier);
    gitC(root, "worktree", "add", "-b", names.branch, join(root, names.worktreeRel), "main");
    commitFile(join(root, names.worktreeRel), "earlier.txt", "earlier\n", "the earlier run's implementer commit");
    gitC(root, "merge", "--no-ff", "-m", mergeSubject(names), names.branch);
    // And the operator's own commit on Main, after it.
    commitFile(root, "OP.md", "operator\n", "the operator's own commit");
    const head = gitC(root, "rev-parse", "main");

    // Run 2 opens on the recorded position, so its range holds both.
    const run2 = join(artifacts, "run-2");
    expectEqual("run 2 opens on the position, not on Main's tip", openRun(root, run2), base);
    expect("which is behind the newer work", base !== head, { base, head });

    const reviewer = stubAgent("a finding");
    expectEqual("run 2's review reports", await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer.run, config: CONFIG }), nodeLine(REPORTED));
    expectEqual("over the range that holds the earlier work", reviewer.prompts()[0]!.includes(`${base}...HEAD`), true);
    expectEqual("and the earlier merge is in its commit menu", reviewer.prompts()[0]!.includes(mergeSubject(names)), true);

    const summariser = stubAgent("run 2's report");
    expectEqual("run 2's summary reports", await summarizeDrain(root, { artifactsDir: run2, runAgent: summariser.run, config: CONFIG }), nodeLine(REPORTED));
    const summary = artifact(run2, SUMMARY_MD_REL);
    expectEqual("the range is stated", summary.includes(`\`${base}..${head}\``), true);
    expectEqual("with nothing made by this run", summary.includes("2 commits on Main, 0 made by this run, 2 not made by this run"), true);
    expectEqual("and the commits it did not make are named", summary.includes("## Commits this run did not make"), true);
    expect(`the earlier run's merge is named`, summary.includes(`beads-dag: merge ${names.branch}`), summary);
    expect(`the operator's commit is named`, summary.includes("the operator's own commit"), summary);
  });

  // The kill ticket 11 staged, again: the merge landed and the store was never told. The next run
  // repairs it, and - because the position was recorded at the killed run's open - the repaired merge
  // is inside the repairing run's range and named there, as a repair and as a commit it did not make.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const run1 = join(artifacts, "run-1");
    const base = openRun(root, run1);

    const killed = publishIssue(root, { title: "merged then killed", handle: "feat/03", slug: "merged-then-killed", labels: [GATE_LABEL] });
    const names = issueNames(killed);
    gitC(root, "worktree", "add", "-b", names.branch, join(root, names.worktreeRel), "main");
    commitFile(join(root, names.worktreeRel), "work.txt", "the work\n", "the implementer's commit");
    gitC(root, "merge", "--no-ff", "-m", mergeSubject(names), names.branch);
    const mergeCommit = gitC(root, "rev-parse", "main");
    bd(root, "update", killed.id, "-s", "in_progress");

    const run2 = join(artifacts, "run-2");
    expectEqual("the repairing run opens on the recorded position", openRun(root, run2), base);
    expectEqual("the leftover is closed", storeIssue(root, killed.id).status, "closed");
    expectEqual(
      "and the run recorded the repair as its own",
      JSON.parse(readFileSync(join(run2, "repairs.json"), "utf8")),
      [{ id: killed.id, handle: killed.handle, outcome: "merged", mergeCommit }],
    );

    const reviewer = stubAgent("a finding");
    expectEqual("its review reports", await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer.run, config: CONFIG }), nodeLine(REPORTED));
    const summariser = stubAgent("the report");
    expectEqual("its summary reports", await summarizeDrain(root, { artifactsDir: run2, runAgent: summariser.run, config: CONFIG }), nodeLine(REPORTED));
    const summary = artifact(run2, SUMMARY_MD_REL);
    expectEqual("the repaired merge is inside the repairing run's range", summary.includes(mergeSubject(names)), true);
    expectEqual("the merge is named as the repair's evidence", summary.includes("## Repairs at open"), true);
    expect(
      "and the repair names the outcome and the merge",
      summary.includes(`- ${killed.handle} [${killed.id}] — closed: merge ${mergeCommit.slice(0, 12)} had already landed`),
      summary,
    );
    expectEqual("and it is a commit this run did not make", summary.includes("## Commits this run did not make"), true);
    expectEqual("with the range's counts", summary.includes("1 commit on Main, 0 made by this run, 1 not made by this run"), true);
    expectEqual("the position advanced to the end of the range the review covered", reviewedPosition(root), gitC(root, "rev-parse", "main"));
  });

  // A repair that reopened a leftover is named with its reason too: the run's record carries every
  // outcome, not only the closes.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const base = openRun(root, artifacts);
    const leftover = publishIssue(root, { title: "the leftover", handle: "feat/04", slug: "the-leftover", labels: [GATE_LABEL] });
    bd(root, "update", leftover.id, "-s", "in_progress");
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    // A second open in fresh artifacts repairs; the first open recorded the position, so the range is
    // the same either way.
    const run2 = join(artifacts, "run-2");
    expectEqual("the repairing open", openRun(root, run2), base);
    const reason = `leftover in progress and main carries no merge commit of beads/feat/04-the-leftover`;
    const reviewer = stubAgent("a finding");
    expectEqual("the review reports", await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer.run, config: CONFIG }), nodeLine(REPORTED));
    expectEqual("the summary reports", await summarizeDrain(root, { artifactsDir: run2, runAgent: stubAgent("the report").run, config: CONFIG }), nodeLine(REPORTED));
    const summary = artifact(run2, SUMMARY_MD_REL);
    expect(
      "the reopened repair is named with its reason",
      summary.includes(`- ${leftover.handle} [${leftover.id}] — reopened: ${reason}`),
      summary,
    );
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
