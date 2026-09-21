/**
 * Capture a decision from the operator surface, without a session.
 *
 * Always type `decision`, never the drain gate. A question is `deferred`. A map is
 * `pinned` (handle `<feature>/map`) and is not a ticket. Prose is `--description` on
 * the bead (ADR-0005). Optional `from` is `--deps` on create: `blocks` when that
 * issue is inquiry, `discovered-from` when it is development or experiment.
 */

import { domainOf } from "./model";
import type { BdWriteRunner } from "./store";

const FEATURE = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const DECISION_TYPE = "decision";

export type CreateInput = {
	feature: string;
	title: string;
	prose: string;
	from?: string;
	/** A map is a container, not a question. */
	map?: boolean;
};

export type GrowSource = {
	id: string;
	type: string;
};

function slugFromTitle(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "");
}

function nextNumber(used: number[]): string {
	const max = used.reduce((m, n) => (n > m ? n : m), 0);
	return String(max + 1).padStart(2, "0");
}

function listHandles(bd: BdWriteRunner): string[] {
	const stdout = bd(["list", "--all", "--json", "--limit", "0"]);
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		throw new Error("list did not answer with JSON");
	}
	if (!Array.isArray(parsed)) {
		throw new Error("list answered with something that is not a list of issues");
	}
	const handles: string[] = [];
	for (const entry of parsed) {
		if (typeof entry !== "object" || entry === null) continue;
		const record = entry as Record<string, unknown>;
		const metadata =
			typeof record.metadata === "object" && record.metadata !== null
				? (record.metadata as Record<string, unknown>)
				: {};
		if (typeof metadata.handle === "string" && metadata.handle !== "") {
			handles.push(metadata.handle);
		}
	}
	return handles;
}

function numbersFromHandles(feature: string, handles: readonly string[]): number[] {
	const prefix = `${feature}/`;
	const used: number[] = [];
	for (const handle of handles) {
		if (!handle.startsWith(prefix)) continue;
		const rest = handle.slice(prefix.length);
		if (rest === "map") continue;
		if (!/^\d+$/.test(rest)) continue;
		used.push(Number(rest));
	}
	return used;
}

/**
 * The capture fields, validated. Throws `create needs …` naming the field that is missing or malformed,
 * so the door refuses a thin create before it looks at anything else.
 */
export function parseCreateInput(record: Record<string, unknown>): CreateInput {
	const feature = typeof record.feature === "string" ? record.feature.trim() : "";
	if (!FEATURE.test(feature)) throw new Error("create needs a feature");
	const title = typeof record.title === "string" ? record.title.trim().replace(/\s+/g, " ") : "";
	if (title === "" || !SLUG.test(slugFromTitle(title))) throw new Error("create needs a title");
	const fromRaw = typeof record.from === "string" ? record.from.trim() : "";
	if (fromRaw !== "" && !ISSUE_ID.test(fromRaw)) throw new Error("create needs a source");
	return {
		feature,
		title,
		prose: typeof record.prose === "string" ? record.prose : "",
		from: fromRaw === "" ? undefined : fromRaw,
		map: record.map === true,
	};
}

/** Inquiry hangs with `blocks`; a development or experiment completion hangs with `discovered-from`. */
export function growEdgeType(sourceType: string): "blocks" | "discovered-from" {
	return domainOf(sourceType) === "inquiry" ? "blocks" : "discovered-from";
}

function depFlag(source: GrowSource): string {
	return growEdgeType(source.type) === "discovered-from" ? `discovered-from:${source.id}` : source.id;
}

/** Hang the new decision off the source. Same-domain inquiry is a gate; a crossing is provenance. */
export function attachGrownFrom(bd: BdWriteRunner, id: string, source: GrowSource): void {
	if (id === "" || id === source.id) throw new Error("create needs a source");
	if (growEdgeType(source.type) === "discovered-from") {
		bd(["dep", "add", id, source.id, "--type", "discovered-from"]);
		return;
	}
	bd(["dep", "add", id, source.id]);
}

/**
 * Create the decision. Returns the new bead id (`bd create --silent`).
 * `dir` is accepted for call-site compatibility; capture no longer writes a sidecar file.
 */
export function createIssue(bd: BdWriteRunner, input: CreateInput, _dir = "", source?: GrowSource): string {
	const { feature, title, prose, map } = parseCreateInput({ ...input });
	const handles = listHandles(bd);
	const handle =
		map === true
			? `${feature}/map`
			: `${feature}/${nextNumber(numbersFromHandles(feature, handles))}`;
	const slug = map === true ? "map" : slugFromTitle(title);
	if (map === true && handles.includes(handle)) throw new Error("create needs an unused map");
	const heading = title.trim().replace(/\s+/g, " ");
	const description = prose.trim() === "" ? heading : prose.trim();
	const args = [
		"create",
		title,
		"--type",
		DECISION_TYPE,
		"--silent",
		"--metadata",
		JSON.stringify({ handle, slug }),
		"--description",
		description,
	];
	if (source !== undefined && source.id !== "") {
		args.push("--deps", depFlag(source));
	}
	const stdout = bd(args);
	const id = stdout.trim().split(/\s+/)[0] ?? "";
	if (id === "") throw new Error("create needs a bead");
	bd(["update", id, "-s", map === true ? "pinned" : "deferred"]);
	return id;
}
