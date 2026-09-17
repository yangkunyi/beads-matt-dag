import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { Store } from "./store.ts";

const THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/** Which runtime spends an agent node: the in-process Pi session, or DeepSeek Harness. */
export type Runner = "pi" | "dsh";

export type PackConfig = {
  model: string | undefined;
  thinkingLevel: ThinkingLevel;
  concurrency: number;
  runner: Runner;
  /** Path to the store binary. Unset, the store module looks for `bd` on PATH. */
  store: string | undefined;
  /**
   * The Target's pre-merge gate: one shell command, run with `sh -c` in the issue's worktree, on the
   * tree that would be merged. Empty (the default) means this Target has not configured one - no
   * process, no record, no behavior change. It comes from this file and never from an issue body: what
   * a worker can write must not decide what runs before a merge (verify.ts).
   */
  verify: string;
  /** How long one gate run may take before its process group is killed and the attempt fails. */
  verifyTimeoutMs: number;
  /**
   * The Target's post-merge act: one shell command, run with `sh -c` in the Target itself, after a merge
   * has landed (postmerge.ts). Empty (the default) means this Target has none - no process, no record.
   * It is where a Target keeps something outside its own git tree true: refreshing an installed copy of
   * the flow, regenerating a document, syncing an index. Like `verify`, it comes from this file and never
   * from an issue body.
   */
  postMerge: string;
};

/** The Target's config, relative to it. The workflow hands this path to every node as INPUTS_CONFIG. */
export const DEFAULT_CONFIG_REL = ".scratch/beads-dag.yaml";

/**
 * How long one gate run may take by default. Exported because the execute node's own timeout has to
 * outlast two gate runs on top of its two agent turns, and the workflow-contract test reads this same
 * constant when it checks that budget: a later edit here cannot silently make the node too short.
 */
export const DEFAULT_VERIFY_TIMEOUT_MS = 15 * 60 * 1000;

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

/** The keys the pack reads, in the order the configuration line names them; every other top-level key
 * is ignored. */
export const CONFIG_KEYS = [
  "runner",
  "model",
  "thinkingLevel",
  "concurrency",
  "store",
  "verify",
  "verifyTimeoutMs",
  "postMerge",
] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

/**
 * Where the effective configuration's values came from: the Target's config file, when one was read,
 * and which keys it set. Every key it did not set is the built-in default (`DEFAULTS`); the store is
 * the one key whose resolution has a second source, PATH, which `store.ts` records on the Store it
 * returns. `loadConfig` returns this beside the values - never instead of them - because the values
 * alone cannot tell "the Target has no file" from "a file said the defaults".
 */
export type ConfigProvenance = {
  /** The file the values were read from; undefined when the Target has no config file. */
  file: string | undefined;
  /** The keys the file set. A key whose parsed value did not take effect is not among them. */
  fromFile: ReadonlySet<ConfigKey>;
};

/** A config read off a Target: the effective values, and where each came from. */
export type LoadedConfig = {
  config: PackConfig;
  provenance: ConfigProvenance;
};

/** One file's answer: the effective values, and the keys that file set. */
export type ParsedConfig = {
  config: PackConfig;
  fromFile: ReadonlySet<ConfigKey>;
};

function isConfigKey(key: string): key is ConfigKey {
  return (CONFIG_KEYS as readonly string[]).includes(key);
}

function isThinkingLevel(v: string): v is ThinkingLevel {
  return (THINKING_LEVELS as readonly string[]).includes(v);
}

/** A shape the reader refuses to guess at. The message names the file and the 1-based line. */
function configError(file: string, line: number, detail: string): Error {
  return new Error(`cannot read ${file} at line ${line}: ${detail}`);
}

/**
 * Where each top-level key sits in the text. Not a YAML reader: `Bun.YAML.parse` already accepted
 * the file; this only names the line of a key this scan is about to refuse (nested, bare, duplicate).
 * The platform parser last-wins on duplicates and its syntax error has no YAML line number, so the
 * scan is how those refusals still name the file and the line.
 */
