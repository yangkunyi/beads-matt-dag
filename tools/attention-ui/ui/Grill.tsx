/**
 * The interview on the selected issue. Grill starts one. The current round is already a list of
 * questions; answering is picking a choice, then one comment.
 */
import { useState, type FormEvent } from "react";
import { postOperatorAction } from "../../operator-ui/client.ts";
import type { GrillQuestion, GrillRound } from "../../operator-ui/round.ts";
import { toast } from "sonner";
import { Badge, Button, Input } from "./kit.tsx";
import { cn } from "./cn.ts";

function send(endpoint: string, body: object, done: string, onWrote: () => void): void {
	void postOperatorAction(endpoint, body)
		.then(() => {
			toast.success(done);
			onWrote();
		})
		.catch((error: unknown) => toast.error(error instanceof Error ? error.message : String(error)));
}

function picked(round: GrillRound): Record<number, string> {
	const answers: Record<number, string> = {};
	for (const question of round.questions) {
		if (question.answer !== undefined && question.answer !== "") answers[question.n] = question.answer;
	}
	return answers;
}

export function Grill(props: {
	issueId: string;
	round: GrillRound | null;
	closed: boolean;
	held: boolean;
	endpoint: string | null;
	onWrote: () => void;
}) {
	const canStart = !props.closed && !props.held && props.endpoint !== null;
	if (props.round === null && !canStart) return null;
	return (
		<section id="grill" className="flex flex-col gap-3">
			{props.round === null ? null : (
				<Round
					key={`${props.issueId}:${props.round.n ?? "round"}:${props.round.questions.map((question) => question.answer ?? "").join("|")}`}
					issueId={props.issueId}
					round={props.round}
					closed={props.closed}
					endpoint={props.endpoint}
					onWrote={props.onWrote}
				/>
			)}
			{canStart ? (
				<Button
					data-act="grill"
					variant="outline"
					onClick={() => send(props.endpoint as string, { intent: "grill", ids: [props.issueId] }, "Grill started", props.onWrote)}
				>
					Grill
				</Button>
			) : null}
		</section>
	);
}

function Round(props: {
	issueId: string;
	round: GrillRound;
	closed: boolean;
	endpoint: string | null;
	onWrote: () => void;
}) {
	const { round } = props;
	const [answers, setAnswers] = useState(() => picked(round));
	const complete = round.questions.every((question) => (answers[question.n] ?? "").trim() !== "");
	const canSend = !props.closed && props.endpoint !== null;
	return (
		<form
			id="grill-round"
			data-round={round.n ?? ""}
			className="flex flex-col gap-4"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				if (!canSend || !complete || props.endpoint === null) return;
				send(
					props.endpoint,
					{
						intent: "answer-round",
						id: props.issueId,
						answers: round.questions.map((question) => ({ n: question.n, choice: (answers[question.n] ?? "").trim() })),
					},
					"Answers sent",
					props.onWrote,
				);
			}}
		>
			<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				{round.n === null ? "Round" : `Round ${round.n}`}
			</p>
			{round.questions.map((question) => (
				<Question
					key={question.n}
					question={question}
					value={answers[question.n] ?? ""}
					disabled={!canSend}
					onPick={(choice) => setAnswers((prev) => ({ ...prev, [question.n]: choice }))}
				/>
			))}
			{canSend ? (
				<Button type="submit" disabled={!complete}>
					Send answers
				</Button>
			) : null}
		</form>
	);
}

function Question(props: {
	question: GrillQuestion;
	value: string;
	disabled: boolean;
	onPick: (choice: string) => void;
}) {
	const { question } = props;
	return (
		<fieldset className="flex flex-col gap-2" data-question={question.n}>
			<legend className="text-sm font-medium">
				Q{question.n}. {question.title}
			</legend>
			{question.body === "" ? null : <p className="text-sm text-muted-foreground">{question.body}</p>}
			{question.choices.length === 0 ? (
				<Input value={props.value} disabled={props.disabled} onChange={(event) => props.onPick(event.target.value)} />
			) : (
				<div role="radiogroup" aria-label={question.title} className="flex flex-col gap-1.5">
					{question.choices.map((choice, index) => {
						const selected = props.value === choice;
						return (
							<Button
								key={`${index}:${choice}`}
								type="button"
								role="radio"
								aria-checked={selected}
								variant={selected ? "default" : "outline"}
								disabled={props.disabled}
								className={cn("h-auto w-full justify-start py-2 text-left whitespace-normal")}
								onClick={() => props.onPick(choice)}
							>
								{choice}
								{choice === question.recommended ? <Badge className="ml-auto">recommended</Badge> : null}
							</Button>
						);
					})}
				</div>
			)}
		</fieldset>
	);
}
