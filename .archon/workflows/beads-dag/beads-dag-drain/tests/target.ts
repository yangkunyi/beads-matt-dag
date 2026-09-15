#!/usr/bin/env bun
/** Shared Target fixture for the repro scripts: a temp git repo, a real store, store helpers, git, expects. */
import { execFileSync, spawnSync } from "node:child_process";
import { accessSync, chmodSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { READONLY_ENV } from "../scripts/worker-env.ts";

/**
 * This process stands in for the drain runner, and a runner's environment is not a worker's.
 *
 * The store's read-only mode belongs to the **agent subprocess** (worker-env.ts): the drain adds it to the
 * environment it hands the runner for one turn, so a worker cannot move a Target's frontier. A node
 * script never runs under it, and a repro that calls one in-process is standing where the node runs. The
 * flag is therefore dropped here rather than inherited, because a worker that runs the pack's own gate
 * from inside a worker is not the situation the pack creates for the code under test: inherited, it makes
 * every repro that publishes an issue die with `operation 'create' is not allowed in read-only mode`,
 * which reads as a broken suite rather than as an environment mismatch - it cost a real worker a
 * fifteen-minute run on 2026-09-15, before it worked out to re-run under `env -u BD_READONLY`. Dropped
 * here, the suite a worker runs is the suite a session runs.
 *
 * The read-only rule keeps its own test: the repros that prove a worker cannot write pass an environment
 * the pack itself built (`workerEnv`), and an explicit value still wins wherever a caller sets one.
 */
delete process.env[READONLY_ENV];

const drainDir = join(import.meta.dir, "..");
const executeDir = join(import.meta.dir, "../../beads-dag-execute");
const inquiryDir = join(import.meta.dir, "../../beads-dag-inquiry");
const readDir = join(import.meta.dir, "../../beads-dag-read");

/** The pack root, the folder both workflow folders live in. */
export const packDir = join(import.meta.dir, "../..");

/**
 * Where one workflow folder's YAML and scripts are. A test names them the way the YAML does, so a
 * script renamed in the pack renames itself in every test rather than being spelled again here.
 */
export const drain = {
  dir: drainDir,
  yaml: join(drainDir, "beads-dag-drain.yaml"),
  script: (name: string): string => join(drainDir, "scripts", `${name}.ts`),
};

export const execute = {
  dir: executeDir,
  yaml: join(executeDir, "beads-dag-execute.yaml"),
  script: (name: string): string => join(executeDir, "scripts", `${name}.ts`),
};

export const inquiry = {
  dir: inquiryDir,
  yaml: join(inquiryDir, "beads-dag-inquiry.yaml"),
  script: (name: string): string => join(inquiryDir, "scripts", `${name}.ts`),
};

/**
 * The per-ticket reading block `beads-dag-inquiry` composes, one instance per handle its pick prints. It
 * is a folder of its own for the same reason `beads-dag-execute` is: only an include or a workflow node
 * can be fanned out over a runtime list, so the per-question node is a composed block, not a script node
 * in the loop.
 */
export const readBlock = {
  dir: readDir,
  yaml: join(readDir, "beads-dag-read.yaml"),
  script: (name: string): string => join(readDir, "scripts", `${name}.ts`),
};

/** The drain's config, relative to the Target: what the tests write a store override into. */
export const CONFIG_REL = ".scratch/beads-dag.yaml";

/** The gate label: an issue without it is outside the frontier. */
export const GATE_LABEL = "ready-for-agent";

export function mkTemp(prefix = "target-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function gitC(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();
}

export function expect(name: string, cond: unknown, detail?: unknown): void {
  if (!cond) {
    throw new Error(`${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ""}`);
  }
}

export function expectEqual(name: string, got: unknown, want: unknown): void {
  const gs = JSON.stringify(got);
  const ws = JSON.stringify(want);
  if (gs !== ws) throw new Error(`${name}: got ${gs}, want ${ws}`);
}

// ---------------------------------------------------------------------------------------------------
// The store binary.
//
// The suite drives a REAL store, so the binary has to be found, and its absence has to fail this
// process rather than skip a test or fall back to a fake store. It is resolved without a fixed PATH:
// BEADS_BIN if an operator set one, then PATH, then the npm global prefix (where the machine's bd is
// installed: on PATH or not, `npm prefix -g` names the prefix the package went into).
// ---------------------------------------------------------------------------------------------------

let cachedStoreBinary: string | undefined;

function isExecutable(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findOnPath(name: string): string | undefined {
  const entries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const dir of entries) {
    const path = join(dir, name);
    if (isExecutable(path)) return path;
  }
  return undefined;
}

/** The npm global prefix, asked once. Absent npm, or a failed ask, is not an error: PATH may answer. */
let npmPrefix: string | undefined;
function npmGlobalPrefix(): string | undefined {
  if (npmPrefix !== undefined) return npmPrefix || undefined;
  try {
    npmPrefix = execFileSync("npm", ["prefix", "-g"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    npmPrefix = "";
  }
  return npmPrefix || undefined;
}

/**
 * The real store binary. Every candidate is a path; the first executable one answers. Whether it can
 * actually RUN (a wrapper script needs its interpreter) is the spawn's business, not this lookup's.
 * Absent everywhere this throws, naming every place looked - a green suite must never mean "skipped".
 */
export function storeBinary(): string {
  if (cachedStoreBinary) return cachedStoreBinary;
  const looked: string[] = [];
  const explicit = process.env.BEADS_BIN?.trim();
  if (explicit) looked.push(explicit);
  const onPath = findOnPath("bd");
  if (onPath) looked.push(onPath);
  const prefix = npmGlobalPrefix();
  if (prefix) looked.push(join(prefix, "bin", "bd"));
  for (const candidate of looked) {
    if (isExecutable(candidate)) return (cachedStoreBinary = candidate);
  }
  throw new Error(
    `no store binary: the suite drives a real store and will not skip. Looked at ${looked.join(", ") || "(nothing)"} ` +
      "(BEADS_BIN, PATH, then `npm prefix -g` + /bin/bd). Install it (npm i -g @beads/bd@1.2.2) or set BEADS_BIN.",
  );
}

/**
 * The suite's own reader of the store. It builds its own command line, so a change in the pack's store
 * module cannot hide a change in the store, and so the assertions read the store's own answers and
 * nothing else. `root` is the Target: the store is found from there.
 */
export function bd(root: string, ...args: string[]): string {
  return execFileSync(storeBinary(), args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Initialise a real store in a Target, the way the design decides: embedded, no agents file, no hooks. */
export function initStore(root: string, prefix = "target"): void {
  bd(root, "init", "--prefix", prefix, "--non-interactive", "--skip-agents", "--skip-hooks");
}

/**
 * The two Target-side premises a reading run opens on: the reading tools, and an effort area. The fixture
 * makes both as directories, which is exactly what the opening node tests - the tools are a copy the
 * Target makes and the pack ships neither, so their contents are not this suite's business.
 */
export function initReadingTarget(root: string): void {
  mkdirSync(join(root, "tools", "inquiry"), { recursive: true });
  mkdirSync(join(root, ".scratch"), { recursive: true });
}

/**
 * Register a custom issue type in a Target's store: `bd config set types.custom experiment`. This is the
 * store's own half of adding a domain — bd refuses a type it does not know at `create`, so an
 * experiment ticket cannot silently be created as work — and the drain's half ships with the pack
 * (domains.ts's NON_WORK_TYPES), which is why no Target configures the exclusion.
 */
export function registerType(root: string, type: string): void {
  bd(root, "config", "set", "types.custom", type);
}

export type PublishOpts = {
  title: string;
  handle: string;
  slug: string;
  type?: string;
  labels?: string[];
  /** The issue's prose. Unset, a short body naming the issue - the tracker always publishes one. */
  body?: string;
};

export type PublishedIssue = { id: string; handle: string; slug: string; bodyPath: string };

/**
 * Where the tracker publishes an issue's body: `.scratch/<feature>/issues/<NN>-<slug>.md`. The fixture
 * spells the rule here, on purpose, rather than asking the pack: a test that read the pack's own
 * derivation could not catch it naming the wrong file.
 */
export function publishedBodyPath(root: string, handle: string, slug: string): string {
  const [feature, number] = handle.split("/");
  if (!feature || !number) throw new Error(`publishedBodyPath: not a <feature>/<NN> handle: ${handle}`);
  return join(root, ".scratch", feature, "issues", `${number}-${slug}.md`);
}

/**
 * The effort directory a question's reading writes into, spelled here for the same reason as the body's
 * path: the rule is the handle's feature, and a test that asked the pack could not catch the pack naming
 * the wrong effort.
 */
export function readingCorpusRel(handle: string): string {
  const [feature] = handle.split("/");
  if (!feature) throw new Error(`readingCorpusRel: not a <feature>/<NN> handle: ${handle}`);
  return join(".scratch", feature);
}

/** The note a question's reading owns: the effort's `notes/<slug>.md`, the ticket's own slug. */
export function readingNoteRel(handle: string, slug: string): string {
  return join(readingCorpusRel(handle), "notes", `${slug}.md`);
}

/**
 * Publish one issue the way the tracker integration will: type, gate label, the two metadata keys the
 * pack consumes, and the body file it hands the implementer by path. Nothing in this build publishes
 * issues, so the fixture stands in for the tracker.
 */
export function publishIssue(root: string, opts: PublishOpts): PublishedIssue {
  const args = [
    "create",
    opts.title,
    "--type",
    opts.type ?? "task",
    "--silent",
    "--metadata",
    JSON.stringify({ handle: opts.handle, slug: opts.slug }),
  ];
  if (opts.labels?.length) args.push("--labels", opts.labels.join(","));
  const id = bd(root, ...args);
  const bodyPath = publishedBodyPath(root, opts.handle, opts.slug);
  mkdirSync(dirname(bodyPath), { recursive: true });
  writeFileSync(bodyPath, opts.body ?? `# ${opts.handle} - ${opts.title}\n\n${opts.title}\n`);
  return { id, handle: opts.handle, slug: opts.slug, bodyPath };
}

/** The store's answer to "what can start": ready, gate-labelled, decision issues excluded. */
export function storeReady(root: string): string[] {
  // Both non-work types, spelled out rather than imported: this is the store's answer as a human would
  // ask for it, and the test of the pack's exclusion should not agree with the pack by construction.
  return JSON.parse(bd(root, "ready", "--exclude-type", "decision,experiment", "-l", GATE_LABEL, "--json")).map(
    (i: { id: string }) => i.id,
  );
}

/** The store's answer to "what can start" before any filter: readiness alone, capped at nothing. */
export function storeReadyAll(root: string): string[] {
  return JSON.parse(bd(root, "ready", "--json", "--limit", "0")).map((i: { id: string }) => i.id);
}

/**
 * A failed attempt, recorded the way the flow records one: the reason is a comment, and the issue goes
 * back to `open`. Nothing else about it changes, which is the point — the retry channel is `bd ready`.
 */
export function failAttempt(root: string, id: string, reason: string, attempt = 1): void {
  bd(root, "update", id, "-s", "in_progress");
  bd(root, "comment", id, `attempt ${attempt} failed: ${reason}`);
  bd(root, "update", id, "-s", "open");
}

/** The four triage states that are not the gate: what an operator moves an issue back to. */
export const TRIAGE_LABELS = ["needs-triage", "needs-info", "ready-for-human", "wontfix"] as const;

/**
 * The operator's move back to a triage state: the role label replaces the gate label.
 *
 * One triage role at a time is what those labels mean, so the move is a replacement — and the gate
 * label is the only thing the drain reads, which is why pulling it is the whole brake. A "move" that
 * left `ready-for-agent` on would not be a move.
 */
export function moveToTriage(root: string, id: string, label: (typeof TRIAGE_LABELS)[number]): void {
  bd(root, "update", id, "--add-label", label, "--remove-label", GATE_LABEL);
}

/** The store's answer to "what is blocked". */
export function storeBlocked(root: string): string[] {
  return JSON.parse(bd(root, "blocked", "--json")).map((i: { id: string }) => i.id);
}

/** One issue as the store reports it (bd show --json returns a top-level array). */
export function storeIssue(root: string, id: string): Record<string, any> {
  const shown = JSON.parse(bd(root, "show", id, "--json"));
  if (!Array.isArray(shown) || shown.length !== 1) throw new Error(`store show ${id}: unexpected shape`);
  return shown[0];
}

/** The comments the store holds for one issue, in the store's own order. */
export function storeComments(root: string, id: string): { text: string; author: string }[] {
  return JSON.parse(bd(root, "comments", id, "--json"));
}

/** Await a rejection and check its reason; a call that does not throw is the failure. */
export async function expectReject(
  name: string,
  fn: () => unknown | Promise<unknown>,
  re: RegExp,
): Promise<void> {
  let error: unknown;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  if (error === undefined) throw new Error(`${name}: did not throw`);
  const message = error instanceof Error ? error.message : String(error);
  if (!re.test(message)) throw new Error(`${name}: reason does not match ${re}: ${message}`);
}

/**
 * A store that is also a probe. Every command the pack asks the store is recorded first, with two facts
 * read at that moment: whether the process that spawned the store held the Main lock (the lock file's
 * pid against the wrapper's own parent), and how many parents Main's tip had (3 is a merge commit).
 * The pack never sees the record; the test reads it. Both files live in the run's artifacts, so the
 * Target only ever holds what the pack put there.
 */
export function writeProbeStore(root: string, artifacts: string): { probe: string; wrapper: string } {
  const wrapper = join(artifacts, "store-that-records-what-it-saw");
  const probe = join(artifacts, "store-probe.log");
  writeFileSync(
    wrapper,
    [
      "#!/bin/sh",
      `REAL=${JSON.stringify(storeBinary())}`,
      `PROBE=${JSON.stringify(probe)}`,
      `LOCK=${JSON.stringify(join(root, ".git", "beads-dag.lock"))}`,
      "mine=no",
      '[ -f "$LOCK" ] && [ "$(cat "$LOCK")" = "$PPID" ] && mine=yes',
      'parents=$(git -C "$(pwd)" rev-list --parents -1 main 2>/dev/null | wc -w)',
      "printf '%s mine=%s parents=%s\\n' \"$1\" \"$mine\" \"$parents\" >> \"$PROBE\"",
      'exec "$REAL" "$@"',
      "",
    ].join("\n"),
  );
  chmodSync(wrapper, 0o755);
  writeTargetConfig(root, `store: ${wrapper}\n`);
  return { probe, wrapper };
}

export type ProbeLine = { command: string; mine: boolean; parents: number };

/** The probe's record, read as the test's own evidence. */
export function probeLines(probe: string): ProbeLine[] {
  if (!existsSync(probe)) return [];
  return readFileSync(probe, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const m = /^(\S+) mine=(yes|no) parents=(\d+)$/.exec(line.trim());
      if (!m) throw new Error(`unreadable probe line: ${line}`);
      return { command: m[1]!, mine: m[2] === "yes", parents: Number(m[3]) };
    });
}

/** The Target's own read of whether a worktree made its checkout dirty. */
export function worktreeDirt(root: string): string {
  return gitC(root, "status", "--porcelain", "--", "worktrees").trim();
}

/** Write the Target's config - the store override lives here. */
export function writeTargetConfig(root: string, text: string): string {
  mkdirSync(join(root, ".scratch"), { recursive: true });
  writeFileSync(join(root, CONFIG_REL), text);
  return CONFIG_REL;
}

/**
 * Point the Target's config at the store binary the suite resolved. A test that drives a node's own
 * function in this process has no spawn to prepend the store's directory to PATH, so it uses the
 * route a Target on a machine without `bd` on PATH would: the config override.
 */
export function writeStoreConfig(root: string): void {
  writeTargetConfig(root, `store: ${storeBinary()}\n`);
}

// ---------------------------------------------------------------------------------------------------
// Target repos.
// ---------------------------------------------------------------------------------------------------

/** Target repo on its main branch with one seed commit and no store. */
export function initTarget(prefix = "target-", mainBranch = "main"): string {
  const root = mkTemp(prefix);
  gitC(root, "init", "-b", mainBranch);
  gitC(root, "config", "user.name", "test");
  gitC(root, "config", "user.email", "test@example.com");
  writeFileSync(join(root, "README.md"), "x\n");
  gitC(root, "add", "README.md");
  gitC(root, "commit", "-m", "init");
  return root;
}

/** Target + real store + artifacts temp dirs, torn down after fn. `{ store: false }` leaves the store out. */
export async function withTarget(
  fn: (root: string, artifacts: string) => Promise<void>,
  opts: { store?: boolean } = {},
): Promise<void> {
  const root = initTarget();
  if (opts.store !== false) initStore(root);
  const artifacts = mkTemp("artifacts-");
  try {
    await fn(root, artifacts);
  } finally {
    try {
      execFileSync("git", ["-C", root, "worktree", "prune"], { encoding: "utf8", stdio: "ignore" });
    } catch {
      /* ignore */
    }
    rmSync(root, { recursive: true, force: true });
    rmSync(artifacts, { recursive: true, force: true });
  }
}

export function commitFile(cwd: string, file: string, content: string, message: string): void {
  writeFileSync(join(cwd, file), content);
  execFileSync("git", ["-C", cwd, "add", file], { encoding: "utf8" });
  execFileSync("git", ["-C", cwd, "commit", "-m", message], { encoding: "utf8" });
}

/**
 * A fake Pi SDK, for driving any node that would otherwise start a live session. The adapter loads the
 * real package by name, so `PI_SDK_PATH` pointing at this tree is the whole ladder and no provider is
 * ever reached. The session writes its answer into the session file - the channel the pack trusts -
 * and returns a different string from `prompt`, which the pack must ignore.
 *
 * Modes: `answer` writes an assistant row; `none` writes nothing; `hang` never ends until the wall
 * clock aborts it; `throw` rejects; `commit` also commits HELLO.md in the session's cwd, so a node can
 * be driven to a real merge without a model; `commit-cwd` commits a file named after that cwd instead,
 * so a second issue in the same repository has its own content to land; `read` writes a receipt and the
 * note at the paths the brief carries and answers a draft, so a reading can be driven end to end; and
 * `read-silent` writes nothing and answers nothing, the turn that read and said nothing.
 * `FAKE_PI_RECORD` names a file the fake leaves the turn's options in, for a test that wants to read them
 * back.
 */
export type FakePiMode = "answer" | "none" | "hang" | "throw" | "commit" | "commit-cwd" | "read" | "read-silent";

export function fakePiSdk(root: string, mode: FakePiMode): string {
  const dir = join(root, `fake-pi-${mode}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "@earendil-works/pi-coding-agent",
      version: "0.0.0",
      type: "module",
      exports: { ".": { import: "./index.js" } },
    }),
  );
  writeFileSync(join(dir, "index.js"), fakePiSource(mode));
  return dir;
}

function fakePiSource(mode: string): string {
  // String concatenation, not a template literal: a `${` inside this source would interpolate here.
  return [
    'import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";',
    'import { execFileSync } from "node:child_process";',
    'import { dirname } from "node:path";',
    `const MODE = ${JSON.stringify(mode)};`,
    "const RECORD = process.env.FAKE_PI_RECORD;",
    'const ANSWER = "the session\'s answer";',
    'const PROMPT_RETURN = "PROMPT-RETURN-VALUE";',
    "let settle;",
    "function record(entry) {",
    "  if (RECORD) writeFileSync(RECORD, JSON.stringify(entry));",
    "}",
    "export const SessionManager = {",
    "  open(file) {",
    "    return { appendSessionInfo() {}, getSessionFile() { return file; } };",
    "  },",
    "};",
    "export const ModelRuntime = { create: async () => ({}) };",
    "export function resolveCliModel(opts) {",
    '  if (opts.cliModel === "nope/nope") return { error: "unknown model nope/nope" };',
    "  return { model: { id: opts.cliModel } };",
    "}",
    'export function getAgentDir() { return "/fake/agent-dir"; }',
    "export class DefaultResourceLoader {",
    "  async reload() {}",
    "}",
    "export function defineTool(definition) { return definition; }",
    "export function createBashToolDefinition(cwd, options) {",
    '  return { kind: "bash", cwd, spawnHook: options.spawnHook };',
    "}",
    "export async function createAgentSession(opts) {",
    "  const file = opts.sessionManager.getSessionFile();",
    "  const cwd = opts.cwd;",
    "  const saw = () => ({",
    "    cwd, sessionFile: file, model: opts.model, thinkingLevel: opts.thinkingLevel,",
    "    customTools: (opts.customTools ?? []).map((tool) => tool && tool.kind),",
    "  });",
    "  record(saw());",
    "  const session = {",
    "    async prompt(text) {",
    "      record({ ...saw(), prompt: text });",
    '      if (MODE === "hang") return new Promise((resolve) => { settle = resolve; });',
    '      if (MODE === "throw") throw new Error("the model exploded");',
    '      if (MODE === "commit") {',
    '        writeFileSync(cwd + "/HELLO.md", "hello\\n");',
    '        execFileSync("git", ["-C", cwd, "add", "HELLO.md"]);',
    '        execFileSync("git", ["-C", cwd, "commit", "-m", "hello from the fake session"]);',
    "      }",
    '      if (MODE === "commit-cwd") {',
    '        const cwdFile = cwd.replace(/\\/+$/, "").split("/").pop() + ".md";',
    '        writeFileSync(cwd + "/" + cwdFile, "hello\\n");',
    '        execFileSync("git", ["-C", cwd, "add", cwdFile]);',
    '        execFileSync("git", ["-C", cwd, "commit", "-m", "hello from the fake session"]);',
    "      }",
    '      if (MODE === "read") {',
    "        const note = /^Note: (\\S+)$/m.exec(text)?.[1];",
    "        const corpus = /^Corpus: (\\S+)$/m.exec(text)?.[1];",
    "        if (note === undefined || corpus === undefined) {",
    "          throw new Error(\"the fake reader's brief carries no Note/Corpus path\");",
    "        }",
    '        const receipt = cwd + "/" + corpus + "/sources/fake-receipt.md";',
    "        mkdirSync(dirname(receipt), { recursive: true });",
    '        writeFileSync(receipt, "SOURCE-URL: https://example.invalid/fake\\nthe fake source says one thing\\n");',
    '        const notePath = cwd + "/" + note;',
    "        mkdirSync(dirname(notePath), { recursive: true });",
    '        writeFileSync(notePath, "# a fake note\\n\\n## Claims\\n\\n- **c1** the fake source says one thing\\n");',
    "      }",
    '      if (MODE !== "none" && MODE !== "read-silent") {',,
    '        appendFileSync(file, JSON.stringify({ type: "message", message: { role: "assistant", content: [',
    '          { type: "thinking", text: "THINKING-LEAK" },',
    '          { type: "text", text: ANSWER },',
    '        ] } }) + "\\n");',
    "      }",
    "      return PROMPT_RETURN;",
    "    },",
    "    async abort() { if (settle) settle(); },",
    "    dispose() {},",
    "  };",
    "  return { session };",
    "}",
    "",
  ].join("\n");
}

export function envWithout(...names: string[]): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const name of names) delete env[name];
  return env;
}

/**
 * The environment as a Target that cannot find the store: every PATH entry under which an executable
 * `bd` resolves is out, not only the one `storeBinary()` happened to pick. A second install earlier or
 * later on PATH would otherwise leave the binary findable, and the premise is what the repros assert.
 */
export function envWithoutStore(): NodeJS.ProcessEnv {
  const entries = (process.env.PATH ?? "")
    .split(delimiter)
    .filter((dir) => dir !== "" && !isExecutable(join(dir, "bd")));
  return { ...process.env, PATH: entries.join(delimiter) };
}

/**
 * Run a pack script node the way Archon does: the Target as the working directory, the node's inputs in
 * the environment, nothing else — except that the store binary's directory joins PATH, as it would in
 * an operator's shell, so the node resolves the store the way the design says it may. `process.execPath`
 * is bun here, which is the runtime the YAMLs declare, so a test drives the same process the runner does.
 *
 * **The node protocol's own variables never come from this process.** `INPUTS_ISSUE`, `INPUTS_CONFIG` and
 * `ARTIFACTS_DIR` are the runner's conversation with one node, and a repro's caller builds that
 * conversation itself - the third argument, and nothing else. Inherited, they are a worker's own inputs:
 * the implementer of a beads-dag ticket runs this suite with `INPUTS_ISSUE` set to its own handle and its
 * own `ARTIFACTS_DIR`, and three repros then read the ambient run instead of their Target (measured
 * 2026-09-15: `node-outcomes` and `worktree` published a handle no store carried, and `pick` found a run
 * directory nobody passed it). That is the same worker-versus-session split the read-only flag gets at the
 * top of this file, and it is dropped the same way: inherited, they make a green suite mean something
 * different inside a worker than in a session, and the suite a worker runs has to be the suite a session
 * runs.
 */
export function runScript(
  script: string,
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): { stdout: string; stderr: string; status: number | null } {
  const path = [dirname(storeBinary()), process.env.PATH ?? ""].filter(Boolean).join(delimiter);
  const inherited = { ...process.env };
  for (const name of ["INPUTS_ISSUE", "INPUTS_CONFIG", "ARTIFACTS_DIR"]) delete inherited[name];
  const r = spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: { ...inherited, PATH: path, ...env },
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

// Self-check: the fixture builds a Target with a real store and drives the opening node through the protocol.
if (import.meta.main) {
  const root = initTarget();
  const artifacts = mkTemp("artifacts-");
  try {
    initStore(root);
    const r = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open speaks the protocol", r.stdout, "opened\n");
    expectEqual("open exits clean", r.status, 0);
    const issue = publishIssue(root, { title: "demo", handle: "feat/01", slug: "demo", labels: [GATE_LABEL] });
    expectEqual("the fixture publishes a handle", storeIssue(root, issue.id).metadata.handle, "feat/01");
    expectEqual("the fixture publishes a slug", storeIssue(root, issue.id).metadata.slug, "demo");
    console.log(JSON.stringify({ ok: true }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(artifacts, { recursive: true, force: true });
  }
}
