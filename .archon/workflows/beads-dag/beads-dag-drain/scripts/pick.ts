import { runNode } from "./node-entry.ts";
import { nodeLine } from "./node-outcomes.ts";

/**
 * The frontier: what this drain may start, in one token — a JSON array of issue handles, so the same
 * token is both the loop's end condition (`[]`) and the fan-out's item list.
 *
 * The frontier is composed here rather than asked of the store, because the store's own answer is
 * partial: it cannot exclude decision issues by type, it cannot leave out an issue without the gate
 * label, it cannot know what this run already tried, and it cannot report a failed issue as ready at
 * all. Every exclusion the store cannot explain is reported in this node's own artifact, so "nothing
 * happened" is explainable afterwards.
 *
 * This slice prints the empty frontier: nothing can be eligible before the store is read.
 */
if (import.meta.main) {
  await runNode({ run: () => nodeLine(JSON.stringify([])) });
}
