#!/usr/bin/env bun
/**
 * Repro: one question, read and landed as a draft answer.
 *
 * The node under test is `read.ts` - the per-ticket reading `beads-dag-inquiry` fans out, one instance per
 * handle its pick prints. A stub runner drives its exported entry (`readQuestion`, the `executeIssue`
 * seam), so the turn costs nothing and the assertions are about what an observer outside the pack sees:
 * the store's own answers (`bd show`, `bd comments`), git (the commit, its paths, its subject, the
 * Target's clean tree), and the files the flow names.
 *
 * What is pinned here:
 *
 *   - a landed reading: the question `open` again, the `answer:draft` label, one comment whose first
 *     line is marked `draft` and names the note's path and the commit, and the note and receipts as one
 *     path-scoped commit on Main;
 *   - the turn's own contract: the `read` role, the question's handle as its session key, the store's
 *     read-only mode in the environment it runs under, and a brief carrying the body plus the corpus and
 *     note paths;
 *   - a turn that wrote no note fails - `attempt 1 failed: …`, back to `open`, no label, nothing
 *     committed - and a turn that answered nothing fails the same way, so the ordinal and the shape a
 *     retry reads are the drain's;
 *   - the executor never closes a question (a question's closure is a session's act), checked at the
 *     source and at the store: after a landing the question is `open`.
 *
 * The turn itself is driven twice more through the fake Pi SDK (`read`, `read-silent`), so the node runs
 * end to end with the real default runner and a session that really writes the corpus it was asked for -
 * no provider, no live model.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { readQuestion } from "../../beads-dag-read/scripts/read.ts";
import type { PackAgentOpts, PackAgentResult } from "../../scripts/agent.ts";
import { FAILED, LANDED, nodeLine } from "../../scripts/node-outcomes.ts";
import { roleSessionFile } from "../../scripts/pi-session.ts";
import { READONLY_ENV } from "../../scripts/worker-env.ts";
import {
  bd,
  expect,
  expectEqual,
  fakePiSdk,
  gitC,
  inquiry,
  publishIssue,
  readBlock,
  readingCorpusRel,
  readingNoteRel,
  runScript,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
  type PublishOpts,
} from "./target.ts";

const READING = "wayfinder:research";
const DRAFT = "answer:draft";

/** The environment variables this file sets; restored in full at the end, whatever happens. */
const TOUCHED_ENV = ["PI_SDK_PATH", "FAKE_PI_RECORD"];
const savedEnv: Record<string, string | undefined> = {};
for (const name of TOUCHED_ENV) savedEnv[name] = process.env[name];

/** A file the reading's turn wrote, as the runner would leave it. */
function write(root: string, rel: string, body: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
}

/** The stub runner: it records the options it was handed, does what the case asks, and returns an answer. */
function stub(
  seen: PackAgentOpts[],
  answer: PackAgentResult,
  work?: (opts: PackAgentOpts) => void,
): (opts: PackAgentOpts) => Promise<PackAgentResult> {
  return async (opts) => {
    seen.push(opts);
    work?.(opts);
    return answer;
  };
}

/** One question, published as the front end would and claimed as pick leaves it. */
function claimedQuestion(root: string, opts: PublishOpts): { id: string; noteRel: string } {
  const issue = publishIssue(root, opts);
  bd(root, "update", issue.id, "-s", "in_progress");
  return { id: issue.id, noteRel: readingNoteRel(opts.handle, opts.slug) };
}

