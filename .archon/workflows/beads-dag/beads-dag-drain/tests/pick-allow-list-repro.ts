#!/usr/bin/env bun
/**
 * Repro: a present allow-list is this run's pool.
 *
 * Each domain run's pick already composes a frontier from the store's ready set minus that run's own
 * rules. A present allow-list adds one more: an issue whose id is not in the list is excluded as
 * `outside-allow-list` and not claimed, and its triage is left where it was. An omitted list (unset, or
 * the empty string the workflow input defaults to) is today's pick. An empty list claims nothing. Being
 * on the list does not bypass ready, that run's gate, attempted, or type — those stay the named
 * exclusions they already are.
 *
 * Each case drives the pick node the way the runner does and reads only what a run's evidence is: the
 * store's answers, the token on stdout, and the exclusions artifact.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_PICK, nodeLine } from "../../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  expectEqual,
  experiment,
  inquiry,
  publishExperiment,
  publishIssue,
  runScript,
  storeIssue,
  withTarget,
} from "./target.ts";

const REPORT = "pick-exclusions.json";
const READING = "leg:research";

type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: { id: string; handle?: string; rule: string }[];
};

function readReport(artifacts: string): ExclusionReport {
  return JSON.parse(readFileSync(join(artifacts, REPORT), "utf8")) as ExclusionReport;
}

function ruleFor(report: ExclusionReport, id: string): string | undefined {
  return report.excluded.find((entry) => entry.id === id)?.rule;
}

function labelsOf(root: string, id: string): string[] {
  const labels = storeIssue(root, id).labels;
  return Array.isArray(labels) ? [...labels].sort() : [];
}

/** Drive one domain's pick. `undefined` is an omitted list; `[]` is present and empty. */
function pick(
  script: string,
  root: string,
  artifacts: string,
  allowList?: string[],
): { stdout: string; stderr: string; status: number | null } {
  const env: NodeJS.ProcessEnv = { ARTIFACTS_DIR: artifacts };
  if (allowList !== undefined) env.INPUTS_ALLOW_LIST = JSON.stringify(allowList);
  return runScript(script, root, env);
}

