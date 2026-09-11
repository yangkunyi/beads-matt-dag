#!/usr/bin/env bun
/**
 * Repro: one brief, one path, frozen.
 *
 * The implementer's whole brief is the path of the issue's body: the executor derives that path from
 * the issue's two metadata keys and hands the implementer nothing else, so one tool call reads the
 * whole issue. The body is the published file - it is not the worktree's copy, it is not duplicated
 * into a prompt, and no node in the pack writes it: the run is expected to complete with the brief
 * unwritable, and its bytes are expected to be the ones the tracker published.
 */
import { chmodSync, readFileSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { FAILED } from "../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  drain,
  expect,
  expectEqual,
  publishIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/** The body the fixture publishes, with one line only the whole file has. */
const BODY = [
  "# feat/01 - the whole issue",
  "",
  "## What to build",
  "",
  "The implementer reads exactly this, from the path it was handed.",
  "",
  "## Criteria",
  "",
  "- [ ] a criterion only the whole body carries",
  "",
].join("\n");

/** The stub agent: it reads the brief it was handed, and answers the way a session would. */
function reader(seen: PackAgentOpts[], read: string[]): (opts: PackAgentOpts) => Promise<PackAgentResult> {
  return async (opts) => {
    seen.push(opts);
    read.push(readFileSync(opts.prompt, "utf8"));
    return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
  };
}

try {
  // The implementer is handed the body's path, and can read the whole issue from it.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "the whole issue",
      handle: "feat/01",
      slug: "the-whole-issue",
      labels: [GATE_LABEL],
      body: BODY,
    });
    const published = join(root, ".scratch", "feat", "issues", "01-the-whole-issue.md");
    expectEqual("the fixture published the body where the tracker does", issue.bodyPath, published);
    // A moment no rewrite can reproduce, so "unchanged" is a fact about the run and not about timing.
    const moment = new Date(1_600_000_000_000);
    utimesSync(published, moment, moment);
    const bytes = readFileSync(published, "utf8");

    const seen: PackAgentOpts[] = [];
    const read: string[] = [];
    const outcome = await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: reader(seen, read) });

    expectEqual("the implementer's brief is the body's path", seen[0]?.prompt, published);
    expect("the whole issue comes back from it", read[0]?.includes("a criterion only the whole body carries"), read[0]);
    expectEqual("the implementer's cwd is the worktree named from the issue", seen[0]?.cwd, join(root, "worktrees", "feat-01-the-whole-issue"));
    expectEqual("the run did not write the brief", statSync(published).mtimeMs, moment.getTime());
    expectEqual("and its bytes are the published ones", readFileSync(published, "utf8"), bytes);
    expectEqual("the outcome is honest: the work is not in Main", outcome, FAILED);
  });

  // The brief is frozen: a run completes with the body itself unwritable.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "the frozen issue",
      handle: "feat/02",
      slug: "the-frozen-issue",
      labels: [GATE_LABEL],
      body: BODY,
    });
    chmodSync(join(root, ".scratch", "feat", "issues", "02-the-frozen-issue.md"), 0o444);
    const seen: PackAgentOpts[] = [];
    const read: string[] = [];
    const outcome = await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: reader(seen, read) });

    expectEqual("the brief is still the body's path", seen[0]?.prompt, issue.bodyPath);
    expectEqual("and still reads whole, byte for byte", read[0], BODY);
    expectEqual("a run that cannot write the brief is not a run that failed", outcome, FAILED);
  });

  // The one module that derives the body's path contains no write at all, and no node writes the brief.
  const naming = readFileSync(join(drain.dir, "scripts", "naming.ts"), "utf8");
  expect(
    "the naming rule carries no write of any kind",
    !/writeFileSync|appendFileSync|createWriteStream|cpSync|copyFileSync|renameSync|unlinkSync|rmSync|mkdirSync|chmodSync|utimesSync/.test(naming),
    naming.slice(0, 120),
  );

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
