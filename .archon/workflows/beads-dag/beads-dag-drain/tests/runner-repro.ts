#!/usr/bin/env bun
/**
 * Repro: the runners, without a provider, without a live session.
 *
 * The pack trusts one channel per runner - Pi's own session jsonl, dsh's event stream - and never the
 * runner's terminal output or the value a prompt call happens to return. This file pins that channel
 * deterministically: a fake Pi SDK (loaded through `PI_SDK_PATH`, so no real SDK and no network) whose
 * prompt call returns something other than what it writes into the session file, and a stub dsh that
 * speaks the harness's JSON-RPC. Both report their session file back on the result, and Pi's lands
 * under the run's artifacts.
 *
 * The other half is what a runner failure does. A runner that cannot start (an unreachable SDK, a
 * model the SDK refuses, no dsh binary) is RunnerUnavailable, not a turn: the node exits non-zero with
 * no token at all, the issue stays exactly where it was claimed, and nothing closes. A runner that
 * starts and then goes wrong is a turn with `lastError`, and the node's own failure path records it.
 *
 * The executor is driven end to end with the fake Pi SDK: the fake session commits in the worktree,
 * and the run merges it. That is the node-level half of the live acceptance; the live half is the
 * throwaway-lab run recorded in `.scratch/beads-dag/issues/06-real-runners.md`.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../../beads-dag-execute/scripts/execute.ts";
import { defaultAgent, packAnswer, RunnerUnavailable, type PackAgentOpts } from "../../scripts/agent.ts";
import { dshAgent } from "../../scripts/dsh-agent.ts";
import { MERGED } from "../../scripts/node-outcomes.ts";
import { loadPiSdk, piBashTool, piSdkCandidates, readPiSession, roleSessionFile } from "../../scripts/pi-session.ts";
import { AGENT_WALL_MS } from "../../scripts/roles.ts";
import { READONLY_ENV, workerEnv } from "../../scripts/worker-env.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  execute,
  expect,
  kernelDir,
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
  writeTargetConfig,
} from "./target.ts";

const PI_SDK_PACKAGE = "@earendil-works/pi-coding-agent";

/** The environment variables this file sets; restored in full at the end, whatever happens. */
const TOUCHED_ENV = [
  "PI_SDK_PATH",
  "FAKE_PI_RECORD",
  "DSH_BIN",
  "DSH_HOME",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_API_KEY",
  "STUB_SEEN",
  "STUB_HANG",
  "STUB_TURN_KIND",
  "STUB_NO_SESSION",
];
const savedEnv: Record<string, string | undefined> = {};
for (const name of TOUCHED_ENV) savedEnv[name] = process.env[name];

/** Run a turn expected to fail because the runner never started, and pin that failure's kind. */
async function expectUnavailable(name: string, run: () => Promise<unknown>, re: RegExp): Promise<void> {
  let error: unknown;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  if (error === undefined) throw new Error(`${name}: did not throw`);
  if (!(error instanceof RunnerUnavailable)) {
    throw new Error(`${name}: not RunnerUnavailable: ${String(error)}`);
  }
  if (!re.test(error.message)) throw new Error(`${name}: reason does not match ${re}: ${error.message}`);
}

/**
 * Run a call whose stderr is the point, collecting what it writes there. The pack's runners say a
 * degraded view on stderr rather than in the result (the channel open.ts's configuration line uses),
 * so this test reads the channel itself.
 */
async function captureStderr<T>(run: () => Promise<T>): Promise<{ value: T; stderr: string }> {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" "));
  };
  try {
    return { value: await run(), stderr: lines.join("\n") };
  } finally {
    console.error = original;
  }
}

