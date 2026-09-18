/**
 * The grill run's comment markers, and the state a later turn reads off them.
 *
 * A round is a comment whose first line is `round N` (optionally naming the commit that carried
 * glossary or ADRs). Done is a comment whose first line is `Done`. Answers are the comments after the
 * latest round that are neither a round, nor Done, nor a failed attempt. The record is the comment
 * thread: nothing here writes a label, and a later turn of the same run kind recomputes from it.
 */
import { DONE, FAILED, ROUND, WAITING } from "../../scripts/node-outcomes.ts";

/** The first line of a round comment, as the node writes it and as a later turn reads it back. */
const ROUND_LINE = /^round (\d+)(?: \(commit ([0-9a-f]{7,64})\))?$/;

/** The first line of a Done comment: the frontier is empty. */
const DONE_LINE = /^Done(?: \(commit ([0-9a-f]{7,64})\))?$/;

/** A failed attempt, the same prefix the rest of the pack writes. */
const FAILURE_LINE = /^attempt \d+ failed:/;

/** The glossary and ADRs a grill turn may crystallise, relative to the Target. */
export const GRILL_DOC_PATHS = ["docs/CONTEXT.md", "docs/adr"];

/** The run's own record of this turn, relative to ARTIFACTS_DIR. */
export const OUTCOME_FILE = "grill-outcome.json";

/** What one grill turn did, for the report to read without re-deriving it from comments. */
export type GrillOutcome = {
  seed: string;
  handle: string;
  token: typeof ROUND | typeof DONE | typeof WAITING | typeof FAILED;
  /** The round this turn wrote, when the token is `round`. */
  round?: number;
};

export type GrillState =
  | { kind: "fresh" }
  | { kind: "waiting"; round: number }
  | { kind: "answered"; round: number }
  | { kind: "empty" };

function firstLine(comment: string): string {
  return (comment.split("\n", 1)[0] ?? "").trim();
}

function parseRound(comment: string): number | undefined {
  const m = ROUND_LINE.exec(firstLine(comment));
  return m === null ? undefined : Number(m[1]);
}

function isDone(comment: string): boolean {
  return DONE_LINE.test(firstLine(comment));
}

function isFailure(comment: string): boolean {
  return FAILURE_LINE.test(firstLine(comment));
}

/** An operator answer: anything after a round that is not another round, Done, or a failed attempt. */
function isAnswer(comment: string): boolean {
  return parseRound(comment) === undefined && !isDone(comment) && !isFailure(comment);
}

/**
 * The grilling so far, read off the seed's comments oldest first. A later turn that sees answers is
 * `answered`; one that does not is `waiting`; a recorded empty frontier is `empty`; no round yet is
 * `fresh`.
 */
export function grillState(comments: readonly string[]): GrillState {
  let lastRound: number | undefined;
  let lastRoundIndex = -1;
  let seenDone = false;
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i]!;
    const n = parseRound(comment);
    if (n !== undefined) {
      lastRound = n;
      lastRoundIndex = i;
      seenDone = false;
      continue;
    }
    if (isDone(comment)) seenDone = true;
  }
  if (seenDone) return { kind: "empty" };
  if (lastRound === undefined) return { kind: "fresh" };
  const after = comments.slice(lastRoundIndex + 1);
  if (after.some(isAnswer)) return { kind: "answered", round: lastRound };
  return { kind: "waiting", round: lastRound };
}

/** The first line of a round comment. The commit is present when this turn landed documents. */
export function roundLine(n: number, commit?: string): string {
  return commit === undefined ? `round ${n}` : `round ${n} (commit ${commit})`;
}

/** The first line of a Done comment. The commit is present when this turn landed documents. */
export function doneLine(commit?: string): string {
  return commit === undefined ? "Done" : `Done (commit ${commit})`;
}

/**
 * What the agent answered: a round body, or Done. A leading `round N` the agent included is stripped
 * so the node owns the number. A first line `Done` is Done even with more text under it.
 */
export function answerKind(text: string): { kind: "round"; body: string } | { kind: "done"; body: string } {
  const trimmed = text.trim();
  const first = firstLine(trimmed);
  if (DONE_LINE.test(first)) {
    const rest = trimmed.split("\n").slice(1).join("\n").trim();
    return { kind: "done", body: rest };
  }
  const rest = parseRound(trimmed) !== undefined ? trimmed.split("\n").slice(1).join("\n").trim() : trimmed;
  return { kind: "round", body: rest };
}
