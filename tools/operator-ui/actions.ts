/**
 * The operator surface's one write door.
 *
 * A tagged intent goes in; a store write comes out, or a refusal and nothing is written.
 * Comment is `bd comment` on the selected issue. Intra-domain `blocks` is `bd dep add` /
 * `bd dep remove`. Crossing `relates-to` is `bd dep relate` / `bd dep unrelate`. Crossing
 * `discovered-from` is `bd dep add --type discovered-from` / `bd dep remove`. Cross-domain
 * `blocks` and `parent-child` are refused. Close, `reading:`, and unknown intents are refused.
 * `bd human respond` is not used. Close, `reading:`, and domain label acts stay the session's
 * (ADR-0006).
 */

import { addComment, parseCommentBody } from "./comment";
import { domainOf } from "./model";
import type { BdWriteRunner } from "./store";

/** Client-side refusal: the store is not written. */
export class OperatorActionRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OperatorActionRefused";
	}
}

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const ACCEPTED_INTENTS = new Set(["comment", "add-edge", "remove-edge"]);
const EDGE_KINDS = new Set(["blocks", "relates-to", "discovered-from"]);

export type OperatorIssue = {
	id: string;
	type: string;
	dependencies: { id: string; type: string }[];
};

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
	const labels = record.labels;
	if (!Array.isArray(labels)) return;
	for (const label of labels) {
		if (typeof label !== "string") continue;
		if (isClosedToken(label)) throw new OperatorActionRefused("closed is refused");
		if (isReadingToken(label)) throw new OperatorActionRefused("reading: is refused");
	}
}

function refuseUnknownIntent(record: Record<string, unknown>): void {
	if (typeof record.intent !== "string" || !ACCEPTED_INTENTS.has(record.intent.trim())) {
		throw new OperatorActionRefused("unknown intent");
	}
}

function findIssue(issues: ReadonlyArray<OperatorIssue>, id: string): OperatorIssue | undefined {
	return issues.find((issue) => issue.id === id);
}

function pairRelation(
	issues: ReadonlyArray<OperatorIssue>,
	a: string,
	b: string,
): string | undefined {
	const fromA = findIssue(issues, a)?.dependencies.find((dep) => dep.id === b);
	if (fromA) return fromA.type;
	const fromB = findIssue(issues, b)?.dependencies.find((dep) => dep.id === a);
	if (fromB) return fromB.type;
	return undefined;
}

function parseEdgeEnds(record: Record<string, unknown>): { from: string; to: string; type: string } {
	if (typeof record.from !== "string" || !ISSUE_ID.test(record.from.trim())) {
		throw new OperatorActionRefused("edge needs two issue ids");
	}
	if (typeof record.to !== "string" || !ISSUE_ID.test(record.to.trim())) {
		throw new OperatorActionRefused("edge needs two issue ids");
	}
	if (typeof record.type !== "string" || record.type.trim() === "") {
		throw new OperatorActionRefused("edge needs a type");
	}
	const from = record.from.trim();
	const to = record.to.trim();
	const type = record.type.trim();
	if (from === to) throw new OperatorActionRefused("edge needs two issue ids");
	return { from, to, type };
}

function requirePair(
	issues: ReadonlyArray<OperatorIssue>,
	from: string,
	to: string,
): { source: OperatorIssue; target: OperatorIssue } {
	const source = findIssue(issues, from);
	const target = findIssue(issues, to);
	if (source === undefined || target === undefined) {
		throw new OperatorActionRefused("unknown issue");
	}
	return { source, target };
}

function refuseEdgeKind(type: string): void {
	if (type === "parent-child") throw new OperatorActionRefused("parent-child is refused");
	if (!EDGE_KINDS.has(type)) throw new OperatorActionRefused("unknown edge type");
}

function resolveIssues(
	issues: ReadonlyArray<OperatorIssue> | (() => ReadonlyArray<OperatorIssue>),
): ReadonlyArray<OperatorIssue> {
	return typeof issues === "function" ? issues() : issues;
}

function applyAddEdge(
	bd: BdWriteRunner,
	record: Record<string, unknown>,
	issues: ReadonlyArray<OperatorIssue>,
): void {
	const { from, to, type } = parseEdgeEnds(record);
	refuseEdgeKind(type);
	const { source, target } = requirePair(issues, from, to);
	if (type === "blocks" && domainOf(source.type) !== domainOf(target.type)) {
		throw new OperatorActionRefused("cross-domain blocks is refused");
	}
	if (pairRelation(issues, from, to) !== undefined) {
		throw new OperatorActionRefused("pair already has a relation");
	}
	if (type === "relates-to") {
		bd(["dep", "relate", from, to]);
		return;
	}
	if (type === "discovered-from") {
		bd(["dep", "add", to, from, "--type", "discovered-from"]);
		return;
	}
	bd(["dep", "add", to, from]);
}

function applyRemoveEdge(
	bd: BdWriteRunner,
	record: Record<string, unknown>,
	issues: ReadonlyArray<OperatorIssue>,
): void {
	const { from, to, type } = parseEdgeEnds(record);
	refuseEdgeKind(type);
	requirePair(issues, from, to);
	if (pairRelation(issues, from, to) !== type) {
		throw new OperatorActionRefused("no such relation");
	}
	if (type === "relates-to") {
		bd(["dep", "unrelate", from, to]);
		return;
	}
	bd(["dep", "remove", to, from]);
}

/**
 * Apply one tagged write. Accepted intents: `comment`, `add-edge`, `remove-edge`. Anything
 * carrying `closed`, `reading:`, or an unknown intent is refused and the store is not written.
 * Cross-domain `blocks` and `parent-child` are refused the same way.
 */
export function applyOperatorAction(
	bd: BdWriteRunner,
	raw: string,
	issues: ReadonlyArray<OperatorIssue> | (() => ReadonlyArray<OperatorIssue>) = [],
): void {
	const record = asObject(raw);
	refuseClosedOrReading(record);
	refuseUnknownIntent(record);
	const intent = typeof record.intent === "string" ? record.intent.trim() : "";
	if (intent === "add-edge") {
		applyAddEdge(bd, record, resolveIssues(issues));
		return;
	}
	if (intent === "remove-edge") {
		applyRemoveEdge(bd, record, resolveIssues(issues));
		return;
	}
	try {
		const comment = parseCommentBody(raw);
		addComment(bd, comment.id, comment.text);
	} catch (error) {
		if (error instanceof OperatorActionRefused) throw error;
		const message = error instanceof Error ? error.message : String(error);
		if (
			message.startsWith("comment needs") ||
			message.includes("not JSON") ||
			message.includes("not an object")
		) {
			throw new OperatorActionRefused(message);
		}
		throw error;
	}
}
