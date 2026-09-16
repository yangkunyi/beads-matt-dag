#!/usr/bin/env bun
/**
 * Repro: a batch of questions, one run, one report.
 *
 * The reading executor's unit repros drive one node each (`inquiry-open/pick/read/leftovers-repro.ts`).
 * This one walks the run the way the runner does - `open`, then `pick` until it answers nothing, one
 * `read` per handle, then `report` - against a throwaway Target with a real store, and asserts on what an
 * observer outside the pack can see: the store's own answers, git, the artifacts the run leaves, and the
 * one document a human reads first.
 *
 * What is pinned here:
 *
 *   - three eligible questions are read in one run, and `report.md` names each with the note's path, the
 *     commit that carries it and the label the landing stamped;
 *   - a failure on one question leaves the other landings intact - their commits and notes are in Main and
 *     the questions carry their drafts - while the report carries the failed question's reason and the
 *     attempt ordinal the store holds;
 *   - a run against an empty frontier claims nothing, commits nothing and says so in one report;
 *   - the drafts awaiting the operator are read from the store at report time - a reading an earlier run
 *     landed appears even though it is blocked, in no frontier and in no artifact of this run, so the list
 *     is derived rather than kept anywhere;
 *   - the report is written by the node and never by a model, and it is the run's last node, so it is
 *     where the run lock goes back.
 *
 * The reading turn itself is the fake Pi SDK (`read`, `read-silent`): no provider, no live model.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_PICK, FAILED, LANDED, OPENED, REPORTED, nodeLine } from "../scripts/node-outcomes.ts";
import { runLockFilePath } from "../scripts/run-lock.ts";
import {
  bd,
  expect,
  expectEqual,
  fakePiSdk,
  gitC,
  initReadingTarget,
  inquiry,
  publishIssue,
  readBlock,
  runScript,
  storeComments,
  storeIssue,
  withTarget,
  type FakePiMode,
  type PublishedIssue,
} from "./target.ts";

const READING = "wayfinder:research";
const DRAFT = "answer:draft";
const REPORT = "report.md";

/** The report artifact, read whole. */
function report(artifacts: string): string {
  return readFileSync(join(artifacts, REPORT), "utf8");
}

/** Every file under one directory, recursively, as absolute paths - the run's artifacts, as files. */
function filesUnder(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const next = rel === "" ? entry.name : join(rel, entry.name);
      if (entry.isDirectory()) walk(next);
      else out.push(join(root, next));
    }
  };
  walk("");
  return out.sort();
}

