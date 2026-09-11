#!/usr/bin/env bun
/** Shared Target fixture for the repro scripts: a temp git repo, a real store, store helpers, git, expects. */
import { execFileSync, spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

const drainDir = join(import.meta.dir, "..");
const executeDir = join(import.meta.dir, "../../beads-dag-execute");

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

export type PublishOpts = {
  title: string;
  handle: string;
  slug: string;
  type?: string;
  labels?: string[];
};

export type PublishedIssue = { id: string; handle: string; slug: string };

/**
 * Publish one issue the way the tracker integration will: type, gate label, and the two metadata keys
 * the pack consumes. Nothing in this build publishes issues, so the fixture stands in for the tracker.
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
  return { id, handle: opts.handle, slug: opts.slug };
}

/** The store's answer to "what can start": ready, gate-labelled, decision issues excluded. */
export function storeReady(root: string): string[] {
  return JSON.parse(bd(root, "ready", "--exclude-type", "decision", "-l", GATE_LABEL, "--json")).map(
    (i: { id: string }) => i.id,
  );
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

/** Write the Target's config - the store override lives here. */
export function writeTargetConfig(root: string, text: string): string {
  mkdirSync(join(root, ".scratch"), { recursive: true });
  writeFileSync(join(root, CONFIG_REL), text);
  return CONFIG_REL;
}

// ---------------------------------------------------------------------------------------------------
// Target repos.
// ---------------------------------------------------------------------------------------------------

/** Target repo on Main with one seed commit and no store. */
export function initTarget(prefix = "target-"): string {
  const root = mkTemp(prefix);
  gitC(root, "init", "-b", "main");
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

export function envWithout(...names: string[]): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const name of names) delete env[name];
  return env;
}

/** The environment as a Target that cannot find the store: the binary's directory out of PATH. */
export function envWithoutStore(): NodeJS.ProcessEnv {
  const storeDir = dirname(storeBinary());
  const entries = (process.env.PATH ?? "").split(delimiter).filter((dir) => dir !== "" && dir !== storeDir);
  return { ...process.env, PATH: entries.join(delimiter) };
}

/**
 * Run a pack script node the way Archon does: the Target as the working directory, the node's inputs in
 * the environment, nothing else — except that the store binary's directory joins PATH, as it would in
 * an operator's shell, so the node resolves the store the way the design says it may. `process.execPath`
 * is bun here, which is the runtime the YAMLs declare, so a test drives the same process the runner does.
 */
export function runScript(
  script: string,
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): { stdout: string; stderr: string; status: number | null } {
  const path = [dirname(storeBinary()), process.env.PATH ?? ""].filter(Boolean).join(delimiter);
  const r = spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, PATH: path, ...env },
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

// Self-check: the fixture builds a Target with a real store and drives the opening node through the protocol.
if (import.meta.main) {
  const root = initTarget();
  try {
    initStore(root);
    const r = runScript(drain.script("open"), root);
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
  }
}
