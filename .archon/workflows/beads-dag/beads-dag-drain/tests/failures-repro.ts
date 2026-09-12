#!/usr/bin/env bun
/**
 * Repro: the drain-end report says what failed, and how often - read from the store.
 *
 * A failure is an event, not a status (ADR-0003): the reason is a comment and the issue goes back to
 * `open`, so the count of an issue's failed attempts is a reading of the store's own comments
 * (`bd comments <id> --json`, counted over the `attempt N failed:` records) and never a counter this
 * pack keeps. The report's block is written by the node, next to the summary the agent answered: what a
 * reader sees is exactly what the store answered, and the model is never handed a number.
 *
 * A run with nothing to say writes one line; a run with no report at all keeps its skip line; a failure
 * with nothing merged is still reported, under that skip line, because a run that burned a worker slot
 * said nothing at all before this ticket.
 *
 * Every failure here is produced by the flow's own writes (the fixture's `failAttempt`, or a real
 * `open` repairing a real leftover), never staged as a comment of the test's own invention.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentRunner } from "../scripts/agent.ts";
import { addAttempted } from "../scripts/attempted.ts";
import type { PackConfig } from "../scripts/config.ts";
import { FAILURES_HEADING } from "../scripts/failures.ts";
import { mergeSubject } from "../scripts/main-writes.ts";
import { issueNames } from "../scripts/naming.ts";
import { NOTHING_TO_REPORT, OPENED, REPORTED, nodeLine } from "../scripts/node-outcomes.ts";
import { REVIEW_BASE_REL, REVIEW_MD_REL, SUMMARY_MD_REL, skipLine, writeArtifact } from "../scripts/report-artifacts.ts";
import { reviewDrain } from "../scripts/review.ts";
import { summarizeDrain } from "../scripts/summary.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  drain,
  expect,
  expectEqual,
  expectReject,
  gitC,
  publishIssue,
  runScript,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

/** One artifact, read whole. */
function artifact(dir: string, rel: string): string {
  return readFileSync(join(dir, rel), "utf8");
}

type Stub = { run: AgentRunner; prompts: () => string[] };

/** A stub agent: it answers the text it was built with and records the briefs it was handed. */
function stubAgent(answer: string): Stub {
  const prompts: string[] = [];
  return {
    run: async (opts) => {
      prompts.push(opts.prompt);
      return { sessionFile: "", answer: { kind: "text", text: answer }, lastError: undefined };
    },
    prompts: () => prompts,
  };
}

/** A stub agent that answers nothing: the runner's failure report is what the node falls back to. */
function dyingAgent(reason: string): AgentRunner {
  return async () => ({ sessionFile: "", answer: { kind: "none" }, lastError: reason });
}

/** A runner that cannot start: the turn throws, as a runner with no session to open does. */
function throwingAgent(reason: string): AgentRunner {
  return async () => {
    throw new Error(reason);
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

/** Run the report pair the way the drain does, over one artifacts dir, and read back both. */
async function readTheRun(
  root: string,
  artifacts: string,
  config: PackConfig = CONFIG,
): Promise<{ summary: string; prompts: string[] }> {
  const reviewers = stubAgent("one finding");
  const reviewed = await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewers.run, config });
  expectEqual("the review reports", reviewed, nodeLine(REPORTED));
  const summariser = stubAgent("the summary");
  const summarised = await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config });
  expectEqual("the summary reports", summarised, nodeLine(REPORTED));
  return { summary: artifact(artifacts, SUMMARY_MD_REL), prompts: summariser.prompts() };
}

/** The number a row reports, read back out of the artifact - never out of the module under test. */
function countIn(block: string): number {
  const m = /— (\d+) recorded failure/.exec(block);
  if (!m) throw new Error(`no count in the block: ${block}`);
  return Number(m[1]);
}

/** The block of one artifact, from its heading to the end. */
function blockOf(summary: string): string {
  const at = summary.indexOf(FAILURES_HEADING);
  if (at < 0) throw new Error(`no failures block in the artifact: ${summary}`);
  return summary.slice(at);
}

