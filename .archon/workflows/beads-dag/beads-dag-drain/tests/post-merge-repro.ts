#!/usr/bin/env bun
/**
 * Repro: the post-merge act.
 *
 * `verify` guards the tree on its way in; nothing used to happen after a merge landed. A merge that
 * changed `skills/` - or a generated document, or an index - left every copy of it outside the Target's
 * git tree stale, and only somebody remembering refreshed them. On 2026-09-15 that failed twice: the
 * implementer of ticket 21 copied an unmerged skill into `~/.agents/skills/`, and the design repo's own
 * copies had sat a day behind.
 *
 * This file pins the fix at two seams. The primitive: one command, run in the Target, bounded and killed
 * on its clock, with a full log and a bounded tail - and an empty command spawning nothing at all, which
 * a `sh` probe proves rather than assumes. The executor: after a settlement the Target's `postMerge`
 * runs with the Target as its cwd, and it can see the merge commit that just landed, which is what makes
 * "after a merge" a fact rather than a claim. Red is not a failed attempt: the merge stands, the issue
 * stays closed, no comment is written, and the failure is named on stderr and left in
 * `ARTIFACTS_DIR/post-merge-<handle>.log`.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import type { AgentRunner, PackAgentOpts, PackAgentResult } from "../scripts/agent.ts";
import { MERGED, nodeLine } from "../scripts/node-outcomes.ts";
import { POST_MERGE_TIMEOUT_MS, postMergeLogName, runPostMerge } from "../scripts/postmerge.ts";
import {
  GATE_LABEL,
  bd,
  commitFile,
  execute,
  expect,
  expectEqual,
  fakePiSdk,
  gitC,
  publishIssue,
  runScript,
  storeBinary,
  storeComments,
  storeIssue,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

/** One turn as the stub saw it: which role ran, where, with what brief and session key. */
type Turn = { role: string; cwd: string; prompt: string; sessionKey: string };

