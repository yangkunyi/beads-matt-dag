import { assertNoCrossDomainEdges } from "./domains.ts";
import { runNode } from "./node-entry.ts";
import { nodeLine, OPENED } from "./node-outcomes.ts";
import { reconcileLeftovers } from "./reconcile.ts";
import { writeReviewBase } from "./report-artifacts.ts";
import { writeRepairs } from "./run-record.ts";
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
 * left claimed - read from git, before pick, so a repaired issue is a candidate of this same run;
 * the run's own record of what that repair did (a repair's close leaves no trace the drain-end report
 * could read otherwise); and the base of the range the drain-end readers report on.
 *
 * The base is the Target's recorded position (review-position.ts), recorded here on a Target that has
 * none: the run does not move Main before this point - the repair either closes an issue whose merge
 * already landed or reopens one that never merged - so the position is the commit the run opened on,
 * and it is taken before any merge the run can make. The position is read here and nowhere else: the
 * range both drain-end readers use lives in the run's review-base artifact, so the review's advance
 * cannot empty the summary's range.
 */
if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: async ({ target, artifactsDir, config }) => {
      const store = preflightStore(target, config);
      assertNoCrossDomainEdges(store, target);
      recomputeBlocked(store, target);
      writeRepairs(artifactsDir, await reconcileLeftovers(target, store, artifactsDir));
      writeReviewBase(target, artifactsDir);
      return nodeLine(OPENED);
    },
  });
}
