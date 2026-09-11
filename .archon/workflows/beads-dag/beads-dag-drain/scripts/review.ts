import { runNode } from "./node-entry.ts";
import { NOTHING_TO_REPORT, nodeLine } from "./node-outcomes.ts";

/**
 * The first of the drain's two readers. It reports on the range this run actually merged — the opening
 * node records that range's base — rather than on what was planned.
 *
 * This slice has no range to read, because nothing merged yet, and says so.
 */
if (import.meta.main) {
  await runNode({ run: () => nodeLine(NOTHING_TO_REPORT) });
}
