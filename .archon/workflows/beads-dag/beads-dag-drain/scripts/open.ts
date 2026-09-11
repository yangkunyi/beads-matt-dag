import { runNode } from "./node-entry.ts";
import { nodeLine, OPENED } from "./node-outcomes.ts";
import { preflightStore, recomputeBlocked } from "./store.ts";

/**
 * The drain's opening node, and its only always-run node.
 *
 * It is the seam for everything that must happen exactly once, before any issue is started: the
 * preflight that fails the run when the store binary cannot be resolved or the Target has no store, the
 * blocked-ness recompute that replaces the predecessor's rebuild-every-cycle scan, the reconciliation of
 * work a killed run left behind, and the base of the range the drain-end readers report on. Each arrives
 * with the work that needs it; this slice opens the store and recomputes before anything else runs.
 */
if (import.meta.main) {
  await runNode({
    run: ({ target, config }) => {
      const store = preflightStore(target, config);
      recomputeBlocked(store, target);
      return nodeLine(OPENED);
    },
  });
}
