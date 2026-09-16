/**
 * The experiment frontier: the one frontier that selects *by* the non-work type instead of excluding it.
 *
 * A drain excludes `decision` and `experiment` structurally, and the reading executor excludes
 * everything that is not a `wayfinder:*` question. This one keeps exactly the experiment tickets: ready
 * issues minus the ones that are not type `experiment`, minus the ones that do not carry the
 * `experiment` label, minus the ones this run already tried.
 *
 * The store owns readiness — `open`, not blocked — and that is one query. It cannot own the three
 * exclusions: two are this flow's policy (the type is the domain, the label is what makes the tickets one
 * filter) and the third is bookkeeping that lives beside the run by design (`attempted-ids.json`). Because
 * the store cannot explain any of them, every excluded issue and its rule goes into the run's own
 * exclusion report, so a run that did nothing can say why.
 *
 * Ordered by handle — feature, then number, then slug — so a batch of tickets is worked in the order the
 * handles read, and truncated to the run's configured concurrency: this is where several independent
 * experiments become one run. `pick` claims nothing: an experiment ticket's claim is an **assignment**,
 * made in the same act as the registration of the run's identity (`run.ts`), so the ticket stays on the
 * frontier until its run node has reserved the name it will be recorded under.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readAttempted } from "../../beads-dag-drain/scripts/attempted.ts";
import { runNode } from "../../beads-dag-drain/scripts/node-entry.ts";
import { nodeLine } from "../../beads-dag-drain/scripts/node-outcomes.ts";
import { preflightStore, readyIssues, type StoreIssue } from "../../beads-dag-drain/scripts/store.ts";
import { EXPERIMENT_LABEL, EXPERIMENT_TYPE } from "./ticket.ts";

/**
 * Why an issue the store offered was left out. These are the rules this executor applies, and the only
 * ones it can explain: anything the store itself excluded (blocked, in progress, closed) never reaches
 * this step and is answered by asking the store.
 */
type ExclusionRule = "not-experiment-type" | "missing-experiment-label" | "attempted-by-this-run";

type ExcludedIssue = { id: string; handle: string | undefined; rule: ExclusionRule };

/** One issue the frontier may hand to a run node: the fields the run's name derives from. */
type Candidate = { id: string; handle: string; slug: string };

/** What the run keeps of this cycle's frontier: what is left to work, and why each candidate is not. */
type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: ExcludedIssue[];
};

/** The artifact pick rewrites each cycle, relative to ARTIFACTS_DIR — the drain's own convention. */
const EXCLUSION_REPORT_FILE = "pick-exclusions.json";

/**
 * The rule that keeps an issue out of the frontier, or undefined when nothing does. The order decides
 * which rule a multiply-excluded issue is reported under: the type first (it is not this domain's work
 * at all), then the label, then this run's own bookkeeping.
 */
function exclusionRule(issue: StoreIssue, attempted: Set<string>): ExclusionRule | undefined {
  if (issue.type !== EXPERIMENT_TYPE) return "not-experiment-type";
  if (!issue.labels.includes(EXPERIMENT_LABEL)) return "missing-experiment-label";
  if (attempted.has(issue.id)) return "attempted-by-this-run";
  return undefined;
}

/**
 * The handle a picked issue is handed to its run node under. There is no fallback: it is the metadata the
 * tracker publishes, and an issue without one cannot name a run's record, so handing it on would start a
 * run nobody can find afterwards.
 */
function handleOf(issue: StoreIssue): string {
  if (issue.handle === undefined) {
    throw new Error(
      `issue ${issue.id} is in the frontier but carries no handle metadata; the tracker publishes ` +
        '"handle" (<feature>/<NN>) when it publishes the issue, and a run\'s name derives from it',
    );
  }
  return issue.handle;
}

/** A handle's two segments; the handle regex that validated it has exactly one slash. */
function splitHandle(handle: string): { feature: string; number: string } {
  const [feature = "", number = ""] = handle.split("/");
  return { feature, number };
}

/**
 * The handle's own order: feature, then the number, then the slug. The number is read as a number when
 * both handles carry one, so `02` follows `01` whether or not the publisher zero-padded; the slug is the
 * last tie-break, which a handle's uniqueness makes unreachable in practice and cheap to keep honest.
 */
function compareCandidates(a: Candidate, b: Candidate): number {
  const left = splitHandle(a.handle);
  const right = splitHandle(b.handle);
  if (left.feature !== right.feature) return left.feature < right.feature ? -1 : 1;
  const leftNumber = Number(left.number);
  const rightNumber = Number(right.number);
  if (Number.isInteger(leftNumber) && Number.isInteger(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  if (left.number !== right.number) return left.number < right.number ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** The store's answer with this step's three rules applied. */
function composeFrontier(
  issues: StoreIssue[],
  attempted: Set<string>,
): { candidates: Candidate[]; excluded: ExcludedIssue[] } {
  const candidates: Candidate[] = [];
  const excluded: ExcludedIssue[] = [];
  for (const issue of issues) {
    const rule = exclusionRule(issue, attempted);
    if (rule !== undefined) {
      excluded.push({ id: issue.id, handle: issue.handle, rule });
      continue;
    }
    const handle = handleOf(issue);
    candidates.push({ id: issue.id, handle, slug: issue.slug ?? "" });
  }
  return { candidates, excluded };
}

function writeExclusionReport(artifactsDir: string, report: ExclusionReport): void {
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, EXCLUSION_REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    run: ({ target, artifactsDir, config }) => {
      const store = preflightStore(target, config);
      const attempted = readAttempted(artifactsDir);
      const { candidates, excluded } = composeFrontier(readyIssues(store, target), attempted);
      const picked = candidates
        .sort(compareCandidates)
        .slice(0, config.concurrency)
        .map((candidate) => ({ id: candidate.id, handle: candidate.handle }));
      writeExclusionReport(artifactsDir, { picked, excluded });
      return nodeLine(JSON.stringify(picked.map((issue) => issue.handle)));
    },
  });
}
