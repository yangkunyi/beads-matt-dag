/**
 * The operator surface's one write door.
 *
 * A tagged intent goes in; a store write or a run launch comes out, or a refusal and nothing
 * is written. Comment is `bd comment` on the selected issue. Create captures a `decision`
 * (`deferred`, no gate, `--description`); a map is `pinned`. Optional `from` is `--deps`.
 * Start launches
 * that domain's existing run with the selected ids as the allow-list; grill launches the grill run
 * with the one selected id as its seed. Neither claims, merges, or stamps `closed`. Intra-domain
 * `blocks` is `bd dep add` / `bd dep remove`. Crossing `relates-to`
 * is `bd dep relate` / `bd dep unrelate`. Crossing `discovered-from` is `bd dep add --type
 * discovered-from` / `bd dep remove`. Cross-domain `blocks` and `parent-child` are refused. Triage
 * `wontfix` is a label, not a close. `run-reading` undefer + `set-state leg=research`.
 * `close-map` unpins then closes a pinned decision. Ordinary close and `reading:` stay refused.
 */

import { addComment } from "./comment";
import { createIssue, parseCreateInput } from "./create";
import { deleteIssue } from "./delete";
import { parseAnswerRoundBody, serializeGrillAnswers } from "./round";
import { domainOf } from "./model";
import { planGrill, planStart, type RunLauncher } from "./start";
import type { BdWriteRunner } from "./store";
import { applyTriage, isTriageLabel } from "./triage";

/** Client-side refusal: the store is not written. */
export class OperatorActionRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OperatorActionRefused";
	}
}

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const ACCEPTED_INTENTS = new Set([
	"comment",
	"create",
	"start",
	"grill",
	"add-edge",
	"remove-edge",
	"triage",
	"delete",
	"answer-round",
	"run-reading",
	"close-map",
]);
const EDGE_KINDS = new Set(["blocks", "relates-to", "discovered-from"]);

