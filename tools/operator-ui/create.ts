/**
 * Create an issue from the operator surface, without a session.
 *
 * Type is required and is the domain. Identity labels go on at create (experiments:
 * `experiment`; inquiry and development: type is enough). Triage is `needs-triage`
 * only — never the gate. The operator supplies the feature; this module allocates
 * the next unused NN and a slug from the title. The bead carries `handle` and
 * `slug`. The body is handle and prose, no status. The write door parses the tagged
 * JSON and calls here.
 */

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BdWriteRunner } from "./store";

const FEATURE = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const TYPE = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type CreateInput = {
	type: string;
	feature: string;
	title: string;
	prose: string;
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

function labelsForCreate(type: string): string[] {
	const labels = ["needs-triage"];
	if (type === "experiment") labels.push("experiment");
	return labels;
}

function issueBody(handle: string, title: string, prose: string): string {
	const heading = title.trim().replace(/\s+/g, " ");
	const text = prose.trim() === "" ? heading : prose.trim();
	return `# ${handle} — ${heading}\n\n${text}\n`;
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
		if (!/^\d+$/.test(rest)) continue;
		used.push(Number(rest));
	}
	return used;
}

function numbersFromBodies(dir: string, feature: string): number[] {
	const folder = join(dir, ".scratch", feature, "issues");
	let names: string[];
	try {
		names = readdirSync(folder);
	} catch {
		return [];
	}
	const used: number[] = [];
	for (const name of names) {
		const match = /^(\d+)-.+\.md$/.exec(name);
		const raw = match?.[1];
		if (raw === undefined) continue;
		used.push(Number(raw));
	}
	return used;
}

/**
 * The create fields, validated. Throws `create needs …` naming the field that is missing or malformed,
 * so the door refuses a thin create before it looks at anything else.
 */
export function parseCreateInput(record: Record<string, unknown>): CreateInput {
	const type = typeof record.type === "string" ? record.type.trim() : "";
	if (!TYPE.test(type)) throw new Error("create needs a type");
	const feature = typeof record.feature === "string" ? record.feature.trim() : "";
	if (!FEATURE.test(feature)) throw new Error("create needs a feature");
	const title = typeof record.title === "string" ? record.title.trim().replace(/\s+/g, " ") : "";
	if (title === "" || !SLUG.test(slugFromTitle(title))) throw new Error("create needs a title");
	return { type, feature, title, prose: typeof record.prose === "string" ? record.prose : "" };
}

/** Write the body and create the bead. Labels are `needs-triage` (plus `experiment` for that type). */
export function createIssue(bd: BdWriteRunner, input: CreateInput, dir: string): void {
	const { type, feature, title, prose } = parseCreateInput({ ...input });
	const slug = slugFromTitle(title);
	const handles = listHandles(bd);
	const nn = nextNumber([...numbersFromHandles(feature, handles), ...numbersFromBodies(dir, feature)]);
	const handle = `${feature}/${nn}`;
	const rel = join(".scratch", feature, "issues", `${nn}-${slug}.md`);
	const abs = join(dir, rel);
	mkdirSync(dirname(abs), { recursive: true });
	writeFileSync(abs, issueBody(handle, title, prose), "utf8");
	bd([
		"create",
		title,
		"--type",
		type,
		"--silent",
		"--metadata",
		JSON.stringify({ handle, slug }),
		"--labels",
		labelsForCreate(type).join(","),
	]);
}
