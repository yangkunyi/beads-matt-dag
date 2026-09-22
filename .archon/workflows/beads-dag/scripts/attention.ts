/**
 * Attention: the Target's one navigator, as one ordered list.
 *
 * A session boots from this JSON and takes the first row. It writes nothing: the store runs read-only
 * for the whole call, and the run lock is inspected, never taken. Development, inquiry and experiment
 * ready sets are each domain's existing dry frontier. Order is the priority: leftovers, then stuck,
 * drafts, ready work, unread results, and deferred questions last. There are no bucket keys.
 */
import { resolve } from "node:path";
import { DRAFT_LABEL } from "../beads-dag-read/scripts/reading.ts";
import { composeReadingFrontier } from "../beads-dag-inquiry/scripts/frontier.ts";
import { isGrillClaim, isReadingClaim } from "../beads-dag-inquiry/scripts/leftovers.ts";
import { loadConfig } from "./config.ts";
import { contractPresence } from "./contract.ts";
import { composeDevelopmentFrontier, GATE_LABEL, isDevelopmentLeftover } from "./dev-frontier.ts";
import { blockingWaitIds, issueDomain, type IssueDomain } from "./domains.ts";
import { composeExperimentFrontier, isExperimentLeftover } from "./experiment-frontier.ts";
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

export type AttentionNext =
  | "wait"
  | "drain"
  | "inquiry"
  | "experiment"
  | "grill"
  | "release"
  | "accept-draft"
  | "read-result"
  | "unstick";

export type AttentionRun = { held: false } | { held: true; runId: string; kind?: RunKind };

export type WorkItem = {
  id: string;
  handle: string;
  title: string;
  next: AttentionNext;
  type: string;
  status: string;
  domain?: IssueDomain;
  waiting_on?: { handle: string; why: "wontfix" | "ungated" }[];
  contract?: "present" | "missing";
  attempts_failed?: number;
};

export type AttentionSnapshot = {
  target: string;
  run: AttentionRun;
  work: WorkItem[];
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

function titleOf(issue: StoreIssue): string {
  return issue.title;
}

/** Next for an in-progress leftover: the executor whose leftover classify matches. */
function leftoverNext(issue: StoreIssue): AttentionNext {
  if (isExperimentLeftover(issue)) return "experiment";
  if (isGrillClaim(issue) && !isReadingClaim(issue)) return "grill";
  if (isReadingClaim(issue)) return "inquiry";
  if (isDevelopmentLeftover(issue)) return "drain";
  return "inquiry";
}

function startOrWait(next: AttentionNext, held: boolean): AttentionNext {
  return held ? "wait" : next;
}

function blockerWhy(blocker: StoreIssue): "wontfix" | "ungated" | undefined {
  if (blocker.status === "closed") return undefined;
  if (blocker.labels.includes(WONTFIX)) return "wontfix";
  if (issueDomain(blocker) === "development" && !blocker.labels.includes(GATE_LABEL)) return "ungated";
  return undefined;
}

function developmentContract(issue: StoreIssue): "present" | "missing" {
  return contractPresence(issue.description ?? "", "development");
}

function attemptsFailed(store: Store, target: string, id: string): number {
  try {
    return recordedFailures(store, target, id).length;
  } catch {
    return 0;
  }
}

function row(issue: StoreIssue, next: AttentionNext, extra: Partial<WorkItem> = {}): WorkItem {
  return {
    id: issue.id,
    handle: handleOf(issue),
    title: titleOf(issue),
    next,
    type: issue.type,
    status: issue.status,
    domain: issueDomain(issue),
    ...extra,
  };
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

  const leftovers: WorkItem[] = inProgress.map((issue) =>
    row(issue, startOrWait(leftoverNext(issue), held)),
  );

  const stuck: WorkItem[] = [];
  for (const issue of all) {
    if (issue.status !== "open" || leftoverIds.has(issue.id)) continue;
    const waiting_on: NonNullable<WorkItem["waiting_on"]> = [];
    for (const blockerId of blockingWaitIds(issue)) {
      const blocker = byId.get(blockerId);
      if (blocker === undefined) continue;
      const why = blockerWhy(blocker);
      if (why === undefined) continue;
      waiting_on.push({ handle: handleOf(blocker), why });
    }
    if (waiting_on.length === 0) continue;
    stuck.push(row(issue, "unstick", { waiting_on }));
  }

  const drafts: WorkItem[] = all
    .filter((issue) => issue.status === "open" && issue.type === "decision" && issue.labels.includes(DRAFT_LABEL))
    .map((issue) => row(issue, "accept-draft"));

  const development = composeDevelopmentFrontier(ready, emptyAttempted).candidates.map((issue) =>
    row(issue, startOrWait("drain", held), {
      contract: developmentContract(issue),
      attempts_failed: attemptsFailed(store, target, issue.id),
    }),
  );

  const inquiry = composeReadingFrontier(ready, inProgress, emptyAttempted).candidates.map((issue) =>
    row(issue, startOrWait("inquiry", held)),
  );

  const experiments = composeExperimentFrontier(ready, emptyAttempted).candidates.map((issue) =>
    row(issue, startOrWait("experiment", held)),
  );

  const unread = all
    .filter(
      (issue) =>
        issue.status === "closed" && issue.type === "experiment" && issue.labels.includes(READING_NONE_LABEL),
    )
    .map((issue) => row(issue, "read-result"));

  const parked = all
    .filter((issue) => issue.status === "deferred")
    .map((issue) => row(issue, "release"));

  return {
    target,
    run,
    work: [...leftovers, ...stuck, ...drafts, ...development, ...inquiry, ...experiments, ...unread, ...parked],
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
  lines.push(`work               ${snapshot.work.length}`);
  for (const item of snapshot.work) {
    const wait =
      item.waiting_on === undefined
        ? ""
        : `  waiting on ${item.waiting_on.map((w) => `${w.handle} (${w.why})`).join(", ")}`;
    lines.push(`  ${item.handle}  ${item.next}${wait}`);
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
