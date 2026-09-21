/**
 * The grill run's opening node, and its only always-run node.
 *
 * The lock-and-release shell (open-lock.ts) takes the shared Target run lock, prints the
 * configuration line, and releases the lock if this work fails. What this executor passes in is the
 * seed it was handed: a grill run takes one decision issue id, refuses any other type and any seed
 * that is not `open`, and claims nothing. Both rules are the seed read's own — the issue is read and
 * judged there, before the blocked-ness recompute and before any turn is spent — and a refused seed
 * gives the lock back, the way every premise this pack refuses at `open` does. There is no frontier
 * and no leftover repair, because this run does not claim — the round is a comment on an open issue,
 * and the operator answers on that same issue.
 *
 * Drain, inquiry and experiment are unchanged: they keep their own open, their own leftovers, and
 * their own premises.
 */
import { runNode } from "../../scripts/node-entry.ts";
import { openRun } from "../../scripts/open-lock.ts";
import { issueById, recomputeBlocked } from "../../scripts/store.ts";

if (import.meta.main) {
  await runNode({
    artifacts: true,
    seed: true,
    run: async ({ target, artifactsDir, config, configProvenance, seedId }) =>
      openRun({ target, artifactsDir, config, configProvenance, kind: "grill" }, (store) => {
        const issue = issueById(store, target, seedId);
        if (issue.type !== "decision") {
          throw new Error(
            `a grill run takes a decision issue as its seed, not a ${issue.type} (${seedId})`,
          );
        }
        if (issue.status !== "open") {
          throw new Error(
            `seed ${seedId} is ${issue.status}, not open; a grill run writes rounds onto an open issue`,
          );
        }
        recomputeBlocked(store, target);
      }),
  });
}
