#!/usr/bin/env bun
/**
 * Repro: the experiment-run include owns the record, the experiment-issue helper, and tool spawn.
 *
 * Those three modules live in the include's folder. The run node does not import the experiment parent
 * folder. Parent YAML still includes the child; the two folders stay split (Archon fan-out). Not a
 * pack-kernel move and not a merge of execute, read, or experiment-run. Existing callers keep their
 * behaviour; this file is the import graph and the folder split, as text.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execute, experiment, experimentRun, expect, packDir, readBlock } from "./target.ts";

/** The vocabulary the include needs. One file each, named the way the pack already names them. */
const INCLUDE_OWNED = ["record", "ticket", "run-tool"] as const;

const experimentScripts = join(experiment.dir, "scripts");
const experimentRunScripts = join(experimentRun.dir, "scripts");

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

const fromExperimentParent = /from\s+"[^"]*beads-dag-experiment\//;

try {
  for (const name of INCLUDE_OWNED) {
    expect(
      `experiment-run include owns ${name}.ts`,
      existsSync(join(experimentRunScripts, `${name}.ts`)),
      join(experimentRunScripts, `${name}.ts`),
    );
    expect(
      `${name}.ts is not in the experiment parent folder`,
      !existsSync(join(experimentScripts, `${name}.ts`)),
      join(experimentScripts, `${name}.ts`),
    );
    expect(
      `${name}.ts did not move into the pack kernel`,
      !existsSync(join(packDir, "scripts", `${name}.ts`)),
      join(packDir, "scripts", `${name}.ts`),
    );
  }

  for (const file of sources(experimentRun.dir)) {
    const rel = file.slice(packDir.length + 1);
    const code = withoutComments(readFileSync(file, "utf8"));
    const hit = fromExperimentParent.exec(code);
    expect(`${rel} does not import the experiment parent folder`, hit === null, hit?.[0]);
  }

  const parentYaml = readFileSync(experiment.yaml, "utf8");
  expect(
    "parent YAML still includes the experiment-run child",
    /include:\s*beads-dag-experiment-run/.test(parentYaml),
  );

  expect("experiment folder stays", existsSync(experiment.yaml), experiment.yaml);
  expect("experiment-run folder stays", existsSync(experimentRun.yaml), experimentRun.yaml);
  expect("execute folder stays", existsSync(execute.yaml), execute.yaml);
  expect("read folder stays", existsSync(readBlock.yaml), readBlock.yaml);

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
