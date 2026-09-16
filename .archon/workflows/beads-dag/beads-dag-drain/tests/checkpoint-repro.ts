#!/usr/bin/env bun
/**
 * Repro: the pre-turn checkpoint, and the latch it removes.
 *
 * The merge carries the issue branch's commits, never the bytes sitting in the working tree, and git
 * refuses a merge over uncommitted changes to files the merge touches. Both facts have the same fix -
 * commit the tree first - and this file pins both:
 *
 * - Before a gate, a dirty worktree is checkpointed as one `wip(beads-dag): <handle> checkpoint …`
 *   commit, so the gate's subject and the merge's subject are the same tree. A clean worktree gains no
 *   commit, and the pack's own runtime paths (`.beads/`, `worktrees/`) are never part of it.
 * - Before the resume path's integration, the same checkpoint runs. Without it, a turn killed mid-edit
 *   leaves a dirty worktree, a later Main that moved over the same file makes git refuse the merge, and
 *   because that refusal is not a conflicted merge (`MERGE_HEAD` is never written) every later attempt
 *   fails at the same line before any agent runs - a permanent lockout only a human could unstick. The
 *   latch case below is asserted against exactly that old signature: without the fix no implementer turn
 *   runs at all.
 *
 * Every case drives the executor with a stub agent, a real store and real git.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { AgentRunner, PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { FAILED, MERGED } from "../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  expect,
  expectEqual,
  gitC,
  publishIssue,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

/** One turn as the stub saw it: which role ran, where, with what brief and session key. */
type Turn = { role: string; cwd: string; prompt: string; sessionKey: string };

/** What a stub role does in one case: side effects, and optionally the result it answers with. */
type Action = (opts: PackAgentOpts) => PackAgentResult | void;

/** The stub runner, as in verify-repro.ts: records every turn and runs the case's per-role action. */
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

/** True while a merge is standing in that directory's git state: git holds MERGE_HEAD. */
function standingMerge(dir: string): boolean {
  const r = spawnSync("git", ["-C", dir, "rev-parse", "-q", "--verify", "MERGE_HEAD"], { encoding: "utf8" });
  return r.status === 0;
}

/** That path's blob on Main, or undefined when Main does not carry it. */
function blobOnMain(root: string, path: string): string | undefined {
  const r = spawnSync("git", ["-C", root, "show", `main:${path}`], { encoding: "utf8" });
  return r.status === 0 ? r.stdout : undefined;
}

/** The Target's config for one case: the store override, and an optional gate that always passes. */
function writeStoreAndGate(root: string, verify?: string): void {
  const lines = [`store: ${storeBinary()}`];
  // JSON.stringify, so the command reaches the reader as the one string it is: a bare `true` in YAML is a
  // boolean, and the reader refuses that rather than quietly running no gate at all.
  if (verify !== undefined) lines.push(`verify: ${JSON.stringify(verify)}`);
  writeTargetConfig(root, `${lines.join("\n")}\n`);
}

