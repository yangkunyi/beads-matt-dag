#!/usr/bin/env bun
/**
 * Repro: a grill run against one seed id writes the next round onto that issue.
 *
 * The node under test is `grill.ts`. A stub runner drives its exported entry (`grillSeed`), so the
 * turn costs nothing and the assertions are about what an observer outside the pack sees: the store's
 * own comments, git (a glossary commit when the turn wrote one), and that drain / inquiry / experiment
 * are not this run.
 *
 * The turn's only channel is the round tool (`round-tool.ts`), so the stub plays the tool's effect: it
 * writes the submission file the tool would write and returns no prose at all. That is deliberate - the
 * node must work from the file, so a regression back to reading the model's text fails here.
 *
 * What is pinned here:
 *
 *   - a first turn writes round 1 onto the seed and stops;
 *   - the comment it writes is the canonical shape the operator surface reads, numbered by the node;
 *   - a later turn that sees answers writes the next round, or Done when the frontier is empty;
 *   - a later turn that does not see answers is waiting — no second round, no turn spent;
 *   - a chat comment is not an answer and does not consume a round;
 *   - a turn that calls neither tool fails, and so does Done on a fresh seed;
 *   - the round tool refuses a recommendation that is not one of its choices, and a second delivery;
 *   - the turn runs with the store read-only;
 *   - the run does not publish development tickets, and it is not an approval gate.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { grillSeed } from "../../beads-dag-grill/scripts/grill.ts";
import type { PackAgentOpts, PackAgentResult } from "../../scripts/agent.ts";
import { DONE, FAILED, ROUND, WAITING } from "../../scripts/node-outcomes.ts";
import { DONE_FILE, ROUND_FILE, roundTools, type Submission } from "../../scripts/round-tool.ts";
import { READONLY_ENV } from "../../scripts/worker-env.ts";
import {
  bd,
  expect,
  expectEqual,
  gitC,
  grill,
  publishIssue,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

const ROUND1: Submission = {
  kind: "round",
  questions: [
    {
      title: "Name",
      body: "what is this called?",
      choices: ["widget", "gadget"],
      recommended: "widget",
    },
  ],
};
const ROUND2: Submission = {
  kind: "round",
  questions: [
    {
      title: "Scope",
      body: "does it cover returns?",
      choices: ["yes", "no"],
      recommended: "yes",
    },
  ],
};
const DONE_NOW: Submission = { kind: "done", summary: "The frontier is empty." };

/** A stub turn: it plays the tool's effect, and answers no prose at all. */
function stub(
  seen: PackAgentOpts[],
  submission: Submission | undefined,
  options: { lastError?: string; work?: (opts: PackAgentOpts) => void } = {},
): (opts: PackAgentOpts) => Promise<PackAgentResult> {
  return async (opts) => {
    seen.push(opts);
    options.work?.(opts);
    if (submission !== undefined) {
      const file = submission.kind === "round" ? ROUND_FILE : DONE_FILE;
      writeFileSync(join(opts.artifactsDir, file), `${JSON.stringify(submission)}\n`);
    }
    return { sessionFile: "", answer: { kind: "none" }, lastError: options.lastError };
  };
}

function listedIds(root: string): string[] {
  return JSON.parse(bd(root, "list", "--all", "--json", "--limit", "0")).map((i: { id: string }) => i.id);
}

