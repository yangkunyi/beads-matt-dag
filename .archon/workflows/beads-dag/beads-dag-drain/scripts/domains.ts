/**
 * The domain boundary: closure never crosses domains (ADR-0004).
 *
 * A decision issue's `closed` means "the question is answered"; an implementation issue's `closed`
 * means "the work is in Main". Closing an issue releases whatever waits on it, so an edge from an
 * implementation issue to a decision issue would let the answer to a question release implementation
 * work that was never built — which is exactly what ADR-0004 forbids. The store cannot police this:
 * `bd ready` treats a closed blocker as done whoever closed it and whatever its type. This module does,
 * in the graph preflight every node that can claim runs: `open`, before anything is claimed or repaired,
 * and `pick`, at each cycle's own claim. The second is not a second opinion but the same check on a fresh
 * read, and it exists because the run it guards outlives a reading: a question answered while the drain is
 * under way — a store write like any other, made by whoever owns the decision issues — releases the
 * implementation issue waiting on it into the very next cycle, and open read the graph before the edge
 * existed.
 *
 * The rest of the boundary lives where the boundary is crossed:
 *
 *   - `pick` excludes decision-type issues from the frontier (by type, so a new flavour of question
 *     cannot leak in by omission), so no path claims one;
 *   - `reconcile` leaves every decision issue's status alone, because nothing in this flow ever claims
 *     one and its status belongs to whoever did.
 *
 * "decision" is spelled once here, so the frontier's exclusion, the repair and the preflight cannot drift
 * apart.
 */
import { allIssues, type Store, type StoreIssue } from "./store.ts";

/** The other domain. Excluded by type, so a new flavour of question cannot leak in by omission. */
export const DECISION_TYPE = "decision";

/** The store's own edge type that means "blocked by": an open target holds the dependent back. */
const BLOCKS = "blocks";

/** How one issue is named in a failure: the handle a human reads, with the id the store answers to. */
function describe(issue: StoreIssue): string {
  return issue.handle !== undefined ? `${issue.handle} [${issue.id}]` : issue.id;
}

/**
 * Refuse the run while any implementation issue is blocked by a decision issue.
 *
 * Every issue is read, closed ones included: a decision issue the wayfinder has already closed is the
 * dangerous case, because the store has released its dependents and a drain would claim work whose
 * blocker's closure means only that a question was answered. Naming the edge is the point — the
 * operator's fix is to remove it (`bd dep remove <dependent> <blocker>`) or restructure the dependency,
 * and removing edges is an operator's act, never the drain's.
 *
 * Only `blocks` edges are refused, because that is the store's blocking type: a `relates-to` link
 * carries no blocking, and implementation-to-implementation blocking is the graph working as designed.
 * The dependent's own status does not narrow the check: an edge is the graph's shape, and a closed issue
 * can be reopened into a drain that would then work it.
 *
 * Throws before anything is claimed: in `open`, ahead of the recompute, the repair and every other write,
 * so a refused run is a no-op; in `pick`, ahead of that cycle's claim, so a run that has already merged
 * work still refuses the work an edge crossing the domains would release.
 */
export function assertNoCrossDomainEdges(store: Store, target: string): void {
  // The read is this function's own, and the whole store: the same population `open` reads, closed ones
  // included. A caller cannot narrow it to what it holds — a ready set has no closed blocker in it, and
  // that blocker is exactly the one whose closure released the dependent.
  const issues = allIssues(store, target);
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const edges: string[] = [];
  for (const issue of issues) {
    if (issue.type === DECISION_TYPE) continue;
    for (const dependency of issue.dependencies) {
      if (dependency.type !== BLOCKS) continue;
      const blocker = byId.get(dependency.id);
      if (blocker?.type === DECISION_TYPE) {
        edges.push(`${describe(issue)} is blocked by the decision issue ${describe(blocker)}`);
      }
    }
  }
  if (edges.length === 0) return;
  throw new Error(
    `closure would cross domains: ${edges.join("; ")}; an implementation issue may only be blocked by ` +
      "another implementation issue (ADR-0004), because a decision's closure means its question is " +
      "answered, not that work is in Main. Remove the edge with the store's dependency command " +
      "(`dep remove <dependent> <blocker>`) or restructure the dependency; the drain claims nothing " +
      "while the edge stands.",
  );
}
