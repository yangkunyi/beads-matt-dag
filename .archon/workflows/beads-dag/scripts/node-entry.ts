import { parseAllowList, type AllowList } from "./allow-list.ts";
import { loadConfig, type ConfigProvenance, type PackConfig } from "./config.ts";

/** What a node's handler is handed: where it runs, its own inputs, and the Target's config. */
type NodeEnv = {
  /** The Target: the process cwd, which every git and store call is relative to. */
  target: string;
  /** INPUTS_ISSUE: the issue handle this instance is for, "" for a node that has no issue. */
  issueHandle: string;
  /** ARTIFACTS_DIR: what this run leaves behind, "" for a node that did not ask for it. */
  artifactsDir: string;
  config: PackConfig;
  /**
   * Where the config's effective values came from: the file it was read from, and the keys it set.
   * The opening node's configuration line is built from this; every other node ignores it.
   */
  configProvenance: ConfigProvenance;
  /**
   * INPUTS_ALLOW_LIST: this run's pool, when the run was started with one. Undefined is omitted — pick
   * is today's. A present set, empty included, is the ids this run may claim.
   */
  allowList: AllowList;
};

type NodeOpts = {
  /** Require INPUTS_ISSUE: only the per-issue nodes do. */
  issue?: boolean;
  /** Require ARTIFACTS_DIR. */
  artifacts?: boolean;
  /**
   * The node's step. Its return value is the node's whole stdout, so a handler hands back a
   * node-outcomes token: the token plus exactly one trailing newline (nodeLine).
   */
  run: (env: NodeEnv) => string | Promise<string>;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/**
 * The Script-node protocol the YAMLs match on: env in, one stdout token out.
 * A Git-contract outcome (including `failed`) exits 0; misconfiguration and thrown errors exit non-zero
 * with the reason on stderr, so a node that could not do its job is never read as one that did it.
 *
 * Archon strips the token's one newline before a `when:` or `until_bash` reads a node's output, which is
 * why the YAMLs compare the bare token.
 */
export async function runNode(opts: NodeOpts): Promise<void> {
  try {
    const target = process.cwd();
    const issueHandle = opts.issue ? requireEnv("INPUTS_ISSUE") : "";
    const artifactsDir = opts.artifacts ? requireEnv("ARTIFACTS_DIR") : "";
    const { config, provenance } = loadConfig(target, process.env.INPUTS_CONFIG);
    const allowList = parseAllowList(process.env.INPUTS_ALLOW_LIST);
    process.stdout.write(
      await opts.run({ target, issueHandle, artifactsDir, config, configProvenance: provenance, allowList }),
    );
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}
