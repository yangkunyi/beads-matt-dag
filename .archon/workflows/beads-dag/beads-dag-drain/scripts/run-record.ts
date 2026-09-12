/**
 * The run's own bookkeeping: the commits it added to Main, and the leftovers its opening step
 * repaired. Both live beside the run (ARTIFACTS_DIR) and nowhere else.
 *
 * Why a record at all: the drain-end report must tell the range's commits apart - which are this run's
 * and which are an earlier run's, an operator's, or a repair's - and neither git nor the store can. A
 * merge subject looks the same whichever run wrote it, the store has no clock that attributes a write
 * to a run (ticket 12 measured that), and a repair that closed an issue wrote nothing at all. So the
 * run writes down what it did, in the only place that knows.
 *
 * Why this is not store state and not a maintained mirror (ADR-0005): it is written by the run that
 * did the work, read by that same run's report, and never kept afterwards; it answers a question about
 * one run's actions, not about any issue. A run-scoped record of what the run itself did is the same
 * kind of thing as `attempted-ids.json` and `pick-exclusions.json`.
 *
 * `main-commits.json` is written under the Main lock (settle.ts, execute.ts): two issue executions can
 * finish at once, and the lock is what serialises their reads and writes. `repairs.json` has one
 * writer, the opening node. Both are absent-tolerant - an unreadable record reads as empty - and a
 * report built without one names the range's commits as not its own rather than inventing a record.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { git } from "./git.ts";
import type { Repair } from "./reconcile.ts";

/** The commits this run added to Main: main-commits.json. */
const MAIN_COMMITS_FILE = "main-commits.json";

/** The leftovers this run's opening step repaired: repairs.json. */
const REPAIRS_FILE = "repairs.json";

/** An artifact read back as JSON, or undefined when it is absent or unreadable. */
function readJSON(artifactsDir: string, file: string): unknown {
  const path = join(artifactsDir, file);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/** The commit SHAs this run has added to Main. An absent or unreadable record reads as none. */
export function readMainCommits(artifactsDir: string): Set<string> {
  const raw = readJSON(artifactsDir, MAIN_COMMITS_FILE);
  return new Set(Array.isArray(raw) ? raw.filter((sha): sha is string => typeof sha === "string") : []);
}

/**
 * Record one commit this run added to Main.
 *
 * Called inside the Main lock by the two writers of Main - the merge (settle.ts) and the ignore
 * rules' commit (execute.ts) - so two concurrent executions cannot lose each other's record. A record
 * that cannot be written is reported on stderr and never thrown: the commit is on Main, and
 * bookkeeping must not turn a landed merge into a failed attempt.
 */
export function recordMainCommit(artifactsDir: string, commit: string): void {
  try {
    const all = readMainCommits(artifactsDir);
    all.add(commit);
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, MAIN_COMMITS_FILE), `${JSON.stringify([...all].sort())}\n`);
  } catch (e) {
    console.error(
      `could not record ${commit} in this run's main-commits.json: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/** True when one parsed entry is a repair this report can name; anything else invalidates the record. */
function isRepair(raw: unknown): raw is Repair {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return typeof r.id === "string" && (r.outcome === "merged" || r.outcome === "failed" || r.outcome === "left-alone");
}

/** The repairs the opening step performed, as reconcile.ts returned them. Absent or unreadable reads as none. */
export function readRepairs(artifactsDir: string): Repair[] {
  const raw = readJSON(artifactsDir, REPAIRS_FILE);
  return Array.isArray(raw) && raw.every(isRepair) ? raw : [];
}

/** Record what the opening step repaired. Written once, by the node that ran it. */
export function writeRepairs(artifactsDir: string, repairs: Repair[]): void {
  if (repairs.length === 0) return;
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, REPAIRS_FILE), `${JSON.stringify(repairs)}\n`);
}

/** A SHA as the report names it: enough to find it, short enough to read. */
function shortSha(sha: string): string {
  return sha.slice(0, 12);
}

/** One repair line: what was repaired, to which outcome, and on what evidence. */
function repairLine(repair: Repair): string {
  const label = repair.handle !== undefined ? `${repair.handle} [${repair.id}]` : repair.id;
  switch (repair.outcome) {
    case "merged":
      return `- ${label} — closed: merge ${shortSha(repair.mergeCommit)} had already landed`;
    case "failed":
      return `- ${label} — reopened: ${repair.reason}`;
    case "left-alone":
      return `- ${label} — left alone: ${repair.reason}`;
  }
}

/** What the summary's range section is built from: the run, the range, and the run's own record. */
export type RangeFacts = {
  target: string;
  /** The range's base: the position the run opened on (report-artifacts.ts writes it to the run). */
  base: string;
  /** The range's end: Main's tip when the summary node ran. */
  head: string;
  /** The commits this run added to Main (readMainCommits). */
  made: Set<string>;
  /** The repairs this run's opening step performed (readRepairs). */
  repairs: Repair[];
};

/**
 * The node-written section the summary carries: the range both readers covered, the Main commits in
 * it that this run did not make, and the repairs this run's opening step performed.
 *
 * The partition is the run's own record, not prose: an earlier run's merge and an operator's commit
 * arrive in the range with a subject that says nothing about who wrote them, so the only honest
 * question is whether the run recorded the commit as one of its own. The range's commits are Main's
 * first-parent line - what Main itself gained, not the branch commits that arrived inside a merge -
 * because a commit inside a merge this run made is this run's work.
 *
 * Empty sections are left out, not zero-filled: a run that made every commit in its range, or
 * repaired nothing, has nothing to say there, and the range line already carries the counts.
 */
export function rangeSection(facts: RangeFacts): string {
  const log = git(facts.target, ["log", "--first-parent", "--format=%H%x00%s", `${facts.base}..${facts.head}`]);
  if (!log.ok) {
    return `## Range\n\n\`${facts.base}..${facts.head}\` — git could not read the range: ${log.out}`;
  }
  const commits = log.out
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [commit, subject] = line.split("\0");
      return { commit: commit ?? "", subject: subject ?? "" };
    });
  const made = commits.filter((c) => facts.made.has(c.commit));
  const foreign = commits.filter((c) => !facts.made.has(c.commit));
  const lines = [
    "## Range",
    "",
    `\`${facts.base}..${facts.head}\` — ${commits.length} commit${commits.length === 1 ? "" : "s"} on Main, ` +
      `${made.length} made by this run, ${foreign.length} not made by this run`,
  ];
  if (foreign.length > 0) {
    lines.push("", "## Commits this run did not make", "");
    for (const c of foreign) lines.push(`- ${shortSha(c.commit)} ${c.subject}`);
  }
  if (facts.repairs.length > 0) {
    lines.push("", "## Repairs at open", "");
    for (const repair of facts.repairs) lines.push(repairLine(repair));
  }
  return lines.join("\n");
}
