import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readAttempted } from "./attempted.ts";
import { failedIssues, failuresBlock } from "./failures.ts";
import { nodeLine } from "./node-outcomes.ts";
import { REVIEW_MD_REL, reviewSkipReason, skipLine, SUMMARY_MD_REL } from "./report-artifacts.ts";
import { reportNodeCli, runReportNode, type ReportNode, type ReportOpts } from "./report-node.ts";
import { preflightStore } from "./store.ts";

/**
 * The second of the drain's two readers: one report over what the first one found, for the human who
 * reads the run afterwards. It merges the review of the range this run merged - the same range, read
 * through the same base - so no other run's work is in it.
 *
 * It spends a session only when there is something to merge: a skipped or errored review is not worth
 * one, and the artifact says which case it was.
 *
 * The run's failures are appended below whatever the summary turned out to be, and the node writes them
 * itself (failures.ts): they are a reading of the store, not something a model produces, and a turn that
 * dies takes its prose with it but not the numbers. A run with failures but nothing merged writes them
 * under its review's skip line, because "what burned a worker slot" is exactly what that run has to say;
 * a run with neither keeps the skip line and nothing else.
 */

/** The node's failure line, by the skeleton's convention: `summary error: <detail>`. */
const summaryErrorLine = (detail: string) => `summary error: ${detail}`;

const SUMMARY_NODE: ReportNode = {
  rel: SUMMARY_MD_REL,
  errorLine: summaryErrorLine,
  read: ({ target, artifactsDir, config }) => {
    // The store is read here, at the drain's end: the failures are the run's own record, and the store
    // is the only place they live. A Target whose store cannot be read fails this node loudly rather
    // than writing a report that says nothing failed.
    const store = preflightStore(target, config);
    const rows = failedIssues(target, store, readAttempted(artifactsDir));
    const block = failuresBlock(rows);
    /**
     * A review this node will not summarise. With no failure to report the artifact stays exactly the
     * skip line it always was; with one, the line is kept and the node's own block is written under it,
     * because a failure is a report - no model is spent, and none is asked for a number.
     */
    const skipped = (line: string) =>
      rows.length === 0 ? { stop: line } : { report: async () => `${line}\n${block}` };
    const reviewFile = join(artifactsDir, REVIEW_MD_REL);
    if (!existsSync(reviewFile)) return skipped(skipLine("no review.md"));
    const reviewMd = readFileSync(reviewFile, "utf8");
    if (!reviewMd.trim()) return skipped(skipLine("empty review.md"));
    const reason = reviewSkipReason(reviewMd);
    if (reason) return skipped(skipLine(`review.md: ${reason}`));
    return {
      report: async (range) => {
        // A runner that cannot start throws rather than answering: the node's own error line stands in
        // for the prose, and the block is still appended - the failures are the node's, so a broken
        // model cannot take them out of the report.
        const text = await range
          .ask({
            role: "summary",
            args: { base: range.base, head: range.head, log: range.log, reviewMd },
            fallback: "(no summary text)",
          })
          .catch((e) => summaryErrorLine(e instanceof Error ? e.message : String(e)));
        return `${text.trimEnd()}\n\n${block}`;
      },
    };
  },
};

/** The node's whole behaviour, minus the protocol: the run's report, and the token its outcome prints. */
export async function summarizeDrain(target: string, opts: ReportOpts): Promise<string> {
  return nodeLine(await runReportNode(SUMMARY_NODE, target, opts));
}

const runSummaryCli = reportNodeCli(summarizeDrain);

if (import.meta.main) {
  await runSummaryCli();
}
