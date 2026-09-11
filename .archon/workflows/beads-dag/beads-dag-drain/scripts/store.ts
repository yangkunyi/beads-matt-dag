import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { DEFAULT_CONFIG_REL, type PackConfig } from "./config.ts";

/**
 * The store module: the only place in the pack that builds a store command.
 *
 * Every other module asks this one, so a change in how the store is addressed — the binary, its
 * arguments, its working directory — has exactly one home. The binary is resolved the way the spec
 * decides: the Target's config override first, then the environment's PATH. A run that cannot resolve
 * it fails at preflight, before any issue is started, naming everywhere it looked.
 */

/** The store's directory, relative to the Target. A Target owns its own store; a parent's is not it. */
export const STORE_DIR_REL = ".beads";

export type Store = {
  /** The binary a store command runs: a resolved path, or a bare name the OS resolves from PATH. */
  binary: string;
  /** Which step of the resolution answered: the Target's config override, or the environment's PATH. */
  source: "config" | "environment";
};

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The PATH entries, in order, with the empty ones dropped — an empty entry is a cwd guess, not a dir. */
function pathEntries(): string[] {
  return (process.env.PATH ?? "").split(delimiter).filter((entry) => entry !== "");
}

function findOnPath(name: string): string | undefined {
  const names = process.platform === "win32" ? [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name] : [name];
  for (const dir of pathEntries()) {
    for (const candidate of names) {
      const path = join(dir, candidate);
      if (isExecutableFile(path)) return path;
    }
  }
  return undefined;
}

/**
 * Resolve the Target's store binary: the config override first, then the environment.
 *
 * An override wins outright: a `store` that does not point at an executable fails loudly rather than
 * silently falling back to PATH, because an operator who set it expects it to be the one used.
 */
export function resolveStore(target: string, config: PackConfig): Store {
  const override = config.store?.trim();
  if (override) {
    const path = isAbsolute(override) ? override : resolve(target, override);
    if (isExecutableFile(path)) return { binary: path, source: "config" };
    throw new Error(
      `cannot find the store binary: ${DEFAULT_CONFIG_REL} sets store to ${JSON.stringify(override)} (${path}), ` +
        "and that is not an executable file; point store at the binary, or unset it to use PATH",
    );
  }
  const found = findOnPath("bd");
  if (found) return { binary: found, source: "environment" };
  throw new Error(
    `cannot find the store binary: ${DEFAULT_CONFIG_REL} sets no store, and bd is not on PATH ` +
      `(looked in: ${pathEntries().join(delimiter) || "(PATH is empty)"}); install it, or point store at it`,
  );
}

/**
 * The opening step's preflight: the store binary resolves, and the Target itself has a store.
 *
 * The store is the Target's own — a `.beads` directory beside the repository being drained, never one
 * inherited from a parent directory — because the drain writes to it. Failing here is the point: the
 * run stops before pick, before a worktree, before anything an operator would have to clean up.
 */
export function preflightStore(target: string, config: PackConfig): Store {
  const store = resolveStore(target, config);
  const dir = join(target, STORE_DIR_REL);
  if (!existsSync(dir)) {
    throw new Error(
      `no store in the Target: ${dir} does not exist; a Target owns its own store, initialise it in the ` +
        `Target (${store.binary} init), it is never inherited from a parent directory`,
    );
  }
  return store;
}

/** One store command, built and run here and nowhere else. Throws with the command and its reason. */
function runStore(store: Store, target: string, args: string[]): string {
  const result = spawnSync(store.binary, args, { cwd: target, encoding: "utf8", env: process.env });
  const command = [store.binary, ...args].join(" ");
  if (result.error) throw new Error(`cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const reason = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`${command} failed (exit ${result.status})${reason ? `: ${reason}` : ""}`);
  }
  return result.stdout ?? "";
}

/**
 * Recompute the store's derived blocked-ness for every issue. The opening step runs it so a change made
 * outside the drain cannot leave a stale answer behind: `bd ready` trusts the denormalized flag, and
 * the recompute is the repair for a pulled or hand-edited store.
 */
export function recomputeBlocked(store: Store, target: string): void {
  runStore(store, target, ["recompute-blocked", "--json"]);
}

/**
 * Push the store's commits to its configured Dolt remote: the operator's one-command backup, carried
 * here so it resolves the binary exactly as the drain does, and reachable from the Target as
 * `bun <pack>/beads-dag-drain/backup.ts`.
 */
export function pushStore(store: Store, target: string): void {
  runStore(store, target, ["dolt", "push"]);
}
