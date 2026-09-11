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

/** Its work is not in Main. The reason is on stderr, and the drain goes on. */
export const FAILED = "failed";

/** A drain-end reader's outcome when the run merged nothing: there is no range to report on. */
export const NOTHING_TO_REPORT = "nothing";

/** The token convention: a handler returns the token plus one newline, and node-entry writes it. */
export function nodeLine(token: string): string {
  return `${token}\n`;
}
