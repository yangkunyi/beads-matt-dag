#!/usr/bin/env bun
/**
 * Repro: the frontier, composed and claimed.
 *
 * Pick asks the store one question — what can start — and applies what the store cannot answer: the
 * decision domain is excluded by type, an issue without the gate label is excluded, an issue this run
 * already tried is excluded, and an issue whose attempt failed is offered like fresh work, because it
 * is `open` again. The result is truncated to the configured concurrency and claimed in one
 * transaction. Everything the store offered and this step left out is reported, with its rule, in the
 * run's own artifact — so "nothing happened" is explainable.
 *
 * Each case drives the pick node the way the runner does and reads only what a run's evidence is: the
 * store's answers, the token on stdout, and the artifact that is a contract in its own right.
 */
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_PICK, nodeLine } from "../../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  envWithout,
  expect,
  expectEqual,
  failAttempt,
  mkTemp,
  publishIssue,
  registerType,
  runScript,
  storeBinary,
  storeIssue,
  storeReady,
  storeReadyAll,
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
  return runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
}

try {
  // The frontier is the store's answer minus this step's three rules, and the claim lands atomically.
  await withTarget(async (root, artifacts) => {
    const eligible = publishIssue(root, { title: "eligible", handle: "feat/01", slug: "eligible", labels: [GATE_LABEL] });
    const blocked = publishIssue(root, { title: "blocked", handle: "feat/02", slug: "blocked", labels: [GATE_LABEL] });
    bd(root, "dep", "add", blocked.id, eligible.id);
    // A flavour of question nobody has seen before, and one with no wayfinder label at all: the
    // exclusion is by type, so neither can leak into the frontier by omission.
    const decision = publishIssue(root, {
      title: "a brand new question",
      type: "decision",
      handle: "feat/03",
      slug: "a-brand-new-question",
      labels: [GATE_LABEL, "wayfinder:brand-new-flavour"],
    });
    const bareDecision = publishIssue(root, {
      title: "a decision with no flavour label",
      type: "decision",
      handle: "feat/04",
      slug: "a-decision-with-no-flavour-label",
      labels: [GATE_LABEL],
    });
    const unlabelled = publishIssue(root, { title: "braked", handle: "feat/05", slug: "braked" });
    // A domain whose issues are not questions at all: an experiment ticket is not this drain's work
    // either, and the exclusion is by type here too — the gate label does not change that. Its type has
    // to exist in the store before bd will create one at all.
    registerType(root, "experiment");
    const experiment = publishIssue(root, {
      title: "a result recorded and waiting to be read",
      type: "experiment",
      handle: "feat/07",
      slug: "a-result-recorded",
      labels: [GATE_LABEL],
    });
    // An attempt that failed: the reason is a comment, and the issue is open again.
    const retried = publishIssue(root, { title: "retried", handle: "feat/06", slug: "retried", labels: [GATE_LABEL] });
    failAttempt(root, retried.id, "the implementer could not reach the API");

    // In the store, the retried issue is indistinguishable from fresh work except for its comment.
    expectEqual("a retried issue is open", storeIssue(root, retried.id).status, "open");
    expectEqual("the failure left a comment and nothing else", storeIssue(root, retried.id).comment_count, 1);
    expectEqual("the store offers it exactly like fresh work", storeReady(root).sort(), [eligible.id, retried.id].sort());
    expect("the store offers the decision issues too", [decision.id, bareDecision.id, experiment.id].every((id) => storeReadyAll(root).includes(id)));
    expect("the blocked issue is not the store's answer", !storeReadyAll(root).includes(blocked.id));

    const run = pick(root, artifacts);
    expectEqual("pick exits clean", run.status, 0);
    expectEqual("pick offers the fresh and the retried issue, and nothing else", (JSON.parse(run.stdout) as string[]).sort(), [
      "feat/01",
      "feat/06",
    ]);
    expectEqual("the eligible issue is claimed", storeIssue(root, eligible.id).status, "in_progress");
    expectEqual("the retried issue is claimed", storeIssue(root, retried.id).status, "in_progress");
    for (const untouched of [blocked, decision, bareDecision, experiment, unlabelled]) {
      expectEqual(`${untouched.handle} was not claimed`, storeIssue(root, untouched.id).status, "open");
    }

    // The report: what was claimed, and the rule that left each other candidate out.
    const report = readReport(artifacts);
    expectEqual("the report names what was picked", report.picked.map((p) => p.handle).sort(), ["feat/01", "feat/06"]);
    expectEqual("the report names the brand new flavour by its type", ruleFor(report, decision.id), "non-work-type");
    expectEqual("the report names a decision with no wayfinder label too", ruleFor(report, bareDecision.id), "non-work-type");
    expectEqual("and names the experiment ticket by its type as well", ruleFor(report, experiment.id), "non-work-type");
    expectEqual("the report names the missing gate label", ruleFor(report, unlabelled.id), "missing-gate-label");
    expectEqual(
      "the report explains every candidate it left out, and no other issue",
      report.excluded.map((e) => e.id).sort(),
      [bareDecision.id, decision.id, experiment.id, unlabelled.id].sort(),
    );
    // The blocked issue never reached this step: the store excluded it, so there is no rule to report.
    expectEqual("a blocked issue is not this step's to explain", ruleFor(report, blocked.id), undefined);
  });

  // The cap, the next cycle of the same run, and the run's own memory of what it tried.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, "concurrency: 2\n");
    const issues = ["01", "02", "03"].map((n) =>
      publishIssue(root, { title: `issue ${n}`, handle: `feat/${n}`, slug: `issue-${n}`, labels: [GATE_LABEL] }),
    );
    const inProgress = (): string[] => issues.filter((i) => storeIssue(root, i.id).status === "in_progress").map((i) => i.id);

    const first = pick(root, artifacts);
    expectEqual("pick exits clean", first.status, 0);
    expectEqual("the batch is truncated to the configured concurrency", (JSON.parse(first.stdout) as string[]).length, 2);
    expectEqual("exactly the cap is claimed", inProgress().length, 2);
    expectEqual(
      "the token names the issues the store says were claimed",
      (JSON.parse(first.stdout) as string[]).sort(),
      issues.filter((i) => inProgress().includes(i.id)).map((i) => i.handle).sort(),
    );

    // A later cycle takes the next batch, and never offers what the run already claimed.
    const leftBehind = issues.filter((i) => !inProgress().includes(i.id)).map((i) => i.handle);
    const second = pick(root, artifacts);
    expectEqual("the next cycle offers what the cap left behind", (JSON.parse(second.stdout) as string[]).sort(), leftBehind.sort());
    const third = pick(root, artifacts);
    expectEqual("a later cycle offers nothing already claimed", (JSON.parse(third.stdout) as string[]).sort(), []);

    // The failure of an issue this run claimed: the store offers it again, this run does not.
    const failed = issues.find((i) => i.id === inProgress()[0])!;
    failAttempt(root, failed.id, "the tests did not pass");
    expectEqual("the store offers the failed issue again", storeReady(root).includes(failed.id), true);
    const fourth = pick(root, artifacts);
    expectEqual("the run that tried it does not offer it again", JSON.parse(fourth.stdout), []);
    expectEqual("the report says why it was left out", ruleFor(readReport(artifacts), failed.id), "attempted-by-this-run");

    // The next drain has no attempted set of its own, so it works the issue exactly like fresh work.
    const nextRun = mkTemp("artifacts-next-");
    try {
      const retry = pick(root, nextRun);
      expectEqual("the next drain retries it", JSON.parse(retry.stdout), [failed.handle]);
      expectEqual("and claims it", storeIssue(root, failed.id).status, "in_progress");
    } finally {
      rmSync(nextRun, { recursive: true, force: true });
    }
  });

  // The claim is one transaction: a batch that fails part-way leaves nothing claimed.
  await withTarget(async (root, artifacts) => {
    const first = publishIssue(root, { title: "first", handle: "feat/01", slug: "first", labels: [GATE_LABEL] });
    const second = publishIssue(root, { title: "second", handle: "feat/02", slug: "second", labels: [GATE_LABEL] });

    // A store that refuses a claim batch once it is under way: it replaces the last line's id with a
    // nonexistent issue, which is what a race that takes an issue away between the ready query and the
    // claim looks like. The first line has already been applied inside the transaction when line two
    // fails, so the store's own answer — every issue still `open` — is the rollback, observed.
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
    expectEqual("nothing was claimed: the first issue is still open", storeIssue(root, first.id).status, "open");
    expectEqual("nothing was claimed: the second issue is still open", storeIssue(root, second.id).status, "open");
    expectEqual("a failed pick writes no report", existsSync(join(artifacts, REPORT)), false);
    expectEqual("a failed pick records nothing as attempted", existsSync(join(artifacts, "attempted-ids.json")), false);
  });

  // A drain with nothing eligible is a clean no-op that still explains itself.
  await withTarget(async (root, artifacts) => {
    const run = pick(root, artifacts);
    expectEqual("nothing to start", run.stdout, nodeLine(EMPTY_PICK));
    expectEqual("a no-op exits clean", run.status, 0);
    expectEqual("the report is still written", readReport(artifacts), { picked: [], excluded: [] });

    // The report and the attempted set live in the run's artifacts, so a node without them cannot run.
    const noArtifacts = runScript(drain.script("pick"), root, envWithout("ARTIFACTS_DIR"));
    expectEqual("pick without a run directory prints no token", noArtifacts.stdout, "");
    expect("pick without a run directory fails loudly", noArtifacts.status !== 0, noArtifacts.status);
    expect("the reason names the missing input", noArtifacts.stderr.includes("ARTIFACTS_DIR"), noArtifacts.stderr);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
