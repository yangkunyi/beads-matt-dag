/**
 * The domain boundary: closure never crosses domains (ADR-0004).
 *
 * A decision issue's `closed` means "the question is answered"; an implementation issue's `closed`
 * means "the work is in Main". Closing an issue releases whatever waits on it, so an implementation
 * issue whose blocking ancestry reaches a decision issue would let the answer to a question release
 * implementation work that was never built — which is exactly what ADR-0004 forbids. The store cannot
 * police this: `bd ready` treats a closed blocker as done whoever closed it and whatever its type, and
 * the release travels down `parent-child` too — a child inherits its parent's blocked-ness, so closing
 * the parent's own blocker releases the whole subtree with no `blocks` edge of the child's for a
 * `blocks`-only walk to see (§7.2). This module does, in the graph preflight every node that can claim
 * runs: `open`, before anything is claimed or repaired, and `pick`, at each cycle's own claim. The
 * second is not a second opinion but the same check on a fresh read, and it exists because the run it
 * guards outlives a reading: a question answered while the drain is under way — a store write like any
 * other, made by whoever owns the decision issues — releases the implementation issue waiting on it
 * into the very next cycle, and open read the graph before the edge existed.
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

/** The hierarchy edge's name, spelled once: the walk and the chain's rendering both use it. */
const PARENT_CHILD = "parent-child";

/** The store's edge types that carry blocking: a not-closed target holds the dependent back, and the
 * walk follows them to find blocking ancestry. `blocks` is the plain dependency; `parent-child` is the
 * hierarchy, and the store propagates blocked-ness down it, so a child waits on what its parent waits
 * on. Every other type in the store's edge vocabulary — `relates-to`, `related`, `tracks`,
 * `discovered-from`, ... — carries no blocking and is not walked. */
const BLOCKING_EDGE_TYPES = new Set(["blocks", PARENT_CHILD]);

/** How one issue is named in a failure: the handle a human reads, with the id the store answers to. */
function describe(issue: StoreIssue): string {
  return issue.handle !== undefined ? `${issue.handle} [${issue.id}]` : issue.id;
}

/** One hop of a blocking chain: the store's edge type that was walked, and the issue it reaches. */
type BlockingHop = { edge: string; issue: StoreIssue };

/** A refused implementation issue and the chain from it to a decision ancestor, hop by hop. */
type CrossDomainChain = { start: StoreIssue; hops: BlockingHop[] };

/**
 * The blocking hops out of one issue: its `blocks` and `parent-child` edges, plus the `parent` field
 * the store answers beside them.
 *
 * bd 1.2.2 derives `parent` from a `parent-child` edge when it answers (`bd export` shows no `parent`
 * key, only the edge), so for a store bd writes, either one alone answers. Both are read anyway: the
 * edge array is the graph the store holds, and the field is the same relation in the shape this module
 * parses, so a store where one outlived the other cannot hide an ancestry. A pair carrying both is
 * visited once, because the walk marks what it reaches.
 */
function blockingHops(issue: StoreIssue): { id: string; edge: string }[] {
  const hops = issue.dependencies
    .filter((dependency) => BLOCKING_EDGE_TYPES.has(dependency.type))
    .map((dependency) => ({ id: dependency.id, edge: dependency.type }));
  if (issue.parent !== undefined) hops.push({ id: issue.parent, edge: PARENT_CHILD });
  return hops;
}

/**
 * Every chain from `start` to a decision issue through blocking ancestry, breadth first, so each one is
 * the shortest path to the decision it names. A decision ends its chain: what waits on a decision is
 * beyond the boundary this check guards. Nothing outside the store is read, an edge whose target the
 * store no longer holds is skipped, and the visited set makes the walk finite even if the graph it
 * reads has a cycle the store's own checks would refuse.
 */
