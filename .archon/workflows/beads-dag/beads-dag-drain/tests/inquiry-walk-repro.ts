#!/usr/bin/env bun
/**
 * Repro: the whole way, once - the operator's question, a reading with the Target's own tools, the draft
 * answer on the ticket, and the session's answer closing it in one act.
 *
 * This is the arc `beads-dag/29` asks for, walked in a lab: one real store, one real git Target, the
 * real nodes the loop runs (`open`, `pick`, `report`) and the per-ticket entry the fan-out calls
 * (`readQuestion`), with the Target's own copy of `tools/inquiry/` doing the reading. Nothing here is a
 * fake store, and the note the node commits is the note the real `note.ts` wrote: the claims re-anchor
 * inside `note.ts`, and the file it leaves is the file the node's existence check looks for.
 *
 * The one thing a lab cannot have is the model. The turn is a stub runner (the `executeIssue` seam the
 * other reading repros use), and it does what the persona tells the reader to do: fetch a receipt, hand
 * the claims to `note.ts` the way its header documents, and answer with what the sources hold - including
 * what they do not, because a claim whose quote cannot be re-found is refused and said out loud.
 *
 * What is pinned, in the order the walk happens:
 *
 *   1. the operator's publication: a `decision` ticket labelled `wayfinder:research`, carrying the handle
 *      and slug the note's path derives from, with its body at the handle's path;
 *   2. the executable half: `open` takes the run lock, `pick` offers exactly that handle, the reading
 *      lands (one path-scoped commit carrying the note and the receipt; a comment whose first line is the
 *      `draft` line; the `answer:draft` label and the status back to `open`, in one store command);
 *   3. the note holds what the sources hold: the anchored claim is in it, the refused one is not, and the
 *      tool printed the refusal;
 *   4. the reader's working file is not a document: it stays out of the commit, and the run's report names
 *      it - the spec's rule for a path the run wrote that the flow does not name;
 *   5. `report` is readable: the landed row names the note and the commit, the headline counts one draft
 *      awaiting the operator, and that section is that one handle;
 *   6. the operator's half: the answer is appended as a comment (never an edit), and the close takes the
 *      label off **in the same store command** - `bd update <id> -s closed --remove-label answer:draft`,
 *      the one act available: `bd close` has no label flag and `bd batch` has no label key;
 *   7. the walk ends where the flow says it does: the ticket closed with the reading's label still on it,
 *      the sweep query empty, and the next report's awaiting section saying `none`.
 *
 * A second, shorter block walks the failure side of the same rule: a turn that wrote a working file and no
 * note fails (`attempt 1 failed:`), and what it left is named by the run's report all the same.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readQuestion } from "../../beads-dag-read/scripts/read.ts";
import type { PackAgentOpts } from "../../scripts/agent.ts";
import { LANDED, OPENED, REPORTED, nodeLine } from "../../scripts/node-outcomes.ts";
import {
  bd,
  expect,
  expectEqual,
  gitC,
  inquiry,
  publishIssue,
  readingCorpusRel,
  readingNoteRel,
  runScript,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/**
 * `tools/inquiry/` lives in the repository, not in the pack - a Target copies it in - and the suite runs
 * from this repository, so git names the root. A missing tool fails this repro loudly, never silently.
 */
