#!/usr/bin/env bun
/**
 * Repro: the configuration a run used, and where each value came from.
 *
 * `loadConfig` returns the built-in defaults silently when the Target has no config file, so without a
 * record of the reading "the Target has no file" and "a file said so" are the same run. The opening
 * node writes one line on stderr naming the effective runner, model, thinking level, concurrency and
 * store binary, each with its source - the Target's config file, by path, or the built-in default; the
 * store's source is the one resolution store.ts makes, the config override or PATH. A node's stdout is
 * its token channel, so the line goes to stderr and `open`'s stdout stays exactly the `opened` token.
 *
 * A Target with no file still runs, on the defaults, and a malformed file still fails the node loudly
 * before any line is written. No resolved value changes: the line reports the values the same
 * `loadConfig` hands every other node.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CONFIG_KEYS,
  DEFAULT_VERIFY_TIMEOUT_MS,
  configLine,
  loadConfig,
  parseConfigText,
  type ConfigKey,
  type PackConfig,
} from "../../scripts/config.ts";
import { OPENED, nodeLine } from "../../scripts/node-outcomes.ts";
import {
  CONFIG_REL,
  drain,
  envWithoutStore,
  expect,
  expectEqual,
  runScript,
  storeBinary,
  withTarget,
  writeTargetConfig,
} from "./target.ts";

const DEFAULTS: PackConfig = {
  model: undefined,
  thinkingLevel: "high",
  concurrency: 4,
  runner: "pi",
  store: undefined,
  verify: "",
  verifyTimeoutMs: DEFAULT_VERIFY_TIMEOUT_MS,
  postMerge: "",
};

try {
  // The line's own shape: one line, every key the pack reads, each value with its source, and the store
  // with the one distinction store.ts makes.
  const bare = configLine(
    DEFAULTS,
    { file: undefined, fromFile: new Set() },
    { binary: "/opt/beads/bd", source: "environment" },
  );
  expectEqual(
    "no file: the defaults are in effect and the store came from PATH",
    bare,
    "beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), " +
      "concurrency=4 (default), store=/opt/beads/bd (PATH), verify=(none) (default), " +
      `verifyTimeoutMs=${DEFAULT_VERIFY_TIMEOUT_MS} (default), postMerge=(none) (default)`,
  );
  expect("the line names every key the pack reads", CONFIG_KEYS.every((key) => bare.includes(`${key}=`)), bare);
  expect("and is one line", !bare.includes("\n"), bare);

  const file = "/lab/.scratch/beads-dag.yaml";
  const written = configLine(
    {
      model: "some/model",
      thinkingLevel: "max",
      concurrency: 1,
      runner: "dsh",
      store: "/opt/other/bd",
      verify: "bun test",
      verifyTimeoutMs: 60_000,
      postMerge: "",
    },
    {
      file,
      fromFile: new Set<ConfigKey>([
        "runner",
        "model",
        "thinkingLevel",
        "concurrency",
        "store",
        "verify",
        "verifyTimeoutMs",
      ]),
    },
    { binary: "/opt/other/bd", source: "config" },
  );
  expectEqual(
    "a file's values name the file they were read from, the store override included",
    written,
    `beads-dag: config: runner=dsh (${file}), model=some/model (${file}), thinkingLevel=max (${file}), ` +
      `concurrency=1 (${file}), store=/opt/other/bd (${file}), verify=bun test (${file}), ` +
      `verifyTimeoutMs=60000 (${file}), postMerge=(none) (default)`,
  );

  const mixed = configLine(
    { model: undefined, thinkingLevel: "high", concurrency: 2, runner: "pi", store: undefined, verify: "", verifyTimeoutMs: DEFAULT_VERIFY_TIMEOUT_MS, postMerge: "" },
    { file, fromFile: new Set<ConfigKey>(["concurrency"]) },
    { binary: "/opt/beads/bd", source: "environment" },
  );
  expectEqual(
    "only the key the file set is the file's; a key set to the default value is still the file's",
    mixed,
    `beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), ` +
      `concurrency=2 (${file}), store=/opt/beads/bd (PATH), verify=(none) (default), ` +
      `verifyTimeoutMs=${DEFAULT_VERIFY_TIMEOUT_MS} (default), postMerge=(none) (default)`,
  );

  // loadConfig records the reading the line is built from: which file, and which keys it set.
  const scratch = mkdtempSync(join(tmpdir(), "config-"));
  try {
    const none = loadConfig(scratch);
    expectEqual(
      "a Target with no file resolves the defaults",
      [
        none.config.model,
        none.config.thinkingLevel,
        none.config.concurrency,
        none.config.runner,
        none.config.store,
        none.config.verify,
        none.config.verifyTimeoutMs,
      ],
      [undefined, "high", 4, "pi", undefined, "", DEFAULT_VERIFY_TIMEOUT_MS],
    );
    expectEqual("and records no file and no key", [none.provenance.file, [...none.provenance.fromFile]], [undefined, []]);

    mkdirSync(join(scratch, ".scratch"), { recursive: true });
    writeFileSync(join(scratch, CONFIG_REL), "concurrency: 2\nrunner: pi\n");
    const some = loadConfig(scratch);
    expectEqual("a file's own keys are the reading's provenance", [...some.provenance.fromFile].sort(), ["concurrency", "runner"]);
    expectEqual("and the file it read is named", some.provenance.file, join(scratch, CONFIG_REL));
    expectEqual("its values are the effective ones", [some.config.concurrency, some.config.runner], [2, "pi"]);
    expectEqual("a key the file did not set stays the default", some.config.thinkingLevel, "high");

    writeFileSync(join(scratch, CONFIG_REL), "concurrency: nope\n");
    let refused = "";
    try {
      loadConfig(scratch);
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect("a malformed file still fails loudly", /invalid concurrency in .*beads-dag\.yaml: nope/.test(refused), refused);

    // The gate's two keys: the command is a string (empty included), and the timeout is a positive
    // integer, refused the same way concurrency is when it is not.
    writeFileSync(join(scratch, CONFIG_REL), "verify: bun test the suite\nverifyTimeoutMs: 1234\n");
    const gated = loadConfig(scratch);
    expectEqual("a gate command is read as written", gated.config.verify, "bun test the suite");
    expectEqual("and its timeout as the number it is", gated.config.verifyTimeoutMs, 1234);
    expectEqual("both are the file's own keys", [...gated.provenance.fromFile].sort(), ["verify", "verifyTimeoutMs"]);

    writeFileSync(join(scratch, CONFIG_REL), 'verify: ""\n');
    const empty = loadConfig(scratch);
    expectEqual("an explicitly empty gate is empty", empty.config.verify, "");
    expectEqual("and is still the file's, not the default's", [...empty.provenance.fromFile], ["verify"]);

    writeFileSync(join(scratch, CONFIG_REL), "verifyTimeoutMs: nope\n");
    refused = "";
    try {
      loadConfig(scratch);
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect(
      "a malformed gate timeout fails loudly",
      /invalid verifyTimeoutMs in .*beads-dag\.yaml: nope/.test(refused),
      refused,
    );

    // A bare `true` is a boolean to the reader, not the command `true`: an empty `verify` means no gate
    // runs, so a value that is not a string is refused rather than silently dropped.
    writeFileSync(join(scratch, CONFIG_REL), "verify: true\n");
    refused = "";
    try {
      loadConfig(scratch);
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect("a non-string gate command fails loudly", /invalid verify in .*beads-dag\.yaml: true/.test(refused), refused);

    // The post-merge act is read, and refused, exactly as the gate is: empty means nothing runs after a
    // merge, so a Target that meant to keep something true must not be left with silence there either.
    writeFileSync(join(scratch, CONFIG_REL), "postMerge: bun tools/flow.ts install\n");
    const refreshing = loadConfig(scratch);
    expectEqual("a post-merge command is read as written", refreshing.config.postMerge, "bun tools/flow.ts install");
    expectEqual("and is the file's own key", [...refreshing.provenance.fromFile], ["postMerge"]);

    writeFileSync(join(scratch, CONFIG_REL), 'postMerge: ""\n');
    const noAct = loadConfig(scratch);
    expectEqual("an explicitly empty post-merge act is empty", noAct.config.postMerge, "");
    expectEqual("and is still the file's, not the default's", [...noAct.provenance.fromFile], ["postMerge"]);

    writeFileSync(join(scratch, CONFIG_REL), "postMerge: true\n");
    refused = "";
    try {
      loadConfig(scratch);
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect("a non-string post-merge command fails loudly", /invalid postMerge in .*beads-dag\.yaml: true/.test(refused), refused);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  // The opening node: the line reaches a run's stderr, and stdout is still the token alone.
  await withTarget(async (root, artifacts) => {
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    const line = configLine(
      DEFAULTS,
      { file: undefined, fromFile: new Set() },
      { binary: storeBinary(), source: "environment" },
    );
    expectEqual("open prints the configuration line on stderr", opened.stderr, `${line}\n`);
    expectEqual("and its stdout is still the opened token alone", opened.stdout, nodeLine(OPENED));
    expectEqual("open exits clean", opened.status, 0);
  });

  // A key the file sets is reported as the file's, and the run resolves it.
  await withTarget(async (root, artifacts) => {
    const configFile = writeTargetConfig(root, "concurrency: 1\n");
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    const resolved = join(root, configFile);
    expectEqual(
      "the line reports the file-set key as the file's",
      opened.stderr,
      `beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), ` +
        `concurrency=1 (${resolved}), store=${storeBinary()} (PATH), verify=(none) (default), ` +
        `verifyTimeoutMs=${DEFAULT_VERIFY_TIMEOUT_MS} (default), postMerge=(none) (default)\n`,
    );
    expectEqual("and the token is unchanged", opened.stdout, nodeLine(OPENED));
  });

  // The gate's and the post-merge act's keys are read from that same file, and the line names it as their
  // source. They are separate acts at separate moments - one command before a merge, another after it -
  // and the line is where a Target sees which of them it has configured and where each came from.
  await withTarget(async (root, artifacts) => {
    const configFile = writeTargetConfig(
      root,
      `store: ${storeBinary()}\nverify: bun test the suite\nverifyTimeoutMs: 1234\npostMerge: bun tools/flow.ts install\n`,
    );
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    const resolved = join(root, configFile);
    expectEqual(
      "the gate command, its timeout and the post-merge act are the file's",
      opened.stderr,
      `beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), ` +
        `concurrency=4 (default), store=${storeBinary()} (${resolved}), verify=bun test the suite (${resolved}), ` +
        `verifyTimeoutMs=1234 (${resolved}), postMerge=bun tools/flow.ts install (${resolved})\n`,
    );
    expectEqual("and the token is unchanged", opened.stdout, nodeLine(OPENED));
  });

  // The store override is the same file, and the line says the binary came from it - not from PATH.
  await withTarget(async (root, artifacts) => {
    const configFile = writeTargetConfig(root, `store: ${storeBinary()}\n`);
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts, ...envWithoutStore() });
    expectEqual(
      "the line reports the store override as the file's",
      opened.stderr,
      `beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), ` +
        `concurrency=4 (default), store=${storeBinary()} (${join(root, configFile)}), verify=(none) (default), ` +
        `verifyTimeoutMs=${DEFAULT_VERIFY_TIMEOUT_MS} (default), postMerge=(none) (default)\n`,
    );
    expectEqual("open exits clean", opened.status, 0);
    expectEqual("and the token is unchanged", opened.stdout, nodeLine(OPENED));
  });

  // A malformed file fails the node before any line: no token, the reader's own error, no config line.
  await withTarget(async (root, artifacts) => {
    writeTargetConfig(root, "concurrency: nope\n");
    const opened = runScript(drain.script("open"), root, { ARTIFACTS_DIR: artifacts });
    expectEqual("a malformed file prints no token", opened.stdout, "");
    expect("and fails the node", opened.status !== 0, opened.status);
    expect("with the reader's own error", /invalid concurrency in .*beads-dag\.yaml: nope/.test(opened.stderr), opened.stderr);
    expect("and no configuration line", !opened.stderr.includes("beads-dag: config:"), opened.stderr);
  });

  // The refusal contract, case by case, driven straight from the text: `parseConfigText` names the file
  // in its messages and reads no filesystem, so the shape of every refusal is pinned here. The runtime's
  // parser reads the YAML; these are the refusals we kept on top of it, and the line numbers come from
  // our own scan because the platform parser has none.
  {
    const file = "/tmp/beads-dag.yaml";
    const refusal = (text: string): string => {
      try {
        parseConfigText(text, file);
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
      return "(accepted)";
    };
    expectEqual(
      "a nested value is refused, naming the file and the key's line",
      refusal("concurrency: 4\n# a comment\nstore:\n  binary: /opt/bd\n"),
      `cannot read ${file} at line 3: "store" must be a single scalar, not a nested value`,
    );
    expectEqual(
      "a bare key is refused, naming the file and the key's line",
      refusal("concurrency: 4\npostMerge:\n"),
      `cannot read ${file} at line 2: "postMerge" has no value`,
    );
    expectEqual(
      "a duplicate key is refused at its second line",
      refusal("concurrency: 4\nrunner: pi\nconcurrency: 8\n"),
      `cannot read ${file} at line 3: duplicate key "concurrency"`,
    );
    expect(
      "a syntax error names the file and cannot name a line",
      refusal("concurrency: [1,\n").startsWith(`cannot read ${file}: `),
      refusal("concurrency: [1,\n"),
    );
    const unknown = parseConfigText("concurrency: 8\nnotAKey: 1\n# store is not set\n", file);
    expectEqual("an unknown key is ignored, not refused", unknown.config.concurrency, 8);
    expectEqual("and only the keys the text set are recorded", [...unknown.fromFile], ["concurrency"]);
    const empty = parseConfigText("# nothing but a comment\n", file);
    expectEqual("a file with no keys keeps the defaults", empty.config.concurrency, 4);
    expectEqual("and records nothing as coming from the file", [...empty.fromFile], []);
  }

  console.log(JSON.stringify({ ok: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
