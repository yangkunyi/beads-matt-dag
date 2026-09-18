/**
 * One seed, one grill turn: the next round onto that issue, or Done, or waiting.
 *
 * This is the grill run's one agent turn. It does not pick a frontier of issues and it does not
 * claim: the seed stays `open` so the operator can answer on it. The turn runs with the store
 * read-only; this node writes the comment afterwards, the same split the reading node uses for a
 * draft answer.
 *
 *   1. read the seed and its comments, and decide whether this turn has work;
 *   2. a last round with no answers is `waiting` — no turn spent, nothing written;
 *   3. a recorded empty frontier is `done` already — no turn spent;
 *   4. otherwise one agent turn under the `grill` role;
 *   5. glossary and ADRs the turn wrote are committed as one path-scoped commit under the Main lock;
 *   6. the round (or Done) becomes a comment on the seed, its first line the marker, naming the
 *      commit when one landed.
 *
 * A first turn that answers Done fails: round 1 is what a grill run against a fresh seed writes.
 * Follow-up issues wait for `/to-tickets`; this node never creates one.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultAgent, type AgentRunner } from "../../scripts/agent.ts";
import { loadConfig, type PackConfig } from "../../scripts/config.ts";
import { commitDocuments, documentSubject } from "../../scripts/doc-commit.ts";
import { bodyPath, issueNames } from "../../scripts/naming.ts";
import { runNode } from "../../scripts/node-entry.ts";
import { DONE, FAILED, ROUND, WAITING, nodeLine } from "../../scripts/node-outcomes.ts";
import { roleAgent } from "../../scripts/roles.ts";
import {
  commentIssue,
  issueById,
  issueComments,
  preflightStore,
  recordFailedAttempt,
  type Store,
  type StoreIssue,
} from "../../scripts/store.ts";
import {
  GRILL_DOC_PATHS,
  OUTCOME_FILE,
  answerKind,
  doneLine,
  grillState,
  roundLine,
  type GrillOutcome,
} from "./rounds.ts";

/** What one grill node needs: where to write, and the runner/seam a test replaces. */
export type GrillOpts = {
  artifactsDir: string;
  /** The Target's config. Unset, the Target's own file is read. */
  config?: PackConfig;
  /** The runner this grilling spends. A run takes the pack's own; a test hands in a stub. */
  runAgent?: AgentRunner;
};

function writeOutcome(artifactsDir: string, outcome: GrillOutcome): void {
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, OUTCOME_FILE), `${JSON.stringify(outcome, null, 2)}\n`);
}

function didNotLand(
  store: Store,
  target: string,
  issue: StoreIssue,
  handle: string,
  artifactsDir: string,
  reason: string,
): string {
  recordFailedAttempt(store, target, issue.id, reason);
  console.error(`${handle}: ${reason}`);
  writeOutcome(artifactsDir, { seed: issue.id, handle, token: FAILED });
  return FAILED;
}

/**
 * Grill one seed: write the next round onto that issue, or record that the frontier is empty.
 * Returns the node's token: `round`, `done`, `waiting`, or `failed`.
 */
export async function grillSeed(target: string, seedId: string, opts: GrillOpts): Promise<string> {
  const config = opts.config ?? loadConfig(target).config;
  const store = preflightStore(target, config);
  const issue = issueById(store, target, seedId);
  const names = issueNames(issue);
  const runAgent = opts.runAgent ?? defaultAgent;
  const comments = issueComments(store, target, issue.id);
  const state = grillState(comments);

  if (state.kind === "empty") {
    writeOutcome(opts.artifactsDir, { seed: issue.id, handle: names.handle, token: DONE });
    console.error(`${names.handle}: frontier already empty`);
    return DONE;
  }
  if (state.kind === "waiting") {
    writeOutcome(opts.artifactsDir, {
      seed: issue.id,
      handle: names.handle,
      token: WAITING,
      round: state.round,
    });
    console.error(`${names.handle}: waiting for answers to round ${state.round}`);
    return WAITING;
  }

  const nextRound = state.kind === "fresh" ? 1 : state.round + 1;
  const turn = await runAgent(
    roleAgent({
      role: "grill",
      args: {
        handle: names.handle,
        bodyPath: bodyPath(target, names),
        seedId: issue.id,
        nextRound,
      },
      cwd: target,
      artifactsDir: opts.artifactsDir,
      config,
    }),
  );
  console.error(`${names.handle}: grill session ${turn.sessionFile}`);

  if (turn.answer.kind !== "text") {
    return didNotLand(
      store,
      target,
      issue,
      names.handle,
      opts.artifactsDir,
      turn.lastError ?? "the grill turn produced no round",
    );
  }

  const answered = answerKind(turn.answer.text);
  if (answered.kind === "done" && state.kind === "fresh") {
    return didNotLand(
      store,
      target,
      issue,
      names.handle,
      opts.artifactsDir,
      "a first turn writes round 1, not Done",
    );
  }
  if (answered.kind === "round" && answered.body === "") {
    return didNotLand(store, target, issue, names.handle, opts.artifactsDir, "the grill turn produced an empty round");
  }

  let commit: string | undefined;
  try {
    const result = await commitDocuments(target, {
      subject: documentSubject("grill", names.handle, names.slug),
      paths: GRILL_DOC_PATHS,
    });
    commit = result.commit;
  } catch (e) {
    return didNotLand(
      store,
      target,
      issue,
      names.handle,
      opts.artifactsDir,
      `the grill's documents could not be committed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (answered.kind === "done") {
    const body = answered.body === "" ? doneLine(commit) : `${doneLine(commit)}\n\n${answered.body}`;
    commentIssue(store, target, issue.id, body);
    writeOutcome(opts.artifactsDir, { seed: issue.id, handle: names.handle, token: DONE });
    console.error(`${names.handle}: frontier empty`);
    return DONE;
  }

  const body = `${roundLine(nextRound, commit)}\n\n${answered.body}`;
  commentIssue(store, target, issue.id, body);
  writeOutcome(opts.artifactsDir, {
    seed: issue.id,
    handle: names.handle,
    token: ROUND,
    round: nextRound,
  });
  console.error(`${names.handle}: wrote round ${nextRound}`);
  return ROUND;
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    seed: true,
    run: async ({ target, seedId, artifactsDir, config }) =>
      nodeLine(await grillSeed(target, seedId, { artifactsDir, config })),
  });
}