/** The stub dsh: the harness's newline-delimited JSON-RPC, one turn, no network. */
function stubDshSource(): string {
  return [
    `#!${process.execPath}`,
    'import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";',
    "const seen = process.env.STUB_SEEN;",
    "const reply = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: \"2.0\", id, result }) + \"\\n\");",
    "const notify = (method, params) => process.stdout.write(JSON.stringify({ jsonrpc: \"2.0\", method, params }) + \"\\n\");",
    "const record = {",
    "  argv: process.argv.slice(2),",
    "  env: {",
    "    home: process.env.DSH_HOME,",
    "    baseUrl: process.env.DEEPSEEK_BASE_URL,",
    "    apiKey: process.env.DEEPSEEK_API_KEY,",
    "    persona: process.env.DSH_SYSTEM_PROMPT,",
    "    readonly: process.env.BD_READONLY,",
    "  },",
    "};",
    "const save = () => { if (seen) writeFileSync(seen, JSON.stringify(record)); };",
    "let buffer = \"\";",
    "process.stdin.setEncoding(\"utf8\");",
    "process.stdin.on(\"data\", (chunk) => {",
    "  buffer += chunk;",
    '  for (let nl = buffer.indexOf("\\n"); nl >= 0; nl = buffer.indexOf("\\n")) {',
    "    const line = buffer.slice(0, nl);",
    "    buffer = buffer.slice(nl + 1);",
    "    if (line.trim()) handle(JSON.parse(line));",
    "  }",
    "});",
    "function handle(message) {",
    '  if (message.method === "initialize") {',
    "    record.initialize = message.params;",
    "    save();",
    '    reply(message.id, { serverInfo: { name: "stub-runtime" } });',
    "    return;",
    "  }",
    '  if (message.method === "session/prompt") {',
    "    record.prompt = message.params;",
    "    save();",
    "    const sessionId = message.params.sessionId;",
    '    const slug = "--" + process.cwd().replace(/^\\/+|\\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-") + "--";',
    '    const dir = [process.env.DSH_HOME, "sessions", slug, sessionId].join("/");',
    '    record.sessionFile = [dir, "session.v3.jsonl"].join("/");',
    '    if (process.env.STUB_NO_SESSION !== "1") {',
    "      mkdirSync(dir, { recursive: true });",
    '      writeFileSync(record.sessionFile, JSON.stringify({ stub: true }) + "\\n");',
    "    }",
    "    save();",
    '    reply(message.id, { messageId: "message-1" });',
    '    notify("session.status", { sessionId, status: "running" });',
    '    if (process.env.STUB_HANG === "1") return;',
    '    notify("session.event", { sessionId, event: { type: "assistant/message", data: { message: { role: "assistant", content: [',
    '      { type: "reasoning", text: "THINKING-LEAK" },',
    '      { type: "text", text: "STUB-ANSWER" },',
    "    ] } } } });",
    '    notify("session.event", { sessionId, event: { type: "turn/end", data: { reason: { kind: process.env.STUB_TURN_KIND ?? "completed" } } } });',
    '    notify("session.status", { sessionId, status: "idle" });',
    "    return;",
    "  }",
    '  if (message.method === "shutdown") {',
    // The real harness finishes writing the turn's tail after it reports the turn idle: this row
    // stands in for those, so the pack has to copy after the harness is closed to get them.
    '    if (record.sessionFile && process.env.STUB_NO_SESSION !== "1") {',
    '      appendFileSync(record.sessionFile, JSON.stringify({ stub: "final" }) + "\\n");',
    "      record.sessionMtimeMs = statSync(record.sessionFile).mtimeMs;",
    "    }",
    "    save();",
    "    reply(message.id, {});",
    "    process.exit(0);",
    "  }",
    "}",
    "",
  ].join("\n");
}

/** The seam options one turn needs, with the parts a case does not care about filled in. */
function agentOpts(over: Partial<PackAgentOpts> & { cwd: string; artifactsDir: string }): PackAgentOpts {
  return {
    env: workerEnv,
    sessionKey: "feat/01",
    role: "implement",
    model: undefined,
    thinkingLevel: "high",
    runner: "pi",
    persona: "PERSONA",
    prompt: "do it",
    wallMs: 60_000,
    ...over,
  };
}

