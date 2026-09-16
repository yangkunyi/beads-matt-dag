import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readAttempted } from "../../scripts/attempted.ts";
import { failedIssues, failuresBlock } from "../../scripts/failures.ts";
import { nodeLine } from "../../scripts/node-outcomes.ts";
import { REVIEW_MD_REL, reviewSkipReason, skipLine, SUMMARY_MD_REL } from "./report-artifacts.ts";
import { reportNodeCli, runReportNode, type ReportNode, type ReportOpts } from "./report-node.ts";
import { readMainCommits, readRepairs, rangeSection } from "./run-record.ts";
import { releaseRunLock } from "../../scripts/run-lock.ts";
import { preflightStore } from "../../scripts/store.ts";

/**
 * The second of the drain's two readers: one report over what the first one found, for the human who
 * reads the run afterwards. It merges the review of the range since the recorded position - the same
 * base the review read, taken from the run's review-base artifact and never from the position ref,
 * which the review may already have advanced - so no other run's work is in it and the review cannot
 * hide its own range from it.
 *
 * It spends a session only when there is something to merge: a skipped or errored review is not worth
 * one, and the artifact says which case it was.
 *
 * Two blocks are the node's own, and both sit below whatever the summary turned out to be (failures.ts
 * and run-record.ts): the run's failures, read from the store, and the range it covered with the
 * commits in it this run did not make and the repairs its opening step performed, read from the run's
 * own record. They are a reading, not something a model produces, so a turn that dies takes its prose
 * with it but not the numbers or the range.
 *
 * Being the run's last node, this is also where the run lock (run-lock.ts) is given back by a run that
 * ends normally; a run that never reaches here leaves the file behind, and the next drain steals it by
 * its dead holder pid.
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
    // The run's own record of what it did, read once: the range section below is built from it.
    const made = readMainCommits(artifactsDir);
    const repairs = readRepairs(artifactsDir);
    const section = (range: { base: string; head: string }) =>
      rangeSection({ target, base: range.base, head: range.head, made, repairs });
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
        // for the prose, and the blocks are still appended - they are the node's, so a broken model
        // cannot take them out of the report.
        const text = await range
          .ask({
            role: "summary",
            args: { base: range.base, head: range.head, log: range.log, reviewMd },
            fallback: "(no summary text)",
          })
          .catch((e) => summaryErrorLine(e instanceof Error ? e.message : String(e)));
        return `${text.trimEnd()}\n\n${section(range)}\n\n${block}`;
      },
    };
  },
};

/**
 * The node's whole behaviour, minus the protocol: the run's report, and the token its outcome prints.
 *
 * Summary is the run's last node, so this is where a run that ends normally gives its run lock back
 * (run-lock.ts). It is released after the report, deliberately: whatever the report says, the run is
 * over when this returns, and a release that cannot happen leaves a file whose holder pid the next
 * drain finds dead and steals. No node after this one exists, and none before it may end the run, so
 * the release has exactly one home.
 */
export async function summarizeDrain(target: string, opts: ReportOpts): Promise<string> {
  const outcome = await runReportNode(SUMMARY_NODE, target, opts);
  releaseRunLock(target, opts.artifactsDir);
  return nodeLine(outcome);
}

const runSummaryCli = reportNodeCli(summarizeDrain);

if (import.meta.main) {
  await runSummaryCli();
}
