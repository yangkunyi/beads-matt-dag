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

/** One dependency an issue declares: the issue it waits on, and the store's type for the edge. */
export type StoreDependency = {
  /** The issue depended on. */
  id: string;
  /** The store's edge type: `blocks`, `parent-child`, `relates-to`, ... */
  type: string;
};

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
  /**
   * The parent the store answers for a `parent-child` edge, when the issue has one. The domain
   * preflight reads it beside the edges: the store propagates a parent's blocked-ness down that
   * relation, so an implementation issue parented under a decision issue waits on the decision's own
   * blockers.
   */
  parent: string | undefined;
  /** The comments the store holds for the issue. Only the drain-end report reads it: a failure is a
   * comment, so a zero here is an issue that can hold no failure record. */
  commentCount: number;
  /** The edges the issue declares, and the `parent` the store keeps for one of them. Every query that
   * asks for an issue gets them; only the domain preflight reads them. */
  dependencies: StoreDependency[];
};

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function toDependencies(raw: unknown): StoreDependency[] {
  if (!Array.isArray(raw)) return [];
  const dependencies: StoreDependency[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const id = text(record.depends_on_id);
    const type = text(record.type);
    if (id !== undefined && type !== undefined) dependencies.push({ id, type });
  }
  return dependencies;
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
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
    parent: text(issue.parent),
    commentCount: toCount(issue.comment_count),
    dependencies: toDependencies(issue.dependencies),
  };
}

/**
 * `--limit 0` asks for everything: the store caps its answer (documented default 100), and the frontier
 * has to be the whole answer twice over — the exclusions are reported from it, and the only cap that may
 * truncate it is the run's own concurrency, applied by pick.
 */
const READY_ARGS = ["ready", "--json", "--limit", "0"];

/** The whole `in_progress` set, by the same rule: the store's cap is not a policy this pack has. */
const IN_PROGRESS_ARGS = ["list", "-s", "in_progress", "--json", "--limit", "0"];

/**
 * One store command that answers with a list of issues, narrowed here and nowhere else. Both queries
 * that read issues go through it, so "the store returned something that is not an issue" has one home.
 */
function issueList(store: Store, target: string, args: string[]): StoreIssue[] {
  const command = args.join(" ");
  const parsed = parseJSON(command, runStore(store, target, args));
  if (!Array.isArray(parsed)) {
    throw new Error(`${command} answered with something that is not a list of issues: ${JSON.stringify(parsed)}`);
  }
  return parsed.map((raw) => toStoreIssue(raw, command));
}

/**
 * What the store says can start: `open`, not blocked, not pinned, not deferred — the store's own answer,
 * before any policy the store does not hold (the gate label, the decision domain, what this run already
 * tried). A drain works exactly what comes back here.
 */
export function readyIssues(store: Store, target: string): StoreIssue[] {
  return issueList(store, target, READY_ARGS);
}

/**
 * Everything the store holds `in_progress`: the set a drain that was killed left claimed.
 *
 * This is the repair's input, and it is the store's answer on purpose — the store is what says an issue
 * was claimed, and git is what says whether the claim's work landed (the repair looks the merge up by
 * the names the issue carries, never by scanning). Nothing but the repair reads it, and it is a plain
 * `list` for the same reason `ready` is: the store's own status is the one fact the repair may take
 * from the store, because it is the fact being repaired.
 */
export function inProgressIssues(store: Store, target: string): StoreIssue[] {
  return issueList(store, target, IN_PROGRESS_ARGS);
}

/**
 * Every issue the store holds, closed ones included: the graph the domain preflight reads.
 *
 * `--all` is the point. A decision issue that has already been closed is the dangerous state — the
 * store has released whatever waits on it — so the edge that produced the release is a fact about the
 * whole store, not about the ready set, and it stays visible here after the closure.
 */
export function allIssues(store: Store, target: string): StoreIssue[] {
  return issueList(store, target, ["list", "--all", "--json", "--limit", "0"]);
}

/**
 * One issue, by the handle the tracker published with it: `<feature>/<NN>`.
 *
 * A handle names exactly one issue - it is what the drain hands its per-issue workflow, and every git
 * name the issue has is derived from it (naming.ts) - so the lookups that matter are "the issue this
 * handle names" and the two ways that fails: no such issue, or a handle two issues carry. Both throw
 * with the handle named, because there is nothing sensible to guess between.
 *
 * `--all` is deliberate: a handle identifies an issue the pack may look for at any age, including one a
 * repair path is about to close. The status filter is the caller's business, not the lookup's.
 */
