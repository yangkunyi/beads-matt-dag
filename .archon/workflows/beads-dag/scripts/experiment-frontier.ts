/**
 * The experiment frontier, composed without claiming.
 *
 * Experiment pick applies these rules and does not claim (claim is assignment in the run node).
 * Attention uses the same rules with an empty attempted set.
 */
import { EXPERIMENT_LABEL, EXPERIMENT_TYPE } from "../beads-dag-experiment-run/scripts/ticket.ts";
import type { StoreIssue } from "./store.ts";

export type ExperimentExclusionRule =
  | "not-experiment-type"
  | "missing-experiment-label"
  | "attempted-by-this-run"
  | "outside-allow-list";

export type ExperimentExcludedIssue = { id: string; handle: string | undefined; rule: ExperimentExclusionRule };

export function experimentExclusionRule(
  issue: StoreIssue,
  attempted: ReadonlySet<string>,
): ExperimentExclusionRule | undefined {
  if (issue.type !== EXPERIMENT_TYPE) return "not-experiment-type";
  if (!issue.labels.includes(EXPERIMENT_LABEL)) return "missing-experiment-label";
  if (attempted.has(issue.id)) return "attempted-by-this-run";
  return undefined;
}

export function composeExperimentFrontier(
  issues: StoreIssue[],
  attempted: ReadonlySet<string>,
): { candidates: StoreIssue[]; excluded: ExperimentExcludedIssue[] } {
  const candidates: StoreIssue[] = [];
  const excluded: ExperimentExcludedIssue[] = [];
  for (const issue of issues) {
    const rule = experimentExclusionRule(issue, attempted);
    if (rule === undefined) candidates.push(issue);
    else excluded.push({ id: issue.id, handle: issue.handle, rule });
  }
  return { candidates, excluded };
}

/** An in-progress issue experiment repair would own, not leave alone. */
export function isExperimentLeftover(issue: StoreIssue): boolean {
  return issue.type === EXPERIMENT_TYPE;
}

/** In-progress experiment claims. */
export function experimentLeftovers(issues: readonly StoreIssue[]): StoreIssue[] {
  return issues.filter(isExperimentLeftover);
}