function crossDomainChains(start: StoreIssue, byId: Map<string, StoreIssue>): CrossDomainChain[] {
  const chains: CrossDomainChain[] = [];
  const seen = new Set<string>([start.id]);
  const decisions = new Set<string>();
  const queue: BlockingHop[][] = [[]];
  while (queue.length > 0) {
    const path = queue.shift()!;
    const issue = path.at(-1)?.issue ?? start;
    for (const hop of blockingHops(issue)) {
      const ancestor = byId.get(hop.id);
      if (ancestor === undefined || seen.has(ancestor.id)) continue;
      seen.add(ancestor.id);
      const next = [...path, { edge: hop.edge, issue: ancestor }];
      if (ancestor.type === DECISION_TYPE) {
        if (!decisions.has(ancestor.id)) {
          decisions.add(ancestor.id);
          chains.push({ start, hops: next });
        }
        continue;
      }
      queue.push(next);
    }
  }
  return chains;
}

/**
 * One chain as the refusal says it: the refused issue, then each blocking ancestor with the edge that
 * reaches it, ending at the decision issue. Naming the whole chain is the point — with a two-deep
 * chain the operator has to see which hop crosses the boundary, because that is the edge to remove.
 */
function renderChain(chain: CrossDomainChain): string {
  let text = describe(chain.start);
  chain.hops.forEach((hop, index) => {
    const decision = index === chain.hops.length - 1;
    const target = decision ? `the decision issue ${describe(hop.issue)}` : describe(hop.issue);
    const relation = hop.edge === PARENT_CHILD ? "is parented under" : "is blocked by";
    text += index === 0 ? ` ${relation} ${target} (${hop.edge})` : `, which ${relation} ${target} (${hop.edge})`;
  });
  return text;
}

/**
 * Refuse the run while any implementation issue's blocking ancestry reaches a decision issue.
 *
 * Every issue is read, closed ones included: a decision issue the wayfinder has already closed is the
 * dangerous case, because the store has released its dependents and a drain would claim work whose
 * blocker's closure means only that a question was answered. The same holds for the subtree a
 * `parent-child` edge hangs under such a decision. Naming the chain is the point — the operator's fix
 * is to remove the edge that crosses the domain (`bd dep remove <dependent> <blocker>`, which removes
 * either relation) or restructure the dependency, and removing edges is an operator's act, never the
 * drain's.
 *
 * The walk follows `blocks` and `parent-child` edges and the `parent` field, at any depth, and nothing
 * else: a `relates-to` link carries no blocking, and implementation-to-implementation ancestry is the
 * graph working as designed, however deep. The dependent's own status does not narrow the check: an
 * ancestry is the graph's shape, and a closed issue can be reopened into a drain that would then work it.
 *
 * Throws before anything is claimed: in `open`, ahead of the recompute, the repair and every other write,
 * so a refused run is a no-op; in `pick`, ahead of that cycle's claim, so a run that has already merged
 * work still refuses the work an ancestry crossing the domains would release.
 */
export function assertNoCrossDomainEdges(store: Store, target: string): void {
  // The read is this function's own, and the whole store: the same population `open` reads, closed ones
  // included. A caller cannot narrow it to what it holds — a ready set has no closed blocker in it, and
  // that blocker is exactly the one whose closure released the dependent.
  const issues = allIssues(store, target);
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const chains: string[] = [];
  for (const issue of issues) {
    if (issue.type === DECISION_TYPE) continue;
    for (const chain of crossDomainChains(issue, byId)) chains.push(renderChain(chain));
  }
  if (chains.length === 0) return;
  throw new Error(
    `closure would cross domains: ${chains.join("; ")}; an implementation issue may only be blocked by ` +
      "another implementation issue (ADR-0004), because a decision's closure means its question is answered, " +
      "not that work is in Main. Remove the edge that crosses the domains with the store's dependency " +
      "command (`dep remove <dependent> <blocker>`) or restructure the dependency; the drain claims nothing " +
      "while the edge stands.",
  );
}
