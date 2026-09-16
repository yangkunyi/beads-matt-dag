/**
 * The repair: a question a killed reading run left claimed, resolved from the store.
 *
 * This is the one place the reading executor differs from the drain, and the difference is that a
 * reading's landing is a **store fact**: the draft label the landed reading stamps. So the repair reads
 * the store, not git - there is no merge to look for, and nothing git could answer - and each leftover
 * takes one of the two resolutions the reading node itself has:
 *
 *   `in_progress` and carrying the draft label   → the reading landed and only the status is stale: back
 *                                                  to `open`, with a comment saying the claim was
 *                                                  released after the reading landed
 *   `in_progress` without it                     → the reading did not land: back to `open` with
 *                                                  `attempt N failed: leftover in progress and no draft
 *                                                  answer on the issue`, which is exactly the ordinal and
 *                                                  the shape a failed attempt already has, so the retry
 *                                                  channel is the frontier itself
 *
 * **Only this executor's own claims are repaired.** The store holds claimed `decision` issues of every
 * leg - a wayfinder session claims a `wayfinder:grilling` ticket and records itself as the assignee - and
 * a reading run has no business reopening one it never took. The line is the domain's own vocabulary: a
 * claim of this executor's is a question carrying the reading leg's label (what the frontier requires), or
 * one carrying the draft label (what a landing stamps). Anything else `in_progress` is left exactly where
 * it was found and reported instead.
 *
 * The one residual, named in the spec: a run killed between the draft comment and the status write is
 * repaired as "did not land" (the label is not there yet), and the next run reads the question a second
 * time. That costs one turn and leaves two drafts on the ticket, which is visible and honest; the
 * alternative is a second state to maintain.
 *
 * The repair is not an attempt by this run: a reopened issue is deliberately not recorded as attempted, so
 * the same run's `pick` offers it as a retry. That is why this runs in the opening node, before pick.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { commentIssue, inProgressIssues, recordFailedAttempt, reopenIssue, type Store, type StoreIssue } from "../../scripts/store.ts";
import { DRAFT_LABEL } from "../../beads-dag-read/scripts/reading.ts";
import { READING_LEG_LABEL } from "./inquiry.ts";

/**
 * What one leftover was resolved to: the reading landed and the status was stale, the reading never
 * landed and the claim is released as an ordinary failed attempt, or a claim this executor leaves alone
 * because it is not its own.
 */
export type ReadingRepair = {
  id: string;
  handle: string | undefined;
  outcome: "landed" | "failed" | "left-alone";
  reason: string;
};

/** The reason a leftover whose reading never landed is put back to `open` with: exactly a failed attempt. */
export const NO_DRAFT_REASON = "leftover in progress and no draft answer on the issue";

/** The repairs artifact, relative to ARTIFACTS_DIR: the same run-scoped bookkeeping the drain keeps. */
const REPAIRS_FILE = "repairs.json";

/** A `decision` issue a reading run may have claimed: the leg label gates the frontier, the draft label marks a landing. */
function isReadingClaim(issue: StoreIssue): boolean {
  return issue.labels.includes(READING_LEG_LABEL) || issue.labels.includes(DRAFT_LABEL);
}

/**
 * Resolve every `in_progress` question this executor's claims could cover, and report the ones it leaves
 * alone. In the store's own order; no issue ever fails the run - one unresolvable claim must not trade
 * itself for a run that never starts.
 */
export function repairReadingLeftovers(target: string, store: Store, runId: string): ReadingRepair[] {
  const repairs: ReadingRepair[] = [];
  for (const issue of inProgressIssues(store, target)) {
    const label = issue.handle ?? issue.id;
    if (issue.type !== "decision") {
      const reason = `a ${issue.type} issue's status is not this executor's to repair: a reading run claims questions`;
      console.error(`${label}: left alone: ${reason}`);
      repairs.push({ id: issue.id, handle: issue.handle, outcome: "left-alone", reason });
      continue;
    }
    if (!isReadingClaim(issue)) {
      const reason =
        `a decision issue without ${READING_LEG_LABEL} or ${DRAFT_LABEL} is another leg's claim, not this executor's`;
      console.error(`${label}: left alone: ${reason}`);
      repairs.push({ id: issue.id, handle: issue.handle, outcome: "left-alone", reason });
      continue;
    }

    if (issue.labels.includes(DRAFT_LABEL)) {
      const reason = `the claim was released after the reading landed (released by run ${runId})`;
      commentIssue(store, target, issue.id, reason);
      reopenIssue(store, target, issue.id);
      console.error(`${label}: repaired: ${reason}`);
      repairs.push({ id: issue.id, handle: issue.handle, outcome: "landed", reason });
      continue;
    }

    recordFailedAttempt(store, target, issue.id, NO_DRAFT_REASON);
    console.error(`${label}: repaired: attempt failed: ${NO_DRAFT_REASON}`);
    repairs.push({ id: issue.id, handle: issue.handle, outcome: "failed", reason: NO_DRAFT_REASON });
  }
  return repairs;
}

/** True when one parsed entry is a repair this report can name; anything else invalidates the record. */
function isReadingRepair(raw: unknown): raw is ReadingRepair {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    (r.outcome === "landed" || r.outcome === "failed" || r.outcome === "left-alone") &&
    typeof r.reason === "string"
  );
}

/** The repairs the opening step performed, as they were written. Absent or unreadable reads as none. */
export function readReadingRepairs(artifactsDir: string): ReadingRepair[] {
  const path = join(artifactsDir, REPAIRS_FILE);
  if (!existsSync(path)) return [];
  try {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(raw) && raw.every(isReadingRepair) ? raw : [];
  } catch {
    return [];
  }
}

/** Record what the opening step repaired. Written once, by the node that ran it; nothing to say writes nothing. */
export function writeReadingRepairs(artifactsDir: string, repairs: ReadingRepair[]): void {
  if (repairs.length === 0) return;
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, REPAIRS_FILE), `${JSON.stringify(repairs)}\n`);
}
