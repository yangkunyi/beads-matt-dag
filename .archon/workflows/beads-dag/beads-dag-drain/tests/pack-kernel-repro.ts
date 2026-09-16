#!/usr/bin/env bun
/**
 * Repro: the pack kernel is a pack folder, not the drain executor.
 *
 * inquiry, experiment, execute, and read import store, locks, the opening lock-and-release shell,
 * attempted, roles, naming, doc-commit, node-entry, git, domains, failures, agent, worker-env, prompt,
 * config, and node-outcomes from the kernel. They do not reach through the drain executor to get those.
 * Drain-alone merge modules stay in drain. Existing callers keep their behaviour; this file is the
 * import graph, as text.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { drain, execute, experiment, experimentRun, expect, inquiry, packDir, readBlock } from "./target.ts";

/** The capabilities the kernel owns. One file each, named the way the pack already names them. */
const KERNEL = [
  "store",
  "run-lock",
  "lock",
  "attempted",
  "roles",
  "naming",
  "doc-commit",
  "node-entry",
  "open-lock",
  "git",
  "domains",
  "failures",
  "agent",
  "worker-env",
  "prompt",
  "config",
  "node-outcomes",
] as const;

/** A module whose reason to exist is that a run merges an issue's work into Main, or reports on one. */
const DRAIN_ALONE = [
  "main-writes",
  "settle",
  "verify",
  "worktree",
  "reconcile",
  "review-position",
  "run-record",
  "report-artifacts",
  "report-node",
  "postmerge",
  "review",
] as const;

const kernelDir = join(packDir, "scripts");
const drainScripts = join(drain.dir, "scripts");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests") continue;
      out.push(...sources(path));
    } else if (entry.name.endsWith(".ts")) {
      out.push(path);
    }
  }
  return out;
}

/** Comments out; a comment may name a path the code must not import. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

const kernelFromDrain = new RegExp(
  String.raw`from\s+"[^"]*beads-dag-drain/scripts/(?:${KERNEL.join("|")})\.ts"`,
);

try {
  for (const name of KERNEL) {
    expect(`kernel owns ${name}.ts`, existsSync(join(kernelDir, `${name}.ts`)), join(kernelDir, `${name}.ts`));
    expect(`${name}.ts is not in the drain executor`, !existsSync(join(drainScripts, `${name}.ts`)), join(drainScripts, `${name}.ts`));
  }
  for (const name of DRAIN_ALONE) {
    expect(`drain still owns ${name}.ts`, existsSync(join(drainScripts, `${name}.ts`)), join(drainScripts, `${name}.ts`));
    expect(`${name}.ts did not move into the kernel`, !existsSync(join(kernelDir, `${name}.ts`)), join(kernelDir, `${name}.ts`));
  }

  const callers = [
    ["execute", execute.dir],
    ["read", readBlock.dir],
    ["inquiry", inquiry.dir],
    ["experiment", experiment.dir],
    ["experiment-run", experimentRun.dir],
  ] as const;
  for (const [name, dir] of callers) {
    for (const file of sources(dir)) {
      const rel = file.slice(packDir.length + 1);
      const code = withoutComments(readFileSync(file, "utf8"));
      const hit = kernelFromDrain.exec(code);
      expect(`${rel} does not import the kernel through the drain executor`, hit === null, hit?.[0]);
    }
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
