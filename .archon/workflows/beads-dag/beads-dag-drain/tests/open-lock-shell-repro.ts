#!/usr/bin/env bun
/**
 * Repro: drain, inquiry, and experiment `open` plug into one lock-and-release shell.
 *
 * The three opening nodes keep their own leftover repair and premises, and call one shell for the
 * work they share: take the Target run lock, print the configuration line, run the work they pass
 * in, and release the lock if that work fails. Leftover repair stays out of the shell — drain from
 * git, inquiry and experiment from the store (ADR-0002). No domain switch inside the shell. Closed
 * stays out (ADR-0006). Existing callers keep their behaviour; this file is the import graph, as
 * text, the way pack-kernel-repro.ts is.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drain, expect, experiment, inquiry, kernelDir } from "./target.ts";

const shellPath = join(kernelDir, "open-lock.ts");
const drainOpen = drain.script("open");
const inquiryOpen = inquiry.script("open");
const experimentOpen = experiment.script("open");

/** Comments out; a comment may name a path or a call the code must not make. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

function source(path: string): string {
  return withoutComments(readFileSync(path, "utf8"));
}

try {
  expect("the kernel owns the lock-and-release shell", existsSync(shellPath), shellPath);
  expect(
    "the shell did not land in the drain executor",
    !existsSync(join(drain.dir, "scripts", "open-lock.ts")),
    join(drain.dir, "scripts", "open-lock.ts"),
  );

  const shell = source(shellPath);
  expect("the shell takes the Target run lock", shell.includes("takeRunLock("), shell);
  expect("the shell prints the configuration line", shell.includes("configLine("), shell);
  expect("the shell releases the lock on failure", shell.includes("releaseRunLock("), shell);

  // Leftover repair stays out of the socket: each executor keeps the one it already has.
  expect("the shell does not repair drain leftovers", !shell.includes("reconcileLeftovers("), shell);
  expect("the shell does not repair reading leftovers", !shell.includes("repairReadingLeftovers("), shell);
  expect("the shell does not repair experiment leftovers", !shell.includes("reconcileExperiments("), shell);
  expect("the shell does not read git for leftovers", !shell.includes("mergedOnMain("), shell);
  // Closed stays out of the shell (ADR-0006): a close is a domain's act, not the opening node's.
  expect("the shell does not close an issue", !/\bcloseIssue(WithLabel)?\(/.test(shell), shell);
  // No domain switch inside the shell: the drain's graph preflight stays in drain.
  expect("the shell does not switch domains", !shell.includes("assertNoCrossDomainEdges("), shell);
  expect("the shell does not import domains", !/from\s+"[^"]*domains\.ts"/.test(shell), shell);

  const opens: [string, string, string][] = [
    ["drain", drainOpen, "reconcileLeftovers("],
    ["inquiry", inquiryOpen, "repairReadingLeftovers("],
    ["experiment", experimentOpen, "reconcileExperiments("],
  ];
  for (const [name, path, repair] of opens) {
    const code = source(path);
    expect(`${name} open imports the lock-and-release shell`, /from\s+"[^"]*scripts\/open-lock\.ts"/.test(code), path);
    expect(`${name} open calls the shell`, /\bopenRun\(/.test(code), path);
    expect(`${name} open keeps leftover repair`, code.includes(repair), path);
    expect(`${name} open does not take the lock itself`, !code.includes("takeRunLock("), path);
    expect(`${name} open does not print the config line itself`, !code.includes("configLine("), path);
    expect(`${name} open does not release the lock itself`, !code.includes("releaseRunLock("), path);
  }

  const drainCode = source(drainOpen);
  expect("drain open still refuses a cross-domain graph", drainCode.includes("assertNoCrossDomainEdges("), drainOpen);

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
