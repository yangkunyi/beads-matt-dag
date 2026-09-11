import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * What this run has already tried, kept beside the run and never in the store.
 *
 * The store's `ready` answer cannot know it: a failed attempt puts its issue back to `open` — that is
 * exactly the retry channel — so within one run the store would offer the same issue again and again.
 * The cap that stops that is per-run bookkeeping, and this is its one home. It is keyed by the store's
 * own ids, because that is what the frontier is composed of.
 */

const FILE = "attempted-ids.json";

/** The run's attempted-ids file, inside ARTIFACTS_DIR. */
function attemptedFile(artifactsDir: string): string {
  return join(artifactsDir, FILE);
}

/** The ids this run has claimed. An unreadable or absent file is an empty set, never a failure. */
export function readAttempted(artifactsDir: string): Set<string> {
  const path = attemptedFile(artifactsDir);
  if (!existsSync(path)) return new Set();
  try {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

/** Record ids as attempted by this run. Called once a claim has actually landed. */
export function addAttempted(artifactsDir: string, ids: string[]): void {
  if (ids.length === 0) return;
  mkdirSync(artifactsDir, { recursive: true });
  const attempted = readAttempted(artifactsDir);
  for (const id of ids) attempted.add(id);
  writeFileSync(attemptedFile(artifactsDir), `${JSON.stringify([...attempted].sort())}\n`);
}
