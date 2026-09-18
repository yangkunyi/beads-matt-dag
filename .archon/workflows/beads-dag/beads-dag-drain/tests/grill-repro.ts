#!/usr/bin/env bun
/**
 * Repro: a grill run against one seed id writes the next round onto that issue.
 *
 * The node under test is `grill.ts`. A stub runner drives its exported entry (`grillSeed`), so the
 * turn costs nothing and the assertions are about what an observer outside the pack sees: the store's
 * own comments, git (a glossary commit when the turn wrote one), and that drain / inquiry / experiment
 * are not this run.
 *
 * What is pinned here:
 *
 *   - a first turn writes round 1 onto the seed and stops;
 *   - a later turn that sees answers writes the next round, or Done when the frontier is empty;
 *   - a later turn that does not see answers is waiting — no second round, no turn spent;
 *   - a first turn that answers Done fails;
 *   - the turn runs with the store read-only;
 *   - the run does not publish development tickets, and it is not an approval gate.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { grillSeed } from "../../beads-dag-grill/scripts/grill.ts";
import type { PackAgentOpts, PackAgentResult } from "../../scripts/agent.ts";
import { DONE, FAILED, ROUND, WAITING } from "../../scripts/node-outcomes.ts";
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

const ROUND1 = "❓ **Q1** - **Name**: what is this called?\n\n➡️ widget";
const ROUND2 = "❓ **Q2** - **Scope**: does it cover returns?\n\n➡️ yes";

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
      runAgent: stub(seen, { sessionFile: "", answer: { kind: "text", text: ROUND1 }, lastError: undefined }, (opts) => {
        const r = spawnSync(storeBinary(), ["comment", seed.id, "the turn must not write"], {
          cwd: root,
          env: opts.env(process.env),
          encoding: "utf8",
        });
        turnWrite = { status: r.status, output: `${r.stderr ?? ""}${r.stdout ?? ""}`.trim() };
      }),
    });

    expectEqual("the first turn writes a round", outcome, ROUND);
    expectEqual("the seed stays open", storeIssue(root, seed.id).status, "open");
    const comments = storeComments(root, seed.id);
    expectEqual("exactly one comment is written", comments.length, 1);
    expect("its first line is round 1", comments[0]!.text.startsWith("round 1"), comments[0]!.text);
    expect("and carries the round body", comments[0]!.text.includes("**Name**"), comments[0]!.text);

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

  // ---- A later turn that sees answers writes the next round. --------------------------------------
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const seed = publishIssue(root, {
      title: "what should this be",
      type: "decision",
      handle: "idea/02",
      slug: "what-should-this-be-2",
    });
    const first = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: ROUND1 }, lastError: undefined }),
    });
    expectEqual("round 1 lands", first, ROUND);
    bd(root, "comment", seed.id, "Q1: widget, go with that");

    const seen: PackAgentOpts[] = [];
    const second = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub(seen, { sessionFile: "", answer: { kind: "text", text: ROUND2 }, lastError: undefined }),
    });
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
    await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: ROUND1 }, lastError: undefined }),
    });
    bd(root, "comment", seed.id, "yes, widget is the name");

    const before = listedIds(root);
    const outcome = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], {
        sessionFile: "",
        answer: { kind: "text", text: "Done\n\nThe frontier is empty." },
        lastError: undefined,
      }),
    });
    expectEqual("the later turn records Done", outcome, DONE);
    const last = storeComments(root, seed.id).at(-1)!.text;
    expect("the last comment is Done", last.startsWith("Done"), last);
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
    await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: ROUND1 }, lastError: undefined }),
    });
    const seen: PackAgentOpts[] = [];
    const outcome = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub(seen, { sessionFile: "", answer: { kind: "text", text: ROUND2 }, lastError: undefined }),
    });
    expectEqual("without answers the turn is waiting", outcome, WAITING);
    expectEqual("and spends no agent turn", seen.length, 0);
    expectEqual("exactly one comment remains", storeComments(root, seed.id).length, 1);
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
    const outcome = await grillSeed(root, seed.id, {
      artifactsDir: artifacts,
      runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: "Done" }, lastError: undefined }),
    });
    expectEqual("Done on a fresh seed fails", outcome, FAILED);
    expectEqual(
      "the store holds the attempt",
      storeComments(root, seed.id)[0]!.text,
      "attempt 1 failed: a first turn writes round 1, not Done",
    );
  });

  // ---- A silent turn fails. -----------------------------------------------------------------------
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
      runAgent: stub([], { sessionFile: "", answer: { kind: "none" }, lastError: "the model exploded" }),
    });
    expectEqual("a silent turn fails", outcome, FAILED);
    expectEqual("recording the runner's reason", storeComments(root, seed.id)[0]!.text, "attempt 1 failed: the model exploded");
  });

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
      runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: ROUND1 }, lastError: undefined }, () => {
        mkdirSync(join(root, "docs"), { recursive: true });
        writeFileSync(join(root, "docs", "CONTEXT.md"), glossary);
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
