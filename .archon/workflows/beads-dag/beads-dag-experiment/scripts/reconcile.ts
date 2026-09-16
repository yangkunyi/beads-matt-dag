/**
 * The repair: an experiment ticket a killed run left running, put back on the frontier.
 *
 * A run claims an experiment ticket by assignment and registers the run's name before anything executes.
 * A run killed in between - or any time after - leaves the ticket `in_progress`, and the store's own
 * ready answer will never offer it again, so a later `open` puts it back to `open` with an ordinary
 * failed-attempt comment (the flow's failure event: the reason as a comment, the status back to the only
 * set that can start).
 *
 * Unlike the drain's repair, there is nothing to read off git that could tell a landed run from an
 * unlanded one: this domain's landing is a **store** event (the record is complete and the ticket
 * closed), and a ticket still `in_progress` is by definition one whose close never happened. So the
 * repair has exactly one direction here, and the residual is the obvious one: a run killed between
 * writing its record and closing the ticket is reopened, and the next run does the work again. That
 * costs a run and is visible; the alternative is a second state to maintain for a window nobody can
 * observe.
 *
 * Only experiment tickets are repaired. An `in_progress` implementation issue belongs to the drain and a
 * question to whoever claimed it (the wayfinder operator); reopening either would fight its owner, and a
 * close would release work across a domain boundary the flow keeps closed. Each one the repair left
 * alone is named on stderr rather than silently skipped.
 */
import { inProgressIssues, recordFailedAttempt, type Store } from "../../scripts/store.ts";
import { EXPERIMENT_TYPE } from "./ticket.ts";

/** What one leftover was resolved to: a released claim, or a status this executor leaves to its owner. */
export type ExperimentRepair = {
  id: string;
  handle: string | undefined;
  outcome: "released" | "left-alone";
  reason: string;
};

/**
 * The reason a leftover is put back to `open` with, from the one fact the repair read: the ticket was in
 * progress. One builder, so the executor and a later report cannot spell it differently.
 */
export function leftoverReason(): string {
  return "leftover in progress and no recorded result closed the issue";
}

/**
 * Put every experiment ticket the store holds `in_progress` back on the frontier, and leave every other
 * ticket's status where its owner left it. Returns what each leftover was resolved to, in the store's
 * order, so the opening node can say so.
 */
export function reconcileExperiments(target: string, store: Store): ExperimentRepair[] {
  const repairs: ExperimentRepair[] = [];
  for (const issue of inProgressIssues(store, target)) {
    const label = issue.handle ?? issue.id;
    if (issue.type !== EXPERIMENT_TYPE) {
      const reason = `a ${issue.type} issue's status is not this executor's to repair: it claims experiment tickets only`;
      console.error(`${label}: left alone: ${reason}`);
      repairs.push({ id: issue.id, handle: issue.handle, outcome: "left-alone", reason });
      continue;
    }
    const reason = leftoverReason();
    // The claim was an assignment, so giving it back clears the status and the name in one update.
    recordFailedAttempt(store, target, issue.id, reason, { giveBackTheClaim: true });
    console.error(`${label}: ${reason}`);
    repairs.push({ id: issue.id, handle: issue.handle, outcome: "released", reason });
  }
  return repairs;
}
