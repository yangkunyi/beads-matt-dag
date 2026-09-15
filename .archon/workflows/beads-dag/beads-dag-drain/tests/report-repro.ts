#!/usr/bin/env bun
/**
 * Repro: the drain-end report reads the range this run merged.
 *
 * The opening node records Main's tip as the run's review base, before any merge. Review and summary
 * read `base..Main` - the commits this run added to Main - so the report covers this run's work and
 * never another run's, whatever the repository already carries. The reading is observable at the seam:
 * the commits the reviewers are handed are the range's commit menu, and the artifacts are the report.
 *
 * A run that merged nothing reads an empty range: both readers spend no agent, write their skip line,
 * and print the nothing token. A run that merged work prints the reported token.
 *
 * The readers' answer channel is the same one every role uses (agent.ts): the runner's own answer, not
 * its session log. The stub agents below are that runner for the function-level cases; the fake Pi SDK
 * drives the node scripts themselves for the protocol-level case.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { AgentRunner, PackAgentOpts } from "../scripts/agent.ts";
import { DEFAULT_VERIFY_TIMEOUT_MS } from "../scripts/config.ts";
import { mergeSubject } from "../scripts/main-writes.ts";
import { issueNames } from "../scripts/naming.ts";
import { MERGED, NOTHING_TO_REPORT, OPENED, REPORTED, nodeLine } from "../scripts/node-outcomes.ts";
import { REVIEW_AXES } from "../scripts/prompt.ts";
import {
  readReviewBase,
  REVIEW_BASE_REL,
  REVIEW_MD_REL,
  skipLine,
  SUMMARY_MD_REL,
} from "../scripts/report-artifacts.ts";
import { reviewDrain } from "../scripts/review.ts";
import { reviewedPosition } from "../scripts/review-position.ts";
import { summarizeDrain } from "../scripts/summary.ts";
import { READONLY_ENV } from "../scripts/worker-env.ts";
import { mainBranch } from "../scripts/worktree.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  drain,
  execute,
  expect,
  expectEqual,
  fakePiSdk,
  gitC,
  publishIssue,
  runScript,
  storeBinary,
  storeIssue,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

/** One artifact, read whole. */
function artifact(dir: string, rel: string): string {
  return readFileSync(join(dir, rel), "utf8");
}

type Seen = PackAgentOpts[];
type Recorder = { run: AgentRunner; all: () => Seen; calls: () => number };

/** A stub agent: it answers the text it was built with and records every turn it was handed. */
function recordingAgent(answer: string): Recorder {
  const seen: Seen = [];
  return {
    run: async (opts) => {
      seen.push(opts);
      return { sessionFile: "", answer: { kind: "text", text: answer }, lastError: undefined };
    },
    all: () => seen,
    calls: () => seen.length,
  };
}

