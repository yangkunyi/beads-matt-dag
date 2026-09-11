#!/usr/bin/env bun
/** Shared Target fixture for the repro scripts: a temp git repo, a temp artifacts dir, git helpers, expects. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const drainDir = join(import.meta.dir, "..");
const executeDir = join(import.meta.dir, "../../beads-dag-execute");

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

/** Target repo on Main with one seed commit and nothing else. */
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

/** Target + artifacts temp dirs, torn down after fn. */
export async function withTarget(fn: (root: string, artifacts: string) => Promise<void>): Promise<void> {
  const root = initTarget();
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

/**
 * Run a pack script node the way Archon does: the Target as the working directory, the node's inputs in
 * the environment, nothing else. `process.execPath` is bun here, which is the runtime the YAMLs declare,
 * so a test drives the same process the runner does.
 */
export function runScript(
  script: string,
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

// Self-check: the fixture builds a Target and drives a node through the protocol.
if (import.meta.main) {
  const root = initTarget();
  try {
    const r = runScript(drain.script("open"), root);
    expectEqual("open speaks the protocol", r.stdout, "opened\n");
    expectEqual("open exits clean", r.status, 0);
    console.log(JSON.stringify({ ok: true }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
