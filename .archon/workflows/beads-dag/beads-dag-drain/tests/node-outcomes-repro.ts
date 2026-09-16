#!/usr/bin/env bun
/**
 * Repro: the byte contract between a node and the runner.
 *
 *   the token     -> nodeLine adds exactly one newline and nothing else, so a node's stdout is its token
 *                    and no other byte
 *   the YAML      -> the one literal a workflow compares (the drain loop's `[]`) is the token the pick
 *                    node prints, so the loop cannot end on a token nobody prints
 *   the exit code -> a work outcome is exit 0, because merged and failed are both results; a node that
 *                    could not do its job is non-zero with the reason on stderr, so it is never read as
 *                    one that did it
 */
import { readFileSync } from "node:fs";
import { EMPTY_PICK, FAILED, NOTHING_TO_REPORT, OPENED, REGISTERED, nodeLine } from "../scripts/node-outcomes.ts";
import { GATE_LABEL, drain, execute, experiment, expect, expectEqual, fakePiSdk, inquiry, publishIssue, runScript, withTarget } from "./target.ts";

try {
  // The byte contract itself.
  expectEqual("nodeLine is the token plus one newline", nodeLine("x"), "x\n");
  expectEqual("nodeLine adds nothing else", nodeLine("x").length, 2);
  expectEqual("the empty pick token is the bracket pair", EMPTY_PICK, "[]");

  // Each looping workflow's end condition is that token, read out of the YAML the loop is written in.
  for (const { name, file } of [
    { name: "drain", file: drain.yaml },
    { name: "experiment", file: experiment.yaml },
  ]) {
    const yaml = readFileSync(file, "utf8");
    const literal = /until_bash:\s*test\s+\$\w+\.output\s*=\s*"([^"]*)"/.exec(yaml)?.[1];
    expect(`the ${name} loop compares the pick token`, literal !== undefined, yaml.slice(0, 200));
    expectEqual(`the ${name} loop's literal is EMPTY_PICK`, literal, EMPTY_PICK);
  }

  // The reading loop ends on the same token, so the same one-token contract holds for the second executor.
  const inquiryYaml = readFileSync(inquiry.yaml, "utf8");
  const inquiryLiteral = /until_bash:\s*test\s+\$\w+\.output\s*=\s*"([^"]*)"/.exec(inquiryYaml)?.[1];
  expect("the reading loop compares the pick token", inquiryLiteral !== undefined, inquiryYaml.slice(0, 200));
  expectEqual("the reading loop's literal is EMPTY_PICK", inquiryLiteral, EMPTY_PICK);

  await withTarget(async (root, artifacts) => {
    // A work outcome: the token alone on stdout, and exit 0.
    const picked = runScript(drain.script("pick"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("pick prints its token and nothing else", picked.stdout, nodeLine(EMPTY_PICK));
    expectEqual("a work outcome exits clean", picked.status, 0);

    // A work outcome: the token alone on stdout, and exit 0. The per-issue node hands its issue to the
    // implementer; the session is the fake SDK this suite pins (no provider, no live model), and a turn
    // that answers nothing means the work is not in Main: its outcome is `failed` - a result, not an error.
    const issue = publishIssue(root, { title: "one issue", handle: "feat/01", slug: "one-issue", labels: [GATE_LABEL] });
    const issued = runScript(execute.script("execute"), root, {
      INPUTS_ISSUE: issue.handle,
      ARTIFACTS_DIR: artifacts,
      PI_SDK_PATH: fakePiSdk(artifacts, "none"),
    });
    expectEqual("execute prints its outcome token", issued.stdout, nodeLine(FAILED));
    expectEqual("failed is a result, not an error", issued.status, 0);
    expect("the reason names the issue", issued.stderr.includes("feat/01"), issued.stderr);

    // Misconfiguration: no token at all, and the reason on stderr.
    const missing = runScript(execute.script("execute"), root, {});
    expectEqual("a node that could not run prints no token", missing.stdout, "");
    expect("a node that could not run exits non-zero", missing.status !== 0, missing.status);
    expect("the reason names the input", /INPUTS_ISSUE is required/.test(missing.stderr), missing.stderr);

    // The vocabulary this slice uses is the one the nodes print, not a second list.
    for (const token of [OPENED, EMPTY_PICK, FAILED, REGISTERED, NOTHING_TO_REPORT]) {
      expect("a token is non-empty and single-line", token.length > 0 && !token.includes("\n"), token);
    }
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
