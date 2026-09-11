#!/usr/bin/env bun
/**
 * Repro: a worker cannot write issue state.
 *
 * The environment the drain hands a worker carries the store's own read-only mode, so the mechanism is
 * the store's, not a prompt's: the worker runs a real write attempt and the store refuses it. The
 * control is the same command with the same store and the same issue - only the pack's environment
 * missing - and it is accepted, so what is being proven is the environment's doing and not a store that
 * happens to be unwritable.
 *
 * Reads are not blocked: a worker that cannot read its own issue's state is not the contract either.
 */
import { spawnSync } from "node:child_process";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { FAILED } from "../scripts/node-outcomes.ts";
import { READONLY_ENV } from "../scripts/worker-env.ts";
import {
  GATE_LABEL,
  bd,
  expect,
  expectEqual,
  publishIssue,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

type Attempt = { status: number | null; output: string };

/** The worker's move: it has the store's binary and the environment the drain gave it. */
function attempt(env: NodeJS.ProcessEnv, cwd: string, args: string[]): Attempt {
  const r = spawnSync(storeBinary(), args, { cwd, env, encoding: "utf8" });
  return { status: r.status, output: `${r.stderr ?? ""}${r.stdout ?? ""}`.trim() };
}

try {
  // A worker's write attempt is refused by the store, and its read still works.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "a worker that tries to write",
      handle: "feat/03",
      slug: "a-worker-that-tries-to-write",
      labels: [GATE_LABEL],
    });
    // As pick left it: the issue is this drain's, in progress.
    bd(root, "update", issue.id, "-s", "in_progress");

    const seen: PackAgentOpts[] = [];
    let write: Attempt | undefined;
    let read: Attempt | undefined;
    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: async (opts): Promise<PackAgentResult> => {
        seen.push(opts);
        const workerEnv = opts.env(process.env);
        write = attempt(workerEnv, opts.cwd, ["update", issue.id, "-s", "closed"]);
        read = attempt(workerEnv, opts.cwd, ["show", issue.id, "--json"]);
        return { sessionFile: "", answer: { kind: "none" }, lastError: "the worker tried to write the store" };
      },
    });

    expectEqual("the worker's environment carries the store's read-only mode", seen[0]?.env(process.env)[READONLY_ENV], "1");
    expect("the worker's write attempt was refused", write !== undefined && write.status !== 0, write);
    expect("and the store said why", /read-only mode/.test(write?.output ?? ""), write?.output);
    expectEqual("the worker's write did not close it", storeIssue(root, issue.id).status, "open");
    expectEqual("and the only record on the issue is the settlement's reason", storeComments(root, issue.id).map((c) => c.text), [
      "attempt 1 failed: the worker tried to write the store",
    ]);
    expectEqual("the worker's read was not blocked", read?.status, 0);
    expectEqual("the outcome is the honest one for a turn with no answer", outcome, FAILED);
  });

  // The control: the same write, with the same store, accepted once the worker's environment is not
  // the one it ran under. So the refusal above was the environment's doing, not the store's.
  await withTarget(async (root) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "the control",
      handle: "feat/04",
      slug: "the-control",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");

    const accepted = attempt(process.env, root, ["comment", issue.id, "written without the worker's environment"]);
    expectEqual("the same write is accepted outside the worker's environment", accepted.status, 0);
    expectEqual("and lands", storeIssue(root, issue.id).comment_count, 1);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
