#!/usr/bin/env bun
/**
 * Repro: the experiment executor's last node.
 *
 * After the pick/run loop, `report` releases the Target run lock this run's `open` took and writes
 * attempted, closed-on-record, and failed from `attempted-ids.json` and the store. It is not the
 * drain's review or summary and not the reading executor's draft report, and it does not merge the
 * experiment-run include into itself. Closed stays completeness of the record (ADR-0006): the
 * per-ticket node already closed a complete record; this node does not close.
 *
 * What is pinned here:
 *
 *   - a run that claimed nothing writes the three empty sections and gives the lock back;
 *   - a complete record is named under attempted and closed-on-record, and the ticket stays closed;
 *   - an incomplete record is named under attempted and failed, with the store's reason and ordinal,
 *     and the ticket stays open;
 *   - a ticket another run closed is not this run's closed-on-record: the list is attempted-ids plus
 *     the store, not every closed experiment;
 *   - the node spends no model, does not close, and does not live in the experiment-run include.
 *
 * The experiment turn itself is the fake Pi SDK (`record-complete`, `record-incomplete`): no provider,
 * no live model.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_PICK, FAILED, CLOSED, OPENED, REPORTED, nodeLine } from "../../scripts/node-outcomes.ts";
import { runLockFilePath } from "../../scripts/run-lock.ts";
import {
  bd,
  envWithRunTool,
  expect,
  expectEqual,
  experiment,
  experimentRun,
  fakePiSdk,
  gitC,
  installExperimentTools,
  publishExperiment,
  runScript,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
  writeStubDvc,
  type FakePiMode,
  type PublishedIssue,
} from "./target.ts";

const REPORT = "report.md";
const UNREAD = "reading:none";

/** The close-out artifact, read whole. */
function report(artifacts: string): string {
  return readFileSync(join(artifacts, REPORT), "utf8");
}