function topLevelKeys(text: string): {
  first: Map<string, { line: number; bare: boolean }>;
  duplicate: { key: string; line: number } | undefined;
} {
  const first = new Map<string, { line: number; bare: boolean }>();
  let duplicate: { key: string; line: number } | undefined;
  let topIndent: number | undefined;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i]!.replace(/[ \t\r]+$/, "");
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "---" || trimmed === "..." || trimmed.startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    if (topIndent === undefined) topIndent = indent;
    if (indent !== topIndent) continue;
    const kv = /^["']?([A-Za-z0-9_.-]+)["']?\s*:(.*)$/.exec(raw.slice(indent));
    if (!kv) continue;
    const key = kv[1]!;
    const rest = kv[2]!.trim();
    const bare = rest === "" || rest.startsWith("#");
    if (first.has(key)) {
      if (duplicate === undefined) duplicate = { key, line: lineNo };
      continue;
    }
    first.set(key, { line: lineNo, bare });
  }
  return { first, duplicate };
}

function applyKnownKey(
  key: ConfigKey,
  value: unknown,
  file: string,
  config: PackConfig,
  fromFile: Set<ConfigKey>,
): void {
  switch (key) {
    case "model":
      if (typeof value === "string") {
        config.model = value;
        fromFile.add(key);
      }
      break;
    case "store":
      if (typeof value === "string") {
        config.store = value;
        fromFile.add(key);
      }
      break;
    case "verify":
      // A command is a string, empty included: `verify: ""` is the Target saying it has none, which is
      // the same behavior as the key being absent, but the reading still records the file as its source.
      // Anything else - a number, a bare `true`, a null - is refused rather than ignored: `config.verify`
      // being empty means no gate runs, and a Target that meant to configure one must not be left with
      // silence there.
      if (typeof value !== "string") {
        throw new Error(`invalid verify in ${file}: ${JSON.stringify(value)} (expected a shell command string)`);
      }
      config.verify = value;
      fromFile.add(key);
      break;
    case "verifyTimeoutMs":
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
        throw new Error(`invalid verifyTimeoutMs in ${file}: ${String(value)}`);
      }
      config.verifyTimeoutMs = value;
      fromFile.add(key);
      break;
    case "postMerge":
      // The same refusal as `verify`, for the same reason: an empty command means nothing runs after a
      // merge, so a Target that wrote something that is not a string must hear about it rather than be
      // left with silence where it meant to keep its machine copies honest.
      if (typeof value !== "string") {
        throw new Error(`invalid postMerge in ${file}: ${JSON.stringify(value)} (expected a shell command string)`);
      }
      config.postMerge = value;
      fromFile.add(key);
      break;
    case "thinkingLevel":
      if (typeof value !== "string" || !isThinkingLevel(value)) {
        throw new Error(`invalid thinkingLevel in ${file}: ${String(value)}`);
      }
      config.thinkingLevel = value;
      fromFile.add(key);
      break;
    case "concurrency":
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
        throw new Error(`invalid concurrency in ${file}: ${String(value)}`);
      }
      config.concurrency = value;
      fromFile.add(key);
      break;
    case "runner":
      if (value !== "pi" && value !== "dsh") {
        throw new Error(`invalid runner in ${file}: ${String(value)} (expected pi or dsh)`);
      }
      config.runner = value;
      fromFile.add(key);
      break;
  }
}

/**
 * Read the pack config with the runtime's YAML parser (`Bun.YAML.parse`), then refuse anything that
 * is not a flat mapping of scalars. That is the choice: keep the hand-rolled reader's contract
 * (unknown keys ignored; nested map or list, bare key, duplicate key refused with file and line)
 * rather than let the platform's superset through. The line of a refused key is found by a scan for
 * that key, because `Bun.YAML.parse`'s own error is `YAML Parse error: Unexpected token` with no
 * YAML line number. A syntax error therefore names the file only. The answer carries which keys the
 * text set, so the opening node's line can name the file as their source. `file` only names the
 * source in error messages, so a test can drive this without a filesystem.
 */
