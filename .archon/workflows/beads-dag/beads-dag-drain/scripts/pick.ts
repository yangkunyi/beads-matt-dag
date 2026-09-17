import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyAllowList } from "../../scripts/allow-list.ts";
import { addAttempted, readAttempted } from "../../scripts/attempted.ts";
import { assertNoCrossDomainEdges, NON_WORK_TYPES } from "../../scripts/domains.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { nodeLine } from "../../scripts/node-outcomes.ts";
import { claimIssues, preflightStore, readyIssues, type StoreIssue } from "../../scripts/store.ts";

/**
 * The frontier: what this drain may start, in one token — a JSON array of issue handles, so the same
 * token is both the loop's end condition (`[]`) and the fan-out's item list.
 *
 * It is the store's own answer, minus what only this run knows:
 *
 *   ready issues − non-work-type issues − issues without the gate label − issues already attempted
 *     − issues outside a present allow-list → truncated to config.concurrency → claimed in one transaction
 *
 * The store owns readiness — `open`, not blocked — and that is one query, `readyIssues`. It cannot own
 * the exclusions: two are this flow's policy rather than the store's facts, one (what this run already
 * tried) is bookkeeping that lives beside the run by design, and a present allow-list is this run's pool.
 * Because the store cannot explain any of them, every excluded issue and its rule goes into the run's
 * own exclusion report, so "nothing happened" is explainable afterwards.
 *
 * An issue whose attempt failed needs no branch of its own: it is `open` again, so the store offers it
 * like fresh work and the retry channel is the same query. The only thing this run adds is that it does
 * not offer it twice — the attempted set.
 *
 * The one thing pick refuses rather than excludes: the graph preflight `open` ran, run again on a read of
 * its own before the claim. Open's reading is one moment and a cycle happens later — a question answered
 * while the run is under way releases the implementation issue waiting on it, which is work §10.4 says
 * must never be started — so the same check is made where the claim is, and a cycle that sees the edge
 * claims nothing at all.
 */

/** The only way into the frontier: an issue without this label is not this drain's work. */
export const GATE_LABEL = "ready-for-agent";

/**
 * Why an issue that the store offered was left out. These are the rules the pack applies, and the only
 * ones it can explain: anything the store itself excluded (blocked, in progress, closed) never reaches
 * this step and is answered by asking the store.
 */
type ExclusionRule = "non-work-type" | "missing-gate-label" | "attempted-by-this-run" | "outside-allow-list";

type ExcludedIssue = { id: string; handle: string | undefined; rule: ExclusionRule };

/** What the run keeps of this cycle's frontier: what was claimed, and why each other candidate was not. */
type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: ExcludedIssue[];
};

/** The artifact pick rewrites each cycle, relative to ARTIFACTS_DIR. */
const EXCLUSION_REPORT_FILE = "pick-exclusions.json";

/**
 * The rule that keeps an issue out of the frontier, or undefined when nothing does. The order is what
 * decides which rule a multiply-excluded issue is reported under: the domain first (it is never this
 * drain's work at all), then the operator's gate, then this run's own bookkeeping.
 */
function exclusionRule(issue: StoreIssue, attempted: Set<string>): ExclusionRule | undefined {
  if (NON_WORK_TYPES.has(issue.type)) return "non-work-type";
  if (!issue.labels.includes(GATE_LABEL)) return "missing-gate-label";
  if (attempted.has(issue.id)) return "attempted-by-this-run";
  return undefined;
}

/** The store's answer with this step's type, gate and attempted rules applied. */
function composeFrontier(
  issues: StoreIssue[],
  attempted: Set<string>,
): { candidates: StoreIssue[]; excluded: ExcludedIssue[] } {
  const candidates: StoreIssue[] = [];
  const excluded: ExcludedIssue[] = [];
  for (const issue of issues) {
    const rule = exclusionRule(issue, attempted);
    if (rule === undefined) candidates.push(issue);
    else excluded.push({ id: issue.id, handle: issue.handle, rule });
  }
  return { candidates, excluded };
}

/**
 * The handle a claimed issue is handed to its worker under. It comes from the metadata the tracker
 * publishes, and there is no fallback: an issue in the frontier without one cannot be named in git, so
 * claiming it would start work whose branch, worktree and body path do not exist.
 */
function handleOf(issue: StoreIssue): string {
  if (issue.handle === undefined) {
    throw new Error(
      `issue ${issue.id} is in the frontier but carries no handle metadata; the tracker publishes ` +
        '"handle" (<feature>/<NN>) when it publishes the issue, and every git name derives from it',
    );
  }
  return issue.handle;
}

function writeExclusionReport(artifactsDir: string, report: ExclusionReport): void {
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, EXCLUSION_REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config, allowList }) => {
      const store = preflightStore(target, config);
      const attempted = readAttempted(artifactsDir);
      const composed = composeFrontier(readyIssues(store, target), attempted);
      const { kept: candidates, dropped } = applyAllowList(composed.candidates, allowList);
      const excluded = [...composed.excluded, ...dropped];
      // The graph preflight again, behind the frontier read and ahead of every claim this cycle makes. It
      // is `open`'s own check — the same function, the same read of the whole store and the same message —
      // and not a second opinion about what crossing domains means: `open`'s reading is one moment, and a
      // decision answered while the run goes on releases the implementation issue waiting on it into this
      // very cycle. Behind the frontier read is the one order that cannot be outrun: anything a closure
      // released into this cycle is already in `candidates` when the check reads the graph that released
      // it, so the cycle either refuses or claims work no decision released. A refused cycle claims
      // nothing, writes no report and records nothing as attempted: the throw is the whole outcome.
      assertNoCrossDomainEdges(store, target);
      const picked = candidates
        .slice(0, config.concurrency)
        .map((issue) => ({ id: issue.id, handle: handleOf(issue) }));
      const ids = picked.map((issue) => issue.id);

      claimIssues(store, target, ids);
      addAttempted(artifactsDir, ids);
      writeExclusionReport(artifactsDir, { picked, excluded });
      return nodeLine(JSON.stringify(picked.map((issue) => issue.handle)));
    },
  });
}