try {
  // ---- Pi: the answer is the session file's, and the session file is under the run's artifacts. -----
  {
    const root = mkTemp("runner-");
    try {
      const artifacts = join(root, "artifacts");
      const work = join(root, "worktree");
      mkdirSync(work, { recursive: true });
      const record = join(root, "pi-record.json");
      process.env.PI_SDK_PATH = fakePiSdk(root, "answer");
      process.env.FAKE_PI_RECORD = record;

      const result = await defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts }));
      const sessionFile = roleSessionFile(artifacts, "feat/01", "implement");
      expectEqual("the answer is the one written into the session", result.answer, {
        kind: "text",
        text: "the session's answer",
      });
      expect(
        "not the value the prompt call returned",
        result.answer.kind === "text" && result.answer.text !== "PROMPT-RETURN-VALUE",
      );
      expectEqual("the result reports the session file's path", result.sessionFile, sessionFile);
      expect("which is under the run's artifacts", sessionFile.startsWith(join(artifacts, "sessions")));
      expect("and really there", existsSync(sessionFile));
      expect("holding the turn's rows", readFileSync(sessionFile, "utf8").includes("the session's answer"));
      expectEqual(
        "and the Pi runner writes no second artifact beside it",
        readdirSync(join(artifacts, "sessions", "feat", "01")),
        ["implement.jsonl"],
      );
      expectEqual("a clean turn has no lastError", result.lastError, undefined);

      const seen = JSON.parse(readFileSync(record, "utf8")) as Record<string, any>;
      expectEqual("the session ran where the node said", seen.cwd, work);
      expectEqual("the session's prompt is the persona and the brief", seen.prompt, "PERSONA\n\ndo it");
      expectEqual("the session mounts the pack's bash tool", seen.customTools, ["bash"]);
      expectEqual(
        "and excludes no tool: excluding 'bash' by name would drop the hooked one with the default",
        seen.excludeTools,
        undefined,
      );
      expect("so the turn really has a shell to run its gate with", seen.activeTools.includes("bash"));
      expectEqual("the thinking level travels", seen.thinkingLevel, "high");

      // ---- The grill role mounts the round's own channel; no other role carries it. -----------------
      const grillRecord = join(root, "pi-record-grill.json");
      process.env.PI_SDK_PATH = fakePiSdk(root, "grill");
      process.env.FAKE_PI_RECORD = grillRecord;
      await defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts, role: "grill", sessionKey: "grill/01" }));
      const grillSeen = JSON.parse(readFileSync(grillRecord, "utf8")) as Record<string, any>;
      expectEqual(
        "the grill turn mounts the round tools beside its shell",
        grillSeen.customTools,
        ["bash", "submit_round", "submit_done"],
      );
      expect(
        "and the mounted tool really wrote the turn's submission",
        existsSync(join(artifacts, "grill-round.json")),
      );
      expect("and the implement turn carries none of them", !seen.customTools.includes("submit_round"));

      // The reader's own rule, on a hand-written session: thinking never becomes the answer.
      const thinkingOnly = join(root, "thinking-only.jsonl");
      writeFileSync(
        thinkingOnly,
        `${JSON.stringify({
          type: "message",
          message: { role: "assistant", content: [{ type: "thinking", text: "THINKING-LEAK" }] },
        })}\n`,
      );
      expectEqual("a turn that only thought answered no text", readPiSession(thinkingOnly).text, undefined);
      expectEqual("blank text is no answer", packAnswer("  \n"), { kind: "none" });
      expectEqual("a real answer keeps its bytes", packAnswer(" x \n"), { kind: "text", text: " x \n" });

      // ---- Pi: a session that says nothing, one that goes wrong, and the wall clock. ---------------
      process.env.PI_SDK_PATH = fakePiSdk(root, "none");
      const silent = await defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts, sessionKey: "feat/02" }));
      expectEqual("a session with no text answers none", silent.answer, { kind: "none" });
      expectEqual("and reports no error of its own", silent.lastError, undefined);

      process.env.PI_SDK_PATH = fakePiSdk(root, "throw");
      const thrown = await defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts, sessionKey: "feat/03" }));
      expectEqual("a prompt that threw is still a turn with no answer", thrown.answer, { kind: "none" });
      expect("and its reason is the runner's own", (thrown.lastError ?? "").includes("the model exploded"), thrown.lastError);

      process.env.PI_SDK_PATH = fakePiSdk(root, "hang");
      const started = Date.now();
      const hung = await defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts, sessionKey: "feat/04", wallMs: 100 }));
      expect("the role's wall clock ends a wedged turn", Date.now() - started < 5_000, Date.now() - started);
      expectEqual("and the turn is reported aborted", hung.lastError, "agent aborted after wall clock");
      expectEqual("with no answer", hung.answer, { kind: "none" });

      // ---- Pi: a runner that cannot start is not a turn. --------------------------------------------
      process.env.PI_SDK_PATH = join(root, "not-a-package");
      await expectUnavailable(
        "an unreachable SDK is a runner that could not start",
        () => defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts })),
        /the pi runner could not start: .*cannot reach the Pi SDK/,
      );
      process.env.PI_SDK_PATH = fakePiSdk(root, "answer");
      await expectUnavailable(
        "a model the SDK refuses is a runner that could not start",
        () => defaultAgent(agentOpts({ cwd: work, artifactsDir: artifacts, sessionKey: "feat/05", model: "nope/nope" })),
        /the pi runner could not start: unknown model nope\/nope/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  // ---- Pi: the SDK ladder, and the spawn hook the session mounts. ----------------------------------
  {
    const root = mkTemp("runner-ladder-");
    try {
      const fake = fakePiSdk(root, "answer");
      expectEqual(
        "PI_SDK_PATH is the whole ladder",
        piSdkCandidates({ env: { PI_SDK_PATH: fake } }),
        [join(fake, "index.js")],
      );
      const libSdk = join(root, "lib", "node_modules", "@earendil-works", "pi-coding-agent");
      mkdirSync(libSdk, { recursive: true });
      writeFileSync(join(libSdk, "package.json"), JSON.stringify({ name: PI_SDK_PACKAGE, type: "module", main: "./index.js" }));
      writeFileSync(join(libSdk, "index.js"), "export const marker = 1;\n");
      expectEqual(
        "the executable's ../lib/node_modules is a candidate root",
        piSdkCandidates({ env: {}, execPath: join(root, "bin", "node"), whichPi: () => null }),
        [PI_SDK_PACKAGE, join(libSdk, "index.js")],
      );

      const sdk = await loadPiSdk({ env: { PI_SDK_PATH: fake } });
      expect("the ladder loads the package", typeof sdk.createAgentSession === "function");
      const tool = piBashTool(sdk, { cwd: root, env: workerEnv }) as {
        kind: string;
        spawnHook: (ctx: { command: string; cwd: string; env: NodeJS.ProcessEnv }) => {
          command: string;
          cwd: string;
          env: NodeJS.ProcessEnv;
        };
      };
      expectEqual("the mounted tool is Pi's bash definition", tool.kind, "bash");
      const spawned = tool.spawnHook({ command: "bd update x -s closed", cwd: root, env: { PATH: "/usr/bin" } });
      expectEqual("and the spawn context carries the store's read-only mode", spawned.env[READONLY_ENV], "1");
      expectEqual("with the rest of the environment intact", spawned.env.PATH, "/usr/bin");
      expectEqual("and the command untouched", spawned.command, "bd update x -s closed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  // ---- dsh: the stub harness, the answer channel, the environment, the wall clock. ------------------
  {
    const root = mkTemp("runner-dsh-");
    try {
      const artifacts = join(root, "artifacts");
      const work = join(root, "worktree");
      mkdirSync(work, { recursive: true });
      const dshHome = join(root, "dsh-home");
      const seen = join(root, "dsh-seen.json");
      const stub = join(root, "stub-dsh");
      writeFileSync(stub, stubDshSource());
      chmodSync(stub, 0o755);
      process.env.DSH_BIN = stub;
      process.env.DSH_HOME = dshHome;
      process.env.DEEPSEEK_BASE_URL = "https://gateway.invalid/v1";
      process.env.DEEPSEEK_API_KEY = "test-key";
      process.env.STUB_SEEN = seen;

      const result = await dshAgent(agentOpts({ cwd: work, artifactsDir: artifacts, runner: "dsh" }));
      expectEqual("the answer comes off the harness's event stream", result.answer, {
        kind: "text",
        text: "STUB-ANSWER",
      });
      expect(
        "and the thinking part never leaks into it",
        result.answer.kind === "text" && !result.answer.text.includes("THINKING-LEAK"),
      );
      const record = JSON.parse(readFileSync(seen, "utf8")) as Record<string, any>;
      const harnessFile = record.sessionFile as string;
      const viewFile = roleSessionFile(artifacts, "feat/01", "implement");
      expectEqual("the reported session file is the view under the run's artifacts", result.sessionFile, viewFile);
      expect("which is not where the harness keeps its own", viewFile !== harnessFile);
      expect("the view is really there", existsSync(viewFile));
      expectEqual(
        "holding the harness's own bytes",
        readFileSync(viewFile, "utf8"),
        readFileSync(harnessFile, "utf8"),
      );
      expect(
        "including the rows the harness wrote after it reported the turn idle",
        readFileSync(viewFile, "utf8").includes('{"stub":"final"}'),
      );
      expect("as a view, never a move: the harness's file is still where it wrote it", existsSync(harnessFile));
      expectEqual("and was not rewritten", statSync(harnessFile).mtimeMs, record.sessionMtimeMs);
      expectEqual("a completed turn has no lastError", result.lastError, undefined);
      expectEqual("the harness boots the minimal profile", record.argv.join(" "), "--profile sdk-minimal");
      expectEqual("the persona is the system prompt", record.env.persona, "PERSONA");
      expectEqual("the brief is the first message", record.prompt.contentBlocks[0].text, "do it");
      expectEqual("the gateway comes from the environment", record.env.baseUrl, "https://gateway.invalid/v1");
      expectEqual("the store's read-only mode reaches the harness's child", record.env.readonly, "1");
      expectEqual("the provider is the harness's default", record.initialize.provider, "deepseek-official");
      expectEqual("the model defaults", record.initialize.model, "deepseek-flash");

      // A harness that left no session file: the turn's work landed, so it is still a turn - the
      // missing view is a loud line on stderr and the result falls back to the harness's own path.
      process.env.STUB_NO_SESSION = "1";
      const unviewed = await captureStderr(() =>
        dshAgent(agentOpts({ cwd: work, artifactsDir: artifacts, runner: "dsh", sessionKey: "feat/11" })),
      );
      delete process.env.STUB_NO_SESSION;
      const second = JSON.parse(readFileSync(seen, "utf8")) as Record<string, any>;
      const missingHarness = second.sessionFile as string;
      const wantedView = roleSessionFile(artifacts, "feat/11", "implement");
      expectEqual("a turn with no harness session file still answers", unviewed.value.answer, {
        kind: "text",
        text: "STUB-ANSWER",
      });
      expectEqual("and is not turned into a failed attempt", unviewed.value.lastError, undefined);
      expect("no view is written", !existsSync(wantedView));
      expect("the harness really did leave nothing there", !existsSync(missingHarness));
      expectEqual("and the result reports the harness's own path", unviewed.value.sessionFile, missingHarness);
      expect("while stderr says the view was not written", /dsh session view not written/.test(unviewed.stderr), unviewed.stderr);
      expect(
        "naming both paths",
        unviewed.stderr.includes(missingHarness) && unviewed.stderr.includes(wantedView),
        unviewed.stderr,
      );

      // All seven of the pack's thinking levels fold onto dsh's four efforts.
      const efforts: [PackAgentOpts["thinkingLevel"], string][] = [
        ["off", "off"],
        ["minimal", "low"],
        ["low", "low"],
        ["medium", "high"],
        ["high", "high"],
        ["xhigh", "high"],
        ["max", "max"],
      ];
      for (const [level, effort] of efforts) {
        await dshAgent(agentOpts({ cwd: work, artifactsDir: artifacts, runner: "dsh", thinkingLevel: level }));
        const got = JSON.parse(readFileSync(seen, "utf8")) as Record<string, any>;
        expectEqual(`thinking level ${level} folds to ${effort}`, got.initialize.reasoningEffort, effort);
      }
      process.env.STUB_TURN_KIND = "aborted";
      const aborted = await dshAgent(agentOpts({ cwd: work, artifactsDir: artifacts, runner: "dsh" }));
      expectEqual("a non-completed turn is reported", aborted.lastError, "turn ended: aborted");
      expectEqual("with the text it managed", aborted.answer, { kind: "text", text: "STUB-ANSWER" });
      delete process.env.STUB_TURN_KIND;

      // The wall clock: the stub accepts the turn and never reports idle.
      process.env.STUB_HANG = "1";
      const started = Date.now();
      const wedged = await dshAgent(agentOpts({ cwd: work, artifactsDir: artifacts, runner: "dsh", wallMs: 500 }));
      expect("the wall clock ends a wedged harness", Date.now() - started < 8_000, Date.now() - started);
      expectEqual("and reports it as an aborted turn", wedged.lastError, "agent aborted after wall clock");
      delete process.env.STUB_HANG;

      // A harness that cannot come up is a runner that never started.
      process.env.DSH_BIN = join(root, "no-such-dsh");
      await expectUnavailable(
        "a missing dsh binary is a runner that could not start",
        () => dshAgent(agentOpts({ cwd: work, artifactsDir: artifacts, runner: "dsh" })),
        /the dsh runner could not start: .*dsh spawn failed/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  // ---- The executor, end to end: the fake session's commit lands in Main, and Main stays clean. ----
  await withTarget(async (root, artifacts) => {
    process.env.PI_SDK_PATH = fakePiSdk(artifacts, "commit");
    process.env.FAKE_PI_RECORD = join(artifacts, "pi-record.json");
    writeTargetConfig(root, `runner: pi\nstore: ${storeBinary()}\n`);
    const issue = publishIssue(root, {
      title: "a live-like run",
      handle: "feat/09",
      slug: "a-live-like-run",
      labels: [GATE_LABEL],
    });
    // A Target's own files are committed before the drain: the brief and the config are not the run's dirt.
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");
    bd(root, "update", issue.id, "-s", "in_progress");

    const outcome = await executeIssue(root, issue.handle, { artifactsDir: artifacts });

    expectEqual("the fake session's work settles as merged", outcome, MERGED);
    expectEqual("the issue is closed in the store", storeIssue(root, issue.id).status, "closed");
    expectEqual("with the merge named", storeIssue(root, issue.id).close_reason, "merged beads/feat/09-a-live-like-run");
    expectEqual("the session's commit is in Main", gitC(root, "show", "main:HELLO.md"), "hello");
    expectEqual(
      "as the merge's second parent",
      gitC(root, "log", "-1", "--format=%s", `${gitC(root, "rev-parse", "main")}^2`),
      "hello from the fake session",
    );
    const sessionFile = roleSessionFile(artifacts, issue.handle, "implement");
    expect("the run's artifacts hold the session file", existsSync(sessionFile));
    expect("with the turn in it", readFileSync(sessionFile, "utf8").includes("the session's answer"));
    const seen = JSON.parse(readFileSync(join(artifacts, "pi-record.json"), "utf8")) as Record<string, any>;
    expectEqual("the session ran in the issue's worktree", seen.cwd, join(root, "worktrees", "feat-09-a-live-like-run"));

    // The store's own log is rewritten by every command; after the run, none of that is dirt.
    expectEqual("the store's interaction log is untracked", gitC(root, "ls-files", "--", ".beads/interactions.jsonl"), "");
    expect("and ignored", gitC(root, "check-ignore", "-v", ".beads/interactions.jsonl").includes("interactions.jsonl"));
    expectEqual("so the Target is clean after the run", gitC(root, "status", "--porcelain"), "");
  });

  // ---- A runner that cannot start fails the node loudly and records nothing as merged. --------------
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `runner: pi\nstore: ${storeBinary()}\n`);
    const issue = publishIssue(root, {
      title: "a runner that cannot start",
      handle: "feat/10",
      slug: "a-runner-that-cannot-start",
      labels: [GATE_LABEL],
    });
    gitC(root, "add", "-A");
    gitC(root, "commit", "-m", "lab setup");
    bd(root, "update", issue.id, "-s", "in_progress");

    const r = runScript(execute.script("execute"), root, {
      ARTIFACTS_DIR: artifacts,
      INPUTS_ISSUE: issue.handle,
      PI_SDK_PATH: join(root, "no-such-sdk"),
    });

    expectEqual("the node exits non-zero", r.status === 0, false);
    expectEqual("and prints no token at all", r.stdout, "");
    expect("its stderr says the runner could not start", r.stderr.includes("the pi runner could not start"), r.stderr);
    expectEqual("the issue is not closed", storeIssue(root, issue.id).status, "in_progress");
    expectEqual("nothing was recorded as an attempt", storeComments(root, issue.id).length, 0);
    expectEqual("no merge commit exists on Main", gitC(root, "log", "--merges", "--format=%s", "main"), "");
    expect(
      "the attempt's worktree is left for the repair path",
      existsSync(join(root, "worktrees", "feat-10-a-runner-that-cannot-start")),
    );
    expectEqual("and the Target is still clean", gitC(root, "status", "--porcelain"), "");
  });

  // ---- One node can run two turns, so its timeout covers both. --------------------------------------
  const executeYaml = readFileSync(execute.yaml, "utf8");
  const timeout = Number(/id: execute[\s\S]*?timeout:\s*(\d+)/.exec(executeYaml)?.[1]);
  expect("the execute node declares a timeout", Number.isFinite(timeout), executeYaml.slice(0, 200));
  expect(
    "and it outlasts the two turns the node can run",
    timeout > 2 * AGENT_WALL_MS,
    `${timeout}ms vs ${2 * AGENT_WALL_MS}ms`,
  );

  // A node that throws - a runner that cannot start - has to fail the run, not be a marker in it: the
  // drain's fan-out is what turns one instance's non-zero exit into a failed run.
  const drainYaml = readFileSync(drain.yaml, "utf8");
  expect(
    "the drain's fan-out is all_success, so a throwing issue node fails the run",
    /fan_out:[\s\S]*?join:\s*all_success/.test(drainYaml),
    drainYaml.slice(0, 200),
  );

  // ---- The seam's own rules, at the source: no static runner, one answer channel. -------------------
  const seam = readFileSync(join(kernelDir, "agent.ts"), "utf8");
  const staticImports = seam.split("\n").filter((line) => /^import\b/.test(line));
  expect(
    "the seam statically imports no runner",
    staticImports.every((line) => !/from "\.\/(?:pi-session|dsh-agent|dsh-runtime)\.ts"/.test(line)),
    staticImports,
  );
  const pi = readFileSync(join(kernelDir, "pi-session.ts"), "utf8");
  expect("the pi runner never reads the prompt call's return", !/=\s*await\s+pi\.session\.prompt\(/.test(pi));
  expect("its answer is its session reader", /piTurn\(/.test(pi) && /readPiSession\(/.test(pi));
  const wire = readFileSync(join(kernelDir, "dsh-runtime.ts"), "utf8");
  expect("the dsh protocol reads no log file", !/readFileSync|createReadStream/.test(wire));

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
