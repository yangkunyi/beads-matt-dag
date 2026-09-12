#!/usr/bin/env bun
/**
 * Repro: the Main-write lock guards git, and nothing else.
 *
 * Every function that writes the Target's branch through git refuses to run unless the caller holds the
 * lock, and the refusal is behavioural: the call throws, and what it would have written is not written.
 * The lock itself is one file in the Target's git directory, so a second process waits for it - and a
 * lock left behind by a killed run is stolen rather than blocking the next one.
 *
 * The other half is what the lock does *not* cover: the store. The recording path runs with no lock at
 * all, and the store sees that - a wrapper around the store binary checks, on every command, whether
 * this process held the Main lock while the command ran. The store write is outside the lock, so the
 * wrapper says so.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentResult } from "../scripts/agent.ts";
import { loadConfig } from "../scripts/config.ts";
import { isMainLockHeld, lockFilePath, withMainLock } from "../scripts/lock.ts";
import { ensureWorktreesIgnored, mergeIntoMain, removeMergedWorktree } from "../scripts/main-writes.ts";
import { preflightStore, recordFailedAttempt } from "../scripts/store.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  drain,
  expect,
  expectEqual,
  expectReject,
  gitC,
  probeLines,
  publishIssue,
  storeComments,
  storeIssue,
  withTarget,
  writeProbeStore,
  writeStoreConfig,
} from "./target.ts";

/** The issue's names, spelled here the way the naming rule spells them - the fixture's own reading. */
const NAMES = {
  handle: "feat/01",
  branch: "beads/feat/01-the-locked-issue",
  worktreeRel: join("worktrees", "feat-01-the-locked-issue"),
  bodyRel: join(".scratch", "feat", "issues", "01-the-locked-issue.md"),
};

