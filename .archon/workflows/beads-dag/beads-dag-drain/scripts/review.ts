import { git } from "./git.ts";
import { nodeLine } from "./node-outcomes.ts";
import { axisHeading, reviewAxes } from "./prompt.ts";
import { REVIEW_MD_REL, reviewErrorLine, reviewErrorText, skipLine } from "./report-artifacts.ts";
import { reportNodeCli, runReportNode, type ReportNode, type ReportOpts } from "./report-node.ts";
import { mainBranch } from "./worktree.ts";

/**
 * The first of the drain's two readers. It reports on the range this run actually merged - the opening
 * node records that range's base, and the range is `base..Main` - rather than on what was planned or on
 * the repository's whole history. Reviewers fetch the range themselves; nothing is pasted.
 *
 * An empty range is a skip, not a report: a run that merged nothing spends no reviewer, and its
 * review.md says the range was empty.
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
    return {
      report: async (range) => {
        // One reviewer per axis, in parallel; each axis' failure is that axis' section, never the
        // other two. The sections join into the one review.md the summary node reads.
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
                fallback: "(no review text)",
              });
              return { heading, body: text.trim() };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              return { heading, body: reviewErrorText(msg) };
            }
          }),
        );
        return sections.map((s) => `${s.heading}\n\n${s.body}\n`).join("\n");
      },
    };
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