try {
  // A gate over a dirty worktree: the dirt is committed first, so the merge carries the same tree the
  // gate saw. The pack's own runtime paths are excluded from that commit.
  await withTarget(async (root, artifacts) => {
    writeStoreAndGate(root, "true");
    const issue = publishIssue(root, {
      title: "a dirty worktree",
      handle: "feat/01",
      slug: "a-dirty-worktree",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch } = names("feat/01", "a-dirty-worktree");
    const checkpoint = `wip(beads-dag): ${issue.handle} checkpoint before verify`;
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit");
          // Left uncommitted on purpose: this is what the checkpoint has to carry into the merge.
          writeFileSync(join(opts.cwd, "dirty.txt"), "the uncommitted work\n");
          // The pack's own runtime paths: a store or a second worktree appearing inside this one is not
          // this issue's work, and must not be swept into the checkpoint.
          mkdirSync(join(opts.cwd, ".beads"), { recursive: true });
          writeFileSync(join(opts.cwd, ".beads", "junk.txt"), "not the issue's work\n");
        },
      }),
    });

    expectEqual("the dirty issue settles", outcome, MERGED);
    expectEqual("the issue is closed", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    const subjects = gitC(root, "log", "--format=%s", "main");
    expect("the checkpoint is a commit on Main's history", subjects.includes(checkpoint), subjects);
    expectEqual("carrying the uncommitted work into the merge", gitC(root, "show", "main:dirty.txt"), "the uncommitted work");
    expectEqual("and the implementer's own commit", gitC(root, "show", "main:work.txt"), "the work");
    expectEqual("while the pack's runtime paths are not committed", blobOnMain(root, ".beads/junk.txt"), undefined);
  });

  // A clean worktree gains no checkpoint: a Target that commits its own work is not given extra commits
  // by the gate.
  await withTarget(async (root, artifacts) => {
    writeStoreAndGate(root, "true");
    const issue = publishIssue(root, {
      title: "a clean worktree",
      handle: "feat/02",
      slug: "a-clean-worktree",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit"),
      }),
    });

    expectEqual("the clean issue settles", outcome, MERGED);
    const subjects = gitC(root, "log", "--format=%s", "main");
    expect("no checkpoint was made", !subjects.includes("wip(beads-dag)"), subjects);
    expect("and the implementer's commit is what landed", subjects.includes("the implementer's commit"), subjects);
  });

  // The latch. An attempt is killed with its worktree dirty; Main then moves over the same file. With the
  // pre-turn checkpoint the next attempt commits the half-work, integrates Main (which now conflicts, and
  // is deferred to the conflict turn), and runs the implementer - where the old behavior failed before any
  // agent ran, at `bringMainIn`, and would do so on every later attempt.
  await withTarget(async (root, artifacts) => {
    writeStoreAndGate(root);
    commitFile(root, "shared.txt", "the base\n", "the base");
    const issue = publishIssue(root, {
      title: "the latched worktree",
      handle: "feat/03",
      slug: "the-latched-worktree",
      labels: [GATE_LABEL],
    });
    const { branch, worktree } = names("feat/03", "the-latched-worktree");
    const checkpoint = `wip(beads-dag): ${issue.handle} checkpoint before integration`;

    // The first attempt: a turn that dirties the tree and then fails, which is exactly the state a
    // killed turn leaves behind.
    bd(root, "update", issue.id, "-s", "in_progress");
    const firstOutcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub([], {
        implement: (opts) => {
          writeFileSync(join(opts.cwd, "shared.txt"), "the earlier attempt\n");
          return { sessionFile: "", answer: { kind: "none" }, lastError: "the earlier attempt did not land" };
        },
      }),
    });
    expectEqual("the first attempt fails", firstOutcome, FAILED);
    expectEqual("and leaves the tree dirty", gitC(join(root, worktree), "status", "--porcelain").trim() !== "", true);
    expectEqual("with its reason recorded", storeComments(root, issue.id)[0]?.text, "attempt 1 failed: the earlier attempt did not land");

    // While the issue waits, Main moves over the very file the dead turn had touched.
    commitFile(root, "shared.txt", "Main moved while it waited\n", "Main moved while it waited");

    bd(root, "update", issue.id, "-s", "in_progress");
    const turns: Turn[] = [];
    let standingAtTheTurn = true;
    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          standingAtTheTurn = standingMerge(opts.cwd);
          commitFile(opts.cwd, "second.txt", "the retry's work\n", "the retry's commit");
        },
        conflict: (opts) => commitFile(opts.cwd, "shared.txt", "the earlier attempt and Main\n", "resolve the retry's conflict"),
      }),
    });

    expectEqual("the retry settles", outcome, MERGED);
    expectEqual("the implementer ran, with no merge standing in its way", turns.map((turn) => turn.role), [
      "implement",
      "conflict",
    ]);
    expectEqual("and no merge was left standing for it", standingAtTheTurn, false);
    expectEqual(
      "no attempt failed at the integration - the old signature is gone",
      storeComments(root, issue.id).some((comment) => comment.text.includes("cannot bring main into the worktree")),
      false,
    );
    expectEqual("only the first attempt's failure is recorded", storeComments(root, issue.id).length, 1);
    expectEqual("the issue closes", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    const subjects = gitC(root, "log", "--format=%s", "main");
    expect("the dead turn's half-work was checkpointed", subjects.includes(checkpoint), subjects);
    expectEqual("the retry's work landed", gitC(root, "show", "main:second.txt"), "the retry's work");
    expectEqual("and the resolution is what Main carries", gitC(root, "show", "main:shared.txt"), "the earlier attempt and Main");
    expectEqual("the worktree is dropped", existsSync(join(root, worktree)), false);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
