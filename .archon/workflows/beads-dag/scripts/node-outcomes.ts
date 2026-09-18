/**
 * The Script-node vocabulary the workflows compare. A node's handler returns one token and node-entry
 * writes it verbatim, so the token is the whole byte contract: the token, no other whitespace, and
 * exactly one trailing newline (nodeLine).
 */

/** The opening node's outcome: the run may proceed. */
export const OPENED = "opened";

/** What pick prints with nothing eligible. beads-dag-drain.yaml ends its drain loop on this literal. */
export const EMPTY_PICK = "[]";

/** An issue's outcome: its work is in Main, so the drain may close it. */
export const MERGED = "merged";

/**
 * A reading's outcome: its note landed, its draft answer is on the question, and the question stays
 * `open` - the last word is a session's. The reading executor's counterpart of the drain's `merged`, and
 * like it a result rather than an error: the run goes on to the next question in the batch.
 */
export const LANDED = "landed";

/** Its work is not in Main. The reason is on stderr, and the drain goes on. */
export const FAILED = "failed";

/**
 * An experiment ticket's claim-and-register outcome: the run's name is reserved and the ticket carries
 * the run. The per-ticket node continues from here into the run turn; a caller that stops after the
 * reservation (the claim-register repro) reads this token, and the node itself prints `closed` or
 * `failed` once the completeness check has run.
 */
export const REGISTERED = "registered";

/**
 * An experiment ticket's outcome: its record is complete, the unread marker is on it, and the ticket
 * is `closed`. The experiment executor's counterpart of the drain's `merged` and the reading's
 * `landed` - a result rather than an error, so the run goes on to the next ticket in the batch.
 */
export const CLOSED = "closed";

/**
 * A grill turn's outcome: the next round is a comment on the seed. The grill run's counterpart of the
 * reading's `landed` - a result rather than an error, and the run stops for answers.
 */
export const ROUND = "round";

/**
 * A grill turn's outcome: the frontier is empty, recorded as `Done` on the seed. Follow-up issues still
 * wait for `/to-tickets`; this run does not publish them.
 */
export const DONE = "done";

/**
 * A grill turn's outcome: the last round is on the seed and no answers have landed, so this turn wrote
 * nothing. A later turn that sees answers writes the next round or Done.
 */
export const WAITING = "waiting";

/** A drain-end reader's outcome when the run merged nothing: there is no range to report on. */
export const NOTHING_TO_REPORT = "nothing";

/**
 * A run's outcome when it wrote the report a human reads afterwards: the drain's summary for the range
 * it merged, the reading executor's `report` for the batch it read, and the experiment executor's
 * `report` for attempted, closed-on-record, and failed. Each writes its artifact unconditionally - a
 * run that did nothing is a run the report has to be able to describe.
 */
export const REPORTED = "reported";

/** The token convention: a handler returns the token plus one newline, and node-entry writes it. */
export function nodeLine(token: string): string {
  return `${token}\n`;
}
