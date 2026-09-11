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
function runStore(store: Store, target: string, args: string[], input?: string): string {
  const result = spawnSync(store.binary, args, { cwd: target, encoding: "utf8", env: process.env, input });
  const command = [store.binary, ...args].join(" ");
  if (result.error) throw new Error(`cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const reason = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`${command} failed (exit ${result.status})${reason ? `: ${reason}` : ""}`);
  }
  return result.stdout ?? "";
}

function parseJSON(command: string, stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`${command} did not answer with JSON: ${stdout.trim().slice(0, 200)}`);
  }
}

/** One issue, narrowed to what the pack reads off the store. The store's JSON shape stops here. */
export type StoreIssue = {
  id: string;
  /** The issue's type. `decision` is the other domain: it never enters a drain's frontier. */
  type: string;
  status: string;
  labels: string[];
  /** `<feature>/<NN>`, when the tracker published one: what branch and worktree names derive from. */
  handle: string | undefined;
  slug: string | undefined;
};

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function toStoreIssue(raw: unknown, command: string): StoreIssue {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${command} returned something that is not an issue: ${JSON.stringify(raw)}`);
  }
  const issue = raw as Record<string, unknown>;
  const id = text(issue.id);
  if (id === undefined) {
    throw new Error(`${command} returned an issue with no id: ${JSON.stringify(raw)}`);
  }
  const metadata =
    typeof issue.metadata === "object" && issue.metadata !== null
      ? (issue.metadata as Record<string, unknown>)
      : {};
  return {
    id,
    type: text(issue.issue_type) ?? "",
    status: text(issue.status) ?? "",
    labels: Array.isArray(issue.labels) ? issue.labels.filter((l): l is string => typeof l === "string") : [],
    handle: text(metadata.handle),
    slug: text(metadata.slug),
  };
}

/**
 * `--limit 0` asks for everything: the store caps its answer (documented default 100), and the frontier
 * has to be the whole answer twice over — the exclusions are reported from it, and the only cap that may
 * truncate it is the run's own concurrency, applied by pick.
 */
const READY_ARGS = ["ready", "--json", "--limit", "0"];

/**
 * What the store says can start: `open`, not blocked, not pinned, not deferred — the store's own answer,
 * before any policy the store does not hold (the gate label, the decision domain, what this run already
 * tried). A drain works exactly what comes back here.
 */
export function readyIssues(store: Store, target: string): StoreIssue[] {
  const command = READY_ARGS.join(" ");
  const parsed = parseJSON(command, runStore(store, target, READY_ARGS));
  if (!Array.isArray(parsed)) {
    throw new Error(`${command} answered with something that is not a list of issues: ${JSON.stringify(parsed)}`);
  }
  return parsed.map((raw) => toStoreIssue(raw, command));
}

/**
 * Claim issues: every one of them, in a single transaction, or none of them.
 *
 * `bd batch` executes its stdin inside one store transaction and rolls the whole thing back on any
 * failing line, so a drain that claims a batch can never leave half the batch in progress. The claim
 * itself is the status transition — `in_progress` is what takes an issue out of every other drain's
 * `ready` answer; the assignee is left alone because the batch grammar cannot express `--claim`'s actor
 * resolution and no step of this flow reads it.
 */
export function claimIssues(store: Store, target: string, ids: string[]): void {
  if (ids.length === 0) return;
  const lines = ids.map((id) => `update ${quoteBatchToken(id)} status=in_progress`);
  runStore(store, target, ["batch"], `${lines.join("\n")}\n`);
}

/** A batch token: quoted always, so an id the store generates can never split a line in two. */
function quoteBatchToken(token: string): string {
  return `"${token.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