/** The stub runner, as conflict/verify-repro's: records every turn and writes the session file. */
function stub(turns: Turn[], commit: (cwd: string) => void): AgentRunner {
  return async (opts: PackAgentOpts): Promise<PackAgentResult> => {
    turns.push({ role: opts.role, cwd: opts.cwd, prompt: opts.prompt, sessionKey: opts.sessionKey });
    const sessionFile = join(opts.artifactsDir, "sessions", opts.sessionKey, `${opts.role}.jsonl`);
    mkdirSync(join(opts.artifactsDir, "sessions", opts.sessionKey), { recursive: true });
    writeFileSync(sessionFile, `${opts.role} turn\n`);
    if (opts.role === "implement") commit(opts.cwd);
    return { sessionFile, answer: { kind: "text", text: "done" }, lastError: undefined };
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

/** The Target's config for one case: the store override, and the post-merge act the case is about. */
function writeActConfig(root: string, postMerge?: string): void {
  const lines = [`store: ${storeBinary()}`];
  // JSON.stringify, so the command reaches the reader as the one string it is: a bare `true` in YAML is a
  // boolean, and the reader refuses that rather than quietly running no act at all.
  if (postMerge !== undefined) lines.push(`postMerge: ${JSON.stringify(postMerge)}`);
  writeTargetConfig(root, `${lines.join("\n")}\n`);
}

/** An issue claimed the way the drain claims one, ready for its execute node. */
function claimed(root: string, handle: string, slug: string): { id: string; handle: string } {
  const issue = publishIssue(root, {
    title: slug.replace(/-/g, " "),
    handle,
    slug,
    labels: [GATE_LABEL],
  });
  bd(root, "update", issue.id, "-s", "in_progress");
  return issue;
}

try {
  // The primitive: green, a bounded tail beside a full log, a killed timeout, and an empty command that
  // spawns no process at all - proven with a `sh` on PATH that records being run, not assumed.
  {
    const dir = mkdtempSync(join(tmpdir(), "postmerge-"));
    try {
      const green = await runPostMerge(dir, "echo refreshed", join(dir, "green.log"));
      expectEqual("a command that exits 0 is green", [green.ok, green.tail, green.timedOut], [true, "refreshed", false]);
      expectEqual("and its log holds the output", readFileSync(join(dir, "green.log"), "utf8"), "refreshed\n");

      const red = await runPostMerge(dir, "echo BROKEN >&2; exit 9", join(dir, "red.log"));
      expectEqual("a non-zero status is red", [red.ok, red.timedOut], [false, false]);
      expectEqual("with the output kept", red.tail, "BROKEN");

      const started = Date.now();
      const hung = await runPostMerge(dir, "sleep 60", join(dir, "hung.log"), 200);
      expectEqual("a command past its clock times out", [hung.ok, hung.timedOut], [false, true]);
      expect("and the run does not wait it out", Date.now() - started < 10_000, `${Date.now() - started}ms`);

      // The empty command is the Target saying it has no post-merge act: no process, and no log either,
      // so a Target without one is byte-for-byte the Target it was before this module existed.
      const probeDir = join(dir, "sh-probe");
      const probe = join(dir, "sh-ran.log");
      mkdirSync(probeDir, { recursive: true });
      writeFileSync(join(probeDir, "sh"), '#!/bin/bash\nprintf \'%s\\n\' "$*" >> "$SH_PROBE"\nexit 0\n');
      chmodSync(join(probeDir, "sh"), 0o755);
      const savedPath = process.env.PATH;
      process.env.PATH = `${probeDir}:${savedPath ?? ""}`;
      process.env.SH_PROBE = probe;
      try {
        const none = await runPostMerge(dir, "", join(dir, "none.log"));
        expectEqual("an empty act is green", [none.ok, none.tail], [true, ""]);
        expectEqual("and spawns no shell", existsSync(probe), false);
        expectEqual("and writes no log", existsSync(join(dir, "none.log")), false);
      } finally {
        process.env.PATH = savedPath;
        delete process.env.SH_PROBE;
      }

      expect("the shipped default is minutes, not hours", POST_MERGE_TIMEOUT_MS <= 5 * 60 * 1000, POST_MERGE_TIMEOUT_MS);
      expectEqual("and the artifact is named for the handle", postMergeLogName("beads-dag/27"), "post-merge-beads-dag-27.log");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Green: the act runs after the settlement. Its cwd is the Target - not the worktree, which is gone by
  // then - and it can read the merge commit, which is the whole difference between this and the gate.
  await withTarget(async (root, artifacts) => {
    const marker = join(artifacts, "act.txt");
    writeActConfig(root, `pwd > '${marker}'; git log -1 --format=%s main >> '${marker}'`);
    const issue = claimed(root, "feat/07", "the-act-runs-after-the-merge");
    const { branch, worktree } = names("feat/07", "the-act-runs-after-the-merge");
    const turns: Turn[] = [];

    const outcome = await executeIssue(root, issue.handle, {
      artifactsDir: artifacts,
      runAgent: stub(turns, (cwd) => commitFile(cwd, "work.txt", "the work\n", "the implementer's commit")),
    });

    expectEqual("the issue settles", outcome, MERGED);
    expectEqual("the act ran in the Target", readFileSync(marker, "utf8").split("\n")[0], root);
    expectEqual(
      "and saw the merge that had just landed",
      readFileSync(marker, "utf8").split("\n")[1],
      `beads-dag: merge ${branch}`,
    );
    expectEqual("the worktree was already gone", existsSync(join(root, worktree)), false);
    expectEqual("the act's own log is in the run's artifacts", existsSync(join(artifacts, postMergeLogName(issue.handle))), true);
    expectEqual("the issue is closed", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    expectEqual("Main carries the issue's one merge", flowMerges(root), [`beads-dag: merge ${branch}`]);
    expectEqual("and no comment was written", storeComments(root, issue.id).length, 0);
    expectEqual("only the implementer ran", turns.map((turn) => turn.role), ["implement"]);
  });

  // No act configured: the settlement is exactly what it was before this module existed - no log, no
  // process, no comment - which a `sh` probe over the whole execute node proves.
  await withTarget(async (root, artifacts) => {
    writeActConfig(root);
    const issue = claimed(root, "feat/08", "no-act-no-process");
    const probeDir = join(artifacts, "sh-probe");
    const probe = join(artifacts, "sh-ran.log");
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(join(probeDir, "sh"), '#!/bin/bash\nprintf \'%s\\n\' "$*" >> "$SH_PROBE"\nexit 0\n');
    chmodSync(join(probeDir, "sh"), 0o755);

    const executed = runScript(execute.script("execute"), root, {
      INPUTS_ISSUE: issue.handle,
      ARTIFACTS_DIR: artifacts,
      PI_SDK_PATH: fakePiSdk(artifacts, "commit"),
      PATH: `${probeDir}:${process.env.PATH ?? ""}`,
      SH_PROBE: probe,
    });

    expectEqual("the node speaks the merged token", executed.stdout, nodeLine(MERGED));
    expectEqual("and exits clean", executed.status, 0);
    expectEqual("no shell ran for a post-merge act", existsSync(probe), false);
    expectEqual("no log was written", existsSync(join(artifacts, postMergeLogName(issue.handle))), false);
    expectEqual("and the issue closed on its merge", storeIssue(root, issue.id).status, "closed");
  });

  // Red: the merge is a fact, and this act cannot un-land it. The node still says `merged` and exits
  // clean, the issue stays closed on its merge commit, no comment is invented - and the failure is said
  // on stderr and left whole in the act's log.
  await withTarget(async (root, artifacts) => {
    writeActConfig(root, "echo INSTALL-FAILED >&2; exit 9");
    const issue = claimed(root, "feat/09", "a-red-act-keeps-the-merge");
    const { branch } = names("feat/09", "a-red-act-keeps-the-merge");

    const executed = runScript(execute.script("execute"), root, {
      INPUTS_ISSUE: issue.handle,
      ARTIFACTS_DIR: artifacts,
      PI_SDK_PATH: fakePiSdk(artifacts, "commit"),
    });

    expectEqual("the node still speaks the merged token", executed.stdout, nodeLine(MERGED));
    expectEqual("and exits clean", executed.status, 0);
    expect(
      "the failure is named on stderr",
      executed.stderr.includes("merged and recorded, but the Target's post-merge command failed") &&
        executed.stderr.includes("INSTALL-FAILED"),
      executed.stderr,
    );
    expect(
      "and the act's whole output is in its log",
      readFileSync(join(artifacts, postMergeLogName(issue.handle)), "utf8").includes("INSTALL-FAILED"),
    );
    expectEqual("the issue is closed on its merge", storeIssue(root, issue.id).close_reason, `merged ${branch}`);
    expectEqual("Main carries the work", flowMerges(root), [`beads-dag: merge ${branch}`]);
    expectEqual("and no failure comment was invented", storeComments(root, issue.id).length, 0);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
