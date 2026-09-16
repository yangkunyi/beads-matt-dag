/**
 * The only place the overview talks to the store.
 *
 * Every graph is `bd list --all --json --limit 0`, and comments are `bd show … --json --include-comments`.
 * The jsonl export is not a source, and nothing here opens `.beads/issues.jsonl`.
 */

import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { StoreComment, StoreIssue } from "./model";

export type BdRunner = (args: string[]) => string;

const CONFIG_REL = join(".scratch", "beads-dag.yaml");

function isExecutableFile(path: string): boolean {
	try {
		if (!statSync(path).isFile()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function pathEntries(): string[] {
	return (process.env.PATH ?? "").split(delimiter).filter((entry) => entry !== "");
}

function findOnPath(name: string): string | undefined {
	for (const dir of pathEntries()) {
		const path = join(dir, name);
		if (isExecutableFile(path)) return path;
	}
	return undefined;
}

/** `store:` in the Target's config, when the file sets one. Quoted values and trailing comments stripped. */
export function storeKeyFromConfig(target: string): string | undefined {
	const file = join(target, CONFIG_REL);
	if (!existsSync(file)) return undefined;
	for (const raw of readFileSync(file, "utf8").split("\n")) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#")) continue;
		const match = /^store:\s*(.*)$/.exec(line);
		if (!match) continue;
		let value = (match[1] ?? "").trim();
		const comment = value.indexOf(" #");
		if (comment >= 0) value = value.slice(0, comment).trim();
		if (
			(value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
			(value.startsWith("'") && value.endsWith("'") && value.length >= 2)
		) {
			value = value.slice(1, -1);
		}
		return value === "" ? undefined : value;
	}
	return undefined;
}

/**
 * Resolve the store binary: `--store` / explicit override first, then the Target's `store:` key, then
 * PATH. An override that is not an executable fails rather than falling back.
 */
export function resolveBd(target: string, override?: string): string {
	const chosen = override !== undefined && override !== "" ? override : storeKeyFromConfig(target);
	if (chosen !== undefined) {
		const path = isAbsolute(chosen) ? chosen : resolve(target, chosen);
		if (isExecutableFile(path)) return path;
		throw new Error(`cannot find the store binary: ${path} is not an executable file`);
	}
	const found = findOnPath("bd");
	if (found) return found;
	throw new Error("cannot find the store binary: bd is not on PATH; pass --store or set store: in .scratch/beads-dag.yaml");
}

/** One store command. Read-only: the flag is the runner's, so a view cannot write the graph it shows. */
export function runBd(binary: string, cwd: string, args: string[]): string {
	const result = spawnSync(binary, ["--readonly", ...args], {
		cwd,
		encoding: "utf8",
		env: { ...process.env, BD_READONLY: "1" },
	});
	const command = [binary, "--readonly", ...args].join(" ");
	if (result.error) throw new Error(`cannot run ${command}: ${result.error.message}`);
	if (result.status !== 0) {
		const reason = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
		throw new Error(`${command} failed (exit ${result.status})${reason ? `: ${reason}` : ""}`);
	}
	return result.stdout ?? "";
}

export function makeRunner(binary: string, cwd: string): BdRunner {
	return (args) => runBd(binary, cwd, args);
}

function parseJSON(command: string, stdout: string): unknown {
	try {
		return JSON.parse(stdout);
	} catch {
		throw new Error(`${command} did not answer with JSON: ${stdout.trim().slice(0, 200)}`);
	}
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value !== "" ? value : undefined;
}

function toCount(value: unknown): number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function toDependencies(raw: unknown): StoreIssue["dependencies"] {
	if (!Array.isArray(raw)) return [];
	const dependencies: StoreIssue["dependencies"] = [];
	for (const entry of raw) {
		if (typeof entry !== "object" || entry === null) continue;
		const record = entry as Record<string, unknown>;
		const id = text(record.depends_on_id);
		const type = text(record.type);
		if (id !== undefined && type !== undefined) dependencies.push({ id, type });
	}
	return dependencies;
}

function toStoreIssue(raw: unknown, command: string): StoreIssue {
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`${command} returned something that is not an issue: ${JSON.stringify(raw)}`);
	}
	const issue = raw as Record<string, unknown>;
	const id = text(issue.id);
	if (id === undefined) {
		throw new Error(`${command} returned an issue with no id: ${JSON.stringify(raw)}`);
	}
	const metadata =
		typeof issue.metadata === "object" && issue.metadata !== null
			? (issue.metadata as Record<string, unknown>)
			: {};
	return {
		id,
		title: text(issue.title) ?? "",
		type: text(issue.issue_type) ?? "",
		status: text(issue.status) ?? "",
		labels: Array.isArray(issue.labels) ? issue.labels.filter((label): label is string => typeof label === "string") : [],
		handle: text(metadata.handle),
		slug: text(metadata.slug),
		commentCount: toCount(issue.comment_count),
		dependencies: toDependencies(issue.dependencies),
	};
}

function toStoreComment(raw: unknown): StoreComment | undefined {
	if (typeof raw !== "object" || raw === null) return undefined;
	const comment = raw as Record<string, unknown>;
	const id = text(comment.id);
	const textValue = text(comment.text);
	if (id === undefined || textValue === undefined) return undefined;
	return {
		id,
		author: text(comment.author) ?? "",
		createdAt: text(comment.created_at) ?? "",
		text: textValue,
	};
}

function issueList(bd: BdRunner, args: string[]): StoreIssue[] {
	const command = args.join(" ");
	const parsed = parseJSON(command, bd(args));
	if (!Array.isArray(parsed)) {
		throw new Error(`${command} answered with something that is not a list of issues: ${JSON.stringify(parsed)}`);
	}
	return parsed.map((raw) => toStoreIssue(raw, command));
}

const LIST_ARGS = ["list", "--all", "--json", "--limit", "0"];

export type FetchedStore = {
	issues: StoreIssue[];
	commentsById: Map<string, StoreComment[]>;
};

/**
 * The Target's graph, from the store. Two commands: the whole issue list, then one `show` for every
 * issue that has comments. Never the jsonl export.
 */
export function fetchStore(bd: BdRunner): FetchedStore {
	const issues = issueList(bd, LIST_ARGS);
	const commentsById = new Map<string, StoreComment[]>();
	const withComments = issues.filter((issue) => issue.commentCount > 0).map((issue) => issue.id);
	if (withComments.length === 0) return { issues, commentsById };
	const showArgs = ["show", ...withComments, "--json", "--include-comments"];
	const parsed = parseJSON(showArgs.join(" "), bd(showArgs));
	if (!Array.isArray(parsed)) {
		throw new Error(`show answered with something that is not a list of issues: ${JSON.stringify(parsed)}`);
	}
	for (const entry of parsed) {
		if (typeof entry !== "object" || entry === null) continue;
		const record = entry as Record<string, unknown>;
		const id = text(record.id);
		if (id === undefined) continue;
		const comments = Array.isArray(record.comments)
			? record.comments.map(toStoreComment).filter((comment): comment is StoreComment => comment !== undefined)
			: [];
		commentsById.set(id, comments);
	}
	return { issues, commentsById };
}
