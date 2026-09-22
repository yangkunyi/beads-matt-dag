#!/usr/bin/env bun
/**
 * Repro: the experiment frontier.
 *
 * The experiment frontier is the one frontier that selects *by* the non-work type instead of excluding
 * it: the store's ready answer minus the issues that are not type `experiment`, minus the experiment
 * tickets that do not carry the `experiment` label, minus the ones this run already tried. What is left
 * is ordered by handle — feature, then number, then slug — and truncated to the run's configured
 * concurrency. Every issue the store offered and this step left out is reported with its rule in the
 * run's own artifact, so a run that did nothing can say why.
 *
 * The one thing this pick does **not** do is claim: an experiment ticket's claim is an assignment made in
 * the same act as its registration (`run.ts`), so until the run node has reserved the run's name the
 * ticket stays on the frontier. These cases read only what a run's evidence is: the store's own answers,
 * the token on stdout, and the exclusions artifact.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { nodeLine, EMPTY_PICK } from "../../scripts/node-outcomes.ts";
import {
  EXPERIMENT_LABEL,
  GATE_LABEL,
  bd,
  envWithout,
  expect,
  expectEqual,
  experiment,
  publishExperiment,
  publishIssue,
  runScript,
  storeIssue,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

const REPORT = "pick-exclusions.json";

type ExclusionReport = {
  picked: { id: string; handle: string }[];
  excluded: { id: string; handle?: string; rule: string }[];
};

function readReport(artifacts: string): ExclusionReport {
  return JSON.parse(readFileSync(join(artifacts, REPORT), "utf8")) as ExclusionReport;
}

/** The rule the report says excluded one issue, or undefined when it does not name that issue at all. */
function ruleFor(report: ExclusionReport, id: string): string | undefined {
  return report.excluded.find((entry) => entry.id === id)?.rule;
}

function pick(root: string, artifacts: string): { stdout: string; stderr: string; status: number | null } {
  return runScript(experiment.script("pick"), root, { ARTIFACTS_DIR: artifacts });
}

try {
  // The frontier is the store's answer minus this step's three rules — and a question ticket is excluded
  // by its type, named per issue, in the run's own report. The order is the handles' own.
  await withTarget(async (root, artifacts) => {
    // Published out of handle order on purpose: the frontier is ordered by handle, not by creation.
    const second = publishExperiment(root, { title: "second", handle: "exp/02", slug: "second" });
    const first = publishExperiment(root, { title: "first", handle: "exp/01", slug: "first" });
    // A question: a decision issue, however it is labelled, is not this domain's work at all.
    const question = publishIssue(root, {
      title: "a question",
      type: "decision",
      handle: "exp/03",
      slug: "a-question",
      labels: ["leg:research"],
    });
    // An experiment ticket without the domain's label: the type is right, the ticket is not runnable as
    // one yet — `bd list -l experiment` is the one filter, so the label is the ticket's own statement.
    const unlabelled = publishIssue(root, {
      title: "an experiment nobody labelled",
      type: "experiment",
      handle: "exp/04",
      slug: "an-experiment-nobody-labelled",
    });
    // A work ticket: the drain's, not this executor's, whatever labels it carries.
    const work = publishIssue(root, { title: "work", handle: "exp/05", slug: "work", labels: [GATE_LABEL, EXPERIMENT_LABEL] });
    // An experiment ticket another run is holding: claimed means out of the frontier, not excluded.
    const claimed = publishExperiment(root, { title: "claimed", handle: "exp/06", slug: "claimed" });
    bd(root, "update", claimed.id, "-s", "in_progress");
    // An experiment ticket this run already tried: the store offers it, this run does not.
    const tried = publishExperiment(root, { title: "tried", handle: "exp/07", slug: "tried" });
    writeFileSync(join(artifacts, "attempted-ids.json"), `${JSON.stringify([tried.id])}\n`);

    const run = pick(root, artifacts);
    expectEqual("pick exits clean", run.status, 0);
    expectEqual("the frontier is the two experiment tickets, in handle order", JSON.parse(run.stdout), [
      "exp/01",
      "exp/02",
    ]);
    expectEqual("and nothing else", (JSON.parse(run.stdout) as string[]).length, 2);

    // pick claims nothing: the run node's assignment is the claim, and it has not happened here.
    for (const issue of [first, second]) {
      expectEqual(`${issue.handle} is still open after pick`, storeIssue(root, issue.id).status, "open");
      expectEqual(`${issue.handle} carries no assignee from pick`, storeIssue(root, issue.id).assignee ?? null, null);
    }

    const report = readReport(artifacts);
    expectEqual("the report names the frontier", report.picked.map((entry) => entry.handle), ["exp/01", "exp/02"]);
    expectEqual("the report names the picked issues by id", report.picked.map((entry) => entry.id).sort(), [first.id, second.id].sort());
    expectEqual("the question ticket's rule is its type", ruleFor(report, question.id), "not-experiment-type");
    expectEqual("a work ticket is not this type either", ruleFor(report, work.id), "not-experiment-type");
    expectEqual("an experiment ticket without its label is named", ruleFor(report, unlabelled.id), "missing-experiment-label");
    expectEqual("this run's own attempt is named", ruleFor(report, tried.id), "attempted-by-this-run");
    expectEqual("a claimed ticket never reached this step", ruleFor(report, claimed.id), undefined);
    expectEqual(
      "the report explains exactly the issues this step left out",
      report.excluded.map((entry) => entry.id).sort(),
      [question.id, unlabelled.id, work.id, tried.id].sort(),
    );
  });

  // The cap, and the fact that the frontier does not move until a run node claims a ticket.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, "concurrency: 1\n");
    const first = publishExperiment(root, { title: "first", handle: "exp/01", slug: "first" });
    const second = publishExperiment(root, { title: "second", handle: "exp/02", slug: "second" });

    const capped = pick(root, artifacts);
    expectEqual("the batch is truncated to the configured concurrency", JSON.parse(capped.stdout), ["exp/01"]);
    expectEqual("the report names only what the cap allowed", readReport(artifacts).picked.map((p) => p.handle), ["exp/01"]);

    // pick claims nothing, so a second cycle offers the same ticket: the run node is what takes it off.
    const again = pick(root, artifacts);
    expectEqual("a cycle with no claim offers the same ticket", JSON.parse(again.stdout), ["exp/01"]);

    bd(root, "update", first.id, "-s", "in_progress", "--assignee", "beads-dag-experiment/a-run");
    const next = pick(root, artifacts);
    expectEqual("the run node's claim takes it off the frontier", JSON.parse(next.stdout), ["exp/02"]);
    expectEqual("and leaves the second ticket where it was", storeIssue(root, second.id).status, "open");
  });

  // A run with nothing eligible is a clean no-op that still explains itself, and the artifacts are
  // required: a node without a run directory cannot run.
  await withTarget(async (root, artifacts) => {
    const run = pick(root, artifacts);
    expectEqual("nothing to run", run.stdout, nodeLine(EMPTY_PICK));
    expectEqual("a no-op exits clean", run.status, 0);
    expectEqual("the report is still written", readReport(artifacts), { picked: [], excluded: [] });

    const noArtifacts = runScript(experiment.script("pick"), root, envWithout("ARTIFACTS_DIR"));
    expectEqual("pick without a run directory prints no token", noArtifacts.stdout, "");
    expect("pick without a run directory fails loudly", noArtifacts.status !== 0, noArtifacts.status);
    expect("the reason names the missing input", noArtifacts.stderr.includes("ARTIFACTS_DIR"), noArtifacts.stderr);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
