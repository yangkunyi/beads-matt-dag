#!/usr/bin/env bun
/**
 * Repro: a worker cannot write issue state - and a fixture never speaks the runner's protocol.
 *
 * The environment the drain hands a worker carries the store's own read-only mode, so the mechanism is
 * the store's, not a prompt's: the worker runs a real write attempt and the store refuses it. The
 * control is the same command with the same store and the same issue - only the pack's environment
 * missing - and it is accepted, so what is being proven is the environment's doing and not a store that
 * happens to be unwritable.
 *
 * Reads are not blocked: a worker that cannot read its own issue's state is not the contract either.
 *
 * The second half is the other thing a worker's environment must not carry into a fixture. A worker's
 * turn has `ARTIFACTS_DIR` set to its own run, so a repro that spreads an env helper *after* naming its
 * own artifacts directory would drive a real node against the live run: measured 2026-09-15, the worker
 * of ticket beads-dag/29 ran this suite inside its turn and `store-open-repro`, `config-repro` and
 * `store-backup-repro` each overwrote that run's `review-base` and `run-lock.json` with a throwaway
 * Target's, leaving the run's review-base naming a commit no repository had - its review then reported
 * nothing at all. So the ambient `ARTIFACTS_DIR` is set here to a directory that must stay empty, and the
 * same call shape that did the damage is the one that proves it fixed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { FAILED, OPENED, nodeLine } from "../scripts/node-outcomes.ts";
import { READONLY_ENV } from "../scripts/worker-env.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  envWithoutStore,
  expect,
  expectEqual,
  mkTemp,
  publishIssue,
  runScript,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
  writeTargetConfig,
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

  // The other half: the protocol the runner speaks to a node never comes from this process either, in a
  // helper's spread any more than in `runScript`'s inheritance.
  await withTarget(async (root, artifacts) => {
    // The store the node finds, without the binary on PATH - the shape that carries `envWithoutStore`.
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const ambient = mkTemp("ambient-artifacts-");
    const saved = process.env.ARTIFACTS_DIR;
    process.env.ARTIFACTS_DIR = ambient;
    try {
      // The call shape that did the damage: the fixture's own directory named first, the helper's
      // spread after it.
      const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts, ...envWithoutStore() });
      expectEqual("the opening node runs", opened.stdout, nodeLine(OPENED));
      expectEqual("and exits clean", opened.status, 0);
      expect("its review-base is the fixture's", existsSync(join(artifacts, "review-base")), opened.stderr);
      expect("and its run lock too", existsSync(join(artifacts, "run-lock.json")), opened.stderr);
      expectEqual("the ambient directory the suite inherited stays empty", readdirSync(ambient).join(","), "");
    } finally {
      if (saved === undefined) delete process.env.ARTIFACTS_DIR;
      else process.env.ARTIFACTS_DIR = saved;
      rmSync(ambient, { recursive: true, force: true });
    }
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