try {
  // A failure this run left open is named with the store's own count; an issue that never failed is not.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const failed = publishIssue(root, { title: "the failure", handle: "feat/01", slug: "the-failure", labels: [GATE_LABEL] });
    const merged = publishIssue(root, { title: "the merge", handle: "feat/02", slug: "the-merge", labels: [GATE_LABEL] });

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run opens", opened.stdout, nodeLine(OPENED));

    // A failed attempt, recorded the way the flow records one; and one issue that merged and closed.
    bd(root, "update", failed.id, "-s", "in_progress");
    bd(root, "comment", failed.id, "attempt 1 failed: nothing to merge: the brief commits nothing");
    bd(root, "update", failed.id, "-s", "open");
    bd(root, "update", merged.id, "-s", "in_progress");
    bd(root, "close", merged.id, "-r", "merged beads/feat/02-the-merge");
    addAttempted(artifacts, [failed.id, merged.id]);
    // This run merged something, so the review is a review: one commit past the base.
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    const { summary, prompts } = await readTheRun(root, artifacts);
    expect(
      "summary.md is the summariser's answer and then the node's block",
      summary.startsWith("the summary\n\n"),
      summary,
    );
    const block = blockOf(summary);
    expect(`the row names the handle and the store's id`, block.includes(`${failed.handle} [${failed.id}]`), block);
    expect(`the row says this run attempted it`, block.includes("attempted by this run"), block);
    expectEqual("the reason is the store's own text", block.includes("attempt 1 failed: nothing to merge: the brief commits nothing"), true);
    expectEqual(
      "the count is the store's own comment count",
      countIn(block),
      storeComments(root, failed.id).length,
    );
    expect(`the issue that never failed has no row`, !block.includes(merged.id) && !block.includes(merged.handle), block);
    expectEqual("the store still holds the issue open", storeIssue(root, failed.id).status, "open");
    expectEqual("the block is one delimited section", summary.indexOf(FAILURES_HEADING), summary.lastIndexOf(FAILURES_HEADING));
    expect(`the block never sits inside the agent's answer`, summary.indexOf(FAILURES_HEADING) > summary.indexOf("the summary"), summary);

    // The node reads the store; the model is never handed a number. The summariser's brief is the
    // review: no id, no reason, no count.
    expectEqual("one summariser turn", prompts.length, 1);
    expect(`the summariser's brief names no failed issue`, !prompts[0]!.includes(failed.id), prompts[0]);
    expect(`and carries no number`, !/recorded failure/.test(prompts[0]!), prompts[0]);
  });

  // A model that fails to answer does not take the numbers with it: the block is the node's.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const failed = publishIssue(root, { title: "the failure", handle: "feat/01", slug: "the-failure", labels: [GATE_LABEL] });
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run opens", opened.stdout, nodeLine(OPENED));
    bd(root, "update", failed.id, "-s", "in_progress");
    bd(root, "comment", failed.id, "attempt 1 failed: the reason the store keeps");
    bd(root, "update", failed.id, "-s", "open");
    addAttempted(artifacts, [failed.id]);
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    const reviewers = stubAgent("one finding");
    expectEqual(
      "the review reports",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewers.run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    const token = await summarizeDrain(root, {
      artifactsDir: artifacts,
      runAgent: dyingAgent("the summariser died"),
      config: CONFIG,
    });
    expectEqual("the summary still reports", token, nodeLine(REPORTED));
    const summary = artifact(artifacts, SUMMARY_MD_REL);
    expectEqual("the node kept the failure block despite the failed turn", summary.startsWith(`the summariser died\n\n${FAILURES_HEADING}\n\n`), true);
    expectEqual("and the store's count is in it", countIn(blockOf(summary)), 1);

    // A runner that cannot start throws instead of answering: the error line replaces the prose, and the
    // numbers the node read are still the report's tail.
    const thrown = await summarizeDrain(root, {
      artifactsDir: artifacts,
      runAgent: throwingAgent("the runner could not start"),
      config: CONFIG,
    });
    expectEqual("a thrown turn still reports", thrown, nodeLine(REPORTED));
    const failedSummary = artifact(artifacts, SUMMARY_MD_REL);
    expect(
      "and the artifact is the node's error line, then the block",
      failedSummary.startsWith(`summary error: the runner could not start\n\n${FAILURES_HEADING}\n\n`),
      failedSummary,
    );
    expectEqual("with the store's count intact", countIn(blockOf(failedSummary)), 1);
  });

  // Cumulative across drains: the same issue failing twice reports 1, then 2 - and the first run's
  // artifact is a reading taken then, not a live view.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const failed = publishIssue(root, { title: "the failure", handle: "feat/01", slug: "the-failure", labels: [GATE_LABEL] });
    const run1 = join(artifacts, "run-1");
    const run2 = join(artifacts, "run-2");

    expectEqual("run 1 opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: run1 }).stdout, nodeLine(OPENED));
    bd(root, "update", failed.id, "-s", "in_progress");
    bd(root, "comment", failed.id, "attempt 1 failed: the first reason");
    bd(root, "update", failed.id, "-s", "open");
    addAttempted(run1, [failed.id]);
    commitFile(root, "run-1.txt", "x\n", "run 1's delivered work");
    const summary1 = (await readTheRun(root, run1)).summary;
    expectEqual("run 1 reports one recorded failure", countIn(blockOf(summary1)), 1);
    expectEqual("with the first reason", blockOf(summary1).includes("attempt 1 failed: the first reason"), true);

    expectEqual("run 2 opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: run2 }).stdout, nodeLine(OPENED));
    bd(root, "update", failed.id, "-s", "in_progress");
    bd(root, "comment", failed.id, "attempt 2 failed: the second reason");
    bd(root, "update", failed.id, "-s", "open");
    addAttempted(run2, [failed.id]);
    commitFile(root, "run-2.txt", "x\n", "run 2's delivered work");
    const summary2 = (await readTheRun(root, run2)).summary;
    expectEqual("run 2 reports the second failure", countIn(blockOf(summary2)), 2);
    expectEqual("with the latest reason", blockOf(summary2).includes("attempt 2 failed: the second reason"), true);
    expectEqual("the store holds both failures", storeComments(root, failed.id).length, 2);
    expectEqual("run 1's report is the reading taken then", artifact(run1, SUMMARY_MD_REL), summary1);
    expectEqual("and it is not rewritten by run 2", countIn(blockOf(artifact(run1, SUMMARY_MD_REL))), 1);
  });

  // A run with nothing to say about failures says so in one line, not an empty section.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    publishIssue(root, { title: "the merge", handle: "feat/01", slug: "the-merge", labels: [GATE_LABEL] });
    expectEqual("the run opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts }).stdout, nodeLine(OPENED));
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    const block = blockOf((await readTheRun(root, artifacts)).summary);
    expectEqual("the block is the heading and one line", block, `${FAILURES_HEADING}\n\nnone this run\n`);
    expectEqual("and nothing else follows it", block.trim().split("\n").length, 3);
  });

  // A run with no report at all keeps its skip line - and the readers spend no agent.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    expectEqual("the run opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts }).stdout, nodeLine(OPENED));

    const reviewers = stubAgent("should not run");
    expectEqual(
      "a run that merged nothing reviews nothing",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewers.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("and spends no reviewer", reviewers.prompts().length, 0);
    const reviewMd = artifact(artifacts, REVIEW_MD_REL);

    const summariser = stubAgent("should not run");
    expectEqual(
      "its summary reports nothing too",
      await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual("and spends no summariser", summariser.prompts().length, 0);
    expectEqual("summary.md is the skip line, unchanged", artifact(artifacts, SUMMARY_MD_REL), skipLine(`review.md: ${reviewMd.trim()}`));
    expect("with no failures block in it", !artifact(artifacts, SUMMARY_MD_REL).includes(FAILURES_HEADING));
  });

  // A failure with nothing merged is still reported: the skip line, then the node's block. This is the
  // run that used to print `nothing` while it had burned a worker slot.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const failed = publishIssue(root, { title: "the failure", handle: "feat/01", slug: "the-failure", labels: [GATE_LABEL] });
    expectEqual("the run opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts }).stdout, nodeLine(OPENED));
    bd(root, "update", failed.id, "-s", "in_progress");
    bd(root, "comment", failed.id, "attempt 1 failed: nothing to merge: the brief commits nothing");
    bd(root, "update", failed.id, "-s", "open");
    addAttempted(artifacts, [failed.id]);

    const reviewers = stubAgent("should not run");
    expectEqual(
      "no merge means no review",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewers.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    const reviewMd = artifact(artifacts, REVIEW_MD_REL);
    const summariser = stubAgent("should not run");
    expectEqual(
      "but the run reports its failure",
      await summarizeDrain(root, { artifactsDir: artifacts, runAgent: summariser.run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    expectEqual("and spends no summariser", summariser.prompts().length, 0);
    expectEqual(
      "the artifact is the review's skip line and then the block",
      artifact(artifacts, SUMMARY_MD_REL),
      `${skipLine(`review.md: ${reviewMd.trim()}`)}\n${FAILURES_HEADING}\n\n- ${failed.handle} [${failed.id}] — 1 recorded failure, open; attempted by this run; latest: attempt 1 failed: nothing to merge: the brief commits nothing\n`,
    );
  });

  // A leftover the opening repair reopened is named with the repair's own reason, and the block says
  // the repair reopened it. The repair is a real `open` over a real claimed leftover, not a staged one.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const leftover = publishIssue(root, { title: "the leftover", handle: "feat/03", slug: "the-leftover", labels: [GATE_LABEL] });
    bd(root, "update", leftover.id, "-s", "in_progress");

    expectEqual("the run opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts }).stdout, nodeLine(OPENED));
    const reason = `leftover in progress and main carries no merge commit of beads/feat/03-the-leftover`;
    expectEqual(
      "the repair reopened it with its reason",
      storeComments(root, leftover.id).map((c) => c.text),
      [`attempt 1 failed: ${reason}`],
    );
    expectEqual("and the store holds it open again", storeIssue(root, leftover.id).status, "open");
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    const block = blockOf((await readTheRun(root, artifacts)).summary);
    expect(`the row names the leftover`, block.includes(`${leftover.handle} [${leftover.id}]`), block);
    expectEqual("the repair's reason is the row's reason", block.includes(reason), true);
    expectEqual("the block says the repair reopened it", block.includes("reopened by an opening repair"), true);
    expectEqual("it was not attempted by this run", block.includes("not attempted by this run"), true);
    expectEqual("and its count is what the store records", countIn(block), 1);
  });

  // A leftover that cannot be named in git is reopened with the naming failure itself, and the report
  // names it by its store id: the repair's other reason, recognised the same way.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const nameless = bd(root, "create", "the nameless leftover", "--type", "task", "--silent");
    bd(root, "update", nameless, "-s", "in_progress");

    expectEqual("the run opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts }).stdout, nodeLine(OPENED));
    const reason = `issue ${nameless} carries no handle metadata: the tracker publishes "handle" (<feature>/<NN>) with every issue, and every git name derives from it`;
    expectEqual(
      "the repair reopened it with the naming failure",
      storeComments(root, nameless).map((c) => c.text),
      [`attempt 1 failed: ${reason}`],
    );
    expectEqual("and the store holds it open again", storeIssue(root, nameless).status, "open");

    const reviewers = stubAgent("should not run");
    expectEqual(
      "no merge means no review",
      await reviewDrain(root, { artifactsDir: artifacts, runAgent: reviewers.run, config: CONFIG }),
      nodeLine(NOTHING_TO_REPORT),
    );
    expectEqual(
      "the report still names the leftover",
      await summarizeDrain(root, { artifactsDir: artifacts, runAgent: stubAgent("should not run").run, config: CONFIG }),
      nodeLine(REPORTED),
    );
    const reviewMd = artifact(artifacts, REVIEW_MD_REL);
    expectEqual(
      "by its id, with the repair's reason",
      artifact(artifacts, SUMMARY_MD_REL),
      `${skipLine(`review.md: ${reviewMd.trim()}`)}\n${FAILURES_HEADING}\n\n- ${nameless} — 1 recorded failure, open; not attempted by this run; reopened by an opening repair: ${reason}\n`,
    );
  });

  // A repair that closed an issue writes no failure record - its merge is the range's business, and the
  // store cannot tell its close from a settlement's, so there is no row here and nothing is invented.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const killed = publishIssue(root, { title: "merged then killed", handle: "feat/04", slug: "merged-then-killed", labels: [GATE_LABEL] });
    const names = issueNames(killed);
    gitC(root, "worktree", "add", "-b", names.branch, join(root, names.worktreeRel), "main");
    commitFile(join(root, names.worktreeRel), "work.txt", "the work\n", "the implementer's commit");
    gitC(root, "merge", "--no-ff", "-m", mergeSubject(names), names.branch);
    bd(root, "update", killed.id, "-s", "in_progress");

    expectEqual("the run opens", runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts }).stdout, nodeLine(OPENED));
    expectEqual("the repair closed the leftover", storeIssue(root, killed.id).status, "closed");
    expectEqual("and it wrote no failure record", storeComments(root, killed.id), []);
    commitFile(root, "delivered.txt", "x\n", "the run's delivered work");

    const block = blockOf((await readTheRun(root, artifacts)).summary);
    expectEqual("so there is no row for it", block, `${FAILURES_HEADING}\n\nnone this run\n`);
  });

  // The report reads the store: a Target whose store cannot be read fails the node, naming the reason,
  // rather than writing a report that says nothing failed.
  await withTarget(
    async (root, artifacts) => {
      writeTargetConfig(root, `store: ${storeBinary()}\n`);
      writeArtifact(join(artifacts, REVIEW_BASE_REL), gitC(root, "rev-parse", "main"));
      writeArtifact(join(artifacts, REVIEW_MD_REL), "## 1. Bugs and incorrect assumptions in the diff\n\nsomething\n");
      expect("no store directory at all", !existsSync(join(root, ".beads")));
      await expectReject(
        "the summary node fails when the store is not there",
        () => summarizeDrain(root, { artifactsDir: artifacts, runAgent: stubAgent("unused").run, config: CONFIG }),
        /no store in the Target/,
      );
    },
    { store: false },
  );

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
