import { runNode } from "./node-entry.ts";
import { NOTHING_TO_REPORT, nodeLine } from "./node-outcomes.ts";

/**
 * The second of the drain's two readers: one report over what the first one found, for the human who
 * reads the run afterwards. It runs only when there is something to read.
 *
 * This slice has nothing to merge into a report, and says so.
 */
if (import.meta.main) {
  await runNode({ run: () => nodeLine(NOTHING_TO_REPORT) });
}
