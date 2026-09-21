/**
 * The Main-write lock: one writer at a time on the Target's branch.
 *
 * Two drains, or one drain and a human, must not merge into the same branch at once. The lock is one
 * file in the Target's git directory, created exclusively and holding the holder's pid, so every process
 * draining that Target agrees on where it is; a pid that is no longer alive is a killed run's leftover
 * and is stolen rather than waited for, because a lock that a kill can leave behind forever is worse
 * than no lock.
 *
 * It guards Main's git writes only (ADR-0002). The store's writes do not come through it: they have the
 * store's own transaction, and the settlement records an outcome after the merge rather than under the
 * lock. So the lock is taken by the callers of main-writes.ts - a whole compound step around the writes
 * it has to make atomic - and by the document commit (`doc-commit.ts`), which lands a run's own documents
 * on the same branch in one path-scoped commit.
 *
 * Re-entrancy: a call made while this process already holds the lock joins the transaction instead of
 * waiting for itself. That is what lets a compound step call one writer after another and still hold one
 * lock, and it is per async context, so a second task in the same process that did not enter the
 * callback still waits.
 *
 * **This is the Main lock and only the Main lock.** A drain also holds a lock that is not about Main at
 * all - one run at a time per Target, held for a whole run - and it is deliberately a second file beside
 * this one (`run-lock.ts`, `beads-dag-run.lock`). Sharing this file would break both: a Main write from
 * another process of the run itself would find the run's live pid in the file and wait LOCK_WAIT_MS,
 * then throw, because re-entrancy here saves `withMainLock` from itself and nothing else; and a second
 * drain would wait a run's length where it has to refuse. The mechanisms the two locks share -
 * exclusive create, the pid check, stealing a dead holder's - live here, so there is one spelling of
 * each.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { closeSync, constants, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitOrThrow } from "./git.ts";

/** The Main lock file's name, inside the Target's git directory. */
export const LOCK_NAME = "beads-dag.lock";

/** How long a process waits for another's lock before giving up, in milliseconds. */
export const LOCK_WAIT_MS = 60_000;

/** How often a waiting process looks again. */
const POLL_MS = 50;

const held = new AsyncLocalStorage<true>();

/** True when this async context already holds the Main lock. Every Main writer insists on it. */
export function isMainLockHeld(): boolean {
  return held.getStore() === true;
}

/** The Target's git directory: where every lock file lives, so all processes resolve the same path. */
export function gitDir(target: string): string {
  return gitOrThrow(target, ["rev-parse", "--absolute-git-dir"]);
}

/** The Main lock's one path: the Target's git directory. */
export function lockFilePath(target: string): string {
  return join(gitDir(target), LOCK_NAME);
}

/** What a lock file records: the holder's pid, and an optional name. Extra lines are the caller's. */
export type LockHolder = { pid: number; name?: string };

/**
 * A lock file's holder, read the one way: pid on the first line, name on the second. Further lines
 * are ignored here — the run lock writes a kind on a third line and reads it itself. An unreadable
 * file or an unusable pid reads as no holder, which every caller treats as a dead one - a lock
 * half-written by a kill must be stolen, never waited for.
 */
export function readLockHolder(path: string): LockHolder | undefined {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
  const lines = raw.split("\n");
  const pid = Number((lines[0] ?? "").trim());
  if (!Number.isInteger(pid) || pid <= 0) return undefined;
  const name = (lines[1] ?? "").trim();
  const holder: LockHolder = { pid };
  if (name !== "") holder.name = name;
  return holder;
}

/**
 * Whether the process that wrote the lock file is still there. A pid that exists but belongs to another
 * user answers EPERM, which is alive: this only steals a lock whose holder is gone. No readable holder
 * means no living holder.
 */
export function lockHolderAlive(holder: LockHolder | undefined): boolean {
  if (holder === undefined) return false;
  try {
    process.kill(holder.pid, 0);
    return true;
  } catch (e) {
    return (e as { code?: string }).code === "EPERM";
  }
}

/** Pid, then name when there is one. The Main lock writes this; the run lock writes its own body. */
function lockFileBody(holder: LockHolder): string {
  if (holder.name !== undefined && holder.name !== "") {
    return `${holder.pid}\n${holder.name}\n`;
  }
  return `${holder.pid}\n`;
}

/** Exclusive create of a lock file. EEXIST is the caller's to interpret. */
export function createExclusiveFile(path: string, body: string): number {
  const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);
  writeFileSync(fd, body);
  return fd;
}

/** Create the Main lock file exclusively for this holder. */
export function createLockFile(path: string, holder: LockHolder): number {
  return createExclusiveFile(path, lockFileBody(holder));
}

/** Remove a lock file this process found dead, tolerating a waiter that got there first. */
export function removeLockFile(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* another waiter got there first */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait for the lock file, stealing it when the pid in it is gone. Returns the open fd we hold. */
async function acquire(path: string): Promise<number> {
  const started = Date.now();
  for (;;) {
    try {
      return createLockFile(path, { pid: process.pid });
    } catch (e) {
      if ((e as { code?: string }).code !== "EEXIST") throw e;
      if (existsSync(path) && !lockHolderAlive(readLockHolder(path))) {
        removeLockFile(path);
        continue;
      }
      if (Date.now() - started > LOCK_WAIT_MS) throw new Error(`timeout waiting for the Main lock ${path}`);
      await sleep(POLL_MS);
    }
  }
}

/**
 * Serialise the Target's Main writes: run `fn` with the lock held, and release it whatever `fn` does.
 *
 * A nested call finds the lock already held by this context and joins the transaction, so a compound
 * step - "make sure worktrees/ is ignored, then merge" - is one acquisition. A second process waits.
 */
export async function withMainLock<T>(target: string, fn: () => T | Promise<T>): Promise<T> {
  if (held.getStore()) return await fn();
  const path = lockFilePath(target);
  const fd = await acquire(path);
  try {
    return await held.run(true, fn);
  } finally {
    closeSync(fd);
    try {
      unlinkSync(path);
    } catch {
      /* already gone */
    }
  }
}
