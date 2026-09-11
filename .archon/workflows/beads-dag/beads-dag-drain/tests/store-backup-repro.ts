#!/usr/bin/env bun
/**
 * Repro: the operator's one-command backup of the store to its remote.
 *
 * The pack carries one command for this: `backup.ts` in the drain folder, run from the Target. It
 * resolves the store binary the way the drain's opening step does and pushes the store's commits to its
 * configured Dolt remote. The proof is the remote's own answer: a fresh repo bootstrapped from it holds
 * the issue. A push that cannot happen fails loudly, with the reason on stderr.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bd, drain, envWithoutStore, expect, expectEqual, initTarget, mkTemp, publishIssue, runScript, withTarget } from "./target.ts";

try {
  await withTarget(async (root, artifacts) => {
    const remote = mkTemp("store-remote-");
    try {
      bd(root, "dolt", "remote", "add", "origin", `file://${remote}`);
      const issue = publishIssue(root, { title: "backed up", handle: "feat/01", slug: "backed-up" });
      expectEqual("the remote starts empty", readdirSync(remote).length, 0);

      const backup = runScript(join(drain.dir, "backup.ts"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("the backup command exits clean", backup.status, 0);
      expect("the command says what it did", /pushed/.test(backup.stdout), backup.stdout);
      expect("the remote gained the store's history", readdirSync(remote).length > 0, readdirSync(remote).length);

      // The remote's own answer: a fresh repo bootstrapped from it holds the issue that was pushed.
      const clone = initTarget("bootstrap-");
      try {
        mkdirSync(join(clone, ".beads"), { recursive: true });
        writeFileSync(join(clone, ".beads", "config.yaml"), `sync.remote: file://${remote}\n`);
        bd(clone, "bootstrap", "--yes");
        const ids = JSON.parse(bd(clone, "list", "--json")).map((i: { id: string }) => i.id);
        expectEqual("a repo bootstrapped from the remote holds the issue", ids, [issue.id]);
      } finally {
        rmSync(clone, { recursive: true, force: true });
      }

      // And it fails loudly where the binary cannot be resolved - never a silent no-op.
      const failed = runScript(join(drain.dir, "backup.ts"), root, { ARTIFACTS_DIR: artifacts, ...envWithoutStore() });
      expectEqual("an unresolvable binary prints nothing on stdout", failed.stdout, "");
      expect("an unresolvable binary fails the command", failed.status !== 0, failed.status);
      expect("the reason names the config file", failed.stderr.includes(".scratch/beads-dag.yaml"), failed.stderr);
    } finally {
      rmSync(remote, { recursive: true, force: true });
    }
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