export function parseConfigText(text: string, file: string): ParsedConfig {
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(text);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`cannot read ${file}: ${detail}`);
  }
  if (parsed === null || parsed === undefined) {
    return { config: { ...DEFAULTS }, fromFile: new Set() };
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw configError(file, 1, "expected a flat mapping of scalars");
  }

  const { first, duplicate } = topLevelKeys(text);
  if (duplicate !== undefined) {
    throw configError(file, duplicate.line, `duplicate key "${duplicate.key}"`);
  }

  const config: PackConfig = { ...DEFAULTS };
  const fromFile = new Set<ConfigKey>();
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isConfigKey(key)) continue;
    const loc = first.get(key);
    const line = loc?.line ?? 1;
    if (value !== null && typeof value === "object") {
      throw configError(file, line, `"${key}" must be a single scalar, not a nested value`);
    }
    if (value === null && (loc?.bare ?? true)) {
      throw configError(file, line, `"${key}" has no value`);
    }
    applyKnownKey(key, value, file, config, fromFile);
  }
  return { config, fromFile };
}

function resolveConfigPath(target: string, configPath?: string): string {
  const raw = configPath?.trim() ? configPath.trim() : DEFAULT_CONFIG_REL;
  return isAbsolute(raw) ? raw : resolve(target, raw);
}

/**
 * The Target's config, or the defaults when it has none, with the reading's provenance beside it.
 * Every node reads it through node-entry; the opening node's configuration line is built from the
 * values and this provenance together.
 */
export function loadConfig(target: string, configPath?: string): LoadedConfig {
  const file = resolveConfigPath(target, configPath);
  if (!existsSync(file)) {
    return { config: { ...DEFAULTS }, provenance: { file: undefined, fromFile: new Set() } };
  }
  const { config, fromFile } = parseConfigText(readFileSync(file, "utf8"), file);
  return { config, provenance: { file, fromFile } };
}

/**
 * The opening node's one line: the effective configuration, each value with the source it came from -
 * the Target's config file, by the path it was read from, or the built-in default.
 *
 * It exists because the values alone cannot tell the two apart: `loadConfig` returns the defaults in
 * silence when the Target has no file, so without this line "no config file" and "a file said so"
 * are the same run. A model the config does not set is the runner's own default, which is what the
 * line names; its source is still the pack's default. The store is the one key whose source has a
 * second form: `store.ts` resolves the binary from the config override first, then PATH, and its
 * `source` says which answered - the file the override was read from, or PATH.
 *
 * The opening shell (`open-lock.ts`) writes it to stderr, never stdout: a node's stdout is its token
 * channel, and open's whole stdout has to stay one `opened` token.
 *
 * The two records are typed out over `CONFIG_KEYS`, so a key added to the pack cannot be left out of
 * the line: the record is missing it and the typecheck fails.
 */
export function configLine(config: PackConfig, provenance: ConfigProvenance, store: Store): string {
  const file = provenance.file;
  const sourceOf = (key: ConfigKey): string =>
    provenance.fromFile.has(key) && file !== undefined ? file : "default";
  const values: Record<ConfigKey, string> = {
    runner: config.runner,
    model: config.model ?? "the runner's default",
    thinkingLevel: config.thinkingLevel,
    concurrency: String(config.concurrency),
    store: store.binary,
    verify: config.verify === "" ? "(none)" : config.verify,
    verifyTimeoutMs: String(config.verifyTimeoutMs),
    postMerge: config.postMerge === "" ? "(none)" : config.postMerge,
  };
  const sources: Record<ConfigKey, string> = {
    runner: sourceOf("runner"),
    model: sourceOf("model"),
    thinkingLevel: sourceOf("thinkingLevel"),
    concurrency: sourceOf("concurrency"),
    store: store.source === "environment" ? "PATH" : file ?? "config",
    verify: sourceOf("verify"),
    verifyTimeoutMs: sourceOf("verifyTimeoutMs"),
    postMerge: sourceOf("postMerge"),
  };
  return `beads-dag: config: ${CONFIG_KEYS.map((key) => `${key}=${values[key]} (${sources[key]})`).join(", ")}`;
}
