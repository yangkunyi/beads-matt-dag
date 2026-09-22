#!/usr/bin/env bun
/**
 * Repro: the grill run's opening node.
 *
 * `open` is the seam everything before the turn hangs on, and it is the same seam the other executors
 * have: the Target-level run lock, the store preflight, the configuration line — with the grill run's
 * own premise added. This drives the real node against a throwaway Target with a real store and asserts
 * on what an observer outside the pack can see: the node's one stdout token, the reason on stderr, the
 * lock file, and the store's own answers.
 *
 * The premise is one seed issue id, a `decision`, still open. A missing seed, a work issue, a seed
 * that is not open, or a closed seed is refused loudly, before anything is written. The run lock is
 * shared, so a drain already running refuses a grill run and a grill run already running refuses a
 * drain.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { RUN_LOCK_FILE, runLockFilePath } from "../../scripts/run-lock.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  expect,
  expectEqual,
  grill,
  publishIssue,
  runScript,
  storeIssue,
  withTarget,
} from "./target.ts";

function seedEnv(artifacts: string, seed: string): NodeJS.ProcessEnv {
  return { ARTIFACTS_DIR: artifacts, INPUTS_SEED: seed };
}

try {
  // A Target with a store and an open decision seed opens cleanly, takes the shared lock and records it.
  await withTarget(async (root, artifacts) => {
    const seed = publishIssue(root, {
      title: "what should this be",
      type: "decision",
      handle: "idea/01",
      slug: "what-should-this-be",
    });
    const runLock = runLockFilePath(root);
    const opened = runScript(grill.script("open"), root, seedEnv(artifacts, seed.id));
    expectEqual("the grill run opens", opened.status, 0);
    expectEqual("with the token alone on stdout", opened.stdout, "opened\n");
    expect("and the configuration line on stderr", opened.stderr.includes("beads-dag: config:"), opened.stderr);
    expectEqual("the run lock is this run's", readFileSync(runLock, "utf8"), `${process.pid}\n${basename(artifacts)}\ngrill\n`);
    expectEqual(
      "and the run says so in its own record",
      JSON.parse(readFileSync(join(artifacts, RUN_LOCK_FILE), "utf8")),
      { run: basename(artifacts), pid: process.pid, path: runLock, kind: "grill" },
    );
    expectEqual("the seed stays open", storeIssue(root, seed.id).status, "open");
  });

  // No seed id: refused loudly, and the lock goes back.
  await withTarget(async (root, artifacts) => {
    const opened = runScript(grill.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a grill run without a seed prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("naming INPUTS_SEED", opened.stderr.includes("INPUTS_SEED"), opened.stderr);
    expect("the lock was released", !existsSync(runLockFilePath(root)));
  });

  // A work issue is not a seed: refused loudly, naming the type.
  await withTarget(async (root, artifacts) => {
    const work = publishIssue(root, {
      title: "build it",
      handle: "feat/01",
      slug: "build-it",
      labels: [GATE_LABEL],
    });
    const opened = runScript(grill.script("open"), root, seedEnv(artifacts, work.id));
    expectEqual("a work issue prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("naming the type", /not a task/.test(opened.stderr), opened.stderr);
    expect("the lock was released", !existsSync(runLockFilePath(root)));
    expectEqual("and claimed nothing", storeIssue(root, work.id).status, "open");
  });

  // A decision issue that is not open is not a seed either: whatever took the claim owns it, and a
  // grill run writes rounds onto an open issue only. Refused loudly, naming the status, and the
  // claim is left exactly as it was found.
  await withTarget(async (root, artifacts) => {
    const seed = publishIssue(root, {
      title: "claimed by someone else",
      type: "decision",
      handle: "idea/02",
      slug: "claimed-by-someone-else",
    });
    bd(root, "update", seed.id, "-s", "in_progress");
    const opened = runScript(grill.script("open"), root, seedEnv(artifacts, seed.id));
    expectEqual("an in_progress seed prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("naming the status", /in_progress/.test(opened.stderr), opened.stderr);
    expect("and saying it is not open", /not open/.test(opened.stderr), opened.stderr);
    expect("the lock was released", !existsSync(runLockFilePath(root)));
    expectEqual("and the claim is untouched", storeIssue(root, seed.id).status, "in_progress");
  });

  // A closed seed is refused too, naming that status.
  await withTarget(async (root, artifacts) => {
    const seed = publishIssue(root, {
      title: "already settled",
      type: "decision",
      handle: "idea/03",
      slug: "already-settled",
    });
    bd(root, "close", seed.id, "--reason", "settled");
    const opened = runScript(grill.script("open"), root, seedEnv(artifacts, seed.id));
    expectEqual("a closed seed prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("saying it is closed", /closed/.test(opened.stderr), opened.stderr);
    expect("the lock was released", !existsSync(runLockFilePath(root)));
  });

  // The lock is shared with the drain: while a grill run holds it, a drain against the same Target is
  // refused — one run at a time, whatever kind of run it is.
  await withTarget(async (root, artifacts) => {
    const seed = publishIssue(root, {
      title: "waiting for the grill run",
      type: "decision",
      handle: "idea/04",
      slug: "waiting-for-the-grill-run",
    });
    const issue = publishIssue(root, {
      title: "waiting for the first run",
      handle: "feat/02",
      slug: "waiting-for-the-first-run",
      labels: [GATE_LABEL],
    });
    const grillRun = join(artifacts, "the-grill-run");
    const opened = runScript(grill.script("open"), root, seedEnv(grillRun, seed.id));
    expectEqual("the grill run takes the lock", opened.status, 0);
    expect("and holds it after the node ends", existsSync(runLockFilePath(root)));

    const drainRun = join(artifacts, "the-drain");
    const refused = runScript(drain.script("open"), root, { ARTIFACTS_DIR: drainRun });
    expectEqual("a drain against the same Target exits non-zero", refused.status, 1);
    expectEqual("with nothing on stdout", refused.stdout, "");
    expect("refusing loudly", refused.stderr.includes("refusing to start"), refused.stderr);
    expect("naming the grill run", refused.stderr.includes(basename(grillRun)), refused.stderr);
    expect("the drain wrote nothing", !existsSync(drainRun));
    expectEqual("and claimed nothing", storeIssue(root, issue.id).status, "open");
  });

  // A dead holder's lock is stolen, with one line saying so, and the run proceeds.
  await withTarget(async (root, artifacts) => {
    const seed = publishIssue(root, {
      title: "after a killed run",
      type: "decision",
      handle: "idea/05",
      slug: "after-a-killed-run",
    });
    const runLock = runLockFilePath(root);
    writeFileSync(runLock, "2147483647\nthe-killed-grill-run\n");
    const opened = runScript(grill.script("open"), root, seedEnv(artifacts, seed.id));
    expectEqual("a killed run does not block the next grill run", opened.status, 0);
    expectEqual("which opens", opened.stdout, "opened\n");
    const steals = opened.stderr.split("\n").filter((line) => line.includes("run lock: stole"));
    expectEqual("one line says the lock was stolen", steals.length, 1);
    expect("naming the dead holder", steals[0]!.includes("the-killed-grill-run"), steals[0]);
  });

  // The last node releases the lock so the next run opens normally.
  await withTarget(async (root, artifacts) => {
    const seed = publishIssue(root, {
      title: "report releases the lock",
      type: "decision",
      handle: "idea/06",
      slug: "report-releases-the-lock",
    });
    const opened = runScript(grill.script("open"), root, seedEnv(artifacts, seed.id));
    expectEqual("open takes the lock", opened.status, 0);
    const reported = runScript(grill.script("report"), root, seedEnv(artifacts, seed.id));
    expectEqual("report exits clean", reported.status, 0);
    expectEqual("with the reported token", reported.stdout, "reported\n");
    expect("and the lock is gone", !existsSync(runLockFilePath(root)));
    expect("leaving a report to read", existsSync(join(artifacts, "report.md")));
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
