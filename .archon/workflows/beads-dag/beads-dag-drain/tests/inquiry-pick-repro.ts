#!/usr/bin/env bun
/**
 * Repro: the reading frontier, composed and claimed.
 *
 * `pick` asks the store what can start and applies what the store cannot answer: a question without the
 * reading leg's label is not this executor's work, the map is a container and never a ticket, a question
 * whose reading already landed is out of the frontier, and a question this run already claimed is not
 * offered twice. What the store already holds claimed by someone else is reported too, so a run can say
 * who has what. The result is ordered by handle, truncated to the configured concurrency, and claimed in
 * one all-or-nothing transaction. Everything the store offered and this step left out is written, with its
 * rule, to the run's own artifact.
 *
 * Each case drives the pick node the way the runner does and reads only what a run's evidence is: the
 * store's own answers, the token on stdout, and the artifact that is a contract in its own right.
 */
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_PICK, nodeLine } from "../scripts/node-outcomes.ts";
import {
  bd,
  expect,
  expectEqual,
  initReadingTarget,
  inquiry,
  mkTemp,
  publishIssue,
  runScript,
  storeBinary,
  storeIssue,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

const REPORT = "pick-exclusions.json";
const READING = "wayfinder:research";
const MAP = "wayfinder:map";
const DRAFT = "answer:draft";

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
  return runScript(inquiry.script("pick"), root, { ARTIFACTS_DIR: artifacts });
}

function readyIds(root: string): string[] {
  return JSON.parse(bd(root, "ready", "--json", "--limit", "0")).map((i: { id: string }) => i.id);
}

