/**
 * The experiment executor's opening node, and its only always-run node.
 *
 * It is the seam for everything that must happen exactly once, before any ticket is worked, in this
 * order: the run lock that refuses a second run on the same Target while another live run holds it
 * (`run-lock.ts`, the drain's own lock — one run at a time per Target, whatever kind of run it is,
 * because a drain and an experiment run both write the Target); the store preflight that fails the run
 * when the binary cannot be resolved or the Target has no store; the one-line report of the effective
 * configuration on stderr; the two premises of the experiment half — the Target carries
 * `tools/experiments/`, and the machine carries the run tool (`run-tool.ts`) — refused here so a machine
 * that cannot run an experiment says so before anything is claimed; and the repair of what a killed run
 * left claimed (`reconcile.ts`), which puts an experiment ticket back on the frontier so this same run is
 * the one that works it.
 *
 * Nothing is claimed and nothing is repaired before the refusals, so a run that cannot start writes
 * nothing. The lock is released when the node fails before those refusals, exactly as the drain's open
 * does; a run killed later leaves the file behind, and the next open steals a dead holder's lock.
 */
import { configLine } from "../../beads-dag-drain/scripts/config.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { nodeLine, OPENED } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { recordRunLock, releaseRunLock, stoleLine, takeRunLock } from "../../beads-dag-drain/scripts/run-lock.ts";
import { preflightStore, recomputeBlocked } from "../../beads-dag-drain/scripts/store.ts";
import { reconcileExperiments } from "./reconcile.ts";
import { requireExperimentTools, resolveRunTool } from "./run-tool.ts";

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config, configProvenance }) => {
      const lock = takeRunLock(target, artifactsDir);
      try {
        // The steal is the one line a killed run's leftover earns.
        const stole = stoleLine(lock);
        if (stole !== undefined) console.error(stole);

        const store = preflightStore(target, config);
        // The configuration line goes to stderr, the channel the repair lines below use and the runner
        // keeps as `stderr_tail`. It cannot go to stdout: a node's stdout is its token channel, and
        // open's whole stdout has to be the `opened` token Archon reads.
        console.error(configLine(config, configProvenance, store));
        requireExperimentTools(target);
        resolveRunTool();
        // After the premises, before the repair: a change made outside the flow cannot leave a stale
        // ready answer behind, and a leftover is repaired against the answer this run will pick from.
        recomputeBlocked(store, target);
        reconcileExperiments(target, store);
        // The run's own record of the lock it holds, written only once the refusal paths above are past:
        // a run refused at open wrote nothing, and a run that proceeds can explain the refusal it causes.
        recordRunLock(artifactsDir, lock);
        return nodeLine(OPENED);
      } catch (e) {
        // An open that failed before the loop has no work to lose: the lock goes back, and a release that
        // cannot happen leaves a file the next run steals by its dead pid.
        releaseRunLock(target, artifactsDir);
        throw e;
      }
    },
  });
}
