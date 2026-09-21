/**
 * The development frontier, composed without claiming.
 *
 * Pick applies these rules and then claims. Attention (and any other dry reader) applies the same
 * rules with an empty attempted set and must not write. One module so the two askers cannot describe
 * two frontiers.
 */
import { NON_WORK_TYPES } from "./domains.ts";
import type { StoreIssue } from "./store.ts";

/** The only way into the development frontier: an issue without this label is not a drain's work. */
export const GATE_LABEL = "ready-for-agent";

/**
 * Why an issue that the store offered was left out. These are the rules the pack applies, and the only
 * ones it can explain: anything the store itself excluded (blocked, in progress, closed) never reaches
 * this step and is answered by asking the store.
 */
export type DevelopmentExclusionRule =
  | "non-work-type"
  | "missing-gate-label"
  | "attempted-by-this-run"
  | "outside-allow-list";

export type DevelopmentExcludedIssue = { id: string; handle: string | undefined; rule: DevelopmentExclusionRule };

/**
 * The rule that keeps an issue out of the frontier, or undefined when nothing does. The order is what
 * decides which rule a multiply-excluded issue is reported under: the domain first (it is never this
 * drain's work at all), then the operator's gate, then this run's own bookkeeping.
 */
export function developmentExclusionRule(
  issue: StoreIssue,
  attempted: ReadonlySet<string>,
): DevelopmentExclusionRule | undefined {
  if (NON_WORK_TYPES.has(issue.type)) return "non-work-type";
  if (!issue.labels.includes(GATE_LABEL)) return "missing-gate-label";
  if (attempted.has(issue.id)) return "attempted-by-this-run";
  return undefined;
}

/** The store's answer with this step's type, gate and attempted rules applied. */
export function composeDevelopmentFrontier(
  issues: StoreIssue[],
  attempted: ReadonlySet<string>,
): { candidates: StoreIssue[]; excluded: DevelopmentExcludedIssue[] } {
  const candidates: StoreIssue[] = [];
  const excluded: DevelopmentExcludedIssue[] = [];
  for (const issue of issues) {
    const rule = developmentExclusionRule(issue, attempted);
    if (rule === undefined) candidates.push(issue);
    else excluded.push({ id: issue.id, handle: issue.handle, rule });
  }
  return { candidates, excluded };
}

/** An in-progress issue drain repair would own, not leave alone. */
export function isDevelopmentLeftover(issue: StoreIssue): boolean {
  return !NON_WORK_TYPES.has(issue.type);
}

/** In-progress implementation claims. */
export function developmentLeftovers(issues: readonly StoreIssue[]): StoreIssue[] {
  return issues.filter(isDevelopmentLeftover);
}