try {
  // The frontier is the store's ready answer minus this step's rules; the exclusions artifact names every
  // question the store offered and this step left out, claimed-by-someone-else included.
  await withTarget(async (root, artifacts) => {
    const eligible = publishIssue(root, { title: "eligible", type: "decision", handle: "q/01", slug: "eligible", labels: [READING] });
    const unlabelled = publishIssue(root, { title: "grilling, not reading", type: "decision", handle: "q/02", slug: "grilling", labels: ["wayfinder:grilling"] });
    const map = publishIssue(root, { title: "the map", type: "decision", handle: "q/03", slug: "the-map", labels: [MAP] });
    const landed = publishIssue(root, { title: "already read", type: "decision", handle: "q/04", slug: "already-read", labels: [READING, DRAFT] });
    const claimed = publishIssue(root, { title: "someone is reading it", type: "decision", handle: "q/05", slug: "someone-is-reading-it", labels: [READING] });
    bd(root, "update", claimed.id, "-s", "in_progress");

    const run = pick(root, artifacts);
    expectEqual("pick exits clean", run.status, 0);
    expectEqual("the frontier is exactly the eligible question", JSON.parse(run.stdout), ["q/01"]);
    expectEqual("and it is claimed", storeIssue(root, eligible.id).status, "in_progress");

    const report = readReport(artifacts);
    expectEqual("the report names what was picked", report.picked, [{ id: eligible.id, handle: "q/01" }]);
    expectEqual("the map is excluded by its own label", ruleFor(report, map.id), "map-container");
    expectEqual("a question with no reading label is excluded", ruleFor(report, unlabelled.id), "missing-reading-label");
    expectEqual("a question whose reading landed is excluded", ruleFor(report, landed.id), "reading-already-landed");
    expectEqual("a question someone else claimed is reported too", ruleFor(report, claimed.id), "already-claimed");
    expectEqual(
      "every candidate this step left out is named, and no other question",
      report.excluded.map((e) => e.id).sort(),
      [map.id, unlabelled.id, landed.id, claimed.id].sort(),
    );
    expectEqual("the unlabelled question was not claimed", storeIssue(root, unlabelled.id).status, "open");
    expectEqual("the landed question was not claimed", storeIssue(root, landed.id).status, "open");
    expectEqual("the other run's claim is untouched", storeIssue(root, claimed.id).status, "in_progress");
  });

  // The order is by handle, the batch is truncated to the configured concurrency, and a claimed question
  // leaves every session's frontier.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, "concurrency: 2\n");
    const issues = ["10", "02", "01"].map((n) =>
      publishIssue(root, { title: `question ${n}`, type: "decision", handle: `q/${n}`, slug: `question-${n}`, labels: [READING] }),
    );
    const inProgress = (): string[] => issues.filter((i) => storeIssue(root, i.id).status === "in_progress").map((i) => i.id);

    const first = pick(root, artifacts);
    expectEqual("pick exits clean", first.status, 0);
    expectEqual("ordered by handle, not by the store's order", JSON.parse(first.stdout), ["q/01", "q/02"]);
    expectEqual("exactly the cap is claimed", inProgress().length, 2);

    const second = pick(root, artifacts);
    expectEqual("the next cycle takes the next batch", JSON.parse(second.stdout), ["q/10"]);
    const third = pick(root, artifacts);
    expectEqual("a later cycle offers nothing already claimed", third.stdout, nodeLine(EMPTY_PICK));
    expectEqual("and the report says so plainly", readReport(artifacts), { picked: [], excluded: [] });

    // A claimed question is out of the store's ready answer, so it is out of every session's frontier: a
    // fresh run - its own artifacts, no memory of this one - is offered nothing and says who has it.
    const claimedIds = inProgress();
    expect(
      "the claimed questions are gone from the store's ready answer",
      claimedIds.every((id) => !readyIds(root).includes(id)),
      claimedIds,
    );
    const otherRun = mkTemp("artifacts-other-");
    try {
      const other = pick(root, otherRun);
      expectEqual("another session's run is offered nothing", other.stdout, nodeLine(EMPTY_PICK));
      const otherReport = readReport(otherRun);
      expectEqual("and its report names every claim it cannot take", otherReport.excluded.length, 3);
      expect(
        "all under the already-claimed rule",
        otherReport.excluded.every((entry) => entry.rule === "already-claimed"),
        otherReport.excluded,
      );
    } finally {
      rmSync(otherRun, { recursive: true, force: true });
    }
  });

  // The claim is one transaction: a batch that fails part-way leaves nothing claimed.
  await withTarget(async (root, artifacts) => {
    const first = publishIssue(root, { title: "first", type: "decision", handle: "q/01", slug: "first", labels: [READING] });
    const second = publishIssue(root, { title: "second", type: "decision", handle: "q/02", slug: "second", labels: [READING] });

    // A store that refuses a claim batch once it is under way: it replaces the last line's id with a
    // nonexistent issue, which is what a race that takes a question away between the ready query and the
    // claim looks like. The first line has already been applied inside the transaction when line two
    // fails, so the store's own answer — every question still `open` — is the rollback, observed.
    const wrapper = join(root, "store-that-refuses-a-partial-batch");
    writeFileSync(
      wrapper,
      [
        "#!/bin/sh",
        `REAL=${JSON.stringify(storeBinary())}`,
        'if [ "$1" = "batch" ]; then',
        "  lines=$(cat)",
        '  if [ "$(printf \'%s\\n\' "$lines" | wc -l)" -gt 1 ]; then',
        "    keep=$(printf '%s\\n' \"$lines\" | sed '$d')",
        "    printf '%s\\n' \"$keep\" 'update store-that-refuses-a-partial-batch status=in_progress' | \"$REAL\" batch",
        "    exit $?",
        "  fi",
        '  printf \'%s\\n\' "$lines" | "$REAL" batch',
        "  exit $?",
        "fi",
        'exec "$REAL" "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(wrapper, 0o755);
    writeTargetConfig(root, `store: ${wrapper}\n`);

    const run = pick(root, artifacts);
    expectEqual("a claim that cannot commit prints no token", run.stdout, "");
    expect("a claim that cannot commit fails the node", run.status !== 0, run.status);
    expect("the reason names the store command that failed", run.stderr.includes("batch"), run.stderr);
    expectEqual("nothing was claimed: the first question is still open", storeIssue(root, first.id).status, "open");
    expectEqual("nothing was claimed: the second question is still open", storeIssue(root, second.id).status, "open");
    expectEqual("a failed pick writes no report", existsSync(join(artifacts, REPORT)), false);
    expectEqual("a failed pick records nothing as attempted", existsSync(join(artifacts, "attempted-ids.json")), false);
  });

  // A run with nothing to read is a clean no-op that still explains itself.
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const run = pick(root, artifacts);
    expectEqual("nothing to read", run.stdout, nodeLine(EMPTY_PICK));
    expectEqual("a no-op exits clean", run.status, 0);
    expectEqual("the report is still written", readReport(artifacts), { picked: [], excluded: [] });
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
