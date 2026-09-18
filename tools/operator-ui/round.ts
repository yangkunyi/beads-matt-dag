/**
 * A grill round as data: the questions a run put to the operator, each with its choices and the
 * run's recommended answer, plus the operator's answers once they are in the store.
 *
 * The round is a comment in the shape `skills/grill` asks the agent for: one
 * `❓ **Q<n>** - **<title>**: <body>` line per question, its `- <choice>` lines under it, and
 * `➡️ <recommended>`. A run may open the comment with its own `round N` line; that line is ignored
 * here, because what the surface needs is the questions. Answers are another comment, one
 * `Q<n>: <choice>` line each.
 *
 * The thread is the record: nothing here writes a label or a file, and a re-read recomputes the
 * current round and its answers from the comments alone.
 */

/** The part of a store comment a round is read from. Structurally what `model.ts` hands over. */
export type RoundComment = {
	id: string;
	author: string;
	createdAt: string;
	text: string;
};

export type GrillQuestion = {
	n: number;
	title: string;
	body: string;
	choices: string[];
	recommended: string;
	/** The operator's answer, when a later comment carries one. */
	answer?: string;
};

export type GrillRound = {
	questions: GrillQuestion[];
};

export type GrillAnswer = {
	n: number;
	choice: string;
};

const QUESTION_LINE = /^❓\s*\*\*Q(\d+)\*\*\s*-\s*\*\*(.+?)\*\*\s*:?\s*(.*)$/;
const CHOICE_LINE = /^[-*]\s+(.+)$/;
const RECOMMENDED_LINE = /^➡\uFE0F?\s*(.*)$/;
const ANSWER_LINE = /^Q(\d+)\s*:\s*(.+)$/;

/** True when the comment carries questions: a round, not conversation. */
export function isRoundComment(text: string): boolean {
	return text.split("\n").some((line) => QUESTION_LINE.test(line.trim()));
}

function parseQuestions(text: string): GrillQuestion[] {
	const questions: GrillQuestion[] = [];
	let current: GrillQuestion | null = null;
	let seenChoice = false;
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		const question = QUESTION_LINE.exec(line);
		if (question !== null) {
			current = {
				n: Number(question[1]),
				title: (question[2] ?? "").trim(),
				body: (question[3] ?? "").trim(),
				choices: [],
				recommended: "",
			};
			questions.push(current);
			seenChoice = false;
			continue;
		}
		if (current === null) continue;
		const recommended = RECOMMENDED_LINE.exec(line);
		if (recommended !== null) {
			current.recommended = (recommended[1] ?? "").trim();
			continue;
		}
		const choice = CHOICE_LINE.exec(line);
		if (choice !== null) {
			current.choices.push((choice[1] ?? "").trim());
			seenChoice = true;
			continue;
		}
		// Prose before the choices is still the question; prose after them belongs to the round, not
		// to the question, so it is left out of the body the surface shows.
		if (line !== "" && !seenChoice) {
			current.body = current.body === "" ? line : `${current.body} ${line}`;
		}
	}
	return questions.filter((question) => Number.isInteger(question.n) && question.n > 0);
}

function parseAnswers(text: string): GrillAnswer[] {
	const answers: GrillAnswer[] = [];
	for (const raw of text.split("\n")) {
		const match = ANSWER_LINE.exec(raw.trim());
		if (match === null) continue;
		answers.push({ n: Number(match[1]), choice: (match[2] ?? "").trim() });
	}
	return answers;
}

/** The round as the agent is asked to write it: questions, their choices, and the recommendation. */
export function serializeGrillRound(questions: readonly GrillQuestion[]): string {
	const blocks = questions.map((question) => {
		const lines = [`❓ **Q${question.n}** - **${question.title}**: ${question.body}`.trimEnd()];
		if (question.choices.length > 0) {
			lines.push("");
			for (const choice of question.choices) lines.push(`- ${choice}`);
		}
		if (question.recommended !== "") {
			lines.push("");
			lines.push(`➡️ ${question.recommended}`);
		}
		return lines.join("\n");
	});
	return `${blocks.join("\n\n")}\n`;
}

/** The operator's answers as the door writes them: one comment, one line per question. */
export function serializeGrillAnswers(answers: readonly GrillAnswer[]): string {
	return answers.map((answer) => `Q${answer.n}: ${answer.choice}`).join("\n");
}

/**
 * The current round and the conversation around it, read off an issue's comments oldest first. The
 * latest comment carrying questions is the round; answers are read from every comment after it. The
 * round comment is not conversation — it is the round, shown as choices, not as a wall of markdown.
 */
export function roundFromComments(comments: readonly RoundComment[]): {
	round: GrillRound | null;
	conversation: RoundComment[];
} {
	let roundIndex = -1;
	for (let index = comments.length - 1; index >= 0; index -= 1) {
		const comment = comments[index];
		if (comment !== undefined && isRoundComment(comment.text)) {
			roundIndex = index;
			break;
		}
	}
	if (roundIndex === -1) return { round: null, conversation: comments.map((comment) => ({ ...comment })) };
	const questions = parseQuestions(comments[roundIndex]?.text ?? "");
	if (questions.length === 0) return { round: null, conversation: comments.map((comment) => ({ ...comment })) };
	const answers = new Map<number, string>();
	for (const comment of comments.slice(roundIndex + 1)) {
		for (const answer of parseAnswers(comment.text)) answers.set(answer.n, answer.choice);
	}
	for (const question of questions) {
		const answer = answers.get(question.n);
		if (answer !== undefined && answer !== "") question.answer = answer;
	}
	return {
		round: { questions },
		conversation: comments.filter((_, index) => index !== roundIndex).map((comment) => ({ ...comment })),
	};
}

/** The `answer-round` intent's body, validated. Throws `answer-round needs …` naming what is wrong. */
export function parseAnswerRoundBody(raw: string): { id: string; answers: GrillAnswer[] } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("answer-round body is not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("answer-round body is not an object");
	}
	const record = parsed as Record<string, unknown>;
	const id = typeof record.id === "string" ? record.id.trim() : "";
	if (id === "") throw new Error("answer-round needs an issue id");
	if (!Array.isArray(record.answers) || record.answers.length === 0) {
		throw new Error("answer-round needs answers");
	}
	const answers: GrillAnswer[] = [];
	for (const entry of record.answers) {
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
			throw new Error("answer-round needs answers");
		}
		const item = entry as Record<string, unknown>;
		const n = typeof item.n === "number" ? item.n : Number.NaN;
		const choice = typeof item.choice === "string" ? item.choice.trim() : "";
		if (!Number.isInteger(n) || n <= 0 || choice === "") throw new Error("answer-round needs answers");
		answers.push({ n, choice });
	}
	return { id, answers };
}
