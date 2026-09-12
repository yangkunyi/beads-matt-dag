#!/usr/bin/env bun
/**
 * The operator's one-command backup of the Target's store to its Dolt remote.
 *
 * Run it from the Target, once the remote is configured (`bd dolt remote add <name> <url>`):
 *
 *   bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts
 *
 * It resolves the store binary the same way the drain's opening step does — the Target's config
 * override, then PATH — so a machine where the binary is not on PATH still backs up. A push that cannot
 * happen prints why, on stderr, and exits non-zero; it never reports success it did not achieve.
 */
import { loadConfig } from "./scripts/config.ts";
import { preflightStore, pushStore } from "./scripts/store.ts";

const target = process.cwd();
try {
  const store = preflightStore(target, loadConfig(target).config);
  pushStore(store, target);
  process.stdout.write("store pushed to its Dolt remote\n");
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
}
