/**
 * The run lock: one drain at a time per Target.
 *
 * `lock.ts` serialises the writes that move Main; this serialises whole runs. Two drains against one
 * Target are not a slower version of one run: the second run's opening repair reads the first run's
 * live claim as a leftover, and its `pick` can offer an issue the first run is implementing right now.
 * So a drain takes this lock before it does anything, and a second drain **refuses** - exit 1, one line
 * naming the holder, nothing claimed and nothing written. It must not wait: the wait would be a run's
 * length, and by the time a waiter woke up the state it meant to read would be a run old.
 *
 * **Its own file.** The lock is `beads-dag-run.lock` beside the Main lock `beads-dag.lock` in the
 * Target's git directory, never the Main lock's file. The Main lock's pid check would misread a run
 * lock: this one is held by the workflow runner process for the run's whole length, so a Main write
 * from another process of the same run would find a live pid in the file, wait LOCK_WAIT_MS and then
 * throw - the Main lock's re-entrancy saves `withMainLock` from itself, in one async context, and
 * nothing would save this. Two files, two lifetimes, no interference.
 *
 * **The holder.** The lock names both the process it trusts to be alive for the run - the workflow
 * runner that started this node (`process.ppid`, which every node of the run shares and the runner
 * outlives) - and the run itself: the basename of the run's artifacts directory, which is Archon's
 * per-run directory `.../artifacts/runs/<run-id>/`. The pack has no run-id field of its own. A pid
 * that is gone is a killed run's leftover and is stolen, exactly as `lock.ts` steals one; a live one
 * refuses, and the refusal names the run id and the pid so its reader can find the run
 * (`archon workflow status`) and kill it if it is stuck.
 *
 * **Why not a store field.** The store is the Target's issue data, and this is not about any issue: it
 * is mutual exclusion between the processes on this machine, and it must be atomically creatable and
 * cheaply stealable when its holder dies. A store field would be visible to every store reader, backed
 * up and restorable into a state that says "held" with nothing holding it, and it has no pid to check.
 * It is run bookkeeping, like `attempted-ids.json` (ADR-0005): written beside the run, meaningful only
 * to the processes draining this Target, kept afterwards nowhere.
 *
 * **Release is best effort.** A run that ends normally releases the lock from `summary`, its last node,
 * but no node but `open` is guaranteed to run: a drain that fails on the way - or is killed - leaves the
 * file behind, and Archon then skips the nodes that would have released it. That is exactly why the
 * holder is a pid: the next drain finds a dead one and steals the lock instead of being refused
 * forever. `open` also releases the lock when its own work fails before returning.
 *
 * The record the run leaves behind (`run-lock.json`, one line in ARTIFACTS_DIR) is the other half: an
 * operator refused by this lock can read the holder run's artifacts and see what held it.
 */
import { closeSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  createLockFile,
  gitDir,
  lockHolderAlive,
  readLockHolder,
  removeLockFile,
  type LockHolder,
} from "./lock.ts";

/** The run lock file's name, beside the Main lock's, inside the Target's git directory. */
export const RUN_LOCK_NAME = "beads-dag-run.lock";

/** The run-lock record in ARTIFACTS_DIR: the lock this run holds, one JSON line. */
export const RUN_LOCK_FILE = "run-lock.json";

/** What this run's lock is, once taken. */
export type RunLock = {
  /** The lock file. */
  path: string;
  /** The holder process: the workflow runner that started this node. */
  pid: number;
  /** The holder's name: this run's id, the basename of its artifacts directory. */
  run: string;
  /** What a dead holder left, when this run took over a killed run's lock instead of creating it. */
  stole?: LockHolder | "unreadable";
};

/** The run lock's one path: the Target's git directory, beside the Main lock. */
export function runLockFilePath(target: string): string {
  return join(gitDir(target), RUN_LOCK_NAME);
}