/** One section of the report, by its heading: the non-empty lines under it, the heading excluded. */
function section(text: string, heading: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `## ${heading}`);
  if (start === -1) throw new Error(`the report carries no ${JSON.stringify(heading)} section:\n${text}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => line.trim() !== "");
}

/** The report's headline: the whole run in one line. */
function headline(text: string): string {
  const line = text.split("\n").find((l) => l.includes("read and landed"));
  if (line === undefined) throw new Error(`the report carries no headline:\n${text}`);
  return line;
}

/** The report's row for one handle, whole: a landed reading's row, or a bare handle line. */
function rowFor(text: string, handle: string): string {
  const row = text
    .split("\n")
    .find((line) => line === `- ${handle}` || line.startsWith(`- ${handle} `));
  if (row === undefined) throw new Error(`the report names no row for ${handle}:\n${text}`);
  return row;
}

/** The questions the store holds claimed, by the store's own answer. */
function claimed(root: string): string[] {
  return JSON.parse(bd(root, "list", "-s", "in_progress", "--json", "--limit", "0")).map(
    (i: { id: string }) => i.id,
  );
}

/** One reading, as the runner runs it: the `read` node for one handle, with the fake session. */
function readOne(root: string, artifacts: string, handle: string, mode: FakePiMode): void {
  const r = runScript(readBlock.script("read"), root, {
    ARTIFACTS_DIR: artifacts,
    INPUTS_ISSUE: handle,
    PI_SDK_PATH: fakePiSdk(artifacts, mode),
  });
  expectEqual(`the reading of ${handle} prints its token`, r.stdout, nodeLine(mode === "read" ? LANDED : FAILED));
  expectEqual(`the reading of ${handle} exits clean`, r.status, 0);
}

/**
 * The whole run, the way Archon's loop walks it: open, pick, one read per handle, pick again until it
 * answers nothing, then report. Returns the handles the loop read, in the order it read them, and the
 * report the last node wrote.
 */
function runBatch(
  root: string,
  artifacts: string,
  modeFor: (handle: string) => FakePiMode = () => "read",
): { read: string[]; report: string } {
  const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
  expectEqual("the run opens", opened.stdout, nodeLine(OPENED));
  expectEqual("open exits clean", opened.status, 0);

  const read: string[] = [];
  for (let cycle = 0; cycle < 10; cycle++) {
    const picked = runScript(inquiry.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("pick exits clean", picked.status, 0);
    const handles = JSON.parse(picked.stdout) as string[];
    if (handles.length === 0) {
      const written = runScript(inquiry.script("report"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("the report node prints its token", written.stdout, nodeLine(REPORTED));
      expectEqual("the report node exits clean", written.status, 0);
      expectEqual("the report node wrote the report", existsSync(join(artifacts, REPORT)), true);
      return { read, report: report(artifacts) };
    }
    for (const handle of handles) {
      readOne(root, artifacts, handle, modeFor(handle));
      read.push(handle);
    }
  }
  throw new Error("the batch never ended: pick kept offering questions");
}

/** Publish one question ticket the way the tracker does, and stage its body outside the run's dirt. */
function question(root: string, n: string, labels: string[] = [READING]): PublishedIssue {
  return publishIssue(root, {
    title: `question ${n}`,
    type: "decision",
    handle: `q/${n}`,
    slug: `question-${n}`,
    labels,
  });
}

/** The note one question's reading owns, spelled here rather than asked of the pack. */
function noteRel(n: string): string {
  return join(".scratch", "q", "notes", `question-${n}.md`);
}

/** Stage the Target's own files - the bodies, the config - so the run's commits hold the run's work only. */
function stageTarget(root: string): void {
  gitC(root, "add", "-A");
  gitC(root, "commit", "-m", "lab setup");
}

try {
  // ---- Three eligible questions, one run: all three are read, and the report says what landed where. ----
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const published = ["01", "02", "03"].map((n) => question(root, n));

    // Two questions the batch must not read, staged to pin where the awaiting list comes from: a reading
    // an earlier run landed whose question is blocked (so no frontier and no artifact ever names it), and
    // one the operator has already answered (closed, so it awaits nobody).
    const earlier = question(root, "00", [READING, DRAFT]);
    const blocker = publishIssue(root, { title: "the blocker", type: "decision", handle: "q/08", slug: "the-blocker" });
    bd(root, "dep", "add", earlier.id, blocker.id);
    const answered = question(root, "09", [READING, DRAFT]);
    bd(root, "close", answered.id, "--reason", "the operator answered it");
    stageTarget(root);

    const run = runBatch(root, artifacts);
    expectEqual("the run read the whole frontier, in handle order", run.read, ["q/01", "q/02", "q/03"]);
    const text = run.report;

    expectEqual(
      "the headline is the whole run in one line",
      headline(text),
      "3 read and landed, 0 failed, 0 still eligible, 4 awaiting the operator.",
    );
    expectEqual(
      "every landed question is named, in handle order",
      section(text, "Read and landed").map((line) => line.replace(/^- (\S+).*$/, "$1")),
      ["q/01", "q/02", "q/03"],
    );

    for (const [i, issue] of published.entries()) {
      const n = `0${i + 1}`;
      const handle = `q/${n}`;
      const slug = `question-${n}`;
      const note = noteRel(n);
      const row = rowFor(text, handle);
      expect(`${handle}'s row names its note`, row.includes(`note ${note} at commit `), row);
      expect(`${handle}'s row names the label the landing stamped`, row.includes(`label ${DRAFT}`), row);
      const commit = /commit ([0-9a-f]{7,64})/.exec(row)?.[1];
      expect(`${handle}'s row names a commit`, commit !== undefined, row);
      expectEqual(
        `${handle}'s commit is the reading's own commit, for that question`,
        gitC(root, "log", "-1", "--format=%s", commit!),
        `read: ${handle} ${slug}`,
      );
      expect(`${handle}'s note is in that commit`, gitC(root, "show", `${commit}:${note}`).startsWith("# a fake note"));
      expectEqual(`${handle} is open`, storeIssue(root, issue.id).status, "open");
      expectEqual(`${handle} carries the draft label`, storeIssue(root, issue.id).labels.includes(DRAFT), true);
      expectEqual(
        `${handle}'s comment is the draft the reading landed`,
        storeComments(root, issue.id)[0]!.text.startsWith(`draft: ${note} (commit ${commit})`),
        true,
      );
    }

    expectEqual("the failures section says nothing failed", section(text, "Failed attempts"), ["none this run"]);
    expectEqual("the frontier the run left is exhausted", section(text, "Frontier left behind"), ["nothing eligible"]);
    // The blocked earlier reading is named although nothing this run wrote names it: the awaiting list is
    // a store reading, not a copy of anything the run kept.
    expectEqual(
      "the drafts awaiting the operator are the store's answer, earlier runs included",
      section(text, "Draft answers awaiting the operator"),
      ["- q/00", "- q/01", "- q/02", "- q/03"],
    );
    expectEqual("the run claimed nothing after its batch", claimed(root), []);
    expectEqual(
      "three reading commits landed, one per question",
      gitC(root, "log", "--format=%s", "-3").split("\n").sort(),
      ["read: q/01 question-01", "read: q/02 question-02", "read: q/03 question-03"],
    );
    for (const file of filesUnder(artifacts)) {
      expect(
        `${file} keeps no second copy of the awaiting list`,
        !readFileSync(file, "utf8").includes(earlier.id),
        file,
      );
    }
    expectEqual("the run's last node gave the run lock back", existsSync(runLockFilePath(root)), false);
  });

  // ---- A failure on one question leaves the other landings intact, and the report carries its ordinal. ----
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const one = question(root, "01");
    const two = question(root, "02");
    const three = question(root, "03");
    stageTarget(root);

    const run = runBatch(root, artifacts, (handle) => (handle === "q/02" ? "read-silent" : "read"));
    expectEqual("the run attempted the whole frontier", run.read, ["q/01", "q/02", "q/03"]);
    const text = run.report;

    expectEqual(
      "the headline keeps the landings and the failure apart",
      headline(text),
      "2 read and landed, 1 failed, 1 still eligible, 2 awaiting the operator.",
    );

    // The other two landings are untouched by the failure beside them.
    for (const [n, issue] of [
      ["01", one],
      ["03", three],
    ] as const) {
      const note = noteRel(n);
      expect(`${n}'s note is in Main`, gitC(root, "show", `main:${note}`).startsWith("# a fake note"));
      const row = rowFor(text, `q/${n}`);
      expectEqual(
        `q/${n}'s landing is named with the commit that carries it`,
        gitC(root, "log", "-1", "--format=%s", /commit ([0-9a-f]{7,64})/.exec(row)![1]!),
        `read: q/${n} question-${n}`,
      );
      expectEqual(`q/${n} is open with its draft`, storeIssue(root, issue.id).labels.includes(DRAFT), true);
    }

    // The failed question: the store's own record, and the report's reading of it.
    expectEqual("the failed question stays open", storeIssue(root, two.id).status, "open");
    expectEqual("with no draft label", storeIssue(root, two.id).labels.includes(DRAFT), false);
    expectEqual(
      "and the store holds its attempt, ordinal included",
      storeComments(root, two.id).map((c) => c.text),
      ["attempt 1 failed: the reading turn produced no draft answer"],
    );
    const failed = section(text, "Failed attempts");
    expectEqual("the failures section names exactly the one question", failed.length, 1);
    expect("with the handle", failed[0]!.includes("q/02"), failed[0]);
    expect(
      "the reason the store holds",
      failed[0]!.includes("attempt 1 failed: the reading turn produced no draft answer"),
      failed[0],
    );
    expect("and the attempt ordinal the store holds", failed[0]!.includes("1 recorded failure"), failed[0]);
    expect("and that this run attempted it", failed[0]!.includes("attempted by this run"), failed[0]);
    expectEqual("the failed question is on the frontier again", section(text, "Frontier left behind"), ["- q/02"]);
    expectEqual(
      "the two landings are the drafts awaiting the operator",
      section(text, "Draft answers awaiting the operator"),
      ["- q/01", "- q/03"],
    );
    expectEqual(
      "the failed question was never committed",
      gitC(root, "log", "--format=%s").split("\n").includes("read: q/02 question-02"),
      false,
    );
    expectEqual("and the run claimed nothing after its batch", claimed(root), []);
  });

  // ---- An empty frontier: the run claims nothing, commits nothing, and says so in one report. ----
  await withTarget(async (root, artifacts) => {
    initReadingTarget(root);
    const head = gitC(root, "rev-parse", "main");

    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run opens", opened.stdout, nodeLine(OPENED));
    const picked = runScript(inquiry.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the frontier is empty", picked.stdout, nodeLine(EMPTY_PICK));
    const written = runScript(inquiry.script("report"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the report node prints its token", written.stdout, nodeLine(REPORTED));
    expectEqual("the report node exits clean", written.status, 0);

    const text = report(artifacts);
    expectEqual(
      "the one report says the run did nothing",
      headline(text),
      "0 read and landed, 0 failed, 0 still eligible, 0 awaiting the operator.",
    );
    expectEqual(
      "and every section says so",
      [
        section(text, "Read and landed"),
        section(text, "Failed attempts"),
        section(text, "Frontier left behind"),
        section(text, "Draft answers awaiting the operator"),
      ],
      [["none this run"], ["none this run"], ["nothing eligible"], ["none"]],
    );
    expectEqual("nothing was claimed", claimed(root), []);
    expectEqual("nothing was committed", gitC(root, "rev-parse", "main"), head);
    expectEqual(
      "and the run left the report and its own bookkeeping, nothing else",
      readdirSync(artifacts).sort(),
      ["pick-exclusions.json", REPORT, "run-lock.json"],
    );
  });

  // ---- A report that cannot read the store fails loudly: "nothing happened" and "the run could not
  //      start" are two different sentences, and only one of them may be a report. ----
  await withTarget(
    async (root, artifacts) => {
      const written = runScript(inquiry.script("report"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("a report without a store prints no token", written.stdout, "");
      expect("and fails the node", written.status !== 0, written.status);
      expect("with the store's own reason", /no store in the Target/.test(written.stderr), written.stderr);
      expectEqual("and writes no report", existsSync(join(artifacts, REPORT)), false);
    },
    { store: false },
  );

  // ---- The report is the node's, never a model's: no runner, no role, and it only ever writes. ----
  {
    const source = readFileSync(inquiry.script("report"), "utf8");
    expect("the report node spends no agent", !/runAgent\s*\(/.test(source), source.slice(0, 300));
    expect(
      "the report node imports no runner and no role table",
      !/from "[^"]*(agent|roles)\.ts"/.test(source),
      source.slice(0, 300),
    );
    expect(
      "the report node never reads a report back as state",
      !/readFileSync\([^)]*REPORT_MD_REL/.test(source),
      source.slice(0, 300),
    );
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
