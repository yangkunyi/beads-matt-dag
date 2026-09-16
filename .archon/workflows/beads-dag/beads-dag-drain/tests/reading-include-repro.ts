#!/usr/bin/env bun
/**
 * Repro: the include that reads owns the labels and paths it needs.
 *
 * The read node does not import the inquiry folder. Parent YAML still includes the child. Folders stay
 * split (Archon fan-out). Not a pack-kernel move and not a merge of execute, read, or experiment-run.
 * Existing callers keep their behaviour; this file is the import graph and the folder layout, as text.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execute, expect, experimentRun, inquiry, kernelDir, packDir, readBlock } from "./target.ts";

/** Comments out; a comment may name a path the code must not import. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sources(path));
    } else if (entry.name.endsWith(".ts")) {
      out.push(path);
    }
  }
  return out;
}

const fromInquiry = /from\s+"[^"]*beads-dag-inquiry\//;

try {
  const readSources = sources(readBlock.dir);
  expect("the reading include has scripts", readSources.length > 0, readBlock.dir);

  const owned = readSources.filter((file) => {
    const code = withoutComments(readFileSync(file, "utf8"));
    return /export\s+const\s+DRAFT_LABEL\b/.test(code) && /export\s+function\s+readingPaths\b/.test(code);
  });
  expect(
    "reading's labels and paths live in a module the reading include owns",
    owned.length >= 1,
    readSources.map((file) => file.slice(packDir.length + 1)).join(" "),
  );

  for (const file of readSources) {
    const rel = file.slice(packDir.length + 1);
    const code = withoutComments(readFileSync(file, "utf8"));
    const hit = fromInquiry.exec(code);
    expect(`${rel} does not import the inquiry folder`, hit === null, hit?.[0]);
  }

  const parentYaml = readFileSync(inquiry.yaml, "utf8");
  expect("parent YAML still includes the child", /include:\s*beads-dag-read\b/.test(parentYaml), inquiry.yaml);

  const split = [
    ["inquiry", inquiry.yaml],
    ["read", readBlock.yaml],
    ["execute", execute.yaml],
    ["experiment-run", experimentRun.yaml],
  ] as const;
  for (const [name, yaml] of split) {
    expect(`${name} stays its own folder`, existsSync(yaml), yaml);
  }

  const kernelHasDraft = sources(kernelDir).some((file) =>
    /export\s+const\s+DRAFT_LABEL\b/.test(withoutComments(readFileSync(file, "utf8"))),
  );
  const kernelHasPaths = sources(kernelDir).some((file) =>
    /export\s+function\s+readingPaths\b/.test(withoutComments(readFileSync(file, "utf8"))),
  );
  expect("the draft label did not move into the pack kernel", !kernelHasDraft, kernelDir);
  expect("readingPaths did not move into the pack kernel", !kernelHasPaths, kernelDir);

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