/** What this run's lock records: the runner pid, and the run id its artifacts directory names. */
function thisHolder(artifactsDir: string): LockHolder & { name: string } {
  return { pid: process.ppid, name: basename(artifactsDir) };
}

/** One holder as a line names it: its run id when it has one, and always its pid. */
function holderText(holder: LockHolder): string {
  return holder.name === undefined ? `pid ${holder.pid}` : `run ${holder.name} (pid ${holder.pid})`;
}

/** The refusal a live holder earns: one line naming the holder, the lock, and the operator's move. */
function refusalLine(path: string, holder: LockHolder): string {
  return (
    `beads-dag: refusing to start: another drain is running (${holderText(holder)}, lock ${path}); ` +
    `one drain at a time per Target - wait for it to end, or kill it and the next drain steals a dead holder's lock`
  );
}

/** Create the lock for this run, or false when someone else holds it. */
function tryCreate(path: string, holder: LockHolder): boolean {
  let fd: number;
  try {
    fd = createLockFile(path, holder);
  } catch (e) {
    if ((e as { code?: string }).code === "EEXIST") return false;
    throw e;
  }
  closeSync(fd);
  return true;
}

/**
 * Take the run lock, or refuse.
 *
 * The create is exclusive, so exactly one process wins it. A loser reads the holder: a live one is
 * another drain and throws the refusal; a dead one - or a file with no readable pid, which is a kill
 * between the create and the write - is a leftover, and is removed and retried, so a run killed
 * anywhere leaves the next drain working. Losing the retry means another process won the steal and is
 * alive, which refuses like any other live holder.
 */
export function takeRunLock(target: string, artifactsDir: string): RunLock {
  const path = runLockFilePath(target);
  const holder = thisHolder(artifactsDir);
  let stole: LockHolder | "unreadable" | undefined;
  for (;;) {
    if (tryCreate(path, holder)) {
      const lock: RunLock = { path, pid: holder.pid, run: holder.name };
      return stole === undefined ? lock : { ...lock, stole };
    }
    const found = readLockHolder(path);
    if (found === undefined || !lockHolderAlive(found)) {
      stole = found ?? "unreadable";
      removeLockFile(path);
      continue;
    }
    throw new Error(refusalLine(path, found));
  }
}

/**
 * Release this run's lock, when the file still records it. False when there was nothing of ours to
 * remove - a run that never took it, a lock another run stole, or a Target git cannot be read - and a
 * release must never fail the node that calls it, so it never throws.
 *
 * The run id is the lock's identity and the pid is only its liveness check, so the release compares the
 * run - not the pid - and works from any process of the run, `summary` in a real run and a test that
 * calls the reader in its own process included. A lock another run took carries another run id and is
 * left alone.
 */
export function releaseRunLock(target: string, artifactsDir: string): boolean {
  try {
    const path = runLockFilePath(target);
    const holder = readLockHolder(path);
    if (holder?.name !== basename(artifactsDir)) return false;
    removeLockFile(path);
    return true;
  } catch {
    return false;
  }
}

/** The steal's one line: a dead holder's lock was taken over. Undefined when there was nothing to steal. */
export function stoleLine(lock: RunLock): string | undefined {
  if (lock.stole === undefined) return undefined;
  const from = lock.stole === "unreadable" ? "a lock file with no readable pid" : holderText(lock.stole);
  return `beads-dag: run lock: stole ${lock.path} from ${from}; that holder is gone and did not release it`;
}

/**
 * Write the run's own record of the lock: one JSON line in ARTIFACTS_DIR, so the holder a refusal
 * names can be checked against its own artifacts without reading the pack.
 */
export function recordRunLock(artifactsDir: string, lock: RunLock): void {
  mkdirSync(artifactsDir, { recursive: true });
  const record = {
    run: lock.run,
    pid: lock.pid,
    path: lock.path,
    ...(lock.stole === undefined ? {} : { stole: lock.stole }),
  };
  writeFileSync(join(artifactsDir, RUN_LOCK_FILE), `${JSON.stringify(record)}\n`);
}
