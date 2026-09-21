/**
 * Attention: the Target's one navigator, as a view.
 *
 * A session boots from this JSON. It writes nothing: the store runs read-only for the whole call, and
 * the run lock is inspected, never taken. Development, inquiry and experiment ready sets are each
 * domain's existing dry frontier with an empty attempted set and no allow-list, so attention and a
 * next run cannot describe two frontiers. Leftovers, drafts, unread, braked and stuck are the piles
 * the tracker already names; this module only puts them in one object.
 *
 * Stuck is derived from the same graph `allIssues` already holds: an open issue waiting on an open
 * `wontfix` blocker, or on a development blocker off the gate. Attention does not call `bd blocked`
 * and does not recompute blocked-ness (that write belongs to a run's open).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DRAFT_LABEL } from "../beads-dag-read/scripts/reading.ts";
import { composeReadingFrontier } from "../beads-dag-inquiry/scripts/frontier.ts";
import { isMapContainer } from "../beads-dag-inquiry/scripts/inquiry.ts";
import { isGrillClaim, isReadingClaim } from "../beads-dag-inquiry/scripts/leftovers.ts";
import { loadConfig } from "./config.ts";
import { contractPresence } from "./contract.ts";
import { composeDevelopmentFrontier, GATE_LABEL, isDevelopmentLeftover } from "./dev-frontier.ts";
import { blockingWaitIds, issueDomain, type IssueDomain } from "./domains.ts";
import { composeExperimentFrontier, isExperimentLeftover } from "./experiment-frontier.ts";
import { bodyPath, issueNames } from "./naming.ts";
import { inspectRunLock, type RunKind } from "./run-lock.ts";
import {
  allIssues,
  inProgressIssues,
  preflightStore,
  readyIssues,
  recordedFailures,
  type Store,
  type StoreIssue,
} from "./store.ts";
import { READONLY_ENV } from "./worker-env.ts";

const WONTFIX = "wontfix";
const READING_NONE_LABEL = "reading:none";
const BRAKE_LABELS = new Set(["needs-triage", "needs-info", "ready-for-human", WONTFIX]);

export type AttentionNext =
  | "wait"
  | "drain"
  | "inquiry"
  | "experiment"
  | "grill"
  | "triage"
  | "run"
  | "accept-or-edit-or-reject"
  | "read-or-decline";

export type AttentionRun = { held: false } | { held: true; runId: string; kind?: RunKind };

export type LeftoverItem = {
  id: string;
  handle: string;
  type: string;
  domain: IssueDomain;
  next: AttentionNext;
};

export type StuckItem = {
  id: string;
  handle: string;
  waiting_on: { handle: string; why: "wontfix" | "braked" }[];
  next: AttentionNext;
};

export type DraftItem = { id: string; handle: string; title: string; next: AttentionNext };

export type ReadyDevelopmentItem = {
  id: string;
  handle: string;
  title: string;
  contract: "present" | "missing";
  attempts_failed: number;
  next: AttentionNext;
};

export type ReadyItem = { id: string; handle: string; title: string; next: AttentionNext };

export type BrakedItem = { id: string; handle: string; labels: string[]; next: AttentionNext };

export type AttentionSnapshot = {
  target: string;
  run: AttentionRun;
  buckets: {
    leftovers: LeftoverItem[];
    stuck: StuckItem[];
    drafts: DraftItem[];
    ready: {
      development: ReadyDevelopmentItem[];
      inquiry: ReadyItem[];
      experiments: ReadyItem[];
    };
    unread_experiments: ReadyItem[];
    braked: BrakedItem[];
  };
};

function withReadonly<T>(fn: () => T): T {
  const prev = process.env[READONLY_ENV];
  process.env[READONLY_ENV] = "1";
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[READONLY_ENV];
    else process.env[READONLY_ENV] = prev;
  }
}

function handleOf(issue: StoreIssue): string {
  return issue.handle ?? issue.id;
}

/** Next for an in-progress leftover: the executor whose leftover classify matches, not a parallel tag. */
function leftoverNext(issue: StoreIssue): Exclude<AttentionNext, "wait" | "triage" | "accept-or-edit-or-reject" | "read-or-decline"> {
  if (isExperimentLeftover(issue)) return "experiment";
  if (isGrillClaim(issue) && !isReadingClaim(issue)) return "grill";
  if (isReadingClaim(issue)) return "inquiry";
  if (isDevelopmentLeftover(issue)) return "drain";
  return "inquiry";
}

