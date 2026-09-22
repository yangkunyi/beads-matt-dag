#!/usr/bin/env bun
/**
 * Repro: a body either has a domain contract head or it does not.
 *
 * Attention reports present|missing from this, and pick does not parse it. The check is the keys'
 * presence at the top of the file, not the values: a later cut may parse; this one must not pretend to.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRACT_KEYS, contractPresence, yamlHead, type ContractKind } from "../../scripts/contract.ts";
import { expect, expectEqual } from "./target.ts";

const repoRoot = join(import.meta.dir, "../../../../../");
const publicationHomes = [
  join(repoRoot, "skills/to-tickets/SKILL.md"),
  join(repoRoot, "docs/agents/issue-tracker.md"),
  join(repoRoot, "skills/ask-loom/issue-tracker.md"),
];

function hasYamlKey(text: string, key: string): boolean {
  return new RegExp(`^${key}\\s*:`, "m").test(text);
}

const headed = `---
goal: the button submits
acceptance:
  - a click lands one row
spec: docs/specs/2026-09-19-attention-and-contract.md
---

Optional prose.
`;

const inquiry = `---
question: what does closed mean
must_cite: true
done_when: the draft names the three domains
---
`;

const experiment = `---
metric: p50 from the run log
reference: exploratory
pin: data=fixtures commit=abc
---
`;

const essay = `# feat/01 — the button

**What to build:** a click lands one row.

- [ ] a click lands one row
`;

const statusLine = `---
goal: no
acceptance:
  - no
---

Status: BLOCKED
`;

try {
  expectEqual("a development head is present", contractPresence(headed, "development"), "present");
  expectEqual("an essay is missing", contractPresence(essay, "development"), "missing");
  expectEqual("inquiry keys are present", contractPresence(inquiry, "inquiry"), "present");
  expectEqual("experiment keys are present", contractPresence(experiment, "experiment"), "present");
  expectEqual("a development head is not an inquiry contract", contractPresence(headed, "inquiry"), "missing");
  expect("the head is the YAML document", yamlHead(headed)?.includes("goal:") === true);
  expect("an essay has no head", yamlHead(essay) === undefined);
  expectEqual("Status in the prose does not remove a present head", contractPresence(statusLine, "development"), "present");
  expectEqual("CRLF fences still parse", contractPresence("---\r\ngoal: x\r\nacceptance:\r\n  - y\r\n---\r\n", "development"), "present");
  const kinds = Object.keys(CONTRACT_KEYS) as ContractKind[];
  for (const home of publicationHomes) {
    const text = readFileSync(home, "utf8");
    for (const kind of kinds) {
      for (const key of CONTRACT_KEYS[kind]) {
        expect(`${home} names ${kind} key ${key}`, hasYamlKey(text, key));
      }
    }
  }
  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
