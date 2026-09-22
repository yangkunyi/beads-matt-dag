import { assertNoCrossDomainEdges } from "../../scripts/domains.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { openRun } from "../../scripts/open-lock.ts";
import { reconcileLeftovers } from "./reconcile.ts";
import { writeReviewBase } from "./report-artifacts.ts";
import { writeRepairs } from "./run-record.ts";
import { recomputeBlocked } from "../../scripts/store.ts";

/**
 * The drain's opening node, and its only always-run node.
 *
 * The lock-and-release shell (open-lock.ts) takes the Target run lock, prints the configuration
 * line, and releases the lock if this work fails. What this executor passes in is its own leftover
 * repair and premises, in this order: the graph preflight that refuses the run while an
 * implementation issue's blocking ancestry reaches a decision issue, naming the chain (nothing may
 * be claimed or repaired first, because the store has already released such a dependent and the
 * drain must not work it); the blocked-ness recompute that replaces the predecessor's
 * rebuild-every-cycle scan; the repair of what a killed run left claimed - read from git, before
 * pick, so a repaired issue is a candidate of this same run; the run's own record of what that
 * repair did (a repair's close leaves no trace the drain-end report could read otherwise); and the
 * base of the range the drain-end readers report on.
 *
 * The base is the Target's recorded position (review-position.ts), recorded here on a Target that
 * has none: the run does not move Main before this point - the repair either closes an issue whose
 * merge already landed or reopens one that never merged - so the position is the commit the run
 * opened on, and it is taken before any merge the run can make. The position is read here and
 * nowhere else: the range both drain-end readers use lives in the run's review-base artifact, so
 * the review's advance cannot empty the summary's range.
 */
if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: async ({ target, artifactsDir, config, configProvenance }) =>
      openRun({ target, artifactsDir, config, configProvenance, kind: "drain" }, async (store) => {
        assertNoCrossDomainEdges(store, target);
        recomputeBlocked(store, target);
        writeRepairs(artifactsDir, await reconcileLeftovers(target, store, artifactsDir));
        writeReviewBase(target, artifactsDir);
      }),
  });
}