function startOrWait(next: AttentionNext, held: boolean): AttentionNext {
  return held ? "wait" : next;
}

function blockerWhy(blocker: StoreIssue): "wontfix" | "braked" | undefined {
  if (blocker.status === "closed") return undefined;
  if (blocker.labels.includes(WONTFIX)) return "wontfix";
  if (issueDomain(blocker) === "development" && !blocker.labels.includes(GATE_LABEL)) return "braked";
  return undefined;
}

function developmentContract(target: string, issue: StoreIssue): "present" | "missing" {
  try {
    const path = bodyPath(target, issueNames(issue));
    if (!existsSync(path)) return "missing";
    return contractPresence(readFileSync(path, "utf8"), "development");
  } catch {
    return "missing";
  }
}

function attemptsFailed(store: Store, target: string, id: string): number {
  try {
    return recordedFailures(store, target, id).length;
  } catch {
    return 0;
  }
}

function composeAttention(store: Store, target: string): AttentionSnapshot {
  const inspected = inspectRunLock(target);
  const held = inspected.held;
  const run: AttentionRun = inspected.held
    ? inspected.kind === undefined
      ? { held: true, runId: inspected.runId }
      : { held: true, runId: inspected.runId, kind: inspected.kind }
    : { held: false };

  const ready = readyIssues(store, target);
  const inProgress = inProgressIssues(store, target);
  const all = allIssues(store, target);
  const byId = new Map(all.map((issue) => [issue.id, issue]));
  const leftoverIds = new Set(inProgress.map((issue) => issue.id));
  const emptyAttempted = new Set<string>();

  const leftovers: LeftoverItem[] = inProgress.map((issue) => ({
    id: issue.id,
    handle: handleOf(issue),
    type: issue.type,
    domain: issueDomain(issue),
    next: startOrWait(leftoverNext(issue), held),
  }));

  const stuck: StuckItem[] = [];
  for (const issue of all) {
    if (issue.status !== "open" || leftoverIds.has(issue.id)) continue;
    const waiting_on: StuckItem["waiting_on"] = [];
    for (const blockerId of blockingWaitIds(issue)) {
      const blocker = byId.get(blockerId);
      if (blocker === undefined) continue;
      const why = blockerWhy(blocker);
      if (why === undefined) continue;
      waiting_on.push({ handle: handleOf(blocker), why });
    }
    if (waiting_on.length === 0) continue;
    stuck.push({ id: issue.id, handle: handleOf(issue), waiting_on, next: "triage" });
  }

  const drafts: DraftItem[] = all
    .filter((issue) => issue.status === "open" && issue.type === "decision" && issue.labels.includes(DRAFT_LABEL))
    .map((issue) => ({
      id: issue.id,
      handle: handleOf(issue),
      title: issue.title,
      next: "accept-or-edit-or-reject" as const,
    }));

  const development = composeDevelopmentFrontier(ready, emptyAttempted).candidates.map((issue) => ({
    id: issue.id,
    handle: handleOf(issue),
    title: issue.title,
    contract: developmentContract(target, issue),
    attempts_failed: attemptsFailed(store, target, issue.id),
    next: startOrWait("drain", held),
  }));

  const inquiry = composeReadingFrontier(ready, inProgress, emptyAttempted).candidates.map((issue) => ({
    id: issue.id,
    handle: handleOf(issue),
    title: issue.title,
    next: startOrWait("inquiry", held),
  }));

  const experiments = composeExperimentFrontier(ready, emptyAttempted).candidates.map((issue) => ({
    id: issue.id,
    handle: handleOf(issue),
    title: issue.title,
    next: startOrWait("experiment", held),
  }));

  const unread_experiments: ReadyItem[] = all
    .filter(
      (issue) =>
        issue.status === "closed" && issue.type === "experiment" && issue.labels.includes(READING_NONE_LABEL),
    )
    .map((issue) => ({
      id: issue.id,
      handle: handleOf(issue),
      title: issue.title,
      next: "read-or-decline" as const,
    }));

  const braked: BrakedItem[] = all
    .filter((issue) => {
      if (isMapContainer(issue)) return false;
      if (issue.labels.includes(GATE_LABEL)) return false;
      if (issue.status === "deferred") return true;
      return (
        issue.status === "open" && issue.labels.some((label) => BRAKE_LABELS.has(label))
      );
    })
    .map((issue) => ({
      id: issue.id,
      handle: handleOf(issue),
      labels: issue.labels.filter((label) => BRAKE_LABELS.has(label)),
      next: issue.status === "deferred" || issue.labels.includes("needs-triage") ? ("run" as const) : ("triage" as const),
    }));

  return {
    target,
    run,
    buckets: {
      leftovers,
      stuck,
      drafts,
      ready: { development, inquiry, experiments },
      unread_experiments,
      braked,
    },
  };
}

