import { git } from "./git.ts";
import { nodeLine } from "./node-outcomes.ts";
import { axisHeading, reviewAxes } from "./prompt.ts";
import {
  isReviewError,
  REVIEW_MD_REL,
  reviewErrorDetail,
  reviewErrorLine,
  reviewErrorText,
  reviewWroteFindings,
  skipLine,
} from "./report-artifacts.ts";
import { reportNodeCli, runReportNode, rangeHoldsOnlyPackBookkeeping, type ReportNode, type ReportOpts } from "./report-node.ts";
import { advanceReviewed } from "./review-position.ts";
import { mainBranch } from "./worktree.ts";

/**
 * The first of the drain's two readers. It reports on the range since the recorded position - the base
 * the opening node put in the run's artifacts, which is Main's tip on a Target that had no position
 * yet - rather than on what was planned or on the repository's whole history. Reviewers fetch the
 * range themselves; nothing is pasted.
 *
 * An empty range is a skip, not a report: a run with nothing unviewed spends no reviewer, and its
 * review.md says the range was empty. A range holding nothing but the pack's own bookkeeping is the
 * same kind of no-op, with its own reason: the pack's commits are reviewed whenever they ride with
 * anything the pack did not write, so the skip is only ever taken for a range no review would have
 * anything to look at.
 *
 * Once the artifact is written the node advances the recorded position past the range, but only when
 * the artifact holds findings: a skip and a failed review leave the position where the run opened it,
 * so the next run covers that range again. The summary reads the same base from the run's artifact, so
 * the advance cannot hide the range from the report that follows it.
 */
const REVIEW_NODE: ReportNode = {
  rel: REVIEW_MD_REL,
  errorLine: reviewErrorLine,
  read: async ({ target, base }) => {
    // The probe is the run's own range: this run's base against Main as it stands now. A base git
    // cannot read is a bun-side error rather than three confused reviewers, and an empty range stops
    // before any agent is spent.
    const main = mainBranch(target);
    const probe = await git(target, ["diff", "--stat", `${base}...${main}`]);
    if (!probe.ok) return { stop: reviewErrorLine(`git diff ${probe.out}`) };
    if (!probe.out.trim()) return { stop: skipLine(`empty diff ${base}...${main}, skipped`) };
    // A range the pack wrote itself holds nothing a reviewer would look at: skip it, naming why,
    // exactly as the empty range is skipped. One unrecognised commit makes the whole range reviewable
    // (report-node.ts owns the recognition and its asymmetry argument), and the summary inherits this
    // skip through review.md, the same way it inherits the empty one - so both readers say why.
    if (await rangeHoldsOnlyPackBookkeeping(target, base, main)) {
      return { stop: skipLine(`only the pack's own bookkeeping ${base}...${main}, skipped`) };
    }
    return {
      report: async (range) => {
        // One reviewer per axis, in parallel; each axis' failure is that axis' section, never the
        // other two. The sections join into the one review.md the summary node reads - unless every
        // axis failed, in which case the whole artifact is the protocol's own failure line (below).
        const sections = await Promise.all(
          reviewAxes().map(async (axis) => {
            const heading = axisHeading(axis);
            try {
              const text = await range.ask({
                role: "review",
                args: {
                  axisIndex: axis.index,
                  base: range.base,
                  axis: axis.title,
                  head: range.head,
                  log: range.log,
                },
                // A turn that answered nothing has not reviewed its axis, so its section is that
                // axis' failure: a review made only of such answers is a failed review, and a failed
                // review does not move the recorded position.
                fallback: reviewErrorText("the reviewer produced no answer"),
              });
              return { heading, body: text.trim() };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              return { heading, body: reviewErrorText(msg) };
            }
          }),
        );
        if (sections.length > 0 && sections.every((s) => isReviewError(s.body))) {
          const reasons = [...new Set(sections.map((s) => reviewErrorDetail(s.body)))];
          return reviewErrorText(`all ${sections.length} review axes failed: ${reasons.join("; ")}`);
        }
        return sections.map((s) => `${s.heading}\n\n${s.body}\n`).join("\n");
      },
    };
  },
  after: (range, body) => {
    // The position advances only past a review that actually wrote findings: a skip (an empty range,
    // or nothing but the pack's own bookkeeping), or a failed review read back through
    // reviewSkipReason, leaves it where the run opened - so the next run reports the same range again.
    if (reviewWroteFindings(body)) advanceReviewed(range.target, range.head);
  },
};

/**
 * The node's whole behaviour, minus the protocol: one report over the run's range, and the token its
 * outcome prints. The CLI below is the Script-node entry.
 */
export async function reviewDrain(target: string, opts: ReportOpts): Promise<string> {
  return nodeLine(await runReportNode(REVIEW_NODE, target, opts));
}

const runReviewCli = reportNodeCli(reviewDrain);

if (import.meta.main) {
  await runReviewCli();
}
