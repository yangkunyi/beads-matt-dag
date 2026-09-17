/**
 * The reading frontier: the store's own ready answer minus what only the flow knows, in the order the
 * flow reads handles in.
 *
 * It is the store's own ready answer, minus:
 *
 *   questions not labelled for a reading leg − the map − questions whose reading already landed −
 *     questions this run already claimed
 *
 * The store owns readiness (`ready`), and with it the already-claimed questions: a question in progress
 * is not in that answer at all. It cannot own the four rules, because they are this flow's vocabulary
 * rather than the store's facts - a reading leg's label, the map's own label, the draft label a landed
 * reading stamps, and a run's own bookkeeping - so every candidate the store offered and these rules
 * left out is handed back with the rule that left it out, for the caller to report.
 *
 * **One home, two askers.** `pick` takes the batch it will claim, and the run's report names the frontier
 * it left behind; a report that spelled the rules again could describe a frontier no pick would offer.
 * The two askers differ in one place only - which questions count as already tried - and that is the
 * caller's argument, not a rule of the frontier: `pick` hands in this run's `attempted-ids.json`, and
 * the report hands in the empty set, because it describes what a next run would find rather than what
 * this one remembers.
 */
import { issueNames } from "../../scripts/naming.ts";
import {
  inProgressIssues,
  readyIssues,
  type Store,
  type StoreIssue,
} from "../../scripts/store.ts";
import { DRAFT_LABEL } from "../../beads-dag-read/scripts/reading.ts";
import { MAP_LABEL, READING_LEG_LABEL } from "./inquiry.ts";

/**
 * Why a question the store offered was left out. These are the rules this module applies, and the only
 * ones it can explain: anything the store itself excluded (blocked, closed) never reaches it and is
 * answered by asking the store.
 */
export type ExclusionRule =
  | "map-container"
  | "missing-reading-label"
  | "reading-already-landed"
  | "attempted-by-this-run"
  | "already-claimed"
  | "outside-allow-list";

/** One issue the store offered and the rules left out, with the rule that left it out. */
export type ExcludedIssue = { id: string; handle: string | undefined; rule: ExclusionRule };

/** The frontier: what a run may read, and what it may not, with a reason for each. */
export type ReadingFrontier = {
  /** The eligible questions, ordered by handle - the order a batch is read in. */
  candidates: StoreIssue[];
  /** Every question the store offered and the rules left out, this run's own attempts included. */
  excluded: ExcludedIssue[];
};

/**
 * The rule that keeps a question out of the frontier, or undefined when nothing does. The order is what
 * decides which rule a multiply-excluded question is reported under: the map first - it is a container
 * and never a ticket, so that is the fact worth naming even though it also fails the leg-label rule - then
 * the reading gate, then the landing, then this run's own memory.
 */
function exclusionRule(issue: StoreIssue, attempted: ReadonlySet<string>): ExclusionRule | undefined {
  if (issue.labels.includes(MAP_LABEL)) return "map-container";
  if (!issue.labels.includes(READING_LEG_LABEL)) return "missing-reading-label";
  if (issue.labels.includes(DRAFT_LABEL)) return "reading-already-landed";
  if (attempted.has(issue.id)) return "attempted-by-this-run";
  return undefined;
}

/**
 * The store's answer with the rules applied: the ready questions, plus the questions the store already
 * holds claimed - the latter reported, never offered.
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
  attempted: ReadonlySet<string>,
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
 * The order the flow reads handles in: the feature, then the number as a number when both are numbers,
 * then the handle itself. Spelled once, so a batch and a report cannot order the same questions two
 * ways, and total for any string - an issue the report names by its store id (one carrying no handle)
 * still sorts rather than failing the report.
 */
export function compareHandles(a: string, b: string): number {
  const [featureA = "", numberA = ""] = a.split("/");
  const [featureB = "", numberB = ""] = b.split("/");
  if (featureA !== featureB) return featureA < featureB ? -1 : 1;
  if (/^\d+$/.test(numberA) && /^\d+$/.test(numberB)) {
    const difference = Number(numberA) - Number(numberB);
    if (difference !== 0) return difference;
  } else if (numberA !== numberB) {
    return numberA < numberB ? -1 : 1;
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** The name a caller sorts an issue by and reports it under: its handle, or the store's id when it has none. */
export function handleOrId(issue: StoreIssue): string {
  return issue.handle ?? issue.id;
}

/**
 * One candidate's handle. It is what the reading turn is handed and what the note's path derives from, so
 * a frontier question that cannot be named fails the caller that has to read it, rather than being handed
 * to a reader that cannot name its note.
 */
export function candidateHandle(issue: StoreIssue): string {
  return issueNames(issue).handle;
}

/**
 * The reading frontier, ordered by handle: the ready questions minus the rules, and every exclusion with
 * its rule. A blocked or pinned question never reaches here - the store leaves it out of `ready`, and
 * "why is this blocked" is a question for the store (`bd blocked`), not for this module.
 */
export function readingFrontier(
  store: Store,
  target: string,
  attempted: ReadonlySet<string>,
): ReadingFrontier {
  const { candidates, excluded } = composeFrontier(
    readyIssues(store, target),
    inProgressIssues(store, target),
    attempted,
  );
  return { candidates: candidates.sort((a, b) => compareHandles(handleOrId(a), handleOrId(b))), excluded };
}
