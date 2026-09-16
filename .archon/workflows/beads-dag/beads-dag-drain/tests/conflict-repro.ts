#!/usr/bin/env bun
/**
 * Repro: a conflict resolved in the same execution.
 *
 * The conflict is not a state and not a second workflow. Bringing Main into the worktree is a step
 * inside a running issue; when it conflicts, git leaves the merge standing in the worktree's own git
 * state and the same execution turns to the conflict role, which resolves the hunks and commits the
 * merge. Then the integration and the merge into Main run again. One conflict turn per execution, after
 * the implementer - and a merge that is clean starts no conflict turn at all, which is asserted through
 * the roles the stub runner was actually called with rather than inferred.
 *
 * The stub runner plays both roles, so every case records whether the conflict turn ran, what shape it
 * had (the same worktree, the same brief, the issue's session key), and what the worktree looked like
 * when it started. All expectations are observable: the store's answers and git.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { AgentRunner, PackAgentOpts, PackAgentResult } from "../../scripts/agent.ts";
import { FAILED, MERGED } from "../../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  expect,
  expectEqual,
  gitC,
  publishIssue,
  storeComments,
  storeIssue,
  withTarget,
  writeStoreConfig,
} from "./target.ts";

/** One turn as the stub saw it: which role ran, where, with what brief and session key. */
type Turn = { role: string; cwd: string; prompt: string; sessionKey: string };

/** What a stub role does in one case: side effects, and optionally the result it answers with. */
type Action = (opts: PackAgentOpts) => PackAgentResult | void;

/**
 * The stub runner: records every turn, runs the per-role action the case set, and writes a session file
 * where the Pi runner would - `sessions/<key>/<role>.jsonl` - so "the conflict turn never ran" is a fact
 * about the run's artifacts and not only about the recorded roles.
 */