const REPO_ROOT = execFileSync("git", ["-C", import.meta.dir, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const TOOLS = join(REPO_ROOT, "tools", "inquiry");
if (!existsSync(join(TOOLS, "note.ts"))) {
  throw new Error(`no ${TOOLS}/note.ts: the walk drives the Target-side tools the flow's reading uses`);
}

const HANDLE = "walk/01";
const SLUG = "what-the-source-holds";
const QUESTION = "what does the walk's source hold?";
const READING = "wayfinder:research";
const DRAFT = "answer:draft";
const SOURCE_ID = "url:https://example.invalid/walk";
const RECEIPT_TEXT = "the walk's source says one thing";
/** One claim that re-anchors in the receipt, and one nobody could re-find. */
const ANCHORED = `the source holds one thing`;
const REFUSED_QUOTE = "the flow should keep it, so the reading says";
const CLAIMS = [
  { statement: ANCHORED, sourceId: SOURCE_ID, locator: "opening", quote: RECEIPT_TEXT },
  { statement: "the flow should keep one thing", sourceId: SOURCE_ID, locator: "opening", quote: REFUSED_QUOTE },
];

/** One file the reading's turn wrote, at a path relative to the Target. */
function write(root: string, rel: string, body: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
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

try {
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    mkdirSync(join(root, "tools"), { recursive: true });
    cpSync(TOOLS, join(root, "tools", "inquiry"), { recursive: true });

    // ---- 1. The operator's question, published the way the tracker publishes one. ----
    const issue = publishIssue(root, {
      title: QUESTION,
      type: "decision",
      handle: HANDLE,
      slug: SLUG,
      labels: [READING],
      body: `# ${HANDLE} - ${QUESTION}\n\nThe operator's question, in his own words.\n`,
    });
    const bodyPath = join(root, ".scratch", "walk", "issues", "01-what-the-source-holds.md");
    const corpusRel = readingCorpusRel(HANDLE);
    const noteRel = readingNoteRel(HANDLE, SLUG);
    // The receipt's file name is the real `sourceSlug`'s answer for the id, spelled as a literal here:
    // the walk observes the tool's own file, and the commit has to name the path the tool chose.
    const receiptRel = join(corpusRel, "sources", "url-https-example.invalid-walk.md");
    const claimsRel = join(corpusRel, "claims.json");
    // The Target's own files - the body, the config, the tool copy - are committed first, so the reading's
    // commit holds the reading's documents and nothing else.
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");

    // ---- 2. The executable half: open, pick, and the reading itself. ----
    const opened = runScript(inquiry.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open takes the run lock and opens the store", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);

    const picked = runScript(inquiry.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("pick offers exactly the operator's question", JSON.parse(picked.stdout), [HANDLE]);
    expectEqual("pick exits clean", picked.status, 0);

    const seen: PackAgentOpts[] = [];
    let noteTool: { status: number | null; output: string } | undefined;
    const answer = [
      "The sources hold: one thing, and the note carries it with its quote.",
      `What they do not: ${REFUSED_QUOTE} was not found in the receipt, so note.ts refused it and the note`,
      "does not carry it.",
      `The note is at ${noteRel}.`,
    ].join("\n");

    const outcome = await readQuestion(root, HANDLE, {
      artifactsDir: artifacts,
      runAgent: async (opts) => {
        seen.push(opts);
        // The Target's own tools, run the way their headers document them: a receipt written by the corpus
        // module, then the note written by note.ts, which re-anchors every claim against its receipt.
        const corpus: { writeReceipt: (dir: string, src: Record<string, unknown>) => string } = await import(
          join(root, "tools", "inquiry", "corpus.ts")
        );
        corpus.writeReceipt(join(root, corpusRel), {
          id: SOURCE_ID,
          aliases: [],
          url: "https://example.invalid/walk",
          kind: "url",
          http: 200,
          extract: "html -> text",
          title: "the source the walk read",
          text: `${RECEIPT_TEXT}\n`,
        });
        write(root, claimsRel, `${JSON.stringify(CLAIMS, null, 2)}\n`);
        const run = spawnSync(
          process.execPath,
          [
            join("tools", "inquiry", "note.ts"),
            "--corpus",
            corpusRel,
            "--question",
            QUESTION,
            "--claims",
            claimsRel,
            "--slug",
            SLUG,
          ],
          { cwd: root, encoding: "utf8" },
        );
        noteTool = { status: run.status, output: `${run.stdout ?? ""}${run.stderr ?? ""}`.trim() };
        return {
          sessionFile: join(artifacts, "sessions", HANDLE, "read.jsonl"),
          answer: { kind: "text", text: answer },
          lastError: undefined,
        };
      },
    });
    expectEqual("the reading lands", outcome, LANDED);

    // The turn was the reading role, in the Target, read-only in the store, briefed with the body and the
    // two paths the run will check and commit.
    const turn = seen[0]!;
    expectEqual("the turn is the reading role", turn.role, "read");
    expectEqual("keyed by the question's handle", turn.sessionKey, HANDLE);
    expectEqual("running where the Target is", turn.cwd, root);
    expect("its brief is the body's path", turn.prompt.startsWith(bodyPath), turn.prompt);
    expect("plus the corpus", turn.prompt.includes(`Corpus: ${corpusRel}`), turn.prompt);
    expect("plus the note path", turn.prompt.includes(`Note: ${noteRel}`), turn.prompt);

    // ---- 3. The note holds what the sources hold, and the claims re-anchor. ----
    expect("note.ts wrote the note", noteTool !== undefined && noteTool.status === 0, noteTool);
    expect("keeping the anchored claim only", noteTool!.output.includes("kept:   1/2"), noteTool!.output);
    expect("and printing the refusal", noteTool!.output.includes("REFUSED"), noteTool!.output);
    const note = readFileSync(join(root, noteRel), "utf8");
    expect("the anchored claim is in the note", note.includes(ANCHORED), note);
    expect("its quote is too", note.includes(RECEIPT_TEXT), note);
    expect("the claim that could not re-anchor is not", !note.includes("the flow should keep one thing"), note);
    expect("the note names the source it came from", note.includes(SOURCE_ID), note);

    // ---- 4. The landing: the commit, the draft comment, the label, the status. ----
    const commit = gitC(root, "rev-parse", "main");
    expectEqual("the question is open again", storeIssue(root, issue.id).status, "open");
    expectEqual("carrying the draft label", storeIssue(root, issue.id).labels.includes(DRAFT), true);
    const comments = storeComments(root, issue.id);
    expectEqual("one comment carries the draft", comments.length, 1);
    expectEqual(
      "whose first line names the note and the commit",
      comments[0]!.text.split("\n")[0],
      `draft: ${noteRel} (commit ${commit})`,
    );
    expect("with the reading's own words under it", comments[0]!.text.endsWith(answer), comments[0]!.text);
    expectEqual(
      "the commit is the domain's word for the ticket",
      gitC(root, "log", "-1", "--format=%s"),
      `read: ${HANDLE} ${SLUG}`,
    );
    expectEqual(
      "carrying the note and the receipt",
      gitC(root, "show", "--name-only", "--format=", "HEAD").split("\n").sort(),
      [noteRel, receiptRel].sort(),
    );
    // The reader's working file is not one of the flow's documents: it is not committed, it stays in the
    // working tree, and the run's report is what says so (the spec's rule for an unnamed path).
    expect("the working file is not in the commit", !gitC(root, "show", "--name-only", "--format=", "HEAD").includes("claims.json"));
    expectEqual("and is still in the working tree", existsSync(join(root, claimsRel)), true);

    // ---- 5. The report a human reads: what landed, and the one line that matters at 9am. ----
    const reported = runScript(inquiry.script("report"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run reports", reported.stdout, nodeLine(REPORTED));
    expectEqual("report exits clean", reported.status, 0);
    const report = readFileSync(join(artifacts, "report.md"), "utf8");
    expect("the headline counts the draft awaiting the operator", headline(report).includes("1 awaiting the operator"), headline(report));
    const landed = section(report, "Read and landed");
    expectEqual("one landed row", landed.length, 1);
    expect("naming the handle and the store id", landed[0]!.startsWith(`- ${HANDLE} [${issue.id}]`), landed[0]);
    expect("the note", landed[0]!.includes(noteRel), landed[0]);
    expect("the commit", landed[0]!.includes(commit), landed[0]);
    expect("and the label it stamped", landed[0]!.includes(DRAFT), landed[0]);
    expectEqual("the awaiting section is the one handle", section(report, "Draft answers awaiting the operator"), [`- ${HANDLE}`]);
    expectEqual(
      "and the unnamed path the run wrote is named",
      section(report, "Left uncommitted"),
      [`- ${HANDLE} — ${claimsRel} (not committed)`],
    );

    // ---- 6. The operator's half: the answer appended, then one act that closes and unlabels. ----
    const final = "Final answer: one thing, and the note's refusal is why the second claim is not there.";
    bd(root, "comment", issue.id, final);
    // The one store command that is both jobs. `bd close` has no label flag (`unknown flag:
    // --remove-label`) and `bd batch` has no label key, so a session that closed first and unlabelled
    // second would have broken the contract's one act - and left the label lying on a closed ticket.
    bd(root, "update", issue.id, "-s", "closed", "--remove-label", DRAFT);

    expectEqual("the ticket is closed", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the reading's own label still on it", storeIssue(root, issue.id).labels, [READING]);
    expectEqual(
      "and both the draft and the answer in the thread, in that order",
      storeComments(root, issue.id).map((c) => (c.text.endsWith(final) ? "answer" : "draft")),
      ["draft", "answer"],
    );
    expectEqual(
      "the sweep the contract names is empty",
      bd(root, "list", "-t", "decision", "-s", "open", "-l", DRAFT, "--json"),
      "[]",
    );

    // ---- 7. The next report says nothing awaits the operator, and the closing moved nothing. ----
    const after = runScript(inquiry.script("report"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run reports again after the close", after.stdout, nodeLine(REPORTED));
    const reread = readFileSync(join(artifacts, "report.md"), "utf8");
    expect("nothing awaits the operator any more", headline(reread).includes("0 awaiting the operator"), headline(reread));
    expectEqual("the awaiting section says so", section(reread, "Draft answers awaiting the operator"), ["none"]);
    expectEqual("nothing is eligible either", section(reread, "Frontier left behind"), ["nothing eligible"]);
    expectEqual("the close moved no commit", gitC(root, "rev-parse", "main"), commit);
  });

  // ---- A turn that wrote no note failed, and what it left is named by the report all the same. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    mkdirSync(join(root, "tools"), { recursive: true });
    cpSync(TOOLS, join(root, "tools", "inquiry"), { recursive: true });
    const issue = publishIssue(root, {
      title: QUESTION,
      type: "decision",
      handle: HANDLE,
      slug: SLUG,
      labels: [READING],
      body: `# ${HANDLE} - ${QUESTION}\n\nThe operator's question, in his own words.\n`,
    });
    const corpusRel = readingCorpusRel(HANDLE);
    const claimsRel = join(corpusRel, "claims.json");
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");

    const outcome = await readQuestion(root, HANDLE, {
      artifactsDir: artifacts,
      runAgent: async () => {
        // A reading that got as far as its working file and no further: no note, so nothing lands.
        write(root, claimsRel, `${JSON.stringify(CLAIMS, null, 2)}\n`);
        return {
          sessionFile: join(artifacts, "sessions", HANDLE, "read.jsonl"),
          answer: { kind: "text", text: "a draft with no note under it" },
          lastError: undefined,
        };
      },
    });
    expectEqual("the reading does not land", outcome, "failed");
    expectEqual("the question goes back to open", storeIssue(root, issue.id).status, "open");
    expectEqual("with no draft label", storeIssue(root, issue.id).labels.includes(DRAFT), false);
    expect(
      "and the store's own failure record",
      storeComments(root, issue.id).some((c) => c.text.startsWith("attempt 1 failed: the reading wrote no note")),
      storeComments(root, issue.id),
    );

    const reported = runScript(inquiry.script("report"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("the run still reports", reported.stdout, nodeLine(REPORTED));
    const report = readFileSync(join(artifacts, "report.md"), "utf8");
    expectEqual(
      "and names what the failed turn left",
      section(report, "Left uncommitted"),
      [`- ${HANDLE} — ${claimsRel} (not committed)`],
    );
  });
  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
