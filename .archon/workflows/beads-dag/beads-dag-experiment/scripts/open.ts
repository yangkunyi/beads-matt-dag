/**
 * The experiment executor's opening node, and its only always-run node.
 *
 * The lock-and-release shell (open-lock.ts) takes the Target run lock, prints the configuration
 * line, and releases the lock if this work fails. What this executor passes in is its own leftover
 * repair and premises, in this order: the two premises of the experiment half — the Target carries
 * `tools/experiments/`, and the machine carries the run tool (`run-tool.ts`) — refused here so a
 * machine that cannot run an experiment says so before anything is claimed; the blocked-ness
 * recompute, so a change made outside the flow cannot leave a stale ready answer behind; and the
 * repair of what a killed run left claimed (`reconcile.ts`), from the store, which puts an
 * experiment ticket back on the frontier so this same run is the one that works it.
 *
 * Nothing is claimed and nothing is repaired before the refusals, so a run that cannot start writes
 * nothing. A run killed later leaves the lock file behind, and the next open steals a dead holder's
 * lock.
 */
import { runNode } from "../../scripts/node-entry.ts";
import { openRun } from "../../scripts/open-lock.ts";
import { recomputeBlocked } from "../../scripts/store.ts";
import { reconcileExperiments } from "./reconcile.ts";
import { requireExperimentTools, resolveRunTool } from "../../beads-dag-experiment-run/scripts/run-tool.ts";

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config, configProvenance }) =>
      openRun({ target, artifactsDir, config, configProvenance }, (store) => {
        requireExperimentTools(target);
        resolveRunTool();
        // After the premises, before the repair: a change made outside the flow cannot leave a stale
        // ready answer behind, and a leftover is repaired against the answer this run will pick from.
        recomputeBlocked(store, target);
        reconcileExperiments(target, store);
      }),
  });
}
