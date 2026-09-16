/**
 * The inquiry executor's opening node, and its only always-run node.
 *
 * The lock-and-release shell (open-lock.ts) takes the shared Target run lock, prints the
 * configuration line, and releases the lock if this work fails. What this executor passes in is its
 * own leftover repair and premises, in this order: the reading premises - the Target's copy of the
 * reading tools, and an effort area to write the corpus into - refused loudly and before any store
 * write, so a run that cannot read anything claims nothing; the blocked-ness recompute that keeps a
 * change made outside the flow from leaving a stale answer behind in the frontier; and the repair,
 * from the store, of every question a killed reading run left claimed (leftovers.ts).
 *
 * Nothing here closes a question ticket and nothing merges anything: a reading's closure is a
 * session's act on the operator's word, and this executor's writes are documents, claims and draft
 * answers.
 */
import { basename } from "node:path";
import { runNode } from "../../scripts/node-entry.ts";
import { openRun } from "../../scripts/open-lock.ts";
import { recomputeBlocked } from "../../scripts/store.ts";
import { preflightReading } from "./inquiry.ts";
import { repairReadingLeftovers, writeReadingRepairs } from "./leftovers.ts";

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: async ({ target, artifactsDir, config, configProvenance }) =>
      openRun({ target, artifactsDir, config, configProvenance }, (store) => {
        preflightReading(target);
        recomputeBlocked(store, target);
        writeReadingRepairs(artifactsDir, repairReadingLeftovers(target, store, basename(artifactsDir)));
      }),
  });
}
