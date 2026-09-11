#!/usr/bin/env bun
/**
 * Repro: the drain's walk over a Target with nothing to do — the walking skeleton's acceptance, as far
 * as a test can drive it.
 *
 * Every node the drain would run is driven the way the runner drives it, and each one reports nothing:
 * the opening node says the run may proceed, pick offers an empty frontier, and both drain-end readers
 * have no range to read. Nothing here reaches a store: the store arrives with the node that must open it
 * first, and until it exists nothing can be eligible.
 *
 * What this cannot check is the graph itself — that the loop ends and no issue instance is started — so
 * the real run against a throwaway Target stays the acceptance for that (README, gates).
 */
import { EMPTY_PICK, NOTHING_TO_REPORT, OPENED, nodeLine } from "../scripts/node-outcomes.ts";
import { drain, expect, expectEqual, runScript, withTarget } from "./target.ts";

try {
  await withTarget(async (root, artifacts) => {
    const env = { ARTIFACTS_DIR: artifacts };

    const opened = runScript(drain.script("open"), root, env);
    expectEqual("open says the run may proceed", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);

    const picked = runScript(drain.script("pick"), root, env);
    expectEqual("pick offers nothing", picked.stdout, nodeLine(EMPTY_PICK));
    expectEqual("pick exits clean", picked.status, 0);
    // The token is the fan-out's item list as well as the loop's end condition, so it has to parse.
    expectEqual("the pick token is an empty list of issue handles", JSON.parse(picked.stdout), []);

    for (const reader of ["review", "summary"]) {
      const r = runScript(drain.script(reader), root, env);
      expectEqual(`${reader} reports on no range`, r.stdout, nodeLine(NOTHING_TO_REPORT));
      expectEqual(`${reader} exits clean`, r.status, 0);
    }
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
