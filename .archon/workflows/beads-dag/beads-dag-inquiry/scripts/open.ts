/**
 * The inquiry executor's opening node, and its only always-run node.
 *
 * It is the seam for everything that must happen exactly once, before any question is picked, and it
 * happens in this order: the **shared run lock**, taken before anything else - the same Target-level lock
 * the drain takes, because both executors write Main and two runs on one Target is one run too many, so a
 * drain already running refuses this one and a reading already running refuses a drain; the store
 * preflight that fails the run when the binary cannot be resolved or the Target has no store; the
 * one-line report of the effective configuration on stderr, the run's only record of which values the
 * Target's file wrote and which defaulted; the reading premises - the Target's copy of the reading tools,
 * and an effort area to write the corpus into - refused loudly and before any store write, so a run that
 * cannot read anything claims nothing; the blocked-ness recompute that keeps a change made outside the
 * flow from leaving a stale answer behind in the frontier; the **repair**, from the store, of every
 * question a killed reading run left claimed (leftovers.ts); and the run's own record of the lock it took
 * and of what it repaired.
 *
 * The lock is taken first and released if this node fails before it returns, exactly as the drain does:
 * an open that failed before the loop has no work to lose, and a release that cannot happen leaves a file
 * the next run steals by its dead pid.
 *
 * Nothing here closes a question ticket and nothing merges anything: a reading's closure is a session's
 * act on the operator's word, and this executor's writes are documents, claims and draft answers.
 */
import { basename } from "node:path";
import { configLine } from "../../beads-dag-drain/scripts/config.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { nodeLine, OPENED } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { recordRunLock, releaseRunLock, stoleLine, takeRunLock } from "../../beads-dag-drain/scripts/run-lock.ts";
import { preflightStore, recomputeBlocked } from "../../beads-dag-drain/scripts/store.ts";
import { preflightReading } from "./inquiry.ts";
import { repairReadingLeftovers, writeReadingRepairs } from "./leftovers.ts";

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: async ({ target, artifactsDir, config, configProvenance }) => {
      const lock = takeRunLock(target, artifactsDir);
      try {
        // The steal is the one line a killed run's leftover earns.
        const stole = stoleLine(lock);
        if (stole !== undefined) console.error(stole);

        const store = preflightStore(target, config);
        // stderr, never stdout: a node's stdout is its token channel, and open's whole stdout has to be
        // the `opened` token Archon reads. Printed before the premises are judged, so even a run the
        // Target refuses says what it was configured with.
        console.error(configLine(config, configProvenance, store));
        preflightReading(target);
        recomputeBlocked(store, target);
        writeReadingRepairs(artifactsDir, repairReadingLeftovers(target, store, basename(artifactsDir)));
        // The run's own record of the lock it holds, written only once the refusal paths are past: a run
        // refused at open wrote nothing, and a run that proceeds can explain the refusal it causes.
        recordRunLock(artifactsDir, lock);
        return nodeLine(OPENED);
      } catch (e) {
        releaseRunLock(target, artifactsDir);
        throw e;
      }
    },
  });
}
