#!/usr/bin/env bun
/**
 * Repro: the drain's opening step against a real store.
 *
 * The opening node resolves the Target's store before anything else happens: the Target's config
 * override first, then the environment's PATH. A Target with a store opens; one without fails before any
 * worktree exists, naming the reason; a machine where the binary cannot be found at all fails naming
 * everywhere it looked; and an override that does not point at a binary fails rather than silently
 * falling back. The step also recomputes blocked-ness, so an issue whose blocker was closed outside the
 * drain is eligible in the same run.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { OPENED, nodeLine } from "../scripts/node-outcomes.ts";
import {
  GATE_LABEL,
  bd,
  drain,
  envWithoutStore,
  expect,
  expectEqual,
  publishIssue,
  runScript,
  storeBinary,
  storeBlocked,
  storeIssue,
  storeReady,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

try {
  // A Target with a store opens cleanly, and the environment resolves the binary.
  await withTarget(async (root, artifacts) => {
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open says the run may proceed", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);
  });

  // The config override wins, even with the binary's directory out of PATH.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts, ...envWithoutStore() });
    expectEqual("the config override opens the store", opened.stdout, nodeLine(OPENED));
    expectEqual("the override exits clean", opened.status, 0);
  });

  // A Target without a store fails at the opening step, before any worktree exists.
  await withTarget(
    async (root, artifacts) => {
      const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
      expectEqual("a storeless Target prints no token", opened.stdout, "");
      expect("a storeless Target fails the node", opened.status !== 0, opened.status);
      expect("the reason names the store directory", opened.stderr.includes(join(root, ".beads")), opened.stderr);
      expect("the reason says what is missing", /no store in the Target/.test(opened.stderr), opened.stderr);
      expect("no worktree was created", !existsSync(join(root, "worktrees")), root);
    },
    { store: false },
  );

  // A machine where the binary cannot be found at all fails naming where it looked.
  await withTarget(async (root, artifacts) => {
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts, ...envWithoutStore() });
    expectEqual("an unresolvable store prints no token", opened.stdout, "");
    expect("an unresolvable store fails the node", opened.status !== 0, opened.status);
    expect("the reason names the config file", opened.stderr.includes(".scratch/beads-dag.yaml"), opened.stderr);
    expect("the reason names PATH", opened.stderr.includes("PATH"), opened.stderr);
    const firstPathEntry = (process.env.PATH ?? "").split(":").find(Boolean);
    expect("the reason lists where it looked", firstPathEntry !== undefined && opened.stderr.includes(firstPathEntry), opened.stderr);
  });

  // An override that is not a binary fails, naming it - never a silent fall back to PATH.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, "store: ./.scratch/not-a-binary\n");
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a broken override prints no token", opened.stdout, "");
    expect("a broken override fails the node", opened.status !== 0, opened.status);
    expect("the reason names the override", opened.stderr.includes("not-a-binary"), opened.stderr);
  });

  // The fixture publishes what the pack consumes, and blocked-ness is recomputed at open.
  await withTarget(async (root, artifacts) => {
    const blocker = publishIssue(root, { title: "the blocker", handle: "feat/01", slug: "the-blocker", labels: [GATE_LABEL] });
    const dependent = publishIssue(root, { title: "the dependent", handle: "feat/02", slug: "the-dependent", labels: [GATE_LABEL] });
    const shown = storeIssue(root, dependent.id);
    expectEqual("the fixture publishes a handle", shown.metadata.handle, "feat/02");
    expectEqual("the fixture publishes a slug", shown.metadata.slug, "the-dependent");

    bd(root, "dep", "add", dependent.id, blocker.id);
    expectEqual("the store hides the dependent while its blocker stands", storeReady(root), [blocker.id]);
    expectEqual("the store reports the dependent as blocked", storeBlocked(root), [dependent.id]);

    // Closed outside the drain - by the operator or another tool, not by this run.
    bd(root, "close", blocker.id, "-r", "closed outside the drain");

    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("open exits clean", opened.status, 0);
    expectEqual("the dependent is eligible in the same run", storeReady(root), [dependent.id]);
    expectEqual("the dependent is no longer blocked", storeBlocked(root), []);
  });

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
