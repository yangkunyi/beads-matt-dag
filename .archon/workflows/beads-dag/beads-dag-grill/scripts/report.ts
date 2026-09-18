/**
 * The grill run's last node: the run's report, and the release of its run lock.
 *
 * One document a human reads afterwards, written by the node and never by a model. It names the seed
 * this run was handed and what the grill turn did — a round, Done, waiting, or a failed attempt —
 * from the run's own `grill-outcome.json` and the store's comments. Nothing here is consulted as
 * state (ADR-0005). This run does not publish development tickets.
 *
 * Being the run's last node, this is also where the run lock is given back by a run that ends
 * normally, exactly as the drain's `summary` and the reading and experiment `report` give it back.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { runNode } from "../../scripts/node-entry.ts";
import { nodeLine, REPORTED } from "../../scripts/node-outcomes.ts";
import { releaseRunLock } from "../../scripts/run-lock.ts";
import { issueById, issueComments, preflightStore } from "../../scripts/store.ts";
import { OUTCOME_FILE, type GrillOutcome } from "./rounds.ts";

/** The run's report, relative to ARTIFACTS_DIR. */
export const REPORT_MD_REL = "report.md";

function readOutcome(artifactsDir: string): GrillOutcome | undefined {
  const path = join(artifactsDir, OUTCOME_FILE);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as GrillOutcome;
}

function reportText(runId: string, seedId: string, outcome: GrillOutcome | undefined, comments: string[]): string {
  const lines = [`# Grill run ${runId}`, "", `Seed: ${outcome?.handle ?? seedId} (${seedId})`];
  if (outcome === undefined) {
    lines.push("Outcome: the grill turn left no record.");
  } else if (outcome.token === "round") {
    lines.push(`Outcome: wrote round ${outcome.round}.`);
  } else if (outcome.token === "done") {
    lines.push("Outcome: the frontier is empty.");
  } else if (outcome.token === "waiting") {
    lines.push(`Outcome: waiting for answers to round ${outcome.round}.`);
  } else {
    lines.push("Outcome: the attempt failed.");
  }
  lines.push("", "Comments on the seed:", comments.length === 0 ? "(none)" : comments.map((c) => `- ${c.split("\n", 1)[0]}`).join("\n"));
  lines.push("");
  return `${lines.join("\n")}\n`;
}

if (import.meta.main) {
  await runNode({
    artifacts: true,
    seed: true,
    run: ({ target, artifactsDir, config, seedId }) => {
      const store = preflightStore(target, config);
      const issue = issueById(store, target, seedId);
      const outcome = readOutcome(artifactsDir);
      const comments = issueComments(store, target, issue.id);
      mkdirSync(artifactsDir, { recursive: true });
      writeFileSync(
        join(artifactsDir, REPORT_MD_REL),
        reportText(basename(artifactsDir), seedId, outcome, comments),
      );
      releaseRunLock(target, artifactsDir);
      return nodeLine(REPORTED);
    },
  });
}