/** The review.md sections, one per axis, with the heading line still attached. */
function sections(body: string): string[] {
  return body.split(/^## /m).slice(1);
}

/** Main's merges in one range, by subject: the run's delivered work, as git records it. */
function merges(root: string, range: string): string[] {
  return gitC(root, "log", "--merges", "--format=%s", range)
    .split("\n")
    .filter((line) => line !== "");
}

/** True iff git can see the ancestry; a failing `merge-base --is-ancestor` says it cannot. */
function isAncestor(root: string, ancestor: string, descendant: string): boolean {
  try {
    gitC(root, "merge-base", "--is-ancestor", ancestor, descendant);
    return true;
  } catch {
    return false;
  }
}

/** The pack's own merge subject for a published issue: how a range entry traces back to a handle. */
function subjectFor(issue: { id: string; handle: string; slug: string }): string {
  return mergeSubject(issueNames(issue));
}

/** The brief a reviewer's turn is handed, as a literal worked example: the range and its exact menu. */
function reviewBrief(base: string, head: string, menu: string): string {
  return `Review the range ${base}...HEAD (HEAD = ${head}) in this repository.\n\nCommits in that range:\n${menu}\n`;
}

/** The brief the summariser's turn is handed: the same range, its menu, and the review to merge. */
function summaryBrief(base: string, head: string, menu: string, reviewMd: string): string {
  return `Git range ${base}...HEAD (HEAD = ${head}).\n\nCommits in that range:\n${menu}\n\nThe ${REVIEW_AXES.length} reviews (review.md):\n${reviewMd}`;
}

/** The readers' clock, by the worked example the role table must meet: 30 minutes, not the pack's own value. */
const READER_WALL_MS = 30 * 60 * 1000;

/** The failures block a run with nothing to report on appends to its summary (failures-repro pins it). */
const NO_FAILURES_BLOCK = "## Failed attempts\n\nnone this run\n";

/** The readers' config, handed in so the model and runner the agents see are the test's, not a file's. */
const CONFIG = {
  model: "some/model",
  thinkingLevel: "high" as const,
  concurrency: 4,
  runner: "pi" as const,
  // The summary node reads the store for the run's failures, so this process needs the binary: the
  // same override a Target without `bd` on PATH would carry.
  store: storeBinary(),
  verify: "",
  verifyTimeoutMs: DEFAULT_VERIFY_TIMEOUT_MS,
};

try {
  // A fresh Target has no recorded position: the base is Main's tip when the run opens, recorded in
  // the run's artifacts - and the run records that tip as the Target's first position.
  await withTarget(async (root, artifacts) => {
    const tip = gitC(root, "rev-parse", "main");
    expectEqual("a fresh Target has no position", reviewedPosition(root), undefined);
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open still speaks the protocol", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);
    expectEqual("the base is Main's tip at open time", readReviewBase(artifacts), { base: tip });
    expectEqual("and it is the artifact review-base", artifact(artifacts, REVIEW_BASE_REL).trim(), tip);
    expectEqual("and the Target now records it as the position", reviewedPosition(root), tip);
  });

  // The repair does not move Main, so opening on the position and opening on Main's tip are the same
  // commit whether the repair ran before or after it: the opening step still records the run's start.
  await withTarget(async (root, artifacts) => {
    const issue = publishIssue(root, {
      title: "merged then killed",
      handle: "feat/01",
      slug: "merged-then-killed",
      labels: [GATE_LABEL],
    });
    const names = issueNames(issue);
    // The kill point, staged directly: the merge already landed, the store still says claimed.
    gitC(root, "worktree", "add", "-b", names.branch, join(root, names.worktreeRel), "main");
    commitFile(join(root, names.worktreeRel), "work.txt", "the work\n", "the implementer's commit");
    gitC(root, "merge", "--no-ff", "-m", mergeSubject(names), names.branch);
    bd(root, "update", issue.id, "-s", "in_progress");
    const tip = gitC(root, "rev-parse", "main");

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open repairs as it always did", opened.stdout, nodeLine(OPENED));
    expectEqual("the leftover is closed", storeIssue(root, issue.id).status, "closed");
    expectEqual("the repair does not move Main", gitC(root, "rev-parse", "main"), tip);
    expectEqual("so the base is the commit the run opened on", artifact(artifacts, REVIEW_BASE_REL).trim(), tip);
  });

  // Two runs in one repository: each report reads its own range, and a third run that has nothing
  // unviewed says so. The pack's own setup commit is in a run's range but is not a merge, so it is not
  // work - while the ignore-rules commit the run itself makes is its own Main write and is counted.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const run1 = join(artifacts, "run-1");
    const run2 = join(artifacts, "run-2");
    const run3 = join(artifacts, "run-3");

    // ---- Run 1: open records the base, the executor merges the issue. ------------------------------
    const first = publishIssue(root, {
      title: "the first issue",
      handle: "feat/02",
      slug: "the-first-issue",
      labels: [GATE_LABEL],
    });
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");

    const open1 = runScript(drain.script("open"), root, { ARTIFACTS_DIR: run1 });
    expectEqual("run 1 opens", open1.stdout, nodeLine(OPENED));
    const base1 = gitC(root, "rev-parse", "main");
    expectEqual("run 1's base is Main before its merge", artifact(run1, REVIEW_BASE_REL).trim(), base1);

    const executed1 = runScript(execute.script("execute"), root, {
      INPUTS_ISSUE: first.handle,
      ARTIFACTS_DIR: run1,
      PI_SDK_PATH: fakePiSdk(artifacts, "commit"),
    });
    expectEqual("run 1 merges its issue", executed1.stdout, nodeLine(MERGED));
    const head1 = gitC(root, "rev-parse", "main");
    expect("run 1's merge moved Main", head1 !== base1, { base1, head1 });
    // Run 1's report: the ignore-rules commit and the merge are both Main writes this run made.
    const range1 = `## Range\n\n\`${base1}..${head1}\` — 2 commits on Main, 2 made by this run, 0 not made by this run`;

    // The run's delivered work is the range's merges. The pack's setup commit is inside the range and
    // is not a merge, so it is never mistaken for a delivered issue.
    expectEqual("run 1's range holds exactly its issue's merge", merges(root, `${base1}..${head1}`), [
      subjectFor(first),
    ]);
    expect(
      "the range also holds the pack's own setup commit, which is not a merge",
      gitC(root, "log", "--format=%s", `${base1}..${head1}`).includes("chore(beads-dag): ignore runtime paths"),
    );

    // Review: one agent per axis, each handed the run's own range and nothing before it.
    const menu1 = gitC(root, "log", `${base1}..${head1}`, "--oneline");
    const reviewer1 = recordingAgent("run 1 findings");
    const reviewed1 = await reviewDrain(root, { artifactsDir: run1, runAgent: reviewer1.run, config: CONFIG });
    expectEqual("run 1's review reports", reviewed1, nodeLine(REPORTED));
    expectEqual("one reviewer per axis", reviewer1.calls(), REVIEW_AXES.length);
    for (const [i, seen] of reviewer1.all().entries()) {
      const axis = REVIEW_AXES[i]!;
      expectEqual(`reviewer ${i + 1} runs in the Target`, seen.cwd, root);
      expectEqual(`reviewer ${i + 1} has its own session`, seen.sessionKey, `drain-review-${i + 1}`);
      expectEqual(`reviewer ${i + 1} is the review role`, seen.role, "review");
      expectEqual(`reviewer ${i + 1}'s wall clock is the readers'`, seen.wallMs, READER_WALL_MS);
      expectEqual(`reviewer ${i + 1}'s model comes from the config`, seen.model, CONFIG.model);
      expect(`reviewer ${i + 1}'s persona pins the run's range`, seen.persona.includes(`${base1}...HEAD`));
      expect(`reviewer ${i + 1}'s persona is its own axis`, seen.persona.includes(`Your axis: ${axis}`));
      for (const [j, other] of REVIEW_AXES.entries()) {
        if (j !== i) expect(`reviewer ${i + 1} leaves axis ${j + 1} to others`, !seen.persona.includes(other));
      }
      expectEqual(`reviewer ${i + 1} is handed the run's range, exactly`, seen.prompt, reviewBrief(base1, head1, menu1));
      expect(
        `reviewer ${i + 1}'s brief names the issue's merge`,
        seen.prompt.includes(subjectFor(first)),
      );
    }
    const review1 = artifact(run1, REVIEW_MD_REL);
    const report1 = sections(review1);
    expectEqual("review.md has one section per axis", report1.length, REVIEW_AXES.length);
    for (const [i, axis] of REVIEW_AXES.entries()) {
      expect(`review.md heads axis ${i + 1}`, report1[i]!.startsWith(`${i + 1}. ${axis}`), report1[i]);
      expect(`axis ${i + 1} carries its reviewer's answer`, report1[i]!.includes("run 1 findings"));
    }

    // Summary: one agent over the review, and the artifact is its answer.
    const summariser1 = recordingAgent("run 1's report");
    const summarised1 = await summarizeDrain(root, { artifactsDir: run1, runAgent: summariser1.run, config: CONFIG });
    expectEqual("run 1's summary reports", summarised1, nodeLine(REPORTED));
    expectEqual("one summariser", summariser1.calls(), 1);
    const summarySeen = summariser1.all()[0]!;
    expectEqual("the summariser is the summary role", summarySeen.role, "summary");
    expectEqual("summary session key", summarySeen.sessionKey, "drain-summary");
    expectEqual("the summariser's wall clock is the readers'", summarySeen.wallMs, READER_WALL_MS);
    expectEqual("the summariser runs in the Target", summarySeen.cwd, root);
    expect(`its persona pins the run's range`, summarySeen.persona.includes(`${base1}...HEAD`));
    expectEqual("its brief is the range, its menu and the review, exactly", summarySeen.prompt, summaryBrief(base1, head1, menu1, review1));
    expectEqual(
      "summary.md is the summariser's answer, the node's range section, then its failures block",
      artifact(run1, SUMMARY_MD_REL),
      `run 1's report\n\n${range1}\n\n${NO_FAILURES_BLOCK}`,
    );

    // The readers' read-only contract: the environment a reader's turn runs under refuses a store
    // write, and the reader moves neither the store nor Main.
    const readerEnv = reviewer1.all()[0]!.env(process.env);
    expectEqual("a reader's environment carries the store's read-only mode", readerEnv[READONLY_ENV], "1");
    const refused = spawnSync(storeBinary(), ["update", first.id, "-s", "open"], {
      cwd: root,
      env: readerEnv,
      encoding: "utf8",
    });
    expect("the store refuses a reader's write", refused.status !== 0, refused.stderr);
    expect("and says why", /read-only mode/.test(`${refused.stderr ?? ""}${refused.stdout ?? ""}`));
    expectEqual("the issue did not move", storeIssue(root, first.id).status, "closed");
    expectEqual("and the readers left Main where the merge put it", gitC(root, "rev-parse", "main"), head1);

    // ---- Run 2: a repository where a previous run already merged; its report is only its own. -------
    const second = publishIssue(root, {
      title: "the second issue",
      handle: "feat/03",
      slug: "the-second-issue",
      labels: [GATE_LABEL],
    });
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "the second brief");
    const secondBrief = gitC(root, "rev-parse", "main");

    const open2 = runScript(drain.script("open"), root, { ARTIFACTS_DIR: run2 });
    expectEqual("run 2 opens", open2.stdout, nodeLine(OPENED));
    // The base is the position run 1's review advanced to, not the tip run 2 opened on: the second
    // brief's commit is inside the range and will be named as one this run did not make.
    const base2 = head1;
    expectEqual("run 2's base is run 1's reviewed head", artifact(run2, REVIEW_BASE_REL).trim(), base2);
    expectEqual("which is the recorded position", reviewedPosition(root), base2);

    const executed2 = runScript(execute.script("execute"), root, {
      INPUTS_ISSUE: second.handle,
      ARTIFACTS_DIR: run2,
      PI_SDK_PATH: fakePiSdk(artifacts, "commit-cwd"),
    });
    expectEqual("run 2 merges its issue", executed2.stdout, nodeLine(MERGED));
    const head2 = gitC(root, "rev-parse", "main");
    expectEqual("run 2's range holds exactly its issue's merge", merges(root, `${base2}..${head2}`), [
      subjectFor(second),
    ]);

    // Run 2's report names its own merge as its own, and the lab's setup commit that landed after run
    // 1's review as one it did not make.
    const range2 =
      `## Range\n\n\`${base2}..${head2}\` — 2 commits on Main, 1 made by this run, 1 not made by this run\n\n` +
      `## Commits this run did not make\n\n- ${secondBrief.slice(0, 12)} the second brief`;
    const reviewer2 = recordingAgent("run 2 findings");
    const reviewed2 = await reviewDrain(root, { artifactsDir: run2, runAgent: reviewer2.run, config: CONFIG });
    expectEqual("run 2's review reports", reviewed2, nodeLine(REPORTED));
    const menu2 = gitC(root, "log", `${base2}..${head2}`, "--oneline");
    for (const seen of reviewer2.all()) {
      expectEqual("run 2's brief is its own range, exactly", seen.prompt, reviewBrief(base2, head2, menu2));
      expect("so it names run 2's merge", seen.prompt.includes(subjectFor(second)));
      expect("and never run 1's merge", !seen.prompt.includes(subjectFor(first)));
    }
    expectEqual(
      "run 2's report is run 2's findings",
      sections(artifact(run2, REVIEW_MD_REL)).map((s) => s.includes("run 2 findings")),
      REVIEW_AXES.map(() => true),
    );
    const summariser2 = recordingAgent("run 2's report");
    await summarizeDrain(root, { artifactsDir: run2, runAgent: summariser2.run, config: CONFIG });
    expectEqual("run 2's summary is its own", artifact(run2, SUMMARY_MD_REL), `run 2's report\n\n${range2}\n\n${NO_FAILURES_BLOCK}`);

    // Run 1's artifacts are run 1's: running run 2 did not touch them.
    expectEqual("run 1's review is unchanged", artifact(run1, REVIEW_MD_REL), review1);
    expectEqual("run 1's summary is unchanged", artifact(run1, SUMMARY_MD_REL), `run 1's report\n\n${range1}\n\n${NO_FAILURES_BLOCK}`);

    // ---- Run 3: nothing to merge. It completes cleanly and says so. ---------------------------------
    const open3 = runScript(drain.script("open"), root, { ARTIFACTS_DIR: run3 });
    expectEqual("run 3 opens", open3.stdout, nodeLine(OPENED));
    const base3 = gitC(root, "rev-parse", "main");
    expectEqual("run 3's base is where run 2 left Main", artifact(run3, REVIEW_BASE_REL).trim(), base3);
    expectEqual("which is run 2's last merge", base3, head2);

    const reviewer3 = recordingAgent("should not run");
    const reviewed3 = await reviewDrain(root, { artifactsDir: run3, runAgent: reviewer3.run, config: CONFIG });
    expectEqual("a run that merged nothing reports nothing", reviewed3, nodeLine(NOTHING_TO_REPORT));
    expectEqual("and spends no reviewer", reviewer3.calls(), 0);
    const skip3 = skipLine(`empty diff ${base3}...main, skipped`);
    expectEqual("its review.md is the skip line", artifact(run3, REVIEW_MD_REL), skip3);

    const summariser3 = recordingAgent("should not run");
    const summarised3 = await summarizeDrain(root, { artifactsDir: run3, runAgent: summariser3.run, config: CONFIG });
    expectEqual("its summary reports nothing too", summarised3, nodeLine(NOTHING_TO_REPORT));
    expectEqual("and spends no summariser", summariser3.calls(), 0);
    expectEqual(
      "its summary.md names the review it could not use",
      artifact(run3, SUMMARY_MD_REL),
      skipLine(`review.md: ${skip3.trim()}`),
    );

    // ---- The node protocol itself: both readers run as scripts, with the run's fake runner. --------
    // An out-of-band merge after the base is inside the run's window: the readers report the range
    // base..Main, whoever landed it, the node scripts speak the reported/nothing tokens, and the merge
    // is named as a commit this run did not make.
    const run4 = join(artifacts, "run-4");
    gitC(root, "checkout", "-b", "operator/side-work", "main");
    commitFile(root, "SIDE.md", "side\n", "the operator's side work");
    gitC(root, "checkout", "main");
    const open4 = runScript(drain.script("open"), root, { ARTIFACTS_DIR: run4 });
    expectEqual("run 4 opens", open4.stdout, nodeLine(OPENED));
    const base4 = artifact(run4, REVIEW_BASE_REL).trim();
    gitC(root, "merge", "--no-ff", "-m", "the operator's merge", "operator/side-work");
    const operatorMerge = gitC(root, "rev-parse", "main");

    const reviewed4 = runScript(drain.script("review"), root, {
      ARTIFACTS_DIR: run4,
      PI_SDK_PATH: fakePiSdk(artifacts, "answer"),
    });
    expectEqual("the review node reports over the range", reviewed4.stdout, nodeLine(REPORTED));
    expectEqual("and exits clean", reviewed4.status, 0);
    const report4 = sections(artifact(run4, REVIEW_MD_REL));
    expectEqual("the CLI wrote one section per axis", report4.length, REVIEW_AXES.length);
    for (const [i, axis] of REVIEW_AXES.entries()) {
      expect(`the CLI's section ${i + 1} is headed and answered`, report4[i]!.startsWith(`${i + 1}. ${axis}`) && report4[i]!.includes("the session's answer"), report4[i]);
    }
    for (const i of [1, 2, 3]) {
      expect(
        `the review session ${i} landed under the run's artifacts`,
        existsSync(join(run4, "sessions", `drain-review-${i}`, "review.jsonl")),
      );
    }
    const summarised4 = runScript(drain.script("summary"), root, {
      ARTIFACTS_DIR: run4,
      PI_SDK_PATH: fakePiSdk(artifacts, "answer"),
    });
    expectEqual("the summary node reports over the review", summarised4.stdout, nodeLine(REPORTED));
    const range4 =
      `## Range\n\n\`${base4}..${operatorMerge}\` — 1 commit on Main, 0 made by this run, 1 not made by this run\n\n` +
      `## Commits this run did not make\n\n- ${operatorMerge.slice(0, 12)} the operator's merge`;
    expectEqual(
      "and its artifact is its runner's answer, then the range it covered and its failures block",
      artifact(run4, SUMMARY_MD_REL),
      `the session's answer\n\n${range4}\n\n${NO_FAILURES_BLOCK}`,
    );
    expect(
      "its session landed under the run's artifacts",
      existsSync(join(run4, "sessions", "drain-summary", "summary.jsonl")),
    );
  });

  // A base that is not there reads as a skip: the readers never invent a range.
  await withTarget(async (root, artifacts) => {
    expectEqual("a missing base reads as a skip", readReviewBase(join(artifacts, "no-such-run")), {
      skip: skipLine("no review-base"),
    });
    const fake = recordingAgent("should not run");
    const token = await reviewDrain(root, { artifactsDir: join(artifacts, "no-such-run"), runAgent: fake.run });
    expectEqual("and spends no agent", fake.calls(), 0);
    expectEqual("reporting nothing", token, nodeLine(NOTHING_TO_REPORT));
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
