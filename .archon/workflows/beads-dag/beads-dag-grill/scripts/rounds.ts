/**
 * The grill run's comment markers, and the state a later turn reads off them.
 *
 * A round is a comment whose first line is `round N` (optionally naming the commit that carried
 * glossary or ADRs), then one block per question: the question's line, its `- ` choices, and the
 * recommendation on the `➡️` line. Done is a comment whose first line is `Done`. An answer is a comment
 * whose every non-empty line is `Q<n>: <choice>` - the shape the operator surface writes and the only
 * shape the run reads as an answer, so a chat reply on the same issue does not consume a round. The record
 * is the comment thread: nothing here writes a label, and a later turn of the same run kind recomputes
 * from it.
 *
 * The node is the only writer of a round comment (renderRound below, from the turn's submitted round), which
 * is what makes the surface's parse of it exact rather than a guess about what the model wrote.
 */
import { DONE, FAILED, ROUND, WAITING } from "../../scripts/node-outcomes.ts";
import type { SubmittedQuestion } from "../../scripts/round-tool.ts";

/** The first line of a round comment, as the node writes it and as a later turn reads it back. */
const ROUND_LINE = /^round (\d+)(?: \(commit ([0-9a-f]{7,64})\))?$/;

/** The first line of a Done comment: the frontier is empty. */
const DONE_LINE = /^Done(?: \(commit ([0-9a-f]{7,64})\))?$/;

/** A failed attempt, the same prefix the rest of the pack writes. */
const FAILURE_LINE = /^attempt \d+ failed:/;

/** One answer line, as the surface writes it and as this reads it back. */
const ANSWER_LINE = /^Q\d+: \S/;

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

/**
 * An operator answer: a comment whose every non-empty line is `Q<n>: <choice>`. The surface writes exactly
 * this and nothing else, so anything else on the issue is conversation - and conversation must not be read
 * as an answer, or a later turn spends itself writing round N+1 having read none.
 */
function isAnswer(comment: string): boolean {
  if (parseRound(comment) !== undefined || isDone(comment) || isFailure(comment)) return false;
  const lines = comment
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return lines.length > 0 && lines.every((line) => ANSWER_LINE.test(line));
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
 * The round as the node writes it, from the round the turn submitted. The question numbers are the node's:
 * the turn submits an ordered frontier and never numbers it itself, so a re-render of the same round is
 * byte-identical and the surface's `Q<n>` always matches the answer's.
 */
export function renderRound(n: number, questions: readonly SubmittedQuestion[], commit?: string): string {
  const blocks = questions.map((question, index) => {
    const lines = [`❓ **Q${index + 1}** - **${question.title}**: ${question.body}`, ""];
    for (const choice of question.choices) lines.push(`- ${choice}`);
    lines.push("", `➡️ ${question.recommended}`);
    return lines.join("\n");
  });
  return `${roundLine(n, commit)}\n\n${blocks.join("\n\n")}\n`;
}
