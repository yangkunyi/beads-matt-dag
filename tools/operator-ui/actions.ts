/**
 * The operator surface's one write door.
 *
 * A tagged intent goes in; a store write comes out, or a refusal and nothing is written.
 * Comment is `bd comment` on the selected issue. Create requires a type (the domain), lands
 * as `needs-triage` without the gate, and writes a body of handle and prose. Triage moves one
 * of the five labels, replacing the rest of the family; `wontfix` is a label, not a close.
 * Close, `reading:`, non-triage labels, and unknown intents are refused. `bd human respond`
 * is not used. Close, `reading:`, and other domain label acts stay the session's (ADR-0006).
 */

import { addComment, parseCommentBody } from "./comment";
import { createIssue, parseCreateBody } from "./create";
import type { BdWriteRunner } from "./store";
import { applyTriage, isTriageLabel, parseTriageBody } from "./triage";

/** Client-side refusal: the store is not written. */
export class OperatorActionRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OperatorActionRefused";
	}
}

function asObject(raw: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new OperatorActionRefused("write is not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new OperatorActionRefused("write is not an object");
	}
	return parsed as Record<string, unknown>;
}

function isReadingToken(value: string): boolean {
	return value === "reading" || value === "reading:" || value.startsWith("reading:");
}

function isClosedToken(value: string): boolean {
	return value === "close" || value === "closed";
}

function isIdeaToken(value: string): boolean {
	return value === "idea" || value.startsWith("idea:");
}

function refuseClosedOrReading(record: Record<string, unknown>): void {
	for (const key of Object.keys(record)) {
		if (isClosedToken(key)) throw new OperatorActionRefused("closed is refused");
		if (isReadingToken(key)) throw new OperatorActionRefused("reading: is refused");
	}
	if (typeof record.intent === "string") {
		if (isClosedToken(record.intent)) throw new OperatorActionRefused("closed is refused");
		if (isReadingToken(record.intent)) throw new OperatorActionRefused("reading: is refused");
	}
	if (record.status === "closed") throw new OperatorActionRefused("closed is refused");
	if (typeof record.label === "string") {
		if (isClosedToken(record.label)) throw new OperatorActionRefused("closed is refused");
		if (isReadingToken(record.label)) throw new OperatorActionRefused("reading: is refused");
	}
	const labels = record.labels;
	if (!Array.isArray(labels)) return;
	for (const label of labels) {
		if (typeof label !== "string") continue;
		if (isClosedToken(label)) throw new OperatorActionRefused("closed is refused");
		if (isReadingToken(label)) throw new OperatorActionRefused("reading: is refused");
	}
}

function refuseNonTriageLabelWrite(record: Record<string, unknown>): void {
	for (const key of Object.keys(record)) {
		if (isIdeaToken(key)) throw new OperatorActionRefused("non-triage label");
	}
	if (typeof record.label === "string" && !isTriageLabel(record.label)) {
		throw new OperatorActionRefused("non-triage label");
	}
	const labels = record.labels;
	if (!Array.isArray(labels)) return;
	for (const label of labels) {
		if (typeof label !== "string") continue;
		if (!isTriageLabel(label)) throw new OperatorActionRefused("non-triage label");
	}
}

function intentOf(record: Record<string, unknown>): string {
	if (typeof record.intent !== "string") {
		throw new OperatorActionRefused("unknown intent");
	}
	return record.intent.trim();
}

function refuseUnknownIntent(intent: string): void {
	if (intent !== "comment" && intent !== "create" && intent !== "triage") {
		throw new OperatorActionRefused("unknown intent");
	}
}

export type OperatorActionOptions = {
	/** Target root. Create writes the body file here. */
	dir?: string;
};

function asRefused(error: unknown, prefixes: string[]): never {
	if (error instanceof OperatorActionRefused) throw error;
	const message = error instanceof Error ? error.message : String(error);
	if (
		prefixes.some((prefix) => message.startsWith(prefix)) ||
		message.includes("not JSON") ||
		message.includes("not an object") ||
		message === "non-triage label"
	) {
		throw new OperatorActionRefused(message);
	}
	throw error;
}

/**
 * Apply one tagged write. Accepted intents are `comment` (`bd comment`), `create` (body plus
 * `bd create`), and `triage` (one of the five labels, replacing the rest of the family).
 * Anything carrying `closed`, `reading:`, a non-triage label, or an unknown intent is refused
 * and the store is not written.
 */
export function applyOperatorAction(
	bd: BdWriteRunner,
	raw: string,
	options: OperatorActionOptions = {},
): void {
	const record = asObject(raw);
	refuseClosedOrReading(record);
	refuseNonTriageLabelWrite(record);
	const intent = intentOf(record);
	refuseUnknownIntent(intent);
	if (intent === "create") {
		try {
			const input = parseCreateBody(raw);
			const dir = options.dir;
			if (dir === undefined || dir === "") {
				throw new OperatorActionRefused("create needs a target");
			}
			createIssue(bd, input, dir);
		} catch (error) {
			asRefused(error, ["create needs"]);
		}
		return;
	}
	if (intent === "comment") {
		try {
			const comment = parseCommentBody(raw);
			addComment(bd, comment.id, comment.text);
		} catch (error) {
			asRefused(error, ["comment needs"]);
		}
		return;
	}
	try {
		const triage = parseTriageBody(raw);
		applyTriage(bd, triage.id, triage.label);
	} catch (error) {
		asRefused(error, ["triage needs"]);
	}
}
