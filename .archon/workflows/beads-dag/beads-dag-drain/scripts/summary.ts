import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { nodeLine } from "./node-outcomes.ts";
import { REVIEW_MD_REL, reviewSkipReason, skipLine, SUMMARY_MD_REL } from "./report-artifacts.ts";
import { reportNodeCli, runReportNode, type ReportNode, type ReportOpts } from "./report-node.ts";

/**
 * The second of the drain's two readers: one report over what the first one found, for the human who
 * reads the run afterwards. It merges the review of the range this run merged - the same range, read
 * through the same base - so a run that merged nothing produces no summary either.
 *
 * It runs only when there is something to merge: a skipped or errored review is not worth a session,
 * and the artifact says which case it was.
 */
const SUMMARY_NODE: ReportNode = {
  rel: SUMMARY_MD_REL,
  errorLine: (detail) => `summary error: ${detail}`,
  read: ({ artifactsDir }) => {
    const reviewFile = join(artifactsDir, REVIEW_MD_REL);
    if (!existsSync(reviewFile)) return { stop: skipLine("no review.md") };
    const reviewMd = readFileSync(reviewFile, "utf8");
    if (!reviewMd.trim()) return { stop: skipLine("empty review.md") };
    const skipped = reviewSkipReason(reviewMd);
    if (skipped) return { stop: skipLine(`review.md: ${skipped}`) };
    return {
      report: (range) =>
        range.ask({
          role: "summary",
          args: { base: range.base, head: range.head, log: range.log, reviewMd },
          fallback: "(no summary text)",
        }),
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
