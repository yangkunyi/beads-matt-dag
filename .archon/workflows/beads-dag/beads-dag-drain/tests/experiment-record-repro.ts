#!/usr/bin/env bun
/**
 * Repro: a complete experiment record closes the ticket; an incomplete one does not.
 *
 * The node under test is `run.ts` - the per-ticket run `beads-dag-experiment` fans out, one instance per
 * handle its pick prints. A stub runner drives its exported entry (`runExperiment`, the `executeIssue`
 * seam), so the turn costs nothing and the assertions are about what an observer outside the pack sees:
 * the store's own answers (`bd show`, `bd comments`, `bd list`), git (the commit, its paths, its subject),
 * and the files the flow names.
 *
 * What is pinned here:
 *
 *   - a complete record closes the ticket, stamps `reading=none` through `bd set-state`, and is committed
 *     as one path-scoped commit; the record's `reading:` line and the dimension are written together;
 *   - an incomplete record leaves the ticket open with `attempt N failed: record incomplete — <what is
 *     missing>` - one case each for a missing file, a missing row and a missing label - and nothing
 *     else happens (no close, no reading dimension, no commit);
 *   - the session's sweep (`bd list -t experiment -s closed -l reading:none`) finds exactly the tickets
 *     closed this way, and clearing the marker is the same `set-state` verb with a new value;
 *   - the run turn is the `experiment` role, with the store read-only, and the executor writes no code
 *     (its commit is the record; the record names the commit the run was on).
 *
 * The turn itself is driven twice more through the fake Pi SDK (`record-complete`, `record-incomplete`),
 * so the node runs end to end with the real default runner - no provider, no live model.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { runExperiment } from "../../beads-dag-experiment-run/scripts/run.ts";
import { clearUnreadMarker, READING_NONE_LABEL, READING_UNREAD } from "../../beads-dag-experiment-run/scripts/record.ts";
import type { PackAgentOpts, PackAgentResult } from "../../scripts/agent.ts";
import { CLOSED, FAILED, nodeLine } from "../../scripts/node-outcomes.ts";
import { roleSessionFile } from "../../scripts/pi-session.ts";
import { READONLY_ENV } from "../../scripts/worker-env.ts";
import {
  bd,
  envWithRunTool,
  expect,
  expectEqual,
  experimentRecordRel,
  experimentRun,
  fakePiSdk,
  gitC,
  installExperimentTools,
  publishExperiment,
  runScript,
  storeBinary,
  storeComments,
  storeIssue,
  storeState,
  withTarget,
  writeStoreConfig,
  writeStubDvc,
  writeTargetConfig,
} from "./target.ts";

const UNREAD = READING_NONE_LABEL;
const READING = "reading";

/** Event beads the store holds for one issue's `reading` dimension, oldest first. */
function readingEvents(root: string, id: string): { created_by?: string; description?: string; title?: string }[] {
  const parsed: unknown = JSON.parse(bd(root, "list", "-t", "event", "--all", "--json", "--limit", "0"));
  if (!Array.isArray(parsed)) throw new Error(`reading events: not a list: ${JSON.stringify(parsed)}`);
  return parsed.filter((row: { parent?: string; title?: string }) => row.parent === id && /reading/.test(row.title ?? ""));
}

/** The environment variables this file sets; restored in full at the end, whatever happens. */
const TOUCHED_ENV = ["PI_SDK_PATH", "FAKE_PI_RECORD"];
const savedEnv: Record<string, string | undefined> = {};
for (const name of TOUCHED_ENV) savedEnv[name] = process.env[name];

/** A file the experiment's turn wrote, as the runner would leave it. */
function write(root: string, rel: string, body: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
}

