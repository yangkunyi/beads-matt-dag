#!/usr/bin/env bun
/**
 * Repro: the experiment executor's open.
 *
 * `open` is the run's only always-run node, and it is where the premises are checked and the leftovers
 * repaired, before anything is claimed:
 *
 * - it takes the **shared run lock** — the same Target-level lock the drain takes — so a drain and an
 *   experiment run cannot write one Target at once, whatever kind of run either is;
 * - it resolves the store and prints the one configuration line;
 * - it refuses a Target that does not carry the experiment tool directory, and a machine with no run tool,
 *   so "this machine cannot run the half yet" is one line at the opening node;
 * - it repairs what a killed run left: an experiment ticket still `in_progress` goes back to `open` with an
 *   ordinary failed-attempt comment and no assignee, while an implementation issue or a question is left
 *   where its owner left it and reported.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { RUN_LOCK_FILE, runLockFilePath } from "../../scripts/run-lock.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  envWithRunTool,
  envWithoutRunTool,
  expect,
  expectEqual,
  experiment,
  installExperimentTools,
  publishExperiment,
  publishIssue,
  runScript,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
  writeStubDvc,
} from "./target.ts";

try {
  // A Target that carries the tools and a machine that carries the run tool: open takes the shared lock
  // and speaks the protocol, and its own record says which lock it holds.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    writeStubDvc(join(artifacts, "bin"));

    const opened = runScript(experiment.script("open"), root, envWithRunTool(join(artifacts, "bin"), { ARTIFACTS_DIR: artifacts }));
    expectEqual("open speaks the protocol", opened.stdout, "opened\n");
    expectEqual("open exits clean", opened.status, 0);

    const lock = runLockFilePath(root);
    expectEqual("the shared run lock names this run", readFileSync(lock, "utf8"), `${process.pid}\n${basename(artifacts)}\n`);
    expectEqual(
      "and the run's own artifacts record it",
      JSON.parse(readFileSync(join(artifacts, RUN_LOCK_FILE), "utf8")),
      { run: basename(artifacts), pid: process.pid, path: lock },
    );
  });

  // The run tool is the premise the opening node refuses without: no dvc anywhere on PATH is one line,
  // and nothing is claimed, repaired or recorded.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const ticket = publishExperiment(root, { title: "waiting", handle: "exp/01", slug: "waiting" });

    const run = runScript(experiment.script("open"), root, { ...envWithoutRunTool(), ARTIFACTS_DIR: artifacts });
    expect("open exits non-zero", run.status !== 0, run.status);
    expectEqual("with nothing on stdout", run.stdout, "");
    expect("the refusal names the run tool", /dvc/.test(run.stderr), run.stderr);
    expect("and the PATH it looked in", /PATH/.test(run.stderr), run.stderr);
    expectEqual("and the lock is released", existsSync(runLockFilePath(root)), false);
    expectEqual("with nothing recorded", existsSync(join(artifacts, RUN_LOCK_FILE)), false);
    expectEqual("and the ticket untouched", storeIssue(root, ticket.id).status, "open");
  });

  // The Target's tool directory is the other premise: a machine that has dvc but a Target without
  // tools/experiments has nothing to register a run with.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    writeStubDvc(join(artifacts, "bin"));

    const run = runScript(experiment.script("open"), root, envWithRunTool(join(artifacts, "bin"), { ARTIFACTS_DIR: artifacts }));
    expect("open exits non-zero", run.status !== 0, run.status);
    expectEqual("with nothing on stdout", run.stdout, "");
    expect("the refusal names the tool directory", run.stderr.includes("tools/experiments"), run.stderr);
    expectEqual("and the lock is released", existsSync(runLockFilePath(root)), false);
  });

  // One run at a time per Target, whatever kind of run it is: while this executor holds the lock a drain
  // is refused, and while a live holder owns it a second experiment run is refused too.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);

    const opened = runScript(experiment.script("open"), root, envWithRunTool(bin, { ARTIFACTS_DIR: artifacts }));
    expectEqual("the experiment run opens", opened.status, 0);
    expectEqual("and holds the lock", existsSync(runLockFilePath(root)), true);

    const drainRun = join(artifacts, "the-drain-run");
    const refused = runScript(drain.script("open"), root, { ARTIFACTS_DIR: drainRun });
    expectEqual("the drain is refused while it holds", refused.status, 1);
    expect("with the shared lock's reason", refused.stderr.includes("refusing to start"), refused.stderr);
    expect("naming the experiment run that holds it", refused.stderr.includes(basename(artifacts)), refused.stderr);
    expectEqual("and the drain wrote nothing", existsSync(drainRun), false);

    const second = runScript(experiment.script("open"), root, envWithRunTool(bin, { ARTIFACTS_DIR: join(artifacts, "the-second-run") }));
    expectEqual("a second experiment run is refused", second.status, 1);
    expect("by the same lock", second.stderr.includes("refusing to start"), second.stderr);

    // A dead holder's lock is not a refusal: the next run steals it, which is what makes a killed run
    // repairable rather than a Target nobody can ever run again.
    rmSync(runLockFilePath(root));
    const after = runScript(experiment.script("open"), root, envWithRunTool(bin, { ARTIFACTS_DIR: join(artifacts, "the-next-run") }));
    expectEqual("a released lock lets the next run in", after.status, 0);
    expectEqual("speaking the protocol", after.stdout, "opened\n");
  });

  // Leftovers, repaired from the store: an experiment ticket a killed run left running goes back to open
  // with an ordinary failed attempt, and every other issue's status is its owner's.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    writeStubDvc(join(artifacts, "bin"));
    const env = envWithRunTool(join(artifacts, "bin"), { ARTIFACTS_DIR: artifacts });

    const leftRunning = publishExperiment(root, { title: "left running", handle: "exp/01", slug: "left-running" });
    bd(root, "update", leftRunning.id, "-s", "in_progress", "--assignee", "beads-dag-experiment/a-dead-run");
    const work = publishIssue(root, { title: "work", handle: "exp/02", slug: "work", labels: [GATE_LABEL] });
    bd(root, "update", work.id, "-s", "in_progress");
    const question = publishIssue(root, { title: "a question", type: "decision", handle: "exp/03", slug: "a-question" });
    bd(root, "update", question.id, "-s", "in_progress");

    const opened = runScript(experiment.script("open"), root, env);
    expectEqual("open still opens", opened.status, 0);
    expectEqual("the leftover experiment ticket is open again", storeIssue(root, leftRunning.id).status, "open");
    expectEqual("and its claim is given back", storeIssue(root, leftRunning.id).assignee ?? null, null);

    const comments = storeComments(root, leftRunning.id).map((comment) => comment.text);
    expectEqual("with exactly one ordinary failed attempt", comments.length, 1);
    expect(
      "the comment keeps the flow's shape and ordinal",
      /^attempt 1 failed: leftover in progress and /.test(comments[0] ?? ""),
      comments[0],
    );
    expect("and says which fact was missing", /no recorded result closed the issue/.test(comments[0] ?? ""), comments[0]);

    expectEqual("an implementation issue is its drain's to repair", storeIssue(root, work.id).status, "in_progress");
    expectEqual("a question is its owner's to repair", storeIssue(root, question.id).status, "in_progress");
    expect("and open says which one it repaired", opened.stderr.includes("exp/01"), opened.stderr);
    expect("and which it left alone", opened.stderr.includes("exp/02") && opened.stderr.includes("exp/03"), opened.stderr);

    // The ticket is on the frontier again, and a second open does not fail it a second time.
    rmSync(runLockFilePath(root));
    const second = runScript(experiment.script("open"), root, env);
    expectEqual("the next open opens too", second.status, 0);
    expectEqual("and the repair is not repeated", storeComments(root, leftRunning.id).length, 1);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