try {
  // Drain: a present list claims only that pool, names the rest, and does not brake them. An id on the
  // list that lacks the gate, is the wrong type, or is not ready, keeps its own named exclusion.
  await withTarget(async (root, artifacts) => {
    const selected = publishIssue(root, { title: "selected", handle: "feat/01", slug: "selected", labels: [GATE_LABEL] });
    const other = publishIssue(root, { title: "other", handle: "feat/02", slug: "other", labels: [GATE_LABEL] });
    const unlabelled = publishIssue(root, { title: "braked", handle: "feat/03", slug: "braked" });
    const decision = publishIssue(root, {
      title: "a question",
      type: "decision",
      handle: "feat/04",
      slug: "a-question",
      labels: [GATE_LABEL],
    });
    const blocker = publishIssue(root, { title: "blocker", handle: "feat/05", slug: "blocker", labels: [GATE_LABEL] });
    const blocked = publishIssue(root, { title: "blocked", handle: "feat/06", slug: "blocked", labels: [GATE_LABEL] });
    bd(root, "dep", "add", blocked.id, blocker.id);
    const otherLabels = labelsOf(root, other.id);
    const unlabelledLabels = labelsOf(root, unlabelled.id);

    const run = pick(drain.script("pick"), root, artifacts, [selected.id, unlabelled.id, decision.id, blocked.id]);
    expectEqual("pick exits clean", run.status, 0);
    expectEqual("pick claims only the gated id on the list", JSON.parse(run.stdout), ["feat/01"]);
    expectEqual("the selected issue is claimed", storeIssue(root, selected.id).status, "in_progress");
    expectEqual("the left-out issue is not claimed", storeIssue(root, other.id).status, "open");
    expectEqual("and still carries the gate", labelsOf(root, other.id), otherLabels);
    expectEqual("the unlabelled issue is not claimed", storeIssue(root, unlabelled.id).status, "open");
    expectEqual("and is not braked either", labelsOf(root, unlabelled.id), unlabelledLabels);
    expectEqual("the decision issue is not claimed", storeIssue(root, decision.id).status, "open");
    expectEqual("the blocked issue is not claimed", storeIssue(root, blocked.id).status, "open");

    const report = readReport(artifacts);
    expectEqual("the report names what was claimed", report.picked, [{ id: selected.id, handle: "feat/01" }]);
    expectEqual("the left-out issue is outside the pool", ruleFor(report, other.id), "outside-allow-list");
    expectEqual("an id on the list without the gate is still missing-gate", ruleFor(report, unlabelled.id), "missing-gate-label");
    expectEqual("a decision on the list never reaches this step", ruleFor(report, decision.id), undefined);
    expectEqual("a blocked id never reached this step", ruleFor(report, blocked.id), undefined);
  });

  // Drain: an omitted list, including the empty-string default, is today's pick.
  await withTarget(async (root, artifacts) => {
    const first = publishIssue(root, { title: "first", handle: "feat/01", slug: "first", labels: [GATE_LABEL] });
    const second = publishIssue(root, { title: "second", handle: "feat/02", slug: "second", labels: [GATE_LABEL] });

    const omitted = pick(drain.script("pick"), root, artifacts);
    expectEqual("an omitted list still picks as today", (JSON.parse(omitted.stdout) as string[]).sort(), ["feat/01", "feat/02"]);
    expectEqual("and claims both", [storeIssue(root, first.id).status, storeIssue(root, second.id).status], [
      "in_progress",
      "in_progress",
    ]);
  });

  await withTarget(async (root, artifacts) => {
    publishIssue(root, { title: "first", handle: "feat/01", slug: "first", labels: [GATE_LABEL] });
    publishIssue(root, { title: "second", handle: "feat/02", slug: "second", labels: [GATE_LABEL] });
    const blank = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts, INPUTS_ALLOW_LIST: "" });
    expectEqual("an empty-string list is omitted, not empty", (JSON.parse(blank.stdout) as string[]).sort(), [
      "feat/01",
      "feat/02",
    ]);
  });

  // Drain: an empty list claims nothing and names every otherwise-eligible issue.
  await withTarget(async (root, artifacts) => {
    const first = publishIssue(root, { title: "first", handle: "feat/01", slug: "first", labels: [GATE_LABEL] });
    const second = publishIssue(root, { title: "second", handle: "feat/02", slug: "second", labels: [GATE_LABEL] });
    const firstLabels = labelsOf(root, first.id);
    const secondLabels = labelsOf(root, second.id);

    const run = pick(drain.script("pick"), root, artifacts, []);
    expectEqual("an empty list claims nothing", run.stdout, nodeLine(EMPTY_PICK));
    expectEqual("the first issue is still open", storeIssue(root, first.id).status, "open");
    expectEqual("the second issue is still open", storeIssue(root, second.id).status, "open");
    expectEqual("and the first still carries the gate", labelsOf(root, first.id), firstLabels);
    expectEqual("and the second still carries the gate", labelsOf(root, second.id), secondLabels);
    const report = readReport(artifacts);
    expectEqual("the first is outside the empty pool", ruleFor(report, first.id), "outside-allow-list");
    expectEqual("the second is outside the empty pool", ruleFor(report, second.id), "outside-allow-list");
  });

  // Inquiry: the same pool rule, against the reading gate rather than ready-for-agent.
  await withTarget(async (root, artifacts) => {
    const selected = publishIssue(root, {
      title: "selected",
      type: "decision",
      handle: "q/01",
      slug: "selected",
      labels: [READING],
    });
    const other = publishIssue(root, {
      title: "other",
      type: "decision",
      handle: "q/02",
      slug: "other",
      labels: [READING],
    });
    const unlabelled = publishIssue(root, {
      title: "grilling",
      type: "decision",
      handle: "q/03",
      slug: "grilling",
      labels: ["leg:grilling"],
    });
    const otherLabels = labelsOf(root, other.id);
    const unlabelledLabels = labelsOf(root, unlabelled.id);

    const run = pick(inquiry.script("pick"), root, artifacts, [selected.id, unlabelled.id]);
    expectEqual("inquiry pick exits clean", run.status, 0);
    expectEqual("inquiry claims only the gated id on the list", JSON.parse(run.stdout), ["q/01"]);
    expectEqual("the selected question is claimed", storeIssue(root, selected.id).status, "in_progress");
    expectEqual("the left-out question is not claimed", storeIssue(root, other.id).status, "open");
    expectEqual("and still carries the reading label", labelsOf(root, other.id), otherLabels);
    expectEqual("the unlabelled question is not claimed", storeIssue(root, unlabelled.id).status, "open");
    expectEqual("and is not braked either", labelsOf(root, unlabelled.id), unlabelledLabels);

    const report = readReport(artifacts);
    expectEqual("the left-out question is outside the pool", ruleFor(report, other.id), "outside-allow-list");
    expectEqual("an id on the list without the reading label is still missing it", ruleFor(report, unlabelled.id), "missing-reading-label");
  });

  await withTarget(async (root, artifacts) => {
    publishIssue(root, { title: "first", type: "decision", handle: "q/01", slug: "first", labels: [READING] });
    publishIssue(root, { title: "second", type: "decision", handle: "q/02", slug: "second", labels: [READING] });
    const omitted = pick(inquiry.script("pick"), root, artifacts);
    expectEqual("an omitted inquiry list still picks as today", JSON.parse(omitted.stdout), ["q/01", "q/02"]);
  });

  await withTarget(async (root, artifacts) => {
    const first = publishIssue(root, { title: "first", type: "decision", handle: "q/01", slug: "first", labels: [READING] });
    const firstLabels = labelsOf(root, first.id);
    const run = pick(inquiry.script("pick"), root, artifacts, []);
    expectEqual("an empty inquiry list claims nothing", run.stdout, nodeLine(EMPTY_PICK));
    expectEqual("the question is still open", storeIssue(root, first.id).status, "open");
    expectEqual("and still carries the reading label", labelsOf(root, first.id), firstLabels);
    expectEqual("named outside the empty pool", ruleFor(readReport(artifacts), first.id), "outside-allow-list");
  });

  // Experiment: the same pool rule. Pick claims nothing here — the run node is the claim — so the token
  // and the report are the evidence, and triage staying put is the same observation.
  await withTarget(async (root, artifacts) => {
    const selected = publishExperiment(root, { title: "selected", handle: "exp/01", slug: "selected" });
    const other = publishExperiment(root, { title: "other", handle: "exp/02", slug: "other" });
    const unlabelled = publishIssue(root, {
      title: "unlabelled",
      type: "experiment",
      handle: "exp/03",
      slug: "unlabelled",
    });
    const otherLabels = labelsOf(root, other.id);
    const unlabelledLabels = labelsOf(root, unlabelled.id);

    const run = pick(experiment.script("pick"), root, artifacts, [selected.id, unlabelled.id]);
    expectEqual("experiment pick exits clean", run.status, 0);
    expectEqual("experiment offers only the labelled id on the list", JSON.parse(run.stdout), ["exp/01"]);
    expectEqual("and still claims nothing", storeIssue(root, selected.id).status, "open");
    expectEqual("the left-out ticket is still open", storeIssue(root, other.id).status, "open");
    expectEqual("and still carries the experiment label", labelsOf(root, other.id), otherLabels);
    expectEqual("the unlabelled ticket is still open", storeIssue(root, unlabelled.id).status, "open");
    expectEqual("and is not braked either", labelsOf(root, unlabelled.id), unlabelledLabels);

    const report = readReport(artifacts);
    expectEqual("the left-out ticket is outside the pool", ruleFor(report, other.id), "outside-allow-list");
    expectEqual("an id on the list without the experiment label is still missing it", ruleFor(report, unlabelled.id), "missing-experiment-label");
  });

  await withTarget(async (root, artifacts) => {
    publishExperiment(root, { title: "first", handle: "exp/01", slug: "first" });
    publishExperiment(root, { title: "second", handle: "exp/02", slug: "second" });
    const omitted = pick(experiment.script("pick"), root, artifacts);
    expectEqual("an omitted experiment list still picks as today", JSON.parse(omitted.stdout), ["exp/01", "exp/02"]);
  });

  await withTarget(async (root, artifacts) => {
    const first = publishExperiment(root, { title: "first", handle: "exp/01", slug: "first" });
    const firstLabels = labelsOf(root, first.id);
    const run = pick(experiment.script("pick"), root, artifacts, []);
    expectEqual("an empty experiment list offers nothing", run.stdout, nodeLine(EMPTY_PICK));
    expectEqual("the ticket is still open", storeIssue(root, first.id).status, "open");
    expectEqual("and still carries the experiment label", labelsOf(root, first.id), firstLabels);
    expectEqual("named outside the empty pool", ruleFor(readReport(artifacts), first.id), "outside-allow-list");
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
