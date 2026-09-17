/**
 * The operator surface's one write door.
 *
 * A tagged intent goes in; a store write or a run launch comes out, or a refusal and nothing
 * is written. Comment is `bd comment` on the selected issue. Create requires a type (the domain),
 * lands as `needs-triage` without the gate, and writes a body of handle and prose. Start launches
 * that domain's existing run with the selected ids as the allow-list; it does not claim, merge,
 * or stamp `closed`. Intra-domain `blocks` is `bd dep add` / `bd dep remove`. Crossing `relates-to`
 * is `bd dep relate` / `bd dep unrelate`. Crossing `discovered-from` is `bd dep add --type
 * discovered-from` / `bd dep remove`. Cross-domain `blocks` and `parent-child` are refused. Triage
 * moves one of the five labels, replacing the rest of the family; `wontfix` is a label, not a
 * close. Close, `reading:`, non-triage labels, and unknown intents are refused. `bd human respond`
 * is not used. Close, `reading:`, and other domain label acts stay the session's (ADR-0006).
 */

import { addComment, parseCommentBody } from "./comment";
import { createIssue, parseCreateBody } from "./create";
import { domainOf } from "./model";
import { planStart, type RunLauncher } from "./start";
import type { BdWriteRunner } from "./store";
import { applyTriage, isTriageLabel, parseTriageBody } from "./triage";

/** Client-side refusal: the store is not written. */
export class OperatorActionRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OperatorActionRefused";
	}
}

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const ACCEPTED_INTENTS = new Set(["comment", "create", "start", "add-edge", "remove-edge", "triage"]);
const EDGE_KINDS = new Set(["blocks", "relates-to", "discovered-from"]);

export type OperatorIssue = {
	id: string;
	type: string;
	dependencies?: ReadonlyArray<{ id: string; type: string }>;
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
	if (!ACCEPTED_INTENTS.has(intent)) {
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
	const fromA = findIssue(issues, a)?.dependencies?.find((dep) => dep.id === b);
	if (fromA) return fromA.type;
	const fromB = findIssue(issues, b)?.dependencies?.find((dep) => dep.id === a);
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

/** Create needs the target dir. Start needs the graph (for domain) and a launcher. Edges need the graph. Comment and triage ignore these. */
export type OperatorActionExtras = {
	/** Target root. Create writes the body file here. */
	dir?: string;
	launchRun?: RunLauncher;
	issues?: ReadonlyArray<OperatorIssue>;
	targetHeld?: boolean;
};

/**
 * Apply one tagged write. Accepted intents are `comment` (`bd comment`), `create` (body plus
 * `bd create`), `start` (launch that domain's existing run with the selected ids as the
 * allow-list; does not write the store), `add-edge` / `remove-edge` (store deps), and `triage`
 * (one of the five labels, replacing the rest of the family). Anything carrying `closed`,
 * `reading:`, a non-triage label, or an unknown intent is refused and the store is not written.
 * Cross-domain `blocks` and `parent-child` are refused the same way.
 */
export function applyOperatorAction(bd: BdWriteRunner, raw: string, extras: OperatorActionExtras = {}): void {
	const record = asObject(raw);
	refuseClosedOrReading(record);
	refuseNonTriageLabelWrite(record);
	const intent = intentOf(record);
	refuseUnknownIntent(intent);
	if (intent === "create") {
		try {
			const input = parseCreateBody(raw);
			const dir = extras.dir;
			if (dir === undefined || dir === "") {
				throw new OperatorActionRefused("create needs a target");
			}
			createIssue(bd, input, dir);
		} catch (error) {
			asRefused(error, ["create needs"]);
		}
		return;
	}
	if (intent === "start") {
		const plan = planStart(record.ids, extras.issues ?? [], extras.targetHeld === true);
		if (!plan.ok) throw new OperatorActionRefused(plan.reason);
		if (extras.launchRun === undefined) throw new Error("start needs a run launcher");
		extras.launchRun({ kind: plan.kind, workflow: plan.workflow, allowList: plan.allowList });
		return;
	}
	if (intent === "add-edge") {
		applyAddEdge(bd, record, extras.issues ?? []);
		return;
	}
	if (intent === "remove-edge") {
		applyRemoveEdge(bd, record, extras.issues ?? []);
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
