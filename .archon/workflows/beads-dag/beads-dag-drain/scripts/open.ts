import { runNode } from "./node-entry.ts";
import { nodeLine, OPENED } from "./node-outcomes.ts";

/**
 * The drain's opening node, and its only always-run node.
 *
 * It is the seam for everything that must happen exactly once, before any issue is started: the
 * preflight that fails the run when the store is not there, the blocked-ness recompute that replaces
 * the predecessor's rebuild-every-cycle scan, the reconciliation of work a killed run left behind, and
 * the base of the range the drain-end readers report on. Each arrives with the work that needs it; this
 * slice is the node itself, speaking the protocol.
 */
if (import.meta.main) {
  await runNode({ run: () => nodeLine(OPENED) });
}