/** One section of the close-out, by its heading: the non-empty lines under it, the heading excluded. */
function section(text: string, heading: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `## ${heading}`);
  if (start === -1) throw new Error(`the close-out carries no ${JSON.stringify(heading)} section:\n${text}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => line.trim() !== "");
}

/** The close-out's headline: the whole run in one line. */
function headline(text: string): string {
  const line = text.split("\n").find((l) => l.includes("attempted") && l.includes("closed on record"));
  if (line === undefined) throw new Error(`the close-out carries no headline:\n${text}`);
  return line;
}

/** Stage the Target's own files so the run's commits hold the run's work only. */
function stageTarget(root: string): void {
  gitC(root, "add", "-A");
  gitC(root, "commit", "-m", "lab setup");
}

/** One experiment, as the runner runs it: the per-ticket node for one handle, with the fake session. */
function runOne(
  root: string,
  artifacts: string,
  bin: string,
  handle: string,
  mode: FakePiMode,
): { stdout: string; status: number | null } {
  const r = runScript(
    experimentRun.script("run"),
    root,
    envWithRunTool(bin, {
      ARTIFACTS_DIR: artifacts,
      INPUTS_ISSUE: handle,
      PI_SDK_PATH: fakePiSdk(artifacts, mode),
    }),
  );
  const token = mode === "record-complete" ? CLOSED : FAILED;
  expectEqual(`the run of ${handle} prints its token`, r.stdout, nodeLine(token));
  expectEqual(`the run of ${handle} exits clean`, r.status, 0);
  return r;
}

/**
 * The whole run, the way Archon's loop walks it: open, pick, one run per handle, pick again until it
 * answers nothing, then the last node. Returns the handles the loop ran, in the order it ran them,
 * and the close-out the last node wrote.
 */
function runBatch(
  root: string,
  artifacts: string,
  bin: string,
  modeFor: (handle: string) => FakePiMode = () => "record-complete",
): { ran: string[]; report: string } {
  const opened = runScript(experiment.script("open"), root, envWithRunTool(bin, { ARTIFACTS_DIR: artifacts }));
  expectEqual("the run opens", opened.stdout, nodeLine(OPENED));
  expectEqual("open exits clean", opened.status, 0);
  expectEqual("open took the Target run lock", existsSync(runLockFilePath(root)), true);

  const ran: string[] = [];
  for (let cycle = 0; cycle < 10; cycle++) {
    const picked = runScript(experiment.script("pick"), root, envWithRunTool(bin, { ARTIFACTS_DIR: artifacts }));
    expectEqual("pick exits clean", picked.status, 0);
    const handles = JSON.parse(picked.stdout) as string[];
    if (handles.length === 0) {
      const written = runScript(experiment.script("report"), root, envWithRunTool(bin, { ARTIFACTS_DIR: artifacts }));
      expectEqual("the last node prints its token", written.stdout, nodeLine(REPORTED));
      expectEqual("the last node exits clean", written.status, 0);
      expectEqual("the last node wrote the close-out", existsSync(join(artifacts, REPORT)), true);
      return { ran, report: report(artifacts) };
    }
    for (const handle of handles) {
      runOne(root, artifacts, bin, handle, modeFor(handle));
      ran.push(handle);
    }
  }
  throw new Error("the batch never ended: pick kept offering tickets");
}

/** Publish one experiment ticket the way the tracker does. */
function ticket(root: string, n: string, title = `pilot ${n}`): PublishedIssue {
  return publishExperiment(root, { title, handle: `exp/${n}`, slug: `pilot-${n}` });
}

try {
  // ---- An empty frontier: the last node writes the three empty sections and gives the lock back. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    stageTarget(root);
    const head = gitC(root, "rev-parse", "main");

    const run = runBatch(root, artifacts, bin);
    expectEqual("the run claimed nothing", run.ran, []);
    const text = run.report;

    expectEqual("the headline is the whole run in one line", headline(text), "0 attempted, 0 closed on record, 0 failed.");
    expectEqual("attempted says none", section(text, "Attempted"), ["none this run"]);
    expectEqual("closed-on-record says none", section(text, "Closed on record"), ["none this run"]);
    expectEqual("failed says none", section(text, "Failed attempts"), ["none this run"]);
    expectEqual("nothing was committed", gitC(root, "rev-parse", "main"), head);
    expectEqual("the last node gave the run lock back", existsSync(runLockFilePath(root)), false);
    expectEqual(
      "and the run left the close-out and its own bookkeeping, nothing else",
      readdirSync(artifacts).sort(),
      ["bin", "pick-exclusions.json", REPORT, "run-lock.json"],
    );
    expect(
      "the close-out is not a draft-answers report",
      !text.includes("Draft answers awaiting the operator") && !text.includes("awaiting the operator"),
      text,
    );
    expect("the close-out is not a drain review", !existsSync(join(artifacts, "review.md")), artifacts);
    expect("and not a drain summary", !existsSync(join(artifacts, "summary.md")), artifacts);
  });

  // ---- A complete record: attempted and closed-on-record name it; the last node does not close. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const one = ticket(root, "01");
    stageTarget(root);

    const run = runBatch(root, artifacts, bin);
    expectEqual("the run worked the ticket", run.ran, ["exp/01"]);
    const text = run.report;

    expectEqual("the headline keeps attempted and closed-on-record together", headline(text), "1 attempted, 1 closed on record, 0 failed.");
    expectEqual("attempted names the ticket", section(text, "Attempted"), [`- exp/01 [${one.id}]`]);
    const closed = section(text, "Closed on record");
    expectEqual("closed-on-record names exactly that ticket", closed.length, 1);
    expect("with the handle", closed[0]!.includes("exp/01"), closed[0]);
    expect("as closed", closed[0]!.includes("closed"), closed[0]);
    expect("and the unread marker the completeness close stamped", closed[0]!.includes(`label ${UNREAD}`), closed[0]);
    expectEqual("failed says none", section(text, "Failed attempts"), ["none this run"]);

    expectEqual("the ticket stays closed: the last node did not reopen it", storeIssue(root, one.id).status, "closed");
    expectEqual("still carrying the unread marker", storeIssue(root, one.id).labels.includes(UNREAD), true);
    expectEqual("the last node gave the run lock back", existsSync(runLockFilePath(root)), false);
  });

  // ---- An incomplete record: attempted and failed name it; closed-on-record does not; it stays open. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const one = ticket(root, "01");
    stageTarget(root);

    const run = runBatch(root, artifacts, bin, () => "record-incomplete");
    expectEqual("the run attempted the ticket", run.ran, ["exp/01"]);
    const text = run.report;

    expectEqual("the headline keeps the failure off closed-on-record", headline(text), "1 attempted, 0 closed on record, 1 failed.");
    expectEqual("attempted names the ticket", section(text, "Attempted"), [`- exp/01 [${one.id}]`]);
    expectEqual("closed-on-record says none", section(text, "Closed on record"), ["none this run"]);

    expectEqual("the ticket stays open: closed is completeness of record", storeIssue(root, one.id).status, "open");
    expectEqual("with no unread marker", storeIssue(root, one.id).labels.includes(UNREAD), false);
    expectEqual(
      "and the store holds its attempt, ordinal included",
      storeComments(root, one.id).map((c) => c.text),
      ["attempt 1 failed: record incomplete — measured:, reference:, covered:, reading:"],
    );
    const failed = section(text, "Failed attempts");
    expectEqual("the failures section names exactly the one ticket", failed.length, 1);
    expect("with the handle", failed[0]!.includes("exp/01"), failed[0]);
    expect("the reason the store holds", failed[0]!.includes("record incomplete"), failed[0]);
    expect("and the attempt ordinal", failed[0]!.includes("1 recorded failure"), failed[0]);
    expect("and that this run attempted it", failed[0]!.includes("attempted by this run"), failed[0]);
    expectEqual("the last node did not close it", storeIssue(root, one.id).status, "open");
  });

  // ---- Mixed batch, plus a ticket another run already closed: this run's lists are its own attempted. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const earlier = ticket(root, "00", "already recorded");
    const one = ticket(root, "01");
    const two = ticket(root, "02");
    stageTarget(root);

    // A close from outside this run: completeness-of-record is already true on that ticket, and this
    // run's close-out must not claim it. The last node does not close, so the hand-close stays as it is.
    bd(root, "close", earlier.id, "--reason", "recorded");
    expectEqual("the earlier ticket is closed before this run", storeIssue(root, earlier.id).status, "closed");

    const run = runBatch(root, artifacts, bin, (handle) => (handle === "exp/02" ? "record-incomplete" : "record-complete"));
    expectEqual("the run attempted this run's frontier", run.ran, ["exp/01", "exp/02"]);
    const text = run.report;

    expectEqual(
      "the headline keeps this run's close and this run's failure apart",
      headline(text),
      "2 attempted, 1 closed on record, 1 failed.",
    );
    expectEqual(
      "attempted is this run's ids, not the earlier close",
      section(text, "Attempted"),
      [`- exp/01 [${one.id}]`, `- exp/02 [${two.id}]`],
    );
    expect(
      "closed-on-record names the complete record",
      section(text, "Closed on record").some((line) => line.includes("exp/01") && line.includes("closed")),
      section(text, "Closed on record").join("\n"),
    );
    expect(
      "and not the ticket another run closed",
      !section(text, "Closed on record").some((line) => line.includes("exp/00")),
      section(text, "Closed on record").join("\n"),
    );
    expect("failed names the incomplete record", section(text, "Failed attempts")[0]!.includes("exp/02"), section(text, "Failed attempts")[0]);
    expectEqual("the complete record stays closed", storeIssue(root, one.id).status, "closed");
    expectEqual("the incomplete record stays open", storeIssue(root, two.id).status, "open");
    expectEqual("the earlier close is untouched", storeIssue(root, earlier.id).status, "closed");
    expectEqual("the last node gave the run lock back", existsSync(runLockFilePath(root)), false);
  });

  // ---- A close-out that cannot read the store fails loudly rather than guessing. ----
  await withTarget(
    async (root, artifacts) => {
      const written = runScript(experiment.script("report"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("a close-out without a store prints no token", written.stdout, "");
      expect("and fails the node", written.status !== 0, written.status);
      expect("with the store's own reason", /no store in the Target/.test(written.stderr), written.stderr);
      expectEqual("and writes no close-out", existsSync(join(artifacts, REPORT)), false);
    },
    { store: false },
  );

  // ---- The last node is this folder's, never a model, never a close, never the experiment-run include. ----
  {
    const source = readFileSync(experiment.script("report"), "utf8");
    expect("the last node spends no agent", !/runAgent\s*\(/.test(source), source.slice(0, 300));
    expect(
      "the last node imports no runner and no role table",
      !/from "[^"]*(agent|roles)\.ts"/.test(source),
      source.slice(0, 300),
    );
    expect(
      "the last node does not import the experiment-run include",
      !/beads-dag-experiment-run/.test(source),
      source.slice(0, 300),
    );
    expect(
      "the last node does not import drain review or summary",
      !/beads-dag-drain\/scripts\/(review|summary|report-node|report-artifacts)/.test(source),
      source.slice(0, 300),
    );
    expect(
      "the last node does not import the reading executor's draft report",
      !/beads-dag-inquiry/.test(source),
      source.slice(0, 300),
    );
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
    expect("the last node does not close a ticket", !/closeIssue/.test(code) && !/\["close"/.test(code), code.slice(0, 400));
    expect(
      "the last node never reads the close-out back as state",
      !/readFileSync\([^)]*REPORT_MD_REL/.test(source),
      source.slice(0, 300),
    );

    const parent = readFileSync(experiment.yaml, "utf8");
    expect("the parent YAML still includes the experiment-run child", parent.includes("include: beads-dag-experiment-run"), parent);
    expect("the last node is declared on the parent, not merged into the include", /id:\s*report/.test(parent), parent);
    expect("and depends on the pick/run loop", parent.includes("depends_on: [experiments]"), parent);

    const child = readFileSync(experimentRun.yaml, "utf8");
    expect("the experiment-run include did not gain the last node", !/id:\s*report/.test(child), child);
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