/** The Target's attention object. Read-only. Recomputed on every call. */
export function attention(target: string): AttentionSnapshot {
  const root = resolve(target);
  const { config } = loadConfig(root);
  const store = preflightStore(root, config);
  return withReadonly(() => composeAttention(store, root));
}

function formatHuman(snapshot: AttentionSnapshot): string {
  const lines: string[] = [`attention  ${snapshot.target}`];
  if (!snapshot.run.held) lines.push("run        free");
  else {
    const kind = snapshot.run.kind !== undefined ? ` ${snapshot.run.kind}` : "";
    lines.push(`run        held${kind} ${snapshot.run.runId}`);
  }
  const { leftovers, stuck, drafts, ready, unread_experiments, braked } = snapshot.buckets;
  const rows: [string, number, string[]][] = [
    ["leftovers", leftovers.length, leftovers.map((item) => `  ${item.handle}  ${item.domain}  ${item.next}`)],
    [
      "stuck",
      stuck.length,
      stuck.map(
        (item) =>
          `  ${item.handle}  waiting on ${item.waiting_on.map((w) => `${w.handle} (${w.why})`).join(", ")}`,
      ),
    ],
    ["drafts", drafts.length, drafts.map((item) => `  ${item.handle}  ${item.title}`)],
    [
      "ready.development",
      ready.development.length,
      ready.development.map((item) => `  ${item.handle}  ${item.contract}  attempts ${item.attempts_failed}`),
    ],
    ["ready.inquiry", ready.inquiry.length, ready.inquiry.map((item) => `  ${item.handle}  ${item.title}`)],
    [
      "ready.experiments",
      ready.experiments.length,
      ready.experiments.map((item) => `  ${item.handle}  ${item.title}`),
    ],
    [
      "unread_experiments",
      unread_experiments.length,
      unread_experiments.map((item) => `  ${item.handle}  ${item.title}`),
    ],
    ["braked", braked.length, braked.map((item) => `  ${item.handle}  ${item.labels.join(",")}`)],
  ];
  for (const [name, count, body] of rows) {
    lines.push(`${name.padEnd(20)} ${count}`);
    if (count > 0) lines.push(...body);
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const dirAt = argv.indexOf("--dir");
  const target = dirAt === -1 ? process.cwd() : (argv[dirAt + 1] ?? process.cwd());
  const snapshot = attention(target);
  console.log(json ? JSON.stringify(snapshot, null, 2) : formatHuman(snapshot));
}
