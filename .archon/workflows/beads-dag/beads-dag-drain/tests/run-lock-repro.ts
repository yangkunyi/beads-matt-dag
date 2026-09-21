#!/usr/bin/env bun
/**
 * Repro: one drain at a time per Target.
 *
 * `lock.ts` serialises the writes that move Main. It does nothing about two runs, and the damage is
 * worse than duplicated work: the second run's opening repair reads the first run's live claim as a
 * leftover, and its pick can offer an issue the first run is implementing right now. So `open` takes a
 * Target-level run lock before it does anything, and:
 *
 * - a live holder refuses the second drain at open: exit 1, nothing on stdout, one line naming the
 *   holder, nothing claimed and nothing written - not even a store call. The lock is its own file, and
 *   a Main write under a held run lock still works, which is what pins that the two locks are distinct;
 * - a dead holder's lock is stolen and the run proceeds, with one line saying so;
 * - one run alone is unaffected, and the run's last node (`summary`) releases the lock so the next
 *   drain opens normally. A run that never reaches its last node leaves the file behind; that is what
 *   the dead-pid steal above is for;
 * - a lock file a kill left half-written has no pid to prove liveness and is stolen like a dead one's,
 *   and an `open` that fails before the loop releases the lock, so the next drain reads the store's own
 *   refusal rather than this run's lock.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { LOCK_NAME, lockFilePath, withMainLock } from "../../scripts/lock.ts";
import { RUN_LOCK_FILE, RUN_LOCK_NAME, runLockFilePath } from "../../scripts/run-lock.ts";
import {
  GATE_LABEL,
  drain,
  expect,
  expectEqual,
  gitC,
  probeLines,
  publishIssue,
  runScript,
  storeIssue,
  withTarget,
  writeProbeStore,
  writeStoreConfig,
} from "./target.ts";

try {
  // A live holder refuses the second drain at open, before anything it could claim or write.
  await withTarget(async (root, artifacts) => {
    const { probe } = writeProbeStore(root, artifacts);
    const issue = publishIssue(root, {
      title: "waiting for the first drain",
      handle: "feat/01",
      slug: "waiting-for-the-first-drain",
      labels: [GATE_LABEL],
    });
    const runLock = runLockFilePath(root);
    const mainLock = lockFilePath(root);
    expect("the run lock is not the Main lock's name", RUN_LOCK_NAME !== (LOCK_NAME as string), RUN_LOCK_NAME);
    expect("nor its file", runLock !== mainLock, [runLock, mainLock]);
    const head = gitC(root, "rev-parse", "main");
    const tree = gitC(root, "status", "--porcelain");
    // The holder is a live pid this process owns, recorded the way the pack records one: the runner's
    // pid, then the run's id. No second session is started to make the premise real.
    writeFileSync(runLock, `${process.pid}\nthe-first-run\n`);
    const refusedRun = join(artifacts, "the-second-run");

    const refused = runScript(drain.script("open"), root, { ARTIFACTS_DIR: refusedRun });
    expectEqual("the second drain exits non-zero", refused.status, 1);
    expectEqual("with nothing on stdout", refused.stdout, "");
    expect("and refuses, loudly", refused.stderr.includes("refusing to start"), refused.stderr);
    expect("naming the holder's run", refused.stderr.includes("the-first-run"), refused.stderr);
    expect("and the pid it recorded", refused.stderr.includes(`pid ${process.pid}`), refused.stderr);
    expect("and the lock file", refused.stderr.includes(runLock), refused.stderr);
    expect("with a move an operator can take", refused.stderr.includes("wait for it to end, or kill it"), refused.stderr);

    expectEqual("the holder was not stolen", readFileSync(runLock, "utf8"), `${process.pid}\nthe-first-run\n`);
    expectEqual("nothing was claimed", storeIssue(root, issue.id).status, "open");
    expectEqual("nothing was written by the refused run", existsSync(refusedRun), false);
    expect("Main did not move", gitC(root, "rev-parse", "main") === head);
    expectEqual("and the Target's tree is unchanged", gitC(root, "status", "--porcelain"), tree);
    expectEqual("the refusal never reached the store", probeLines(probe), []);
    expect("and never took the Main lock", !existsSync(mainLock));

    // The same refusal with a holder that recorded no run id: the pid alone still names it.
    writeFileSync(runLock, `${process.pid}\n`);
    const anonymous = runScript(drain.script("open"), root, { ARTIFACTS_DIR: refusedRun });
    expectEqual("a pid-only holder is refused too", anonymous.status, 1);
    expect("and the message names the pid", anonymous.stderr.includes(`another run is running (pid ${process.pid}`), anonymous.stderr);
  });

  // A dead holder's lock is stolen, one line says so, and the run proceeds.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const runLock = runLockFilePath(root);
    writeFileSync(runLock, "2147483647\nthe-killed-run\n");

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a killed run does not block the next drain", opened.status, 0);
    expectEqual("which opens", opened.stdout, "opened\n");
    const stealLines = opened.stderr.split("\n").filter((line) => line.includes("run lock: stole"));
    expectEqual("one line says the lock was stolen", stealLines.length, 1);
    expect("naming the dead holder", stealLines[0]!.includes("the-killed-run") && stealLines[0]!.includes("2147483647"), stealLines[0]);
    expectEqual("the lock now names this run", readFileSync(runLock, "utf8"), `${process.pid}\n${basename(artifacts)}\ndrain\n`);
    expectEqual(
      "and the run's own record says what it took over",
      JSON.parse(readFileSync(join(artifacts, RUN_LOCK_FILE), "utf8")),
      { run: basename(artifacts), pid: process.pid, path: runLock, kind: "drain", stole: { pid: 2147483647, name: "the-killed-run" } },
    );
    expect("the run proceeded", existsSync(join(artifacts, "review-base")));
  });

  // One run alone is unaffected; the Main lock still guards its own writes; the last node releases.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    publishIssue(root, { title: "the sole run", handle: "feat/02", slug: "the-sole-run", labels: [GATE_LABEL] });
    const runLock = runLockFilePath(root);

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a run with no holder opens", opened.status, 0);
    expectEqual("and speaks the protocol", opened.stdout, "opened\n");
    expectEqual("taking the lock", readFileSync(runLock, "utf8"), `${process.pid}\n${basename(artifacts)}\ndrain\n`);
    expectEqual(
      "and saying so in its artifacts",
      JSON.parse(readFileSync(join(artifacts, RUN_LOCK_FILE), "utf8")),
      { run: basename(artifacts), pid: process.pid, path: runLock, kind: "drain" },
    );

    // The Main lock is untouched by the run lock: its own writes still run, and do not wait a run's
    // length for a file that is not theirs.
    let wrote = false;
    const started = Date.now();
    await withMainLock(root, () => {
      wrote = true;
    });
    const waited = Date.now() - started;
    expectEqual("the Main lock still runs its own writes", wrote, true);
    expect("without waiting for the run lock", waited < 5_000, waited);
    expect("the two locks stay distinct files", lockFilePath(root) !== runLockFilePath(root));

    // The run's last node gives the lock back, so the next drain is not refused.
    const summary = runScript(drain.script("summary"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run's reader ends it", summary.status, 0);
    expectEqual("reporting nothing", summary.stdout, "nothing\n");
    expectEqual("and the lock is released", existsSync(runLock), false);

    const next = runScript(drain.script("open"), root, { ARTIFACTS_DIR: join(artifacts, "the-next-run") });
    expectEqual("the next drain opens normally", next.status, 0);
    expectEqual("speaking the protocol", next.stdout, "opened\n");
  });

  // A lock file a kill left half-written - no pid to check, so no liveness to prove - is a leftover
  // like a dead pid's, and is stolen rather than refusing forever.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const runLock = runLockFilePath(root);
    writeFileSync(runLock, "not a pid\n");

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a lock with no readable pid does not block the next drain", opened.status, 0);
    expectEqual("which opens", opened.stdout, "opened\n");
    expect("and the steal says what it found", opened.stderr.includes("no readable pid"), opened.stderr);
    expectEqual("the lock is this run's now", readFileSync(runLock, "utf8"), `${process.pid}\n${basename(artifacts)}\ndrain\n`);
    expectEqual(
      "and its record says the same",
      JSON.parse(readFileSync(join(artifacts, RUN_LOCK_FILE), "utf8")).stole,
      "unreadable",
    );
  });

  // An open that fails before the loop has no work to lose, so it gives the lock back: the next drain
  // reads the store's own refusal, not this run's lock.
  await withTarget(
    async (root, artifacts) => {
      const runLock = runLockFilePath(root);
      const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("a storeless Target fails at open", opened.status, 1);
      expect("with the store's own reason", opened.stderr.includes("no store in the Target"), opened.stderr);
      expectEqual("and the lock is released", existsSync(runLock), false);
      expectEqual("with nothing recorded", existsSync(join(artifacts, RUN_LOCK_FILE)), false);
    },
    { store: false },
  );

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
