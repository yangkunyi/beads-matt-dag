/**
 * The reading frontier, claimed: one JSON array of question handles, so the same token is both the loop's
 * end condition (`[]`) and the fan-out's item list.
 *
 * The rules, the order and the exclusions live in `frontier.ts`, because the run's report asks the same
 * question at the end of the run and may not answer it differently. This node adds the two things that
 * are about a *cycle* rather than about the frontier: which questions this run has already claimed
 * (`attempted-ids.json`), and the claim itself.
 *
 * **Order is by handle** - feature, then the number, then the slug - so a batch of questions opened in an
 * order is read in that order, and the order is the one already visible in the branch and body names.
 * **The cap is `concurrency`**, and the claim is one `bd batch` transaction: all-or-nothing, so a claim
 * that fails part-way leaves nothing claimed.
 *
 * The claim is the status alone (`in_progress`), with no assignee: it is what takes a question out of
 * every session's frontier and out of every later cycle of this run.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyAllowList } from "../../scripts/allow-list.ts";
import { addAttempted, readAttempted } from "../../scripts/attempted.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { nodeLine } from "../../scripts/node-outcomes.ts";
import { claimIssues, preflightStore } from "../../scripts/store.ts";
import { candidateHandle, readingFrontier, type ExcludedIssue } from "./frontier.ts";

/** What the run keeps of this cycle's frontier: what was claimed, and why each other candidate was not. */
type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: ExcludedIssue[];
};

/** The artifact pick rewrites each cycle, relative to ARTIFACTS_DIR. */
const EXCLUSION_REPORT_FILE = "pick-exclusions.json";

function writeExclusionReport(artifactsDir: string, report: ExclusionReport): void {
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, EXCLUSION_REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config, allowList }) => {
      const store = preflightStore(target, config);
      const frontier = readingFrontier(store, target, readAttempted(artifactsDir));
      const { kept, dropped } = applyAllowList(frontier.candidates, allowList);
      // Every candidate is named before the batch is cut, not only the ones that fit: a frontier question
      // that cannot be named cannot be read at all (the note's path derives from its name), so it fails
      // this node rather than being claimed and left for a reader that cannot find its note.
      const named = kept.map((issue) => ({ id: issue.id, handle: candidateHandle(issue) }));
      const picked = named.slice(0, config.concurrency);
      const ids = picked.map((issue) => issue.id);

      claimIssues(store, target, ids);
      addAttempted(artifactsDir, ids);
      writeExclusionReport(artifactsDir, { picked, excluded: [...frontier.excluded, ...dropped] });
      return nodeLine(JSON.stringify(picked.map((issue) => issue.handle)));
    },
  });
}
