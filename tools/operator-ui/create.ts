/**
 * Create an issue from the operator surface, without a session.
 *
 * Type is required and is the domain. Identity labels go on at create (experiments:
 * `experiment`; inquiry and development: type is enough). Triage is `needs-triage`
 * only — never the gate. The operator supplies the feature; this module allocates
 * the next unused NN and a slug from the title. The bead carries `handle` and
 * `slug`. The body is handle and prose, no status.
 */

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BdWriteRunner } from "./store";

const FEATURE = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const TYPE = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type CreateRequest = {
	type: string;
	feature: string;
	title: string;
	prose: string;
	slug: string;
};

export function slugFromTitle(title: string): string {
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

/**
 * Pull type, feature, title and optional prose out of a JSON object. Type is the
 * domain and is required. Remaining extra fields are not a write.
 */
export function parseCreateBody(raw: string): CreateRequest {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("create body is not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("create body is not an object");
	}
	const record = parsed as Record<string, unknown>;
	if (typeof record.type !== "string" || record.type.trim() === "") {
		throw new Error("create needs a type");
	}
	const type = record.type.trim();
	if (!TYPE.test(type)) throw new Error("create needs a type");
	if (typeof record.feature !== "string" || record.feature.trim() === "") {
		throw new Error("create needs a feature");
	}
	const feature = record.feature.trim();
	if (!FEATURE.test(feature)) throw new Error("create needs a feature");
	if (typeof record.title !== "string" || record.title.trim() === "") {
		throw new Error("create needs a title");
	}
	const title = record.title.trim().replace(/\s+/g, " ");
	const slug = slugFromTitle(title);
	if (!SLUG.test(slug)) throw new Error("create needs a title");
	const prose = typeof record.prose === "string" ? record.prose : "";
	return { type, feature, title, prose, slug };
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

/** Write the body and create the bead. Labels are `needs-triage` (plus `experiment` for that type). */
export function createIssue(bd: BdWriteRunner, input: CreateRequest, dir: string): void {
	const handles = listHandles(bd);
	const nn = nextNumber([...numbersFromHandles(input.feature, handles), ...numbersFromBodies(dir, input.feature)]);
	const handle = `${input.feature}/${nn}`;
	const rel = join(".scratch", input.feature, "issues", `${nn}-${input.slug}.md`);
	const abs = join(dir, rel);
	mkdirSync(dirname(abs), { recursive: true });
	writeFileSync(abs, issueBody(handle, input.title, input.prose), "utf8");
	bd([
		"create",
		input.title,
		"--type",
		input.type,
		"--silent",
		"--metadata",
		JSON.stringify({ handle, slug: input.slug }),
		"--labels",
		labelsForCreate(input.type).join(","),
	]);
}
