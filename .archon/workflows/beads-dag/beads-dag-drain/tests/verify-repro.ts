#!/usr/bin/env bun
/**
 * Repro: the pre-merge gate.
 *
 * Nothing checked the work before it landed. `settle.ts` merges the branch into Main, so `closed` used
 * to imply "a merge commit exists" - not that anything ran. This file pins the fix at the node seam: the
 * Target's `verify` command runs in the issue's worktree on the tree that would be merged, once after
 * the implementer's turn and again after a conflict turn:
 *
 *   implement -> gate -> settle, and on a conflicting settle: conflict -> gate -> settle.
 *
 * Red is an ordinary failed attempt - the reason a comment, the issue back to `open`, nothing merged,
 * the worktree and branch kept, the full output in `ARTIFACTS_DIR/verify-<n>.log`. Green lets the
 * settle proceed unchanged. An unset command spawns nothing at all, which a `sh` probe proves rather
 * than assumes. A gate that outlives `verifyTimeoutMs` is killed and recorded, not hung on.
 *
 * Every case drives a real store and real git. Most drive the executor itself with a stub agent; the
 * last drives the execute node the way the runner spawns it, with the fake Pi SDK behind its turn.
 */
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { AgentRunner, PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { FAILED, MERGED, nodeLine } from "../scripts/node-outcomes.ts";
import { VERIFY_TAIL_CHARS, runVerify } from "../scripts/verify.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  drain,
  execute,
  expect,
  expectEqual,
  fakePiSdk,
  gitC,
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

/** One turn as the stub saw it: which role ran, where, with what brief and session key. */
type Turn = { role: string; cwd: string; prompt: string; sessionKey: string };

/** What a stub role does in one case: side effects, and optionally the result it answers with. */
type Action = (opts: PackAgentOpts) => PackAgentResult | void;

/**
 * The stub runner, exactly as conflict-repro's: records every turn, writes the session file where the
 * Pi runner would, and runs the case's per-role action.
 */
function stub(turns: Turn[], actions: { implement?: Action; conflict?: Action } = {}): AgentRunner {
  return async (opts) => {
    turns.push({ role: opts.role, cwd: opts.cwd, prompt: opts.prompt, sessionKey: opts.sessionKey });
    const sessionFile = join(opts.artifactsDir, "sessions", opts.sessionKey, `${opts.role}.jsonl`);
    mkdirSync(join(opts.artifactsDir, "sessions", opts.sessionKey), { recursive: true });
    writeFileSync(sessionFile, `${opts.role} turn\n`);
    const action = opts.role === "implement" ? actions.implement : actions.conflict;
    return (
      action?.(opts) ?? {
        sessionFile,
        answer: { kind: "text", text: "done" },
        lastError: undefined,
      }
    );
  };
}

/** An issue's names, spelled the way the naming rule spells them: the fixture's own reading. */
function names(handle: string, slug: string): { branch: string; worktree: string } {
  const [feature, number] = handle.split("/");
  return {
    branch: `beads/${feature}/${number}-${slug}`,
    worktree: join("worktrees", `${feature}-${number}-${slug}`),
  };
}

/** The merge commits Main carries whose subject is the flow's own, in order. */
function flowMerges(root: string): string[] {
  return gitC(root, "log", "--merges", "--format=%s", "main")
    .split("\n")
    .filter((subject) => subject.startsWith("beads-dag: merge "));
}

/** The Target's config for one case: the store override, and the gate the case is about. */
function writeGateConfig(root: string, verify?: string, verifyTimeoutMs?: number): void {
  const lines = [`store: ${storeBinary()}`];
  // JSON.stringify, so the command reaches the reader as the one string it is: a bare `true` in YAML is a
  // boolean, and the reader refuses that rather than quietly running no gate at all.
  if (verify !== undefined) lines.push(`verify: ${JSON.stringify(verify)}`);
  if (verifyTimeoutMs !== undefined) lines.push(`verifyTimeoutMs: ${verifyTimeoutMs}`);
  writeTargetConfig(root, `${lines.join("\n")}\n`);
}

try {
  // The gate primitive itself: green, red with a bounded tail and a full log, and a timeout that kills
  // the process group instead of waiting out a command that will not finish.
  {
    const dir = mkTemp("verify-");
    try {
      const green = await runVerify(dir, "echo hi", 5_000);
      expectEqual("a command that exits 0 is green", [green.ok, green.tail, green.timedOut], [true, "hi", false]);

      const log = join(dir, "full.log");
      const many = "i=0; while [ $i -lt 3000 ]; do echo line-$i; i=$((i+1)); done; exit 7";
      const red = await runVerify(dir, many, 10_000, log);
      expectEqual("a non-zero status is red", red.ok, false);
      expectEqual("and not a timeout", red.timedOut, false);
      expect("the tail is bounded", red.tail.length <= VERIFY_TAIL_CHARS, red.tail.length);
      expect("keeping the last line", red.tail.includes("line-2999"), red.tail.slice(-40));
      expect("and dropping the first", !red.tail.includes("line-0\n"), red.tail.slice(0, 40));
      const full = readFileSync(log, "utf8");
      expect("the full log keeps the head", full.includes("line-0\n"), full.slice(0, 40));
      expect("and the tail", full.includes("line-2999\n"), full.slice(-40));

      const started = Date.now();
      const hung = await runVerify(dir, "sleep 60", 200);
      expectEqual("a command past its clock times out", [hung.ok, hung.timedOut], [false, true]);
      expect("and the run does not wait it out", Date.now() - started < 10_000, `${Date.now() - started}ms`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Green: the gate runs on the would-be-merged tree, and the settlement then proceeds exactly as it
  // does without a gate - the merge lands, the issue closes, no comment is written. The gate's own cwd
  // is the evidence that it ran where it must: the issue's worktree, not the Target.
  await withTarget(async (root, artifacts) => {
    const marker = join(artifacts, "gate-cwd.txt");
    writeGateConfig(root, `pwd > '${marker}'`);
    const issue = publishIssue(root, {
      title: "a green gate",
      handle: "feat/01",
      slug: "a-green-gate",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/01", "a-green-gate");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit"),
      }),
    });

    expectEqual("a green gate settles the issue", outcome, MERGED);
    expectEqual("the gate ran in the issue's worktree", readFileSync(marker, "utf8").trim(), join(root, worktree));
    expectEqual("and only the implementer ran", turns.map((turn) => turn.role), ["implement"]);
    expectEqual("the issue is closed in the store", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    expectEqual("Main carries the issue's one merge", flowMerges(root), [`beads-dag: merge ${branch}`]);
    expectEqual("no comment was written", storeComments(root, issue.id).length, 0);
    expect("the gate's output is in the run's artifacts", existsSync(join(artifacts, "verify-1.log")));
    expectEqual("and no second gate ran", existsSync(join(artifacts, "verify-2.log")), false);
    expectEqual("the worktree is dropped", existsSync(join(root, worktree)), false);
    expectEqual("and its branch", gitC(root, "branch", "--list", branch), "");
  });

  // Red: the attempt is recorded exactly as any other failed attempt. Nothing merges, the issue goes
  // back to `open`, the worktree and branch are kept because they hold the attempt, and the full output
  // is in verify-1.log while only its tail reaches the comment.
  await withTarget(async (root, artifacts) => {
    writeGateConfig(root, "echo BOOM >&2; exit 3");
    const issue = publishIssue(root, {
      title: "a red gate",
      handle: "feat/02",
      slug: "a-red-gate",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/02", "a-red-gate");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit"),
      }),
    });

    expectEqual("a red gate fails the attempt", outcome, FAILED);
    expectEqual("the implementer's turn is the only turn", turns.map((turn) => turn.role), ["implement"]);
    expectEqual("the issue is never closed", storeIssue(root, issue.id).status, "open");
    expectEqual(
      "the reason names the gate and its tail",
      storeComments(root, issue.id)[0]?.text,
      "attempt 1 failed: verify failed: BOOM",
    );
    expectEqual("nothing of it is in Main", flowMerges(root), []);
    expect("the worktree is left for the report", existsSync(join(root, worktree)));
    expectEqual("with the attempt's commit", gitC(join(root, worktree), "log", "-1", "--format=%s"), "the implementer's commit");
    expectEqual("and its branch", gitC(root, "branch", "--list", branch).includes(branch), true);
    const log = readFileSync(join(artifacts, "verify-1.log"), "utf8");
    expect("the full log holds the gate's output", log.includes("BOOM"), log);
    expectEqual("and no second gate ran", existsSync(join(artifacts, "verify-2.log")), false);
  });

  // Unset: no command means no process and no record. A `sh` shim first on PATH records any invocation
  // of a shell, so "no sh ran" is a fact about the run rather than a reading of the config.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "no gate configured",
      handle: "feat/03",
      slug: "no-gate-configured",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch } = names("feat/03", "no-gate-configured");
    const probeDir = join(artifacts, "sh-probe");
    const probe = join(artifacts, "sh-ran.log");
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(join(probeDir, "sh"), '#!/bin/bash\nprintf \'%s\\n\' "$*" >> "$SH_PROBE"\nexit 0\n');
    chmodSync(join(probeDir, "sh"), 0o755);
    const savedPath = process.env.PATH;
    const savedProbe = process.env.SH_PROBE;
    process.env.PATH = `${probeDir}:${savedPath ?? ""}`;
    process.env.SH_PROBE = probe;
    let outcome = "";
    try {
      outcome = await executeIssue(root, issue.handle, {
        artifactsDir: artifacts,
        runAgent: stub([], {
          implement: (opts) => commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit"),
        }),
      });
    } finally {
      process.env.PATH = savedPath;
      if (savedProbe === undefined) delete process.env.SH_PROBE;
      else process.env.SH_PROBE = savedProbe;
    }

    expectEqual("an unset gate leaves the settlement unchanged", outcome, MERGED);
    expectEqual("no sh ran", existsSync(probe), false);
    expectEqual("and no gate artifact was written", existsSync(join(artifacts, "verify-1.log")), false);
    expectEqual("the issue is closed as usual", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
  });

  // A timeout is red and bounded: the process group is killed, the attempt is recorded as a timeout,
  // and the node returns rather than hanging on a gate it cannot finish.
  await withTarget(async (root, artifacts) => {
    writeGateConfig(root, "sleep 60", 300);
    const issue = publishIssue(root, {
      title: "a gate that outlives its clock",
      handle: "feat/04",
      slug: "a-gate-that-outlives-its-clock",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { worktree } = names("feat/04", "a-gate-that-outlives-its-clock");
    const started = Date.now();

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub([], {
        implement: (opts) => commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit"),
      }),
    });
    const elapsed = Date.now() - started;

    expectEqual("a gate that outlives its clock fails the attempt", outcome, FAILED);
    expectEqual("the issue goes back to open", storeIssue(root, issue.id).status, "open");
    expect(
      "and the reason names the timeout",
      storeComments(root, issue.id)[0]?.text?.startsWith("attempt 1 failed: verify failed: timed out after 300ms") === true,
      storeComments(root, issue.id)[0]?.text,
    );
    expectEqual("nothing merged", flowMerges(root), []);
    expect("the run did not wait out the gate", elapsed < 30_000, `${elapsed}ms`);
    expect("the worktree is left", existsSync(join(root, worktree)));
  });

  // The order, pinned: the gate runs after the implementer's turn and before the settle that conflicts,
  // and again after the conflict turn and before the second settle. The gate and the stub agents append
  // to one record, so the sequence is the run's own.
  await withTarget(async (root, artifacts) => {
    const record = join(artifacts, "order.log");
    writeGateConfig(root, `echo gate >> '${record}'`);
    commitFile(root, "shared.txt", "the base\n", "the base");
    const issue = publishIssue(root, {
      title: "the order of the gate",
      handle: "feat/05",
      slug: "the-order-of-the-gate",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch } = names("feat/05", "the-order-of-the-gate");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          appendFileSync(record, "implement\n");
          commitFile(opts.cwd, "shared.txt", "the issue's side\n", "the issue's change");
          // Main moves on the same path, so the settle's integration conflicts and the conflict turn runs.
          commitFile(root, "shared.txt", "Main's side\n", "Main moved under the issue");
        },
        conflict: (opts) => {
          appendFileSync(record, "conflict\n");
          commitFile(opts.cwd, "shared.txt", "both intents\n", "resolve the conflict");
        },
      }),
    });

    expectEqual("the conflicted issue settles", outcome, MERGED);
    expectEqual("the conflict turn ran", turns.map((turn) => turn.role), ["implement", "conflict"]);
    expectEqual(
      "the gate sits between each turn and its settle",
      readFileSync(record, "utf8").trim().split("\n"),
      ["implement", "gate", "conflict", "gate"],
    );
    expect("the first gate's log is in the artifacts", existsSync(join(artifacts, "verify-1.log")));
    expect("and the second gate's is too", existsSync(join(artifacts, "verify-2.log")));
    expectEqual("the issue closes", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    expectEqual("and Main carries the resolution", gitC(root, "show", "main:shared.txt"), "both intents");
    expectEqual("no comment was written", storeComments(root, issue.id).length, 0);
  });

  // The node protocol itself: the execute node, spawned the way the runner spawns it, with the fake Pi
  // SDK driving the implementer turn and a real `sh` gate. Red, so the node's token is `failed` while the
  // process exits clean and the store carries the gate's reason.
  await withTarget(async (root, artifacts) => {
    writeGateConfig(root, "echo PROTOCOL-GATE-RED >&2; exit 4");
    const issue = publishIssue(root, {
      title: "the node protocol",
      handle: "feat/06",
      slug: "the-node-protocol",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");

    const executed = runScript(execute.script("execute"), root, {
      INPUTS_ISSUE: issue.handle,
      ARTIFACTS_DIR: artifacts,
      PI_SDK_PATH: fakePiSdk(artifacts, "commit"),
    });

    expectEqual("the node speaks the failure token", executed.stdout, nodeLine(FAILED));
    expectEqual("and exits clean", executed.status, 0);
    expectEqual(
      "the store carries the gate's reason",
      storeComments(root, issue.id)[0]?.text,
      "attempt 1 failed: verify failed: PROTOCOL-GATE-RED",
    );
    expectEqual("the issue is never closed", storeIssue(root, issue.id).status, "open");
    expect(
      "the full log is in the artifacts",
      readFileSync(join(artifacts, "verify-1.log"), "utf8").includes("PROTOCOL-GATE-RED"),
    );
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