function stub(
  turns: Turn[],
  actions: { implement?: Action; conflict?: Action } = {},
): AgentRunner {
  return async (opts) => {
    turns.push({ role: opts.role, cwd: opts.cwd, prompt: opts.prompt, sessionKey: opts.sessionKey });
    const sessionFile = join(opts.artifactsDir, "sessions", opts.sessionKey, `${opts.role}.jsonl`);
    mkdirSync(dirname(sessionFile), { recursive: true });
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

/** True while a merge is standing in that directory's git state: git holds MERGE_HEAD. */
function standingMerge(dir: string): boolean {
  const r = spawnSync("git", ["-C", dir, "rev-parse", "-q", "--verify", "MERGE_HEAD"], { encoding: "utf8" });
  return r.status === 0;
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

try {
  // A clean merge starts no conflict turn: the worktree branch carries work, Main has not moved, and
  // the only turn the execution spends is the implementer's.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "a clean merge",
      handle: "feat/01",
      slug: "a-clean-merge",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/01", "a-clean-merge");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit"),
      }),
    });

    expectEqual("the clean merge settles the issue", outcome, MERGED);
    expectEqual("and only the implementer ran", turns.map((turn) => turn.role), ["implement"]);
    expectEqual(
      "the implementer's session file is the one under the issue's key",
      existsSync(join(artifacts, "sessions", issue.handle, "implement.jsonl")),
      true,
    );
    expectEqual(
      "and no conflict session was opened",
      existsSync(join(artifacts, "sessions", issue.handle, "conflict.jsonl")),
      false,
    );
    expectEqual("the issue is closed in the store", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    expectEqual("Main carries the issue's one merge", flowMerges(root), [`beads-dag: merge ${branch}`]);
    expectEqual("the worktree is dropped", existsSync(join(root, worktree)), false);
    expectEqual("and its branch", gitC(root, "branch", "--list", branch), "");
  });

  // A clean *integration* - Main moved while the turn ran, but on a different file - is still no
  // conflict turn: the integration merge is made in the worktree and then merged into Main.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    const issue = publishIssue(root, {
      title: "a clean integration",
      handle: "feat/02",
      slug: "a-clean-integration",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/02", "a-clean-integration");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          commitFile(opts.cwd, "work.txt", "the work\n", "the implementer's commit");
          // Main moves while the turn is running, on a path the turn does not touch.
          commitFile(root, "landed.txt", "landed\n", "something else landed");
        },
      }),
    });

    expectEqual("the clean integration settles the issue", outcome, MERGED);
    expectEqual("and starts no conflict turn", turns.map((turn) => turn.role), ["implement"]);
    expectEqual("the issue is closed", storeIssue(root, issue.id).status, "closed");
    expectEqual("with one flow merge on Main", flowMerges(root), [`beads-dag: merge ${branch}`]);
    expect("Main carries what landed while the issue was worked on", gitC(root, "show", "main:landed.txt").includes("landed"));
    expectEqual("and the issue's work", gitC(root, "show", "main:work.txt"), "the work");
    expect(
      "the integration merge is in Main's history",
      gitC(root, "log", "--format=%s", "main").includes(`Merge branch 'main' into ${branch}`),
      gitC(root, "log", "--format=%s", "main"),
    );
    expectEqual("the worktree is dropped", existsSync(join(root, worktree)), false);
    expectEqual("and its branch", gitC(root, "branch", "--list", branch), "");
  });

  // A conflicted integration: the merge is left standing for the conflict turn, the turn resolves and
  // commits it, and the issue then merges exactly as a clean one would.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    commitFile(root, "shared.txt", "the base\n", "the base");
    const issue = publishIssue(root, {
      title: "a conflict the agent resolves",
      handle: "feat/03",
      slug: "a-conflict-resolved",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/03", "a-conflict-resolved");
    const turns: Turn[] = [];
    let conflictedWhenTheTurnStarted = false;
    let mainWhileConflicted = "";

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          commitFile(opts.cwd, "shared.txt", "the issue's side\n", "the issue's change");
          // Main moves on the same path, so the integration cannot be clean.
          commitFile(root, "shared.txt", "Main's side\n", "Main moved under the issue");
        },
        conflict: (opts) => {
          conflictedWhenTheTurnStarted = standingMerge(opts.cwd) && gitC(opts.cwd, "status", "--porcelain").includes("UU");
          mainWhileConflicted = gitC(root, "rev-parse", "main");
          commitFile(opts.cwd, "shared.txt", "both intents\n", "resolve the conflict");
        },
      }),
    });

    expectEqual("the conflicted integration settles the issue", outcome, MERGED);
    expectEqual("the conflict turn ran, under its role, after the implementer", turns.map((turn) => turn.role), [
      "implement",
      "conflict",
    ]);
    expectEqual("the conflict turn ran in the issue's worktree", turns[1]?.cwd, join(root, worktree));
    expectEqual("was handed the same brief", turns[1]?.prompt, issue.bodyPath);
    expectEqual("and the issue's own session key", turns[1]?.sessionKey, issue.handle);
    expectEqual("the merge stood for it", conflictedWhenTheTurnStarted, true);
    expectEqual(
      "the conflict turn's session file was written under the issue's key",
      existsSync(join(artifacts, "sessions", issue.handle, "conflict.jsonl")),
      true,
    );
    expectEqual("and it sits beside the implementer's own", existsSync(join(artifacts, "sessions", issue.handle, "implement.jsonl")), true);
    expectEqual("the issue is closed in the store", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    expectEqual("Main carries the issue's one flow merge", flowMerges(root), [`beads-dag: merge ${branch}`]);

    // The merge that landed: Main's tip, whose first parent was Main when the conflict was resolved and
    // whose second parent is the conflict turn's merge commit - the issue's work plus Main in one commit.
    const tip = gitC(root, "rev-parse", "main");
    expectEqual("the resolution is in Main", gitC(root, "show", "main:shared.txt"), "both intents");
    expectEqual("the settle merge's first parent was Main at the conflict", gitC(root, "rev-parse", `${tip}^1`), mainWhileConflicted);
    expectEqual("its second parent is the conflict turn's commit", gitC(root, "log", "-1", "--format=%s", `${tip}^2`), "resolve the conflict");
    expectEqual("which merged in the Main that conflicted", gitC(root, "rev-parse", `${tip}^2^2`), mainWhileConflicted);
    expectEqual("and carried the issue's own work", gitC(root, "log", "-1", "--format=%s", `${tip}^2^`), "the issue's change");
    expectEqual("the worktree is dropped once the merge landed", existsSync(join(root, worktree)), false);
    expectEqual("and its branch", gitC(root, "branch", "--list", branch), "");
  });

  // A conflict the agent cannot resolve fails the issue with a reason, and leaves its work for the
  // report: the standing merge is rolled back, the worktree and branch stay, and Main has no merge.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    commitFile(root, "shared.txt", "the base\n", "the base");

    // (a) the conflict turn answers nothing: the runner's own reason is what the issue records.
    const silent = publishIssue(root, {
      title: "the silent conflict agent",
      handle: "feat/04",
      slug: "the-silent-conflict-agent",
      labels: [GATE_LABEL],
    });
    bd(root, "update", silent.id, "-s", "in_progress");
    const silentNames = names("feat/04", "the-silent-conflict-agent");
    const silentTurns: Turn[] = [];

    const silentOutcome = await executeIssue(root, silent.handle, {
      artifactsDir: artifacts,
      runAgent: stub(silentTurns, {
        implement: (opts) => {
          commitFile(opts.cwd, "shared.txt", "the issue's side\n", "the silent issue's change");
          commitFile(root, "shared.txt", "Main's side\n", "Main moved under the silent issue");
        },
        conflict: () => ({ sessionFile: "", answer: { kind: "none" }, lastError: "the conflict runner died" }),
      }),
    });

    expectEqual("an unresolved conflict is a failure", silentOutcome, FAILED);
    expectEqual("both turns ran", silentTurns.map((turn) => turn.role), ["implement", "conflict"]);
    expectEqual("the issue is never closed", storeIssue(root, silent.id).status, "open");
    expectEqual("and its reason is the runner's own", storeComments(root, silent.id)[0]?.text, "attempt 1 failed: the conflict runner died");
    expectEqual("the standing merge was rolled back", standingMerge(join(root, silentNames.worktree)), false);
    expectEqual("so the worktree is clean again", gitC(join(root, silentNames.worktree), "status", "--porcelain"), "");
    expect("the worktree is left for the report", existsSync(join(root, silentNames.worktree)));
    expectEqual("holding the implementer's commit only", gitC(join(root, silentNames.worktree), "log", "-1", "--format=%s"), "the silent issue's change");
    expectEqual("and nothing of it is in Main", flowMerges(root), []);

    // (b) the conflict turn answers, but leaves the merge unresolved: git is the fact, not its answer.
    const stubborner = publishIssue(root, {
      title: "the agent that does not resolve",
      handle: "feat/05",
      slug: "the-agent-that-does-not-resolve",
      labels: [GATE_LABEL],
    });
    bd(root, "update", stubborner.id, "-s", "in_progress");
    const stubbornerNames = names("feat/05", "the-agent-that-does-not-resolve");
    const stubbornerTurns: Turn[] = [];

    const stubbornerOutcome = await executeIssue(root, stubborner.handle, {
      artifactsDir: artifacts,
      runAgent: stub(stubbornerTurns, {
        implement: (opts) => {
          commitFile(opts.cwd, "shared.txt", "the other issue's side\n", "the other issue's change");
          commitFile(root, "shared.txt", "Main moved again\n", "Main moved under the other issue");
        },
        // It answers with text, but the merge is exactly as it found it.
        conflict: () => undefined,
      }),
    });

    expectEqual("an unanswered merge is a failure too", stubbornerOutcome, FAILED);
    expectEqual("and the conflict turn did run", stubbornerTurns.map((turn) => turn.role), ["implement", "conflict"]);
    expectEqual("the issue goes back to open", storeIssue(root, stubborner.id).status, "open");
    expectEqual(
      "with the reason naming the merge that stayed unresolved",
      storeComments(root, stubborner.id)[0]?.text,
      "attempt 1 failed: the conflict agent left the merge unresolved",
    );
    expectEqual("the merge is rolled back again", standingMerge(join(root, stubbornerNames.worktree)), false);
    expect("that worktree is left too", existsSync(join(root, stubbornerNames.worktree)));
    expectEqual("its branch still carries the attempt", gitC(join(root, stubbornerNames.worktree), "log", "-1", "--format=%s"), "the other issue's change");
    expectEqual("Main has no flow merge from either issue", flowMerges(root), []);
  });

  // A resumed worktree whose branch already conflicts with Main: the pre-turn integration cannot
  // resolve it - the execution's one conflict turn belongs after the implementer, where both sides of
  // the conflict include the turn's work - so it is rolled back, the implementer runs, and the
  // integration after it hands the same conflict to the conflict turn.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    commitFile(root, "shared.txt", "the base\n", "the base");
    const issue = publishIssue(root, {
      title: "a resumed attempt that conflicts",
      handle: "feat/06",
      slug: "a-resumed-attempt-that-conflicts",
      labels: [GATE_LABEL],
    });
    const { branch, worktree } = names("feat/06", "a-resumed-attempt-that-conflicts");

    // The earlier attempt: commits and then fails, which leaves exactly the state a retry resumes.
    bd(root, "update", issue.id, "-s", "in_progress");
    const firstOutcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub([], {
        implement: (opts) => {
          commitFile(opts.cwd, "shared.txt", "the earlier attempt\n", "the earlier attempt's commit");
          return { sessionFile: "", answer: { kind: "none" }, lastError: "the earlier attempt did not land" };
        },
      }),
    });
    expectEqual("the earlier attempt failed and left its worktree", firstOutcome, FAILED);
    expectEqual("holding its commit", gitC(join(root, worktree), "log", "-1", "--format=%s"), "the earlier attempt's commit");

    // While the issue waits, Main moves on the same path.
    commitFile(root, "shared.txt", "Main moved while it waited\n", "Main moved while it waited");
    bd(root, "update", issue.id, "-s", "in_progress");
    const turns: Turn[] = [];
    let mergeStandingAtTheTurn = true;

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          // The pre-turn conflict was rolled back, so the implementer's worktree is not mid-merge.
          mergeStandingAtTheTurn = standingMerge(opts.cwd);
          commitFile(opts.cwd, "second.txt", "the retry's work\n", "the retry's commit");
        },
        conflict: (opts) => commitFile(opts.cwd, "shared.txt", "the earlier intent and Main\n", "resolve the retry's conflict"),
      }),
    });

    expectEqual("the retry settles", outcome, MERGED);
    expectEqual("the implementer ran with no merge standing in its way", mergeStandingAtTheTurn, false);
    expectEqual("then the conflict turn ran", turns.map((turn) => turn.role), ["implement", "conflict"]);
    expectEqual("the issue closes", storeIssue(root, issue.id).status, "closed");
    expectEqual("with one flow merge", flowMerges(root), [`beads-dag: merge ${branch}`]);
    const subjects = gitC(root, "log", "--format=%s", "main");
    expect("both attempts are in Main", subjects.includes("the earlier attempt's commit") && subjects.includes("the retry's commit"), subjects);
    expectEqual("and the resolution is what Main carries", gitC(root, "show", "main:shared.txt"), "the earlier intent and Main");
    expectEqual("the worktree is dropped after the merge", existsSync(join(root, worktree)), false);
    expectEqual("and the branch with it", gitC(root, "branch", "--list", branch), "");
  });

  // A conflict turn whose merge was rolled back is not a resolution: git decides, not the answer.
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    commitFile(root, "shared.txt", "the base\n", "the base");
    const issue = publishIssue(root, {
      title: "the agent that aborts the merge",
      handle: "feat/07",
      slug: "the-agent-that-aborts",
      labels: [GATE_LABEL],
    });
    bd(root, "update", issue.id, "-s", "in_progress");
    const { branch, worktree } = names("feat/07", "the-agent-that-aborts");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, {
        implement: (opts) => {
          commitFile(opts.cwd, "shared.txt", "the issue's side\n", "the issue's change");
          commitFile(root, "shared.txt", "Main's side\n", "Main moved under the issue");
        },
        conflict: (opts) => {
          // The persona forbids this; a turn that does it anyway has not resolved anything.
          const r = spawnSync("git", ["-C", opts.cwd, "merge", "--abort"], { encoding: "utf8" });
          expectEqual("the stub could abort the standing merge", r.status, 0);
        },
      }),
    });

    expectEqual("a rolled-back merge is not a resolution", outcome, FAILED);
    expectEqual("the conflict turn ran", turns.map((turn) => turn.role), ["implement", "conflict"]);
    expectEqual("the issue goes back to open", storeIssue(root, issue.id).status, "open");
    expectEqual(
      "with the reason naming what git did not see",
      storeComments(root, issue.id)[0]?.text,
      "attempt 1 failed: the conflict agent did not conclude the merge: main is not in the branch",
    );
    expectEqual("nothing merged", flowMerges(root), []);
    expect("the worktree stays", existsSync(join(root, worktree)));
    expectEqual("with the attempt's commit", gitC(join(root, worktree), "log", "-1", "--format=%s"), "the issue's change");
    expectEqual("and its branch", gitC(root, "branch", "--list", branch).includes(branch), true);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
