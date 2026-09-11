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
 * it has to make atomic - and by nothing else.
 *
 * Re-entrancy: a call made while this process already holds the lock joins the transaction instead of
 * waiting for itself. That is what lets a compound step call one writer after another and still hold one
 * lock, and it is per async context, so a second task in the same process that did not enter the
 * callback still waits.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { closeSync, constants, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitOrThrow } from "./git.ts";

/** The lock file's name, inside the Target's git directory. */
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

/** The lock's one path: the Target's git directory. */
export function lockFilePath(target: string): string {
  return join(gitOrThrow(target, ["rev-parse", "--absolute-git-dir"]), LOCK_NAME);
}

/**
 * Whether the process that wrote the lock file is still there. A pid that exists but belongs to another
 * user answers EPERM, which is alive: this only steals a lock whose holder is gone.
 */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as { code?: string }).code === "EPERM";
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
      const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);
      writeFileSync(fd, `${process.pid}\n`);
      return fd;
    } catch (e) {
      if ((e as { code?: string }).code !== "EEXIST") throw e;
      if (existsSync(path)) {
        const pid = Number(readFileSync(path, "utf8").trim());
        if (!Number.isInteger(pid) || pid <= 0 || !pidAlive(pid)) {
          try {
            unlinkSync(path);
          } catch {
            /* another waiter got there first */
          }
          continue;
        }
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
