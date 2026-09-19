/**
 * The round a grill turn submits, and the two tools that are its only channel.
 *
 * The grill turn used to answer in prose and the node parsed the shape out of the text, which is where the
 * round's producer and consumer drifted apart: the persona asked for choices inside the body, the surface
 * read `- ` lines, and a round written to the brief parsed to no choices at all. The turn now delivers the
 * round by calling a tool whose parameters are the round's own shape, so the schema is the contract, Pi
 * validates the call before the tool runs, and a malformed round comes back to the model as a tool error it
 * can fix in the same turn. The tools write the accepted round into the artifacts directory; the node renders
 * the comment from that file, which makes the node the only writer of the comment's shape and the consumer's
 * parse exact instead of hopeful.
 *
 * Pi's SDK has no schema option of its own (`structuredOutput` belongs to pi-subagents), but it mounts custom
 * tools, and `defineTool` takes a JSON Schema as its `parameters`: pi-ai compiles it with TypeBox's compiler,
 * which reads plain JSON Schema. So the shape below is written as JSON Schema and the pack needs no schema
 * library - which it could not import anyway, having no node_modules where it runs.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** One question as the turn submits it. The number is the node's: it numbers the questions when it renders. */
export type SubmittedQuestion = {
  title: string;
  body: string;
  choices: string[];
  recommended: string;
};

/** What a turn submitted: a round, or the empty frontier. */
export type Submission =
  | { kind: "round"; questions: SubmittedQuestion[] }
  | { kind: "done"; summary: string };

/** The turn's submission, as the node reads it back. `none` is a turn that called neither tool. */
export type ReadSubmission = Submission | { kind: "none" };

/** Where the tools leave the round and the Done summary, relative to the node's artifacts directory. */
export const ROUND_FILE = "grill-round.json";
export const DONE_FILE = "grill-done.json";

const ONE_LINE = (what: string): string => `${what} must be one line: the node renders it on one line of the comment`;

/**
 * A question's own shape, as JSON Schema. Every string is a single line, because the node renders the round
 * as the surface reads it: the title and the body on the question's line, each choice on its own `- ` line,
 * the recommendation on the `➡️` line. A newline inside any of them would break that rendering, so the
 * schema refuses it rather than the renderer coping with it.
 */
const QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body", "choices", "recommended"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      pattern: "^[^\\n\\r]+$",
      description: "The decision's name, a few words, no newline.",
    },
    body: {
      type: "string",
      minLength: 1,
      pattern: "^[^\\n\\r]+$",
      description: "What is being decided, one line, no newline.",
    },
    choices: {
      type: "array",
      minItems: 2,
      items: { type: "string", minLength: 1, pattern: "^[^\\n\\r]+$" },
      description: "The answers the operator picks between, each one line. At least two.",
    },
    recommended: {
      type: "string",
      minLength: 1,
      pattern: "^[^\\n\\r]+$",
      description: "Your recommended answer, copied exactly from one of the choices.",
    },
  },
} as const;

/** The parameters the model sees for `submit_round`. */
export const ROUND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      items: QUESTION_SCHEMA,
      description: "The whole frontier: every decision whose prerequisites are settled, in one round.",
    },
  },
} as const;

/** The parameters the model sees for `submit_done`. */
export const DONE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: {
      type: "string",
      minLength: 1,
      description: "One or two lines: what the grilling settled, for the issue's record.",
    },
  },
} as const;

/**
 * The refusals the schema cannot state. A recommendation that is not one of the choices is the one that
 * matters: it is what the surface's "recommended" mark compares, so a near-miss would silently render no
 * mark at all - the defect this channel exists to end.
 */
function refused(questions: readonly SubmittedQuestion[]): string | undefined {
  if (questions.length === 0) return "a round needs at least one question";
  for (const [index, question] of questions.entries()) {
    const at = `question ${index + 1}`;
    if (question.choices.length < 2) return `${at} needs at least two choices`;
    if (question.recommended.trim() === "") return `${at} needs a recommended answer`;
    if (!question.choices.includes(question.recommended)) {
      return (
        `${at}'s recommended answer is not one of its choices. It must be copied exactly from ` +
        `[${question.choices.join(" | ")}], but was ${JSON.stringify(question.recommended)}`
      );
    }
    if (question.title.trim() === "") return `${at} needs a title`;
    if (question.body.trim() === "") return `${at} needs a body`;
    for (const field of [question.title, question.body, ...question.choices]) {
      if (/[\n\r]/.test(field)) return ONE_LINE(`${at}'s text`);
    }
  }
  return undefined;
}

