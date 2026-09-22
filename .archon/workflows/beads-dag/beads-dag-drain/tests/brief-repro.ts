#!/usr/bin/env bun
/**
 * Repro: the brief is the bead's description.
 *
 * The implementer is handed that text and nothing else about the issue. The run does not read a
 * sidecar file, and it does not write the description back.
 */
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentOpts, PackAgentResult } from "../../scripts/agent.ts";
import { FAILED } from "../../scripts/node-outcomes.ts";
import { GATE_LABEL, expect, expectEqual, publishIssue, storeIssue, withTarget, writeStoreConfig } from "./target.ts";

/** The description the fixture publishes, with one line only the whole brief has. */
const BODY = [
  "# feat/01 - the whole issue",
  "",
  "## What to build",
  "",
  "The implementer reads exactly this text.",
  "",
  "## Criteria",
  "",
  "- [ ] a criterion only the whole body carries",
  "",
].join("\n");

function reader(seen: PackAgentOpts[]): (opts: PackAgentOpts) => Promise<PackAgentResult> {
  return async (opts) => {
    seen.push(opts);
    return { sessionFile: "", answer: { kind: "text", text: "done" }, lastError: undefined };
  };
}

try {
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "the whole issue",
      handle: "feat/01",
      slug: "the-whole-issue",
      labels: [GATE_LABEL],
      body: BODY,
    });
    const seen: PackAgentOpts[] = [];
    const outcome = await executeIssue(root, issue.handle, { artifactsDir: artifacts, runAgent: reader(seen) });

    expectEqual("the implementer's brief is the description", seen[0]?.prompt, BODY);
    expect("the whole issue comes back from it", seen[0]?.prompt.includes("a criterion only the whole body carries"));
    expectEqual("the implementer's cwd is the worktree named from the issue", seen[0]?.cwd, `${root}/worktrees/feat-01-the-whole-issue`);
    expectEqual("the run did not rewrite the description", storeIssue(root, issue.id).description, BODY);
    expectEqual("the outcome is honest: the work is not in Main", outcome, FAILED);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