/** Wait for a child that may already be gone by the time this is called. */
function gone(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

/** Wait until the child has said what it has to say, or fail with everything it did say. */
async function until(child: ChildProcess, thought: () => boolean, said: () => string, what: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!thought()) {
    if (child.exitCode !== null) {
      throw new Error(`${what}: the child was gone first, having said ${JSON.stringify(said())}`);
    }
    if (Date.now() > deadline) throw new Error(`${what}: the child said only ${JSON.stringify(said())}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

try {
  // Every writer of Main refuses without the lock, and each refusal leaves Main exactly as it was.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, { title: "the locked issue", handle: NAMES.handle, slug: "the-locked-issue", labels: [GATE_LABEL] });
    bd(root, "update", issue.id, "-s", "in_progress");
    // A worktree holding one commit on the issue's branch: made by a run, then left behind by its
    // failure - which is exactly the state a Main write must not meet without the lock.
    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        commitFile(opts.cwd, "attempt.txt", "an attempt\n", "an attempt's commit");
        return { sessionFile: "", answer: { kind: "none" }, lastError: "the attempt did not land" };
      },
    });
    expectEqual("the attempt failed and left its worktree", outcome, "failed");
    const worktree = join(root, NAMES.worktreeRel);
    expect("the worktree is there", existsSync(worktree), worktree);
    // The run wrote the Target's ignore line, so the refusal below is about the write it would make,
    // not about a file that was not there yet.
    const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
    const head = gitC(root, "rev-parse", "main");
    expectEqual("and no lock is held", isMainLockHeld(), false);

    await expectReject(
      "unlocked ensureWorktreesIgnored",
      () => ensureWorktreesIgnored(root),
      /ensureWorktreesIgnored writes Main and must run inside withMainLock/,
    );
    expectEqual("a refused ignore line changed nothing", readFileSync(join(root, ".gitignore"), "utf8"), gitignore);
    expectEqual("and committed nothing", gitC(root, "rev-parse", "main"), head);
    await expectReject(
      "unlocked mergeIntoMain",
      () => mergeIntoMain(root, NAMES),
      /mergeIntoMain writes Main and must run inside withMainLock/,
    );
    expectEqual("a refused merge did not move Main", gitC(root, "rev-parse", "main"), head);
    await expectReject(
      "unlocked removeMergedWorktree",
      () => removeMergedWorktree(root, NAMES),
      /removeMergedWorktree writes Main and must run inside withMainLock/,
    );
    expect("a refused removal left the worktree", existsSync(worktree));
    expectEqual("and its branch", gitC(root, "branch", "--list", NAMES.branch).includes(NAMES.branch), true);

    // Under the lock each one is the function it is, and the ignore line is a no-op the second time.
    expectEqual("the ignore line is already there", await withMainLock(root, () => ensureWorktreesIgnored(root)), false);
    expectEqual("so nothing more is committed", gitC(root, "rev-parse", "main"), head);
    const landed = await withMainLock(root, () => mergeIntoMain(root, NAMES));
    expectEqual("the merge lands under the lock", landed.created, true);
    await withMainLock(root, () => removeMergedWorktree(root, NAMES));
    expectEqual("the removal drops the worktree", existsSync(worktree), false);
  });

  // The ignore lines themselves: written once under the lock when the Target has none, and never twice.
  await withTarget(async (root) => {
    // The store's own init already wrote a .gitignore (with its database entries); it has no drain rules.
    const before = readFileSync(join(root, ".gitignore"), "utf8");
    expect("the Target has no worktrees rule to begin with", !before.includes("worktrees"));
    expect("and no interactions rule", !before.includes("interactions.jsonl"));
    expectEqual("both lines are written under the lock", await withMainLock(root, () => ensureWorktreesIgnored(root)), true);
    expectEqual(
      "as one Main commit",
      gitC(root, "log", "-1", "--format=%s"),
      "chore(beads-dag): ignore runtime paths",
    );
    expectEqual(
      "and the file gained both rules",
      readFileSync(join(root, ".gitignore"), "utf8"),
      `${before}/worktrees/\n/.beads/interactions.jsonl\n`,
    );
    expectEqual("and the store's log is untracked", gitC(root, "ls-files", "--", ".beads/interactions.jsonl"), "");
    expectEqual("the second call writes nothing", await withMainLock(root, () => ensureWorktreesIgnored(root)), false);
    expectEqual(
      "and commits nothing",
      gitC(root, "log", "-1", "--format=%s"),
      "chore(beads-dag): ignore runtime paths",
    );
    // A log that is tracked again after the fact (a force-add, or a store restored from a backup) is
    // untracked again even though both ignore lines are already in place.
    gitC(root, "add", "-f", ".beads/interactions.jsonl");
    gitC(root, "commit", "-m", "someone tracked the log again");
    expectEqual("a re-tracked log is untracked again", await withMainLock(root, () => ensureWorktreesIgnored(root)), true);
    expectEqual("and left untracked", gitC(root, "ls-files", "--", ".beads/interactions.jsonl"), "");
  });

  // Held while the callback runs, re-entered from inside it, released after it - and the one file
  // every process agrees on.
  await withTarget(async (root) => {
    const path = lockFilePath(root);
    expectEqual("no lock before", isMainLockHeld(), false);
    expect("no lock file before", !existsSync(path), path);
    let nested = false;
    await withMainLock(root, async () => {
      expectEqual("the lock is held inside the callback", isMainLockHeld(), true);
      expect("the lock file is in the Target's git directory", existsSync(path), path);
      expectEqual("and names the process holding it", readFileSync(path, "utf8").trim(), String(process.pid));
      await withMainLock(root, async () => {
        nested = true;
      });
      expectEqual("a nested call takes the same lock without waiting", nested, true);
      expectEqual("and it is still held", isMainLockHeld(), true);
    });
    expectEqual("released afterwards", isMainLockHeld(), false);
    expectEqual("and the file is gone", existsSync(path), false);
  });

  // Another process holds it: the next one waits, and only runs once that process let go.
  await withTarget(async (root) => {
    const holder = join(root, "hold-the-lock.ts");
    writeFileSync(
      holder,
      [
        `import { withMainLock } from ${JSON.stringify(join(drain.dir, "scripts", "lock.ts"))};`,
        `await withMainLock(${JSON.stringify(root)}, async () => {`,
        `  process.stdout.write("held\\n");`,
        `  await new Promise((r) => setTimeout(r, 1200));`,
        `});`,
        `process.stdout.write("released\\n");`,
        "",
      ].join("\n"),
    );
    const child = spawn(process.execPath, [holder], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
    let said = "";
    child.stdout.on("data", (chunk: Buffer) => {
      said += chunk.toString();
    });
    await until(child, () => said.includes("held"), () => said, "the other process takes the lock");
    const path = lockFilePath(root);
    expect("the lock file appears while the other process holds it", existsSync(path), path);
    expectEqual("and names that process", readFileSync(path, "utf8").trim(), String(child.pid));

    const started = Date.now();
    let ranAfter = false;
    await withMainLock(root, () => {
      ranAfter = said.includes("released");
    });
    const waited = Date.now() - started;
    expectEqual("the callback ran only after the other process released", ranAfter, true);
    expect("and the wait was the other process's hold", waited >= 500, waited);
    await gone(child);
  });

  // A lock a killed run left behind names a dead process, so it is stolen instead of blocking the next
  // drain: the stale-pid path is the whole reason this file can be trusted to survive a kill.
  await withTarget(async (root) => {
    const path = lockFilePath(root);
    writeFileSync(path, "2147483647\n");
    const started = Date.now();
    let ran = false;
    await withMainLock(root, () => {
      ran = true;
      expectEqual("the stolen lock names this process now", readFileSync(path, "utf8").trim(), String(process.pid));
    });
    expectEqual("a killed run's lock does not block the next one", ran, true);
    expect("and is not waited for", Date.now() - started < 5000, Date.now() - started);
    expectEqual("it is gone once released", existsSync(path), false);
  });

  // The recording path needs no lock, and the store sees that it had none: the wrapper checks, on
  // every command it is handed, whether the process that spawned it held the Main lock at that moment.
  await withTarget(async (root, artifacts) => {
    const { probe } = writeProbeStore(root, artifacts);
    const issue = publishIssue(root, { title: "recorded without a lock", handle: "feat/02", slug: "recorded-without-a-lock", labels: [GATE_LABEL] });
    bd(root, "update", issue.id, "-s", "in_progress");

    const store = preflightStore(root, loadConfig(root).config);
    recordFailedAttempt(store, root, issue.id, "a failure with no lock anywhere");

    expectEqual("the record lands with nothing held", storeIssue(root, issue.id).status, "open");
    expectEqual("and the reason with it", storeComments(root, issue.id).map((c) => c.text), [
      "attempt 1 failed: a failure with no lock anywhere",
    ]);
    expectEqual("and still no lock is held", isMainLockHeld(), false);
    const locked = probeLines(probe).filter((line) => line.mine);
    expectEqual("the store saw every write with no Main lock held", locked, []);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