/** A store that refuses one verb: a `bd` that fails that subcommand and passes the rest through to the real one. */
function writeRefusingStore(binDir: string, verb: string): string {
  mkdirSync(binDir, { recursive: true });
  const wrapper = join(binDir, "bd");
  writeFileSync(
    wrapper,
    [
      "#!/bin/sh",
      `if [ "$1" = "${verb}" ]; then`,
      `  echo "this store refuses ${verb}" >&2`,
      "  exit 1",
      "fi",
      `exec "${storeBinary()}" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(wrapper, 0o755);
  return wrapper;
}

/** The stub runner: it records the options it was handed, does what the case asks, and returns an answer. */
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

/** A complete record: an attempts-table row and the four labelled closing lines, naming the run's commit. */
function completeRecord(commit: string): string {
  return [
    "# result",
    "",
    "| run | metric | source | commit |",
    "| --- | --- | --- | --- |",
    `| 01-pilot | 0.91 | metrics.json | ${commit} |`,
    "",
    "measured: acc=0.91 from metrics.json",
    "reference: met the frozen baseline of 0.9",
    "covered: one seed, one dataset, one config",
    "reading: none yet",
    "",
  ].join("\n");
}

/** The sweep the contract names: closed experiment tickets nobody has read. */
function unreadSweep(root: string): string[] {
  const parsed: unknown = JSON.parse(bd(root, "list", "-t", "experiment", "-s", "closed", "-l", UNREAD, "--json"));
  if (!Array.isArray(parsed)) throw new Error(`unread sweep: not a list: ${JSON.stringify(parsed)}`);
  return parsed.map((row: { id?: string }) => {
    if (typeof row.id !== "string") throw new Error(`unread sweep: row has no id: ${JSON.stringify(row)}`);
    return row.id;
  });
}

try {
  // ---- A complete record closes the ticket, stamps the unread marker, and is committed. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const ticket = publishExperiment(root, { title: "pilot", handle: "exp/01", slug: "pilot" });
    const recordRel = experimentRecordRel("exp/01", "pilot");
    const bodyPath = join(root, ".scratch", "exp", "issues", "01-pilot.md");
    const seen: PackAgentOpts[] = [];
    let turnWrite: { status: number | null; output: string } | undefined;
    let statusDuringTurn: string | undefined;
    let assigneeDuringTurn: string | undefined;
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");
    const code = gitC(root, "rev-parse", "HEAD");
    const prevPath = process.env.PATH;
    const prevDvc = process.env.DVC_BIN;
    process.env.PATH = envWithRunTool(bin).PATH;
    process.env.DVC_BIN = "";

    try {
      const outcome = await runExperiment(root, "exp/01", {
        artifactsDir: artifacts,
        runAgent: stub(seen, { sessionFile: "", answer: { kind: "text", text: "ran" }, lastError: undefined }, (opts) => {
          write(root, recordRel, completeRecord(code));
          write(root, "train.py", "print('no')\n");
          const r = spawnSync(storeBinary(), ["update", ticket.id, "-s", "closed"], {
            cwd: root,
            env: opts.env(process.env),
            encoding: "utf8",
          });
          turnWrite = { status: r.status, output: `${r.stderr ?? ""}${r.stdout ?? ""}`.trim() };
          const during = storeIssue(root, ticket.id);
          statusDuringTurn = during.status;
          assigneeDuringTurn = during.assignee;
        }),
      });

      expectEqual("a complete record closes", outcome, CLOSED);
      expectEqual("the ticket is closed", storeIssue(root, ticket.id).status, "closed");
      expectEqual("carrying the unread reading", storeState(root, ticket.id, READING), READING_UNREAD);
      expect("and still the experiment label", storeIssue(root, ticket.id).labels.includes("experiment"), storeIssue(root, ticket.id).labels);
      const who = `beads-dag-experiment/${artifacts.split("/").pop()}`;
      const events = readingEvents(root, ticket.id);
      expectEqual("one event bead records the unread write", events.length, 1);
      expectEqual("the actor is the run's own identity", events[0]!.created_by, who);
      expect("the reason is the close", /Reason: record closed/.test(events[0]!.description ?? ""), events[0]!.description);

      const commit = gitC(root, "rev-parse", "main");
      const comments = storeComments(root, ticket.id);
      expectEqual("exactly one comment is written", comments.length, 1);
      expectEqual("naming the record and the commit", comments[0]!.text, `recorded: ${recordRel} (commit ${commit})`);

      expectEqual("one commit carries the record", gitC(root, "log", "-1", "--format=%s"), "record: exp/01 pilot");
      expectEqual("naming exactly the record", gitC(root, "show", "--name-only", "--format=", "HEAD"), recordRel);
      expect("the record is in Main", gitC(root, "show", `main:${recordRel}`).includes("reading: none yet"), recordRel);
      expect("and names the commit the run was on", gitC(root, "show", `main:${recordRel}`).includes(code), code);
      expectEqual("the executor committed no code", existsSync(join(root, "train.py")) && gitC(root, "status", "--porcelain", "--", "train.py") !== "", true);

      const turn = seen[0]!;
      expectEqual("the turn is the experiment role", turn.role, "experiment");
      expectEqual("keyed by the ticket's handle", turn.sessionKey, "exp/01");
      expectEqual("running where the Target is", turn.cwd, root);
      expectEqual("with the store read-only", turn.env({})[READONLY_ENV], "1");
      expect("its brief is the body's path", turn.prompt.startsWith(bodyPath), turn.prompt);
      expect("plus the record path", turn.prompt.includes(`Record: ${recordRel}`), turn.prompt);

      expect("the experiment turn tried to write the store", turnWrite !== undefined);
      expect("and the store refused it", turnWrite!.status !== 0, turnWrite);
      expect("in its own read-only words", /read-only/.test(turnWrite!.output), turnWrite);
      expectEqual("leaving the ticket claimed, not closed, during the turn", statusDuringTurn, "in_progress");
      expectEqual("under the run's own identity", assigneeDuringTurn, `beads-dag-experiment/${artifacts.split("/").pop()}`);
    } finally {
      process.env.PATH = prevPath;
      if (prevDvc === undefined) delete process.env.DVC_BIN;
      else process.env.DVC_BIN = prevDvc;
    }
  });

  // ---- Missing file, missing row, missing label: the ticket stays open, naming exactly what is missing. ----
  for (const [kind, handle, slug, work, missing] of [
    ["file", "exp/02", "no-file", (_root: string, _rel: string) => undefined, ".scratch/exp/results/02-no-file.md"],
    [
      "row",
      "exp/03",
      "no-row",
      (root: string, rel: string) =>
        write(
          root,
          rel,
          "measured: acc=0.91 from metrics.json\nreference: met the frozen baseline\ncovered: one seed\nreading: none yet\n",
        ),
      "attempts-table row",
    ],
    [
      "label",
      "exp/04",
      "no-label",
      (root: string, rel: string) =>
        write(
          root,
          rel,
          "| run | metric |\n| --- | --- |\n| 01 | 0.91 |\n\nmeasured: acc=0.91 from metrics.json\nreference: met the frozen baseline\nreading: none yet\n",
        ),
      "covered:",
    ],
  ] as const) {
    await withTarget(async (root, artifacts) => {
      writeStoreConfig(root);
      installExperimentTools(root);
      const bin = join(artifacts, "bin");
      writeStubDvc(bin);
      const ticket = publishExperiment(root, { title: kind, handle, slug });
      const recordRel = experimentRecordRel(handle, slug);
      gitC(root, "add", "-A");
      gitC(root, "commit", "-m", "lab setup");
      const before = gitC(root, "rev-parse", "main");
      const prevPath = process.env.PATH;
      const prevDvc = process.env.DVC_BIN;
      process.env.PATH = envWithRunTool(bin).PATH;
      process.env.DVC_BIN = "";
      try {
        const outcome = await runExperiment(root, handle, {
          artifactsDir: artifacts,
          runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: "ran" }, lastError: undefined }, () => {
            work(root, recordRel);
          }),
        });
        expectEqual(`a missing ${kind} fails`, outcome, FAILED);
        expectEqual("the ticket stays open", storeIssue(root, ticket.id).status, "open");
        expectEqual("with no reading dimension", storeState(root, ticket.id, READING), undefined);
        expectEqual(
          "naming exactly what is missing",
          storeComments(root, ticket.id)[0]!.text,
          `attempt 1 failed: record incomplete — ${missing}`,
        );
        expectEqual("nothing was committed", gitC(root, "rev-parse", "main"), before);
        expectEqual("and the assignment is given back", storeIssue(root, ticket.id).assignee ?? null, null);
      } finally {
        process.env.PATH = prevPath;
        if (prevDvc === undefined) delete process.env.DVC_BIN;
        else process.env.DVC_BIN = prevDvc;
      }
    });
  }

  // ---- The sweep finds exactly the tickets closed this way; clearing the marker is one act. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const closed = publishExperiment(root, { title: "recorded", handle: "exp/05", slug: "recorded" });
    const other = publishExperiment(root, { title: "hand-closed", handle: "exp/06", slug: "hand-closed" });
    const recordRel = experimentRecordRel("exp/05", "recorded");
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");
    const code = gitC(root, "rev-parse", "HEAD");
    const prevPath = process.env.PATH;
    const prevDvc = process.env.DVC_BIN;
    process.env.PATH = envWithRunTool(bin).PATH;
    process.env.DVC_BIN = "";
    try {
      await runExperiment(root, "exp/05", {
        artifactsDir: artifacts,
        runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: "ran" }, lastError: undefined }, () => {
          write(root, recordRel, completeRecord(code));
        }),
      });
      bd(root, "update", other.id, "-s", "closed");

      expectEqual("the sweep finds exactly the ticket closed this way", unreadSweep(root), [closed.id]);
      expectEqual("the hand-closed ticket is closed without the marker", storeIssue(root, other.id).status, "closed");
      expectEqual("and has no reading dimension", storeState(root, other.id, READING), undefined);

      clearUnreadMarker(root, closed.id, recordRel, "declined — not useful", {
        reason: "operator declined",
        actor: "session/test",
      });
      expectEqual("clearing empties the sweep", unreadSweep(root), []);
      expectEqual("the dimension now holds the reading", storeState(root, closed.id, READING), "declined — not useful");
      expectEqual("the ticket stays closed", storeIssue(root, closed.id).status, "closed");
      const record = readFileSync(join(root, recordRel), "utf8");
      expect("the record's marker line changed", record.includes("reading: declined — not useful"), record);
      expect("and no longer says none yet", !/^reading: none yet$/m.test(record), record);
      const comments = storeComments(root, closed.id).map((c) => c.text);
      expect("no comment restates the reading", !comments.some((text) => text.includes("declined — not useful")), comments);
      const events = readingEvents(root, closed.id);
      expect("a second event bead records the clear", events.length >= 2, events.length);
      const declined = events.find((event) => /Reason: operator declined/.test(event.description ?? ""));
      expect("the clear's event is on the ticket", declined !== undefined, events);
      expectEqual("the actor is the session's own", declined!.created_by, "session/test");
    } finally {
      process.env.PATH = prevPath;
      if (prevDvc === undefined) delete process.env.DVC_BIN;
      else process.env.DVC_BIN = prevDvc;
    }
  });

  // ---- The turn end to end, through the real default runner and the fake session. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    process.env.PI_SDK_PATH = fakePiSdk(artifacts, "record-complete");
    const ticket = publishExperiment(root, { title: "a run the fake session writes", handle: "exp/07", slug: "a-run-the-fake-session-writes" });
    const recordRel = experimentRecordRel("exp/07", "a-run-the-fake-session-writes");
    const prevPath = process.env.PATH;
    const prevDvc = process.env.DVC_BIN;
    process.env.PATH = envWithRunTool(bin).PATH;
    process.env.DVC_BIN = "";
    try {
      const outcome = await runExperiment(root, "exp/07", { artifactsDir: artifacts });
      expectEqual("the fake session's record closes", outcome, CLOSED);
      expectEqual("the ticket is closed with the unread marker", storeIssue(root, ticket.id).status, "closed");
      expectEqual("carrying the unread reading", storeState(root, ticket.id, READING), READING_UNREAD);
      expect("the record came off the session", existsSync(join(root, recordRel)), recordRel);
      expect("the record is in Main", gitC(root, "show", `main:${recordRel}`).includes("reading: none yet"), recordRel);
      const sessionFile = roleSessionFile(artifacts, "exp/07", "experiment");
      expect("the turn's session is under the run's artifacts", existsSync(sessionFile), sessionFile);

      process.env.PI_SDK_PATH = fakePiSdk(artifacts, "record-incomplete");
      const silent = publishExperiment(root, {
        title: "a run that writes an incomplete record",
        handle: "exp/08",
        slug: "a-run-that-writes-an-incomplete-record",
      });
      const before = gitC(root, "rev-parse", "main");
      const silentOutcome = await runExperiment(root, "exp/08", { artifactsDir: artifacts });
      expectEqual("an incomplete fake record does not close", silentOutcome, FAILED);
      expect("the attempt names a missing label", /record incomplete — /.test(storeComments(root, silent.id)[0]!.text ?? ""), storeComments(root, silent.id)[0]?.text);
      expectEqual("back to open", storeIssue(root, silent.id).status, "open");
      expectEqual("no reading dimension", storeState(root, silent.id, READING), undefined);
      expectEqual("and nothing was committed", gitC(root, "rev-parse", "main"), before);
    } finally {
      process.env.PATH = prevPath;
      if (prevDvc === undefined) delete process.env.DVC_BIN;
      else process.env.DVC_BIN = prevDvc;
    }
  });

  // ---- The node itself, through the protocol the runner uses: env in, one token out. ----
  await withTarget(async (root, artifacts) => {
    writeStoreConfig(root);
    installExperimentTools(root);
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    const ticket = publishExperiment(root, { title: "a run the runner drives", handle: "exp/09", slug: "a-run-the-runner-drives" });
    const r = runScript(
      experimentRun.script("run"),
      root,
      envWithRunTool(bin, {
        ARTIFACTS_DIR: artifacts,
        INPUTS_ISSUE: "exp/09",
        PI_SDK_PATH: fakePiSdk(artifacts, "record-complete"),
      }),
    );
    expectEqual("the run node prints its token and nothing else", r.stdout, nodeLine(CLOSED));
    expectEqual("as a result, not an error", r.status, 0);
    expectEqual("the ticket is closed", storeIssue(root, ticket.id).status, "closed");
    expectEqual("with the unread reading", storeState(root, ticket.id, READING), READING_UNREAD);
  });

  // ---- The unread marker is written before the close, and a store that refuses it leaves a ticket the
  // next run retries. The other order fails differently and worse: the ticket would already be `closed`
  // with no marker, so the sweep (`bd list -t experiment -s closed -l reading:none`) could never find it
  // and the result would be lost with nobody to tell. Both writes are idempotent, so the retry is cheap.
  await withTarget(async (root, artifacts) => {
    installExperimentTools(root);
    const ticket = publishExperiment(root, {
      title: "a marker the store refuses",
      handle: "exp/10",
      slug: "a-marker-the-store-refuses",
    });
    const recordRel = experimentRecordRel("exp/10", "a-marker-the-store-refuses");
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");
    const code = gitC(root, "rev-parse", "HEAD");
    const prevPath = process.env.PATH;
    const prevDvc = process.env.DVC_BIN;
    const bin = join(artifacts, "bin");
    writeStubDvc(bin);
    // The store is named by absolute path in the config, so the refusal is arranged there rather than on
    // PATH: one verb fails, every other command reaches the real store.
    writeTargetConfig(root, `store: ${writeRefusingStore(bin, "set-state")}\n`);
    process.env.PATH = envWithRunTool(bin).PATH;
    process.env.DVC_BIN = "";
    try {
      const outcome = await runExperiment(root, "exp/10", {
        artifactsDir: artifacts,
        runAgent: stub([], { sessionFile: "", answer: { kind: "text", text: "ran" }, lastError: undefined }, () => {
          write(root, recordRel, completeRecord(code));
        }),
      });
      expectEqual("a refused unread marker fails the node", outcome, FAILED);
      expectEqual("and does not leave the ticket closed", storeIssue(root, ticket.id).status, "open");
      expectEqual("so the sweep never claims it was read", unreadSweep(root), []);
      expect(
        "and the ticket carries the failure",
        storeComments(root, ticket.id).some((entry) =>
          /attempt 1 failed: the record could not be closed out/.test(entry.text),
        ),
        JSON.stringify(storeComments(root, ticket.id)),
      );
    } finally {
      process.env.PATH = prevPath;
      if (prevDvc === undefined) delete process.env.DVC_BIN;
      else process.env.DVC_BIN = prevDvc;
    }
  });

  // ---- The tracker contract and the experiment-domain document carry the four literal labels. ----
  {
    const repo = gitC(import.meta.dir, "rev-parse", "--show-toplevel");
    for (const rel of ["docs/agents/issue-tracker.md", "docs/specs/2026-09-15-experiment-domain.md"]) {
      const text = readFileSync(join(repo, rel), "utf8");
      for (const label of ["measured:", "reference:", "covered:", "reading:"]) {
        expect(`${rel} carries ${label}`, text.includes(`\`${label}\``), rel);
      }
    }
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
} finally {
  for (const name of TOUCHED_ENV) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
}