/** The tool result shape Pi's tools return: one text block, and a details bag. */
type ToolResult = { content: { type: "text"; text: string }[]; details: Record<string, unknown> };

function accepted(text: string): ToolResult {
  return { content: [{ type: "text", text }], details: {} };
}

/** The submission file a turn left, or none. The node clears these before the turn, so a stale file cannot be read. */
export function readSubmission(artifactsDir: string): ReadSubmission {
  const round = join(artifactsDir, ROUND_FILE);
  if (existsSync(round)) {
    const parsed = JSON.parse(readFileSync(round, "utf8")) as Submission;
    return parsed;
  }
  const done = join(artifactsDir, DONE_FILE);
  if (existsSync(done)) return JSON.parse(readFileSync(done, "utf8")) as Submission;
  return { kind: "none" };
}

/** Drop both submission files, so a turn that submits nothing reads as nothing rather than as last run's round. */
export function clearSubmission(artifactsDir: string): void {
  rmSync(join(artifactsDir, ROUND_FILE), { force: true });
  rmSync(join(artifactsDir, DONE_FILE), { force: true });
}

/** The slice of the SDK these tools need: `defineTool` and nothing else. */
export type RoundToolSdk = { defineTool(definition: unknown): unknown };

/**
 * The grill role's two tools, built for one turn. Mounted only for the grill role (pi-session.ts), because
 * they are the round's channel and no other role has a round to deliver.
 *
 * `submitted` is per-session state, not per-call: a turn that already delivered its round is refused if it
 * tries to deliver a second one, so the node cannot render a round the model changed its mind about. A call
 * that was refused by `refused()` leaves the flag alone, so the model can correct it and submit again.
 */
export function roundTools(sdk: RoundToolSdk, opts: { artifactsDir: string }): unknown[] {
  let submitted = false;
  const submitRound = sdk.defineTool({
    name: "submit_round",
    label: "Submit round",
    description:
      "Deliver this turn's round: every decision whose prerequisites are settled, each with the choices the " +
      "operator picks between and the answer you recommend. The node writes it onto the seed issue as the " +
      "round the operator surface renders. Call this once, when the round is complete.",
    parameters: ROUND_SCHEMA,
    execute: async (_toolCallId: string, params: { questions: SubmittedQuestion[] }): Promise<ToolResult> => {
      if (submitted) throw new Error("this turn already delivered its round");
      const questions = params.questions ?? [];
      const reason = refused(questions);
      if (reason !== undefined) throw new Error(reason);
      const submission: Submission = {
        kind: "round",
        questions: questions.map((question) => ({
          title: question.title,
          body: question.body,
          choices: [...question.choices],
          recommended: question.recommended,
        })),
      };
      writeFileSync(join(opts.artifactsDir, ROUND_FILE), `${JSON.stringify(submission, null, 2)}\n`);
      submitted = true;
      return accepted(
        `round accepted: ${questions.length} question${questions.length === 1 ? "" : "s"}. ` +
          "The node writes it onto the seed; the operator answers on the surface. Nothing else is yours to write.",
      );
    },
  });
  const submitDone = sdk.defineTool({
    name: "submit_done",
    label: "Submit done",
    description:
      "Deliver the end of the grilling: the frontier is empty, every decision is settled. The node records " +
      "Done on the seed issue. Call this once, instead of submit_round, and never on a first turn.",
    parameters: DONE_SCHEMA,
    execute: async (_toolCallId: string, params: { summary: string }): Promise<ToolResult> => {
      if (submitted) throw new Error("this turn already delivered its round");
      const summary = (params.summary ?? "").trim();
      if (summary === "") throw new Error("Done needs a summary of what the grilling settled");
      const submission: Submission = { kind: "done", summary };
      writeFileSync(join(opts.artifactsDir, DONE_FILE), `${JSON.stringify(submission, null, 2)}\n`);
      submitted = true;
      return accepted("Done accepted. The node records it on the seed; follow-up issues wait for /to-tickets.");
    },
  });
  return [submitRound, submitDone];
}
