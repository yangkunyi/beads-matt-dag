#!/usr/bin/env bun
/**
 * Repro: the store has exactly one module in the pack.
 *
 * Every store command the pack builds - the binary, its arguments, its working directory - is built by
 * beads-dag-drain/scripts/store.ts and nowhere else. This asserts that over the pack's own sources, as
 * text: no other module names the store binary, and no other module spawns something called a store
 * binary. The tests are out of the scan on purpose: the fixture builds its own commands so it stays an
 * independent reader of the store.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { drain, execute, experiment, experimentRun, expect, inquiry, packDir } from "./target.ts";

/** Every .ts in the pack outside tests/: both workflow folders' scripts, and the backup command. */
function packSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests") continue;
      out.push(...packSources(path));
    } else if (entry.name.endsWith(".ts")) {
      out.push(path);
    }
  }
  return out;
}

/** Comments out; the code left is what the assertion is about. A comment may name anything. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

const storeModule = join(drain.dir, "scripts", "store.ts");
const sources = packSources(packDir);

try {
  expect("the store module is in the pack", sources.includes(storeModule), storeModule);
  const storeCode = withoutComments(readFileSync(storeModule, "utf8"));
  expect("the store module names the store binary", /\bbd\b/.test(storeCode));

  for (const file of sources) {
    if (file === storeModule) continue;
    const name = file.slice(packDir.length + 1);
    const code = withoutComments(readFileSync(file, "utf8"));
    const named = /\bbd\b/.exec(code);
    expect(`${name} builds no store command of its own`, named === null, named?.[0]);
    for (const call of code.matchAll(/\b(?:spawnSync|spawn|execFileSync|execFile)\s*\(([^)]*)\)/g)) {
      const firstArgument = call[1]!.split(",")[0]!.trim();
      expect(`${name} spawns no store binary`, !/\bbinary\b|\bstore\b/i.test(firstArgument), firstArgument);
    }
  }

  // The nodes that need the store call the module; none of them could have kept a private copy.
  const callers = [
    ["open", join(drain.dir, "scripts", "open.ts")],
    ["pick", join(drain.dir, "scripts", "pick.ts")],
    ["execute", join(execute.dir, "scripts", "execute.ts")],
    ["summary", join(drain.dir, "scripts", "summary.ts")],
    ["backup", join(drain.dir, "backup.ts")],
    ["inquiry open", join(inquiry.dir, "scripts", "open.ts")],
    ["inquiry pick", join(inquiry.dir, "scripts", "pick.ts")],
    ["experiment open", join(experiment.dir, "scripts", "open.ts")],
    ["experiment pick", join(experiment.dir, "scripts", "pick.ts")],
    ["experiment run", join(experimentRun.dir, "scripts", "run.ts")],
  ] as const;
  for (const [name, file] of callers) {
    expect(
      `${name} imports the store module`,
      /from "[^"]*store\.ts"/.test(readFileSync(file, "utf8")),
      file,
    );
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
