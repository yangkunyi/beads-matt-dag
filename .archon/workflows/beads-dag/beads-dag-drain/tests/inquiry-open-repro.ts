#!/usr/bin/env bun
/**
 * Repro: the inquiry executor's opening node.
 *
 * `open` is the seam everything before the loop hangs on, and it is the same seam the drain has: the
 * Target-level run lock, the store preflight, the configuration line, the repair - with the reading
 * domain's own premises added. This drives the real node against a throwaway Target with a real store and
 * asserts on what an observer outside the pack can see: the node's one stdout token, the reason on stderr,
 * the lock file, the run's own artifacts, and the store's own answers.
 *
 * The two premises are the Target's copy of the reading tools and an effort area; both are refused
 * loudly, before anything is claimed. The run lock is **shared** - the same file and the same module the
 * drain takes - so a drain already running refuses a reading run and a reading run already running refuses
 * a drain: one run at a time per Target, whatever kind of run it is.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { RUN_LOCK_FILE, runLockFilePath } from "../scripts/run-lock.ts";
import {
  drain,
  expect,
  expectEqual,
  gitC,
  initReadingTarget,
  inquiry,
  publishIssue,
  runScript,
  storeIssue,
  withTarget,
} from "./target.ts";

try {
  // A Target with a store, the reading tools and an effort area opens cleanly, takes the shared lock and
  // records it in its own artifacts.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const runLock = runLockFilePath(root);
    const head = gitC(root, "rev-parse", "main");
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the reading run opens", opened.status, 0);
    expectEqual("with the token alone on stdout", opened.stdout, "opened\n");
    expect("and the configuration line on stderr", opened.stderr.includes("beads-dag: config:"), opened.stderr);
    expectEqual("the run lock is this run's", readFileSync(runLock, "utf8"), `${process.pid}\n${basename(artifacts)}\n`);
    expectEqual(
      "and the run says so in its own record",
      JSON.parse(readFileSync(join(artifacts, RUN_LOCK_FILE), "utf8")),
      { run: basename(artifacts), pid: process.pid, path: runLock },
    );
    expect("Main did not move", gitC(root, "rev-parse", "main") === head);
  });

  // No reading tool directory: refused loudly, before anything is claimed or written, and the lock goes back.
  await withTarget(async (root, artifacts) => {
    mkdirSync(join(root, ".scratch"), { recursive: true });
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a Target without the reading tools prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("naming the missing directory", opened.stderr.includes(join(root, "tools", "inquiry")), opened.stderr);
    expect("and saying what to do", /no reading tool directory/.test(opened.stderr), opened.stderr);
    expect("the lock was released", !existsSync(runLockFilePath(root)));
    expect("with nothing recorded", !existsSync(join(artifacts, RUN_LOCK_FILE)));
  });

  // No effort directory: refused loudly too - a reading has nowhere to put its corpus.
  await withTarget(async (root, artifacts) => {
    mkdirSync(join(root, "tools", "inquiry"), { recursive: true });
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a Target without an effort area prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("naming the missing directory", opened.stderr.includes(join(root, ".scratch")), opened.stderr);
    expect("and saying what it is for", /no effort directory/.test(opened.stderr), opened.stderr);
    expect("the lock was released", !existsSync(runLockFilePath(root)));
  });

  // No store at all: the store preflight's own refusal, before the reading premises are even read.
  await withTarget(
    async (root, artifacts) => {
      initReadingTarget(root);
      const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("a storeless Target prints no token", opened.stdout, "");
      expect("and fails the node", opened.status !== 0, opened.status);
      expect("naming the store directory", opened.stderr.includes(join(root, ".beads")), opened.stderr);
      expect("with the store's own reason", /no store in the Target/.test(opened.stderr), opened.stderr);
      expect("the lock was released", !existsSync(runLockFilePath(root)));
    },
    { store: false },
  );

  // The lock is shared with the drain: while a reading run holds it, a drain against the same Target is
  // refused - one run at a time, whatever kind of run it is - and nothing of the refused run is written.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const issue = publishIssue(root, {
      title: "waiting for the reading run",
      handle: "feat/01",
      slug: "waiting-for-the-reading-run",
      labels: ["ready-for-agent"],
    });
    const readingRun = join(artifacts, "the-reading-run");
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: readingRun });
    expectEqual("the reading run takes the lock", opened.status, 0);
    const runLock = runLockFilePath(root);
    expect("and holds it after the node ends", existsSync(runLock));

    const drainRun = join(artifacts, "the-drain");
    const refused = runScript(drain.script("open"), root, { ARTIFACTS_DIR: drainRun });
    expectEqual("a drain against the same Target exits non-zero", refused.status, 1);
    expectEqual("with nothing on stdout", refused.stdout, "");
    expect("refusing loudly", refused.stderr.includes("refusing to start"), refused.stderr);
    expect("naming the reading run", refused.stderr.includes(basename(readingRun)), refused.stderr);
    expect("and the holder's pid", refused.stderr.includes(`pid ${process.pid}`), refused.stderr);
    expect("the drain wrote nothing", !existsSync(drainRun));
    expectEqual("and claimed nothing", storeIssue(root, issue.id).status, "open");

    // And a second reading run against the same Target is refused by the same lock: the refusal does not
    // care which executor asks.
    const secondRun = join(artifacts, "the-second-reading-run");
    const readingRefused = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: secondRun });
    expectEqual("a second reading run is refused", readingRefused.status, 1);
    expect("naming the holder", readingRefused.stderr.includes("refusing to start"), readingRefused.stderr);
  });

  // And the other direction, so the shared lock is pinned both ways: while a *drain* holds it, a reading
  // run against the same Target is refused by the same file, with nothing of the refused run written.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const question = publishIssue(root, {
      title: "waiting for the drain",
      type: "decision",
      handle: "q/01",
      slug: "waiting-for-the-drain",
      labels: ["wayfinder:research"],
    });
    const drainRun = join(artifacts, "the-drain");
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: drainRun });
    expectEqual("the drain takes the lock", opened.status, 0);
    expect("and holds it after the node ends", existsSync(runLockFilePath(root)));

    const readingRun = join(artifacts, "the-reading-run");
    const refused = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: readingRun });
    expectEqual("a reading run against the same Target exits non-zero", refused.status, 1);
    expectEqual("with nothing on stdout", refused.stdout, "");
    expect("refusing loudly", refused.stderr.includes("refusing to start"), refused.stderr);
    expect("naming the drain", refused.stderr.includes(basename(drainRun)), refused.stderr);
    expect("and the holder's pid", refused.stderr.includes(`pid ${process.pid}`), refused.stderr);
    expect("the reading run wrote nothing", !existsSync(readingRun));
    expectEqual("and claimed nothing", storeIssue(root, question.id).status, "open");
  });

  // A dead holder's lock is stolen, with one line saying so, and the run proceeds.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const runLock = runLockFilePath(root);
    writeFileSync(runLock, "2147483647\nthe-killed-reading-run\n");
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a killed run does not block the next reading run", opened.status, 0);
    expectEqual("which opens", opened.stdout, "opened\n");
    const steals = opened.stderr.split("\n").filter((line) => line.includes("run lock: stole"));
    expectEqual("one line says the lock was stolen", steals.length, 1);
    expect("naming the dead holder", steals[0]!.includes("the-killed-reading-run"), steals[0]);
    expectEqual("the lock is this run's now", readFileSync(runLock, "utf8"), `${process.pid}\n${basename(artifacts)}\n`);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