export type OperatorIssue = {
	id: string;
	type: string;
	status?: string;
	labels?: ReadonlyArray<string>;
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

function refuseIdentityInBody(record: Record<string, unknown>): void {
	if ("author" in record || "actor" in record) {
		throw new OperatorActionRefused("comment author is the door's, not the body's");
	}
}

function refuseCascadeOrForce(record: Record<string, unknown>): void {
	if ("cascade" in record || "force" in record) {
		throw new OperatorActionRefused("cascade and force are refused");
	}
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

function issueIdOf(record: Record<string, unknown>, need: string): string {
	if (typeof record.id !== "string" || !ISSUE_ID.test(record.id.trim())) {
		throw new OperatorActionRefused(need);
	}
	return record.id.trim();
}

function isMapIssue(issue: OperatorIssue): boolean {
	return issue.status === "pinned";
}

function applyRunReading(bd: BdWriteRunner, id: string, issues: ReadonlyArray<OperatorIssue>): void {
	const issue = findIssue(issues, id);
	if (issue === undefined) throw new OperatorActionRefused("unknown issue");
	if (issue.type !== "decision") throw new OperatorActionRefused("run-reading needs a decision");
	if (isMapIssue(issue)) throw new OperatorActionRefused("run-reading refuses a map");
	bd(["update", id, "-s", "open"]);
	bd(["set-state", id, "leg=research", "--reason", "operator run"]);
}

function applyCloseMap(bd: BdWriteRunner, id: string, issues: ReadonlyArray<OperatorIssue>): void {
	const issue = findIssue(issues, id);
	if (issue === undefined) throw new OperatorActionRefused("unknown issue");
	if (issue.type !== "decision" || !isMapIssue(issue)) {
		throw new OperatorActionRefused("close-map needs a pinned decision");
	}
	if (issue.status === "pinned") bd(["update", id, "-s", "open"]);
	bd(["close", id, "--reason", "way is clear"]);
}

function asRefused(error: unknown, prefixes: string[]): never {
	if (error instanceof OperatorActionRefused) throw error;
	const message = error instanceof Error ? error.message : String(error);
	if (
		prefixes.some((prefix) => message.startsWith(prefix)) ||
		message.includes("not JSON") ||
		message.includes("not an object") ||
		message === "non-triage label" ||
		message === "in_progress is refused" ||
		message === "issue has dependents" ||
		message === "unknown issue"
	) {
		throw new OperatorActionRefused(message);
	}
	throw error;
}

/** Create needs the target dir only for call-site compatibility. Start and grill need the graph and a launcher. Edges, run-reading and close-map need the graph. Comment takes the door's actor. */
export type OperatorActionExtras = {
	/** Target root. Create writes the body file here. */
	dir?: string;
	launchRun?: RunLauncher;
	issues?: ReadonlyArray<OperatorIssue>;
	targetHeld?: boolean;
	/** Stamped on `bd comment` as `--actor`. Absent, the store's own fallback applies. */
	actor?: string;
};

/**
 * Apply one tagged write. `create` is a deferred decision (or a pinned map) with `--description`.
 * `run-reading` opens a parked question and stamps `leg:research`. `close-map` unpins then closes.
 */
export function applyOperatorAction(bd: BdWriteRunner, raw: string, extras: OperatorActionExtras = {}): void {
	const record = asObject(raw);
	refuseIdentityInBody(record);
	refuseCascadeOrForce(record);
	refuseClosedOrReading(record);
	refuseNonTriageLabelWrite(record);
	const intent = intentOf(record);
	refuseUnknownIntent(intent);
	if (intent === "create") {
		try {
			const input = parseCreateInput(record);
			const dir = extras.dir;
			if (dir === undefined || dir === "") {
				throw new OperatorActionRefused("create needs a target");
			}
			const source =
				input.from === undefined ? undefined : findIssue(extras.issues ?? [], input.from);
			if (input.from !== undefined && source === undefined) {
				throw new OperatorActionRefused("create needs a known issue");
			}
			const id = createIssue(bd, input, dir, source);
			if (id === "" && source !== undefined) throw new OperatorActionRefused("create needs a source");
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
	if (intent === "grill") {
		const plan = planGrill(record.ids, extras.issues ?? [], extras.targetHeld === true);
		if (!plan.ok) throw new OperatorActionRefused(plan.reason);
		if (extras.launchRun === undefined) throw new Error("grill needs a run launcher");
		extras.launchRun({ kind: plan.kind, workflow: plan.workflow, seed: plan.seed });
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
	if (intent === "delete") {
		if (record.confirm !== true) throw new OperatorActionRefused("delete needs confirm");
		const id = issueIdOf(record, "delete needs an issue id");
		try {
			deleteIssue(bd, id, extras.issues ?? []);
		} catch (error) {
			asRefused(error, ["delete needs"]);
		}
		return;
	}
	if (intent === "comment") {
		const id = issueIdOf(record, "comment needs an issue id");
		if (typeof record.text !== "string" || record.text.trim() === "") {
			throw new OperatorActionRefused("comment needs some text");
		}
		try {
			addComment(bd, id, record.text.trim(), extras.actor);
		} catch (error) {
			asRefused(error, ["comment needs"]);
		}
		return;
	}
	if (intent === "answer-round") {
		try {
			const body = parseAnswerRoundBody(raw);
			addComment(bd, body.id, serializeGrillAnswers(body.answers), extras.actor);
		} catch (error) {
			asRefused(error, ["answer-round needs", "comment needs"]);
		}
		return;
	}
	if (intent === "run-reading") {
		const id = issueIdOf(record, "run-reading needs an issue id");
		try {
			applyRunReading(bd, id, extras.issues ?? []);
		} catch (error) {
			asRefused(error, ["run-reading"]);
		}
		return;
	}
	if (intent === "close-map") {
		const id = issueIdOf(record, "close-map needs an issue id");
		try {
			applyCloseMap(bd, id, extras.issues ?? []);
		} catch (error) {
			asRefused(error, ["close-map"]);
		}
		return;
	}
	const id = issueIdOf(record, "triage needs an issue id");
	if (typeof record.label !== "string" || record.label.trim() === "") {
		throw new OperatorActionRefused("triage needs a label");
	}
	const label = record.label.trim();
	if (!isTriageLabel(label)) throw new OperatorActionRefused("non-triage label");
	try {
		applyTriage(bd, id, label);
	} catch (error) {
		asRefused(error, ["triage needs"]);
	}
}
