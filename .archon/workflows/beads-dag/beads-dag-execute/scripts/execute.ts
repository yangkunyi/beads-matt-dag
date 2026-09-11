import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { FAILED, nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";

/**
 * One issue, start to finish: the implementer at work in a worktree off Main, Main brought into that
 * worktree, the merge into Main under the write lock, and — if that merge conflicts — the conflict agent
 * in this same execution, then the merge again. Only after the merge landed does the outcome go into the
 * store, so a closed issue always has its merge commit behind it.
 *
 * This slice does not do the work yet, so it reports the honest outcome for an issue whose work is not in
 * Main: failed, with the reason on stderr where every other reason goes. The drain goes on.
 */
if (import.meta.main) {
  await runNode({
    issue: true,
    run: ({ issueHandle }) => {
      console.error(`${issueHandle}: not implemented`);
      return nodeLine(FAILED);
    },
  });
}