try {
  // ---- Round 1 lands on a fresh seed. -------------------------------------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "what should this be",
      type: "decision",
      handle: "idea/01",
      slug: "what-should-this-be",
      body: "# idea/01 - what should this be\n\nA product idea, still foggy.\n",
    });
    const before = listedIds(root);
    const bodyPath = join(root, ".scratch", "idea", "issues", "01-what-should-this-be.md");
    const seen: PackAgentOpts[] = [];
    let turnWrite: { status: number | null; output: string } | undefined;
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");

    const outcome = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub(seen, ROUND1, {
        work: (opts) => {
          const r = spawnSync(storeBinary(), ["comment", seed.id, "the turn must not write"], {
            cwd: root,
            env: opts.env(process.env),
            encoding: "utf8",
          });
          turnWrite = { status: r.status, output: `${r.stderr ?? ""}${r.stdout ?? ""}`.trim() };
        },
      }),
    });

    expectEqual("the first turn writes a round", outcome, ROUND);
    expectEqual("the seed stays open", storeIssue(root, seed.id).status, "open");
    const comments = storeComments(root, seed.id);
    expectEqual("exactly one comment is written", comments.length, 1);
    expect("its first line is round 1", comments[0]!.text.startsWith("round 1"), comments[0]!.text);
    expect(
      "the comment is the canonical shape the surface reads",
      comments[0]!.text.includes("❓ **Q1** - **Name**: what is this called?"),
      comments[0]!.text,
    );
    expect("with each choice on its own line", comments[0]!.text.includes("\n- widget\n"), comments[0]!.text);
    expect("and the recommendation on the arrow line", comments[0]!.text.includes("\n➡️ widget\n"), comments[0]!.text);

    const turn = seen[0]!;
    expectEqual("the turn is the grill role", turn.role, "grill");
    expectEqual("keyed by the seed's handle", turn.sessionKey, "idea/01");
    expectEqual("running where the Target is", turn.cwd, root);
    expectEqual("with the store read-only", turn.env({})[READONLY_ENV], "1");
    expect("its brief is the body's path", turn.prompt.startsWith(bodyPath), turn.prompt);
    expect("plus the seed id", turn.prompt.includes(`Seed: ${seed.id}`), turn.prompt);
    expect("plus next round 1", turn.prompt.includes("Next round: 1"), turn.prompt);
    expect("the turn tried to write the store", turnWrite !== undefined);
    expect("and the store refused it", turnWrite!.status !== 0, turnWrite);
    expect("in its own read-only words", /read-only/.test(turnWrite!.output), turnWrite);
    expectEqual("no new issue was published", listedIds(root), before);
  });

  // ---- The node numbers the questions, not the turn. ----------------------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "two questions at once",
      type: "decision",
      handle: "idea/08",
      slug: "two-questions-at-once",
    });
    const two: Submission = {
      kind: "round",
      questions: [
        { title: "Name", body: "what is this called?", choices: ["widget", "gadget"], recommended: "widget" },
        { title: "Scope", body: "does it cover returns?", choices: ["yes", "no"], recommended: "no" },
      ],
    };
    const outcome = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], two) });
    expectEqual("a round with two questions lands", outcome, ROUND);
    const text = storeComments(root, seed.id)[0]!.text;
    expect("the first is Q1", text.includes("❓ **Q1** - **Name**"), text);
    expect("the second is Q2", text.includes("❓ **Q2** - **Scope**"), text);
    expect("each keeps its own recommendation", text.includes("\n➡️ widget\n") && text.includes("\n➡️ no\n"), text);
  });

  // ---- A later turn that sees answers writes the next round. --------------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "what should this be",
      type: "decision",
      handle: "idea/02",
      slug: "what-should-this-be-2",
    });
    const first = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], ROUND1) });
    expectEqual("round 1 lands", first, ROUND);
    bd(root, "comment", seed.id, "Q1: widget");

    const seen: PackAgentOpts[] = [];
    const second = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub(seen, ROUND2) });
    expectEqual("a later turn writes the next round", second, ROUND);
    expect("and asked for round 2", seen[0]!.prompt.includes("Next round: 2"), seen[0]!.prompt);
    const comments = storeComments(root, seed.id).map((c) => c.text);
    expect("round 2 is on the seed", comments.some((c) => c.startsWith("round 2")), comments);
    expectEqual("the seed stays open", storeIssue(root, seed.id).status, "open");
  });

  // ---- A later turn that sees answers can record that the frontier is empty. ----------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "a small idea",
      type: "decision",
      handle: "idea/03",
      slug: "a-small-idea",
    });
    await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], ROUND1) });
    bd(root, "comment", seed.id, "Q1: widget");

    const before = listedIds(root);
    const outcome = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], DONE_NOW) });
    expectEqual("the later turn records Done", outcome, DONE);
    const last = storeComments(root, seed.id).at(-1)!.text;
    expect("the last comment is Done", last.startsWith("Done"), last);
    expect("carrying the summary", last.includes("The frontier is empty."), last);
    expectEqual("no development ticket was published", listedIds(root), before);
    expectEqual("the seed stays open", storeIssue(root, seed.id).status, "open");
  });

  // ---- Waiting: a later turn that does not see answers writes nothing. ----------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "waiting on answers",
      type: "decision",
      handle: "idea/04",
      slug: "waiting-on-answers",
    });
    await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], ROUND1) });
    const seen: PackAgentOpts[] = [];
    const outcome = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub(seen, ROUND2) });
    expectEqual("without answers the turn is waiting", outcome, WAITING);
    expectEqual("and spends no agent turn", seen.length, 0);
    expectEqual("exactly one comment remains", storeComments(root, seed.id).length, 1);
  });

  // ---- A chat comment is not an answer: it must not consume a round. ------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "a chatty operator",
      type: "decision",
      handle: "idea/09",
      slug: "a-chatty-operator",
    });
    await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], ROUND1) });
    bd(root, "comment", seed.id, "thinking out loud: maybe gadget after all?");

    const seen: PackAgentOpts[] = [];
    const outcome = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub(seen, ROUND2) });
    expectEqual("a chat comment leaves the round waiting", outcome, WAITING);
    expectEqual("and spends no turn", seen.length, 0);
  });

  // ---- A first turn that answers Done fails: round 1 is what a fresh seed writes. -----------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "too sure too soon",
      type: "decision",
      handle: "idea/05",
      slug: "too-sure-too-soon",
    });
    const outcome = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], DONE_NOW) });
    expectEqual("Done on a fresh seed fails", outcome, FAILED);
    expectEqual(
      "the store holds the attempt",
      storeComments(root, seed.id)[0]!.text,
      "attempt 1 failed: a first turn writes round 1, not Done",
    );
  });

  // ---- A turn that calls neither tool fails, whatever prose it wrote. -----------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "no round delivered",
      type: "decision",
      handle: "idea/10",
      slug: "no-round-delivered",
    });
    const outcome = await grillSeed(root, seed.id, { artifactsDir: artifacts, runAgent: stub([], undefined) });
    expectEqual("a turn with no submission fails", outcome, FAILED);
    expectEqual(
      "naming the tools it did not call",
      storeComments(root, seed.id)[0]!.text,
      "attempt 1 failed: the grill turn submitted no round: neither submit_round nor submit_done was called",
    );
  });

  // ---- A turn whose runner failed records the runner's reason. ------------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "a silent grill",
      type: "decision",
      handle: "idea/06",
      slug: "a-silent-grill",
    });
    const outcome = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], undefined, { lastError: "the model exploded" }),
    });
    expectEqual("a silent turn fails", outcome, FAILED);
    expectEqual("recording the runner's reason", storeComments(root, seed.id)[0]!.text, "attempt 1 failed: the model exploded");
  });

  // ---- The round tool's own refusals: what the schema cannot say. ---------------------------------
  {
    const artifacts = mkdtempSync(join(tmpdir(), "round-tool-"));
    const tools = roundTools({ defineTool: (definition: unknown) => definition }, { artifactsDir: artifacts }) as {
      name: string;
      execute: (id: string, params: unknown) => Promise<unknown>;
    }[];
    const round = tools.find((tool) => tool.name === "submit_round")!;
    const done = tools.find((tool) => tool.name === "submit_done")!;
    const refusal = async (params: unknown): Promise<string> => {
      try {
        await round.execute("call", params);
        return "";
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    };
    const good = { questions: [{ title: "Name", body: "what?", choices: ["a", "b"], recommended: "a" }] };
    const nearMiss = { questions: [{ title: "Name", body: "what?", choices: ["a", "b"], recommended: "a." }] };
    const oneChoice = { questions: [{ title: "Name", body: "what?", choices: ["a"], recommended: "a" }] };
    const twoLines = { questions: [{ title: "Name", body: "what?", choices: ["a", "b\nc"], recommended: "a" }] };

    expect("a recommendation that is not a choice is refused", (await refusal(nearMiss)).includes("not one of its choices"));
    expect("naming the choices", (await refusal(nearMiss)).includes("[a | b]"));
    expect("a single choice is refused", (await refusal(oneChoice)).includes("at least two choices"));
    expect("a choice with a newline is refused", (await refusal(twoLines)).includes("must be one line"));
    expectEqual("a good round is accepted", await refusal(good), "");
    expect(
      "and a second delivery in the same turn is refused",
      (await refusal(good)).includes("already delivered"),
    );
    const doneTools = roundTools({ defineTool: (definition: unknown) => definition }, { artifactsDir: artifacts });
    const freshDone = (doneTools as { name: string; execute: (id: string, params: unknown) => Promise<unknown> }[]).find(
      (tool) => tool.name === "submit_done",
    )!;
    expect(
      "Done needs a summary",
      await freshDone
        .execute("call", { summary: "  " })
        .then(() => "")
        .catch((e: unknown) => (e instanceof Error ? e.message : String(e)))
        .then((message: string) => message.includes("needs a summary")),
    );
    rmSync(artifacts, { recursive: true, force: true });
  }

  // ---- Glossary the turn wrote lands as one path-scoped commit. -----------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "a term crystallises",
      type: "decision",
      handle: "idea/07",
      slug: "a-term-crystallises",
    });
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");
    const glossary = "# Product\n\n**Widget**:\nThe thing.\n";
    const outcome = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], ROUND1, {
        work: () => {
          mkdirSync(join(root, "docs"), { recursive: true });
          writeFileSync(join(root, "docs", "CONTEXT.md"), glossary);
        },
      }),
    });
    expectEqual("the round lands", outcome, ROUND);
    expectEqual("one commit carries the glossary", gitC(root, "log", "-1", "--format=%s"), "grill: idea/07 a-term-crystallises");
    expectEqual("naming the glossary", gitC(root, "show", "--name-only", "--format=", "HEAD"), "docs/CONTEXT.md");
    expectEqual("and the bytes", gitC(root, "show", "HEAD:docs/CONTEXT.md"), glossary.trim());
    const first = storeComments(root, seed.id)[0]!.text.split("\n", 1)[0]!;
    expect("the round line names the commit", /round 1 \(commit [0-9a-f]{7,64}\)$/.test(first), first);
  });

  // ---- Not an approval gate, and this run does not create issues. ---------------------------------
  const yaml = readFileSync(grill.yaml, "utf8");
  expect("the grill run is not an approval gate", !/approval\s*:/.test(yaml), yaml.slice(0, 200));
  for (const file of [grill.script("open"), grill.script("grill"), grill.script("report"), grill.script("rounds"), grill.yaml]) {
    const source = readFileSync(file, "utf8");
    expect(`${file} never creates an issue`, !/"create"\s*,/.test(source), source.slice(0, 200));
    expect(`${file} never closes an issue`, !/closeIssue\s*\(/.test(source), source.slice(0, 200));
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