try {
  // ---- The reading lands: a note committed, a draft answer, the label, and the question still open. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const { id, noteRel } = claimedQuestion(root, {
      title: "what does the tool hold",
      type: "decision",
      handle: "q/01",
      slug: "what-does-the-tool-hold",
      labels: [READING],
    });
    const corpusRel = readingCorpusRel("q/01");
    const receiptRel = join(corpusRel, "sources", "url-example-invalid-x.md");
    const receiptBody = "SOURCE-URL: https://example.invalid/x\nSHA256: abc\nwhat the source holds\n";
    const noteBody = "# what does the tool hold\n\n## Claims\n\n- **c1** one thing\n";
    const bodyPath = join(root, ".scratch", "q", "issues", "01-what-does-the-tool-hold.md");
    const seen: PackAgentOpts[] = [];
    const draft = "what the sources hold: one thing\nwhat they do not: the second thing\nwhere the note is";
    // What the reading turn's own store write gets: the environment the role call carries, and the
    // store's answer to a write under it. Both are read inside the turn, where they happened.
    let turnWrite: { status: number | null; output: string } | undefined;
    let statusDuringTurn: string | undefined;
    // The Target's own files are committed before the reading: the brief and the config are not the run's
    // dirt, so the only commit the reading makes is its own.
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");

    const outcome = await readQuestion(root, "q/01", {
      artifactsDir: artifacts,
      runAgent: stub(seen, { sessionFile: "", answer: { kind: "text", text: draft }, lastError: undefined }, (opts) => {
        write(root, receiptRel, receiptBody);
        write(root, noteRel, noteBody);
        const r = spawnSync(storeBinary(), ["update", id, "-s", "closed"], {
          cwd: root,
          env: opts.env(process.env),
          encoding: "utf8",
        });
        turnWrite = { status: r.status, output: `${r.stderr ?? ""}${r.stdout ?? ""}`.trim() };
        statusDuringTurn = storeIssue(root, id).status;
      }),
    });

    expectEqual("the reading lands", outcome, LANDED);
    expectEqual("the question is open again", storeIssue(root, id).status, "open");
    expectEqual("carrying the draft label", storeIssue(root, id).labels.includes(DRAFT), true);
    expectEqual("with nothing else on it", storeIssue(root, id).labels.slice().sort(), [DRAFT, READING].sort());

    const commit = gitC(root, "rev-parse", "main");
    const comments = storeComments(root, id);
    expectEqual("exactly one comment is written", comments.length, 1);
    const lines = comments[0]!.text.split("\n");
    expect("its first line is marked draft", lines[0]!.startsWith("draft:"), lines[0]);
    expect("and names the note", lines[0]!.includes(noteRel), lines[0]);
    expect("and the commit", lines[0]!.includes(commit), lines[0]);
    expectEqual("with the reading's own words under it, byte for byte", comments[0]!.text, `draft: ${noteRel} (commit ${commit})\n\n${draft}`);

    expectEqual("one commit carries the note and the receipt", gitC(root, "log", "-1", "--format=%s"), "read: q/01 what-does-the-tool-hold");
    expectEqual(
      "naming exactly those two paths",
      gitC(root, "show", "--name-only", "--format=", "HEAD").split("\n").sort(),
      [noteRel, receiptRel].sort(),
    );
    expectEqual("the note is in Main", gitC(root, "show", `main:${noteRel}`), noteBody.trim());
    expectEqual("and the receipt too", gitC(root, "show", `main:${receiptRel}`), receiptBody.trim());
    expectEqual("and the reading's own paths are left clean", gitC(root, "status", "--porcelain", "--", corpusRel), "");

    const turn = seen[0]!;
    expectEqual("the turn is the reading role", turn.role, "read");
    expectEqual("keyed by the question's handle", turn.sessionKey, "q/01");
    expectEqual("running where the Target is", turn.cwd, root);
    expectEqual("with the store read-only", turn.env({})[READONLY_ENV], "1");
    expect("its brief is the body's path", turn.prompt.startsWith(bodyPath), turn.prompt);
    expect("plus the corpus the run commits", turn.prompt.includes(`Corpus: ${corpusRel}`), turn.prompt);
    expect("plus the note path", turn.prompt.includes(`Note: ${noteRel}`), turn.prompt);

    // The read-only rule, as the store itself answers it: the turn's write attempt is refused, and the
    // question is exactly where the claim left it.
    expect("the reading turn tried to write the store", turnWrite !== undefined);
    expect("and the store refused it", turnWrite!.status !== 0, turnWrite);
    expect("in its own read-only words", /read-only/.test(turnWrite!.output), turnWrite);
    expectEqual("leaving the question claimed, not closed", statusDuringTurn, "in_progress");
  });

  // ---- A turn that wrote no note failed, whatever it said: the note check, before the commit. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const { id, noteRel } = claimedQuestion(root, {
      title: "a reading with no note",
      type: "decision",
      handle: "q/02",
      slug: "a-reading-with-no-note",
      labels: [READING],
    });
    const before = gitC(root, "rev-parse", "main");

    const outcome = await readQuestion(root, "q/02", {
      artifactsDir: artifacts,
      runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: "a draft with no note" }, lastError: undefined }),
    });

    expectEqual("a turn that wrote no note fails", outcome, FAILED);
    expectEqual("the store holds the attempt, with its ordinal", storeComments(root, id)[0]!.text, `attempt 1 failed: the reading wrote no note at ${noteRel}`);
    expectEqual("the question is open again", storeIssue(root, id).status, "open");
    expectEqual("with no draft label", storeIssue(root, id).labels.includes(DRAFT), false);
    expectEqual("nothing was committed", gitC(root, "rev-parse", "main"), before);
    expectEqual("and no note exists", existsSync(join(root, noteRel)), false);
  });

  // ---- A turn that answered nothing fails even when it wrote a note; the runner's reason is recorded. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const { id, noteRel } = claimedQuestion(root, {
      title: "a silent reading",
      type: "decision",
      handle: "q/03",
      slug: "a-silent-reading",
      labels: [READING],
    });
    const before = gitC(root, "rev-parse", "main");

    const outcome = await readQuestion(root, "q/03", {
      artifactsDir: artifacts,
      runAgent: stub([], { sessionFile: "", answer: { kind: "none" }, lastError: "the model exploded" }, () =>
        write(root, noteRel, "# a note with nobody's words\n"),
      ),
    });

    expectEqual("a turn with no answer fails", outcome, FAILED);
    expectEqual("recording the runner's reason", storeComments(root, id)[0]!.text, "attempt 1 failed: the model exploded");
    expectEqual("the question is open again", storeIssue(root, id).status, "open");
    expectEqual("with no draft label", storeIssue(root, id).labels.includes(DRAFT), false);
    expectEqual("and the note is not committed", gitC(root, "rev-parse", "main"), before);
  });

  // ---- The ordinal is the store's own history: a second failed attempt is attempt 2. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const { id } = claimedQuestion(root, {
      title: "a question that keeps failing",
      type: "decision",
      handle: "q/04",
      slug: "a-question-that-keeps-failing",
      labels: [READING],
    });
    const failing = { sessionFile: "", answer: { kind: "text" as const, text: "no note again" }, lastError: undefined };
    await readQuestion(root, "q/04", { artifactsDir: artifacts, runAgent: stub([], failing) });
    await readQuestion(root, "q/04", { artifactsDir: artifacts, runAgent: stub([], failing) });

    const comments = storeComments(root, id).map((c) => c.text);
    expectEqual("the store holds two failed attempts", comments.length, 2);
    expect("the second is attempt 2", comments[1]!.startsWith("attempt 2 failed: "), comments[1]);
    expectEqual("the question is still open", storeIssue(root, id).status, "open");
  });

  // ---- The turn end to end, through the real default runner and the fake session: it writes the corpus
  //      the brief named, and its last words are the draft answer the node comments. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    process.env.PI_SDK_PATH = fakePiSdk(artifacts, "read");
    const { id, noteRel } = claimedQuestion(root, {
      title: "a reading the fake session writes",
      type: "decision",
      handle: "q/05",
      slug: "a-reading-the-fake-session-writes",
      labels: [READING],
    });
    const receiptRel = join(readingCorpusRel("q/05"), "sources", "fake-receipt.md");

    const outcome = await readQuestion(root, "q/05", { artifactsDir: artifacts });

    expectEqual("the fake session's reading lands", outcome, LANDED);
    expectEqual("the question is open with the draft label", storeIssue(root, id).status, "open");
    expectEqual("carrying the label", storeIssue(root, id).labels.includes(DRAFT), true);
    expect("the receipt came off the session", existsSync(join(root, receiptRel)), receiptRel);
    expect("and so did the note", existsSync(join(root, noteRel)), noteRel);
    expect("the note is in Main", gitC(root, "show", `main:${noteRel}`).startsWith("# a fake note"), noteRel);
    expect("the draft comment is the session's answer", storeComments(root, id)[0]!.text.includes("the session's answer"));
    const sessionFile = roleSessionFile(artifacts, "q/05", "read");
    expect("the turn's session is under the run's artifacts", existsSync(sessionFile), sessionFile);

    // ---- And the silent mode: the same node, a turn that answered nothing, and no reading. ----
    process.env.PI_SDK_PATH = fakePiSdk(artifacts, "read-silent");
    const silent = claimedQuestion(root, {
      title: "a reading that says nothing",
      type: "decision",
      handle: "q/06",
      slug: "a-reading-that-says-nothing",
      labels: [READING],
    });
    const before = gitC(root, "rev-parse", "main");
    const silentOutcome = await readQuestion(root, "q/06", { artifactsDir: artifacts });
    expectEqual("a silent turn does not land", silentOutcome, FAILED);
    expectEqual("the attempt is on the ticket", storeComments(root, silent.id)[0]!.text, "attempt 1 failed: the reading turn produced no draft answer");
    expectEqual("back to open", storeIssue(root, silent.id).status, "open");
    expectEqual("no draft label", storeIssue(root, silent.id).labels.includes(DRAFT), false);
    expectEqual("no note was written", existsSync(join(root, silent.noteRel)), false);
    expectEqual("and nothing was committed", gitC(root, "rev-parse", "main"), before);
  });

  // ---- The node itself, through the protocol the runner uses: env in, one token out. ----------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const { id } = claimedQuestion(root, {
      title: "a reading the runner drives",
      type: "decision",
      handle: "q/07",
      slug: "a-reading-the-runner-drives",
      labels: [READING],
    });

    const r = runScript(readBlock.script("read"), root, {
      ARTIFACTS_DIR: artifacts,
      INPUTS_ISSUE: "q/07",
      PI_SDK_PATH: fakePiSdk(artifacts, "read"),
    });

    expectEqual("the read node prints its token and nothing else", r.stdout, nodeLine(LANDED));
    expectEqual("as a result, not an error", r.status, 0);
    expectEqual("the question stays open", storeIssue(root, id).status, "open");
    expectEqual("with the draft label", storeIssue(root, id).labels.includes(DRAFT), true);
  });

  // ---- Nothing in this executor closes a question: the closure is a session's act on the operator's word.
  //      Checked at the source of every script and YAML the executor runs, and at the store above: a
  //      landed reading leaves the question open.
  for (const file of [
    readBlock.script("read"),
    readBlock.script("reading"),
    readBlock.yaml,
    inquiry.script("inquiry"),
    inquiry.script("leftovers"),
    inquiry.script("open"),
    inquiry.script("pick"),
    inquiry.yaml,
  ]) {
    const source = readFileSync(file, "utf8");
    expect(`${file} never closes an issue`, !/closeIssue\s*\(/.test(source), source.slice(0, 200));
    expect(`${file} needs no close command`, !/"close"\s*,/.test(source), source.slice(0, 200));
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
} finally {
  for (const name of TOUCHED_ENV) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
}
