/**
 * The reading frontier: what this run may read, in one token - a JSON array of question handles, so the
 * same token is both the loop's end condition (`[]`) and the fan-out's item list.
 *
 * It is the store's own ready answer, minus what only the flow knows:
 *
 *   ready questions − questions not labelled for a reading leg − the map − questions whose reading
 *     already landed − questions this run already claimed → ordered by handle → truncated to
 *     config.concurrency → claimed in one transaction
 *
 * The store owns readiness (`ready`), and with it the already-claimed questions: a question in progress
 * is not in that answer at all. It cannot own the four rules, because they are this flow's vocabulary
 * rather than the store's facts - a reading leg's label, the map's own label, the draft label a landed
 * reading stamps, and this run's own bookkeeping - so every candidate the store offered and this step
 * left out is written, with the rule that left it out, into the run's own exclusion report. A question
 * claimed by another run is reported too (rule `already-claimed`), read from the store's own
 * `in_progress` set: it is not the store's business to explain why a run did not read it, and "someone
 * else has it" is the answer.
 *
 * **Order is by handle** - feature, then the number, then the slug - so a batch of questions opened in an
 * order is read in that order, and the order is the one already visible in the branch and body names.
 * **The cap is `concurrency`**, and the claim is one `bd batch` transaction: all-or-nothing, so a claim
 * that fails part-way leaves nothing claimed.
 *
 * The claim is the status alone (`in_progress`), with no assignee: it is what takes a question out of
 * every session's frontier and out of every later cycle of this run.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addAttempted, readAttempted } from "../../beads-dag-drain/scripts/attempted.ts";
import { issueNames } from "../../beads-dag-drain/scripts/naming.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import {
  claimIssues,
  inProgressIssues,
  preflightStore,
  readyIssues,
  type StoreIssue,
} from "../../beads-dag-drain/scripts/store.ts";
import { DRAFT_LABEL, MAP_LABEL, READING_LEG_LABEL } from "./inquiry.ts";

/**
 * Why a question the store offered was left out. These are the rules this step applies, and the only ones
 * it can explain: anything the store itself excluded (blocked, closed) never reaches this step and is
 * answered by asking the store.
 */
type ExclusionRule =
  | "map-container"
  | "missing-reading-label"
  | "reading-already-landed"
  | "attempted-by-this-run"
  | "already-claimed";

type ExcludedIssue = { id: string; handle: string | undefined; rule: ExclusionRule };

/** What the run keeps of this cycle's frontier: what was claimed, and why each other candidate was not. */
type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: ExcludedIssue[];
};

/** The artifact pick rewrites each cycle, relative to ARTIFACTS_DIR. */
const EXCLUSION_REPORT_FILE = "pick-exclusions.json";

/**
 * The rule that keeps a question out of the frontier, or undefined when nothing does. The order is what
 * decides which rule a multiply-excluded question is reported under: the map first - it is a container
 * and never a ticket, so that is the fact worth naming even though it also fails the leg-label rule - then
 * the reading gate, then the landing, then this run's own memory.
 */
function exclusionRule(issue: StoreIssue, attempted: Set<string>): ExclusionRule | undefined {
  if (issue.labels.includes(MAP_LABEL)) return "map-container";
  if (!issue.labels.includes(READING_LEG_LABEL)) return "missing-reading-label";
  if (issue.labels.includes(DRAFT_LABEL)) return "reading-already-landed";
  if (attempted.has(issue.id)) return "attempted-by-this-run";
  return undefined;
}

/**
 * The store's answer with this step's rules applied: the ready questions, plus the questions the store
 * already holds claimed - the latter reported, never offered.
 *
 * The claimed set is filtered to this executor's domain: a `decision` issue carrying the reading leg's
 * label (a claim of a reading run's) or the draft label (a landing). An implementation issue the drain has
 * claimed, or a decision issue another leg has claimed, is not this run's frontier and not its report.
 * A question this run itself claimed is left out - it is the run's own, already in `attempted-ids.json`,
 * and re-reporting it every cycle would say nothing.
 */
function composeFrontier(
  ready: StoreIssue[],
  inProgress: StoreIssue[],
  attempted: Set<string>,
): { candidates: StoreIssue[]; excluded: ExcludedIssue[] } {
  const candidates: StoreIssue[] = [];
  const excluded: ExcludedIssue[] = [];
  for (const issue of ready) {
    const rule = exclusionRule(issue, attempted);
    if (rule === undefined) candidates.push(issue);
    else excluded.push({ id: issue.id, handle: issue.handle, rule });
  }
  for (const issue of inProgress) {
    if (issue.type !== "decision") continue;
    if (attempted.has(issue.id)) continue;
    if (!issue.labels.includes(READING_LEG_LABEL) && !issue.labels.includes(DRAFT_LABEL)) continue;
    excluded.push({ id: issue.id, handle: issue.handle, rule: "already-claimed" });
  }
  return { candidates, excluded };
}

/**
 * A question's place in the order, and the check that it can be named at all: the handle and the slug are
 * exactly what the reading turn's note path derives from, so a frontier question missing either fails the
 * node rather than being fed to a reader that cannot name its note.
 */
function orderKey(issue: StoreIssue): { handle: string; feature: string; number: string; slug: string } {
  const names = issueNames(issue);
  const [feature = "", number = ""] = names.handle.split("/");
  return { handle: names.handle, feature, number, slug: issue.slug ?? "" };
}

/** By handle: the feature, then the number as a number where both are numbers, then the slug. */
function compareHandles(a: StoreIssue, b: StoreIssue): number {
  const x = orderKey(a);
  const y = orderKey(b);
  if (x.feature !== y.feature) return x.feature < y.feature ? -1 : 1;
  if (/^\d+$/.test(x.number) && /^\d+$/.test(y.number)) {
    const difference = Number(x.number) - Number(y.number);
    if (difference !== 0) return difference;
  } else if (x.number !== y.number) {
    return x.number < y.number ? -1 : 1;
  }
  if (x.slug === y.slug) return 0;
  return x.slug < y.slug ? -1 : 1;
}

function writeExclusionReport(artifactsDir: string, report: ExclusionReport): void {
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, EXCLUSION_REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config }) => {
      const store = preflightStore(target, config);
      const attempted = readAttempted(artifactsDir);
      const { candidates, excluded } = composeFrontier(
        readyIssues(store, target),
        inProgressIssues(store, target),
        attempted,
      );
      const picked = candidates
        .sort(compareHandles)
        .slice(0, config.concurrency)
        .map((issue) => ({ id: issue.id, handle: orderKey(issue).handle }));
      const ids = picked.map((issue) => issue.id);

      claimIssues(store, target, ids);
      addAttempted(artifactsDir, ids);
      writeExclusionReport(artifactsDir, { picked, excluded });
      return nodeLine(JSON.stringify(picked.map((issue) => issue.handle)));
    },
  });
}
