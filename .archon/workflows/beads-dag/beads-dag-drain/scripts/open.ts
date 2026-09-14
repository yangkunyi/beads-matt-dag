import { configLine } from "./config.ts";
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
 * the Target has no store; the one-line report of the effective configuration on stderr - the run's
 * only record of which values the Target's file wrote and which defaulted, and the store's source
 * among them; the graph preflight that refuses the run while an implementation issue's blocking
 * ancestry reaches a decision issue, naming the chain (nothing may be claimed or repaired first, because
 * the store has already released such a dependent and the drain must not work it); the blocked-ness
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
    run: async ({ target, artifactsDir, config, configProvenance }) => {
      const store = preflightStore(target, config);
      // The configuration line goes to stderr, the channel the repair lines below use and the runner
      // keeps as `stderr_tail`. It cannot go to stdout: a node's stdout is its token channel, and
      // open's whole stdout has to be the `opened` token Archon reads. It is written before the graph
      // preflight, so even a run the graph refuses says what it was configured with.
      console.error(configLine(config, configProvenance, store));
      assertNoCrossDomainEdges(store, target);
      recomputeBlocked(store, target);
      writeRepairs(artifactsDir, await reconcileLeftovers(target, store, artifactsDir));
      writeReviewBase(target, artifactsDir);
      return nodeLine(OPENED);
    },
  });
}
