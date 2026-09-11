import { assertNoCrossDomainEdges } from "./domains.ts";
import { runNode } from "./node-entry.ts";
import { nodeLine, OPENED } from "./node-outcomes.ts";
import { reconcileLeftovers } from "./reconcile.ts";
import { writeReviewBase } from "./report-artifacts.ts";
import { preflightStore, recomputeBlocked } from "./store.ts";

/**
 * The drain's opening node, and its only always-run node.
 *
 * It is the seam for everything that must happen exactly once, before any issue is started, and it
 * happens in this order: the preflight that fails the run when the store binary cannot be resolved or
 * the Target has no store; the graph preflight that refuses the run while an implementation issue is
 * blocked by a decision issue, naming the edge (nothing may be claimed or repaired first, because the
 * store has already released such a dependent and the drain must not work it); the blocked-ness
 * recompute that replaces the predecessor's rebuild-every-cycle scan; the repair of what a killed run
 * left claimed - read from git, before pick, so a repaired issue is a candidate of this same run; and
 * the base of the range the drain-end readers report on.
 *
 * The base is recorded after the repair on purpose, and the order is not load-bearing: the repair does
 * not move Main (it closes an issue whose merge already landed, or reopens one that never merged), so a
 * base taken before the repair and one taken after it are the same commit. What matters is that this
 * node is always-run and runs before the loop, so the base is one commit per run, taken before any
 * merge the run can make.
 */
if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: async ({ target, artifactsDir, config }) => {
      const store = preflightStore(target, config);
      assertNoCrossDomainEdges(store, target);
      recomputeBlocked(store, target);
      await reconcileLeftovers(target, store);
      writeReviewBase(target, artifactsDir);
      return nodeLine(OPENED);
    },
  });
}
