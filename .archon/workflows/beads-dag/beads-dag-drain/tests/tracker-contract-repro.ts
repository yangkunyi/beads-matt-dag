#!/usr/bin/env bun
/**
 * Repro: the contract this Target runs under and the contract the setup skill ships are one document.
 *
 * This repository is a Target, so it keeps the contract at `docs/agents/issue-tracker.md` — the file
 * its AGENTS.md points at. The shipped copy in the closed skill set is
 * `skills/ask-loom/issue-tracker.md`. Product Targets do not copy it; they read the installed skill.
 * This checkout is the source, so the two files here are one document in two homes.
 *
 * They were byte-identical until `beads-dag/24` edited this Target's copy alone. The draft answer's rule,
 * its sweep query and the "executor drafts the answer" bullet landed in `docs/agents/issue-tracker.md` and
 * never in the shipped one, and nothing compared them: a Target set up after that commit would have had a
 * contract that says nothing about a draft answer - a session closing a question with `bd close`, leaving
 * `answer:draft` on a closed ticket, and a sweep query that names tickets nobody is waiting on. That is
 * exactly the kind of drift the flow's own documents cannot notice on their own (`beads-dag/29`, the first
 * real reading), and it is why this repro exists: the two files are the same bytes, and the failure names
 * the first line that differs, because the repair is to edit one and copy it over the other.
 *
 * What it does not check: that the bytes are *right*. The contract's content is read by a person; this
 * only says that the person read one copy of it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "./target.ts";

/**
 * The contract lives in the repository, not in the pack: the pack is copied to a machine's Archon home,
 * a Target's `docs/agents/` is copied per repo by hand. The suite runs from this repository, so git names
 * the root - and either file missing fails this repro loudly instead of reporting a green suite.
 */
const REPO_ROOT = execFileSync("git", ["-C", import.meta.dir, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const CONTRACT = join(REPO_ROOT, "docs", "agents", "issue-tracker.md");
const SHIPPED = join(REPO_ROOT, "skills", "ask-loom", "issue-tracker.md");

/** The first line two texts disagree at, as a one-line reason a reader can act on. */
function firstDifference(mine: string, theirs: string): string {
  const a = mine.split("\n");
  const b = theirs.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `line ${i + 1} differs:\n  docs/agents/issue-tracker.md: ${JSON.stringify(a[i] ?? "(no such line)")}\n  skills/ask-loom/issue-tracker.md: ${JSON.stringify(b[i] ?? "(no such line)")}`;
    }
  }
  return "the files differ but no line does (trailing bytes)";
}

try {
  expect("the Target's contract is there", existsSync(CONTRACT), CONTRACT);
  expect("the setup skill's shipped copy is there", existsSync(SHIPPED), SHIPPED);
  const contract = readFileSync(CONTRACT, "utf8");
  const shipped = readFileSync(SHIPPED, "utf8");
  if (contract !== shipped) {
    throw new Error(
      `the contract this Target runs under and the contract ask-loom ships have drifted apart; ` +
        `${firstDifference(contract, shipped)}\nedit docs/agents/issue-tracker.md and copy it over ` +
        `skills/ask-loom/issue-tracker.md (or the other way round)`,
    );
  }
  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