export function issueByHandle(store: Store, target: string, handle: string): StoreIssue {
  const args = ["list", "--metadata-field", `handle=${handle}`, "--all", "--json", "--limit", "0"];
  const issues = issueList(store, target, args);
  if (issues.length === 0) {
    throw new Error(`no issue carries handle ${handle}: ${args.join(" ")} answered with nothing`);
  }
  if (issues.length > 1) {
    throw new Error(
      `handle ${handle} names ${issues.length} issues (${issues.map((issue) => issue.id).join(", ")}): a handle is an ` +
        "issue's identity in git, so it names exactly one",
    );
  }
  return issues[0]!;
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

/**
 * Close an issue as merged: the one closure this pack writes, and it means the work is in Main.
 *
 * The caller has the merge behind it (settle.ts merges first, then records), and the reason names the
 * branch that landed, so a reader of the store can see what the closure means without asking git. The
 * restriction is ADR-0004: closing an issue releases whatever waits on it, so a closure that could mean
 * anything else would release work against a dependency that was not delivered.
 */
export function closeIssue(store: Store, target: string, id: string, reason: string): void {
  runStore(store, target, ["close", id, "--reason", reason]);
}

/** One comment the store holds, as this module reads it back. */
type StoreComment = { text: string };

/**
 * The failure record, as the flow writes it into a comment: `attempt N failed: <reason>`. One comment
 * per failed attempt (recordFailedAttempt), so the store's own comment trail is the count - and the
 * plainest reading of a failure there is, because `bd history` records transitions, not bodies.
 */
const FAILURE_COMMENT = /^attempt (\d+) failed:(?: ([\s\S]*))?$/;

export type RecordedFailure = {
  /** The attempt ordinal the flow wrote: one plus the failures already recorded when it failed. */
  attempt: number;
  /** The reason, with the `attempt N failed: ` prefix stripped. */
  reason: string;
  /** The whole comment, exactly as the store answered it. */
  text: string;
};

/**
 * One issue's recorded failures, oldest first, from the store's own answers.
 *
 * `bd comments <id> --json` is the query the drain-end report reads: a failure is an event (§10.3) -
 * a comment plus a return to `open` - and this is where the reason lives. `bd history` cannot answer
 * it: it records the transition commits and the issue's status after each, never the comment's body,
 * so every failure there looks like every other update.
 */
export function recordedFailures(store: Store, target: string, id: string): RecordedFailure[] {
  const command = `comments ${id} --json`;
  const parsed = parseJSON(command, runStore(store, target, ["comments", id, "--json"]));
  if (!Array.isArray(parsed)) {
    throw new Error(`${command} answered with something that is not a list of comments: ${JSON.stringify(parsed)}`);
  }
  return parsed
    .filter(
      (raw): raw is StoreComment =>
        typeof raw === "object" && raw !== null && typeof (raw as { text?: unknown }).text === "string",
    )
    .flatMap((comment) => {
      const m = FAILURE_COMMENT.exec(comment.text);
      return m ? [{ attempt: Number(m[1]), reason: m[2] ?? "", text: comment.text }] : [];
    });
}

/**
 * Write one comment on an issue. The store stamps author and time itself, and appends only - a comment is
 * an event, and the writing flow never edits or deletes one. `recordFailedAttempt` is built on this, and
 * the inquiry executor's repair uses it for the release it records.
 */
export function commentIssue(store: Store, target: string, id: string, text: string): void {
  runStore(store, target, ["comment", id, text]);
}

/**
 * Put an issue back to `open`: the status every released claim returns to, failed or landed. It is the
 * plain status write `recordFailedAttempt` ends with, named so a caller that is not recording a failure
 * does not have to spell it again.
 */
export function reopenIssue(store: Store, target: string, id: string): void {
  runStore(store, target, ["update", id, "-s", "open"]);
}

/**
 * Record a failed attempt: the reason as a comment, then the issue back to `open`. Nothing is closed.
 *
 * This is the whole of the pack's failure policy (§10.3). A failure is an event, not a status: the
 * reason persists in a comment, the issue returns to the only set that can start, and the retry channel
 * is `bd ready` itself - so the next drain works it exactly like fresh work, and this one is kept from
 * it by its own `attempted-ids.json`. Its dependents stay blocked where they were, because nothing
 * merged and nothing was closed.
 *
 * `attempt N` is the ordinal of this failure record - one plus the failures already on the issue - so
 * the comment reads as a history even though the store keeps only one comment's worth of text.
 *
 * The two writes are separate transactions, and deliberately in this order: a crash between them leaves
 * the reason recorded and the issue still in progress, which the next drain's repair can read. The
 * other order would leave an issue that looks untouched with no reason anywhere.
 */
export function recordFailedAttempt(store: Store, target: string, id: string, reason: string): void {
  const attempt = 1 + recordedFailures(store, target, id).length;
  commentIssue(store, target, id, `attempt ${attempt} failed: ${reason}`);
  reopenIssue(store, target, id);
}
