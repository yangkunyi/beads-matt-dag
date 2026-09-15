/**
 * DVC, as this tool sees it: the binary, one call, and the shape of `exp show`.
 *
 * The run tool is resolved the way the pack resolves its store binary: `DVC_BIN` first — the escape hatch
 * a repro pins a stub behind — then `PATH`. Nothing else about the machine is assumed: no config, no
 * cache, no Python, no plugin, no run store.
 *
 * `dvc exp show --json` is a **column tree, not a table of rows** (measured on DVC 3.67.1, 2026-09-15):
 *
 *   [ {rev: "workspace", name: null, …},
 *     {rev: "<sha>", name: "main", data: {…},
 *       experiments: [ {revs: [ {rev, name, data: {rev, timestamp, params, metrics, deps, outs, meta}} ]} ]} ]
 *
 * so a run is found by name in `experiments[].revs[]`, and `data.params` / `data.metrics` are keyed **per
 * file**: an entry is either `{data: {…}}` or `{error: {…}}`. A metric that is an output rather than a
 * committed file reads as an error on the baseline and as a value on the experiment — which is why the
 * verbs report an error entry as empty instead of guessing at a number.
 *
 * A queued run shows its params, no metric data and no output hashes; an executed one shows both. That
 * difference is what `register` reads before it calls a run reserved.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, join } from "node:path";

/** A params or metrics file in an `exp show` node: the values DVC read, or the reason it could not. */
export type FileEntry<T> = { data?: T; error?: { type?: string; msg?: string } };

export type ExpData = {
	rev?: string;
	timestamp?: string | null;
	params?: Record<string, FileEntry<Record<string, unknown>>>;
	metrics?: Record<string, FileEntry<Record<string, unknown>>>;
	outs?: Record<string, { hash?: string | null; size?: number | null }>;
};

/** One node of the `exp show` tree. A run (or a column) carries `data`; a column carries `experiments`. */
export type ExpNode = {
	rev?: string;
	name?: string | null;
	data?: ExpData | null;
	experiments?: { revs?: ExpNode[] }[] | null;
};

function isExecutable(path: string): boolean {
	try {
		if (!statSync(path).isFile()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

/** The directories PATH holds, in order. Named once so a refusal can list what it looked in. */
export function pathDirs(): string[] {
	return (process.env.PATH ?? "").split(delimiter).filter(Boolean);
}

/** `DVC_BIN`, or the `dvc` on PATH. A machine without a run tool is a refusal, never a silent no-op. */
export function dvcBinary(): string {
	const override = process.env.DVC_BIN;
	if (override) {
		if (!isExecutable(override)) throw new Error(`DVC_BIN is set to ${override}, which is not an executable file`);
		return override;
	}
	for (const dir of pathDirs()) {
		const candidate = join(dir, "dvc");
		if (isExecutable(candidate)) return candidate;
	}
	throw new Error(
		`no dvc on PATH: looked in ${pathDirs().join(", ") || "(PATH is empty)"}\n` +
			"install DVC, or set DVC_BIN to the run tool — the experiment half runs DVC's queue and nothing else",
	);
}

export type DvcCall = { status: number; stdout: string; stderr: string };

/** One `dvc` process, in the repository, with this process's environment (so PATH and DVC_BIN reach it). */
export function dvc(repo: string, args: string[]): DvcCall {
	const r = spawnSync(dvcBinary(), args, {
		cwd: repo,
		encoding: "utf8",
		env: process.env,
		maxBuffer: 64 * 1024 * 1024,
	});
	return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

/** The first non-empty line of something DVC said, for a one-line refusal. */
export function firstLine(text: string): string {
	return (text.split("\n").find((l) => l.trim().length > 0) ?? "").trim();
}

/** DVC's own words, on stderr: the verb's stdout is one JSON answer and stays parseable. */
export function forward(call: DvcCall): void {
	for (const text of [call.stdout, call.stderr]) {
		if (text.trim()) process.stderr.write(text.endsWith("\n") ? text : `${text}\n`);
	}
}

/** How DVC's `{error: {...}}` reads in one line. */
export function describeError(entry: { type?: string; msg?: string }): string {
	return [entry.type, entry.msg].filter(Boolean).join(": ") || "an error with no message";
}

/** The tree, parsed. A DVC that answers something else is refused here, not three functions later. */
export function expShow(repo: string): ExpNode[] {
	const call = dvc(repo, ["exp", "show", "--json"]);
	if (call.status !== 0) {
		throw new Error(`dvc exp show --json failed (exit ${call.status}): ${firstLine(call.stderr) || firstLine(call.stdout)}`);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(call.stdout);
	} catch {
		throw new Error(`dvc exp show --json did not print JSON: ${firstLine(call.stdout) || "(nothing on stdout)"}`);
	}
	if (!Array.isArray(parsed)) throw new Error("dvc exp show --json did not print a list");
	return parsed as ExpNode[];
}

/** Every named run in the tree, in DVC's order. The top-level columns are not runs. */
export function experimentNodes(tree: ExpNode[]): ExpNode[] {
	const out: ExpNode[] = [];
	const visit = (node: ExpNode): void => {
		if (typeof node.name === "string" && node.data) out.push(node);
		for (const column of node.experiments ?? []) for (const child of column.revs ?? []) visit(child);
	};
	for (const top of tree) for (const column of top.experiments ?? []) for (const child of column.revs ?? []) visit(child);
	return out;
}

export function nodeName(node: ExpNode): string | null {
	return typeof node.name === "string" ? node.name : null;
}

/** The revision the run's own bytes live at — what the lock and an undeclared metric file are read from. */
export function nodeRev(node: ExpNode): string | null {
	const rev = node.data?.rev ?? node.rev;
	return typeof rev === "string" && rev ? rev : null;
}

/** The run's parameters, as `exp show` reports them: per file, with the values DVC read. */
export function paramsOf(node: ExpNode): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [file, entry] of Object.entries(node.data?.params ?? {})) {
		if (entry.data !== undefined) out[file] = entry.data;
	}
	return out;
}

/** True when a node looks executed rather than queued: an output hash, or a metric DVC could read. */
export function looksExecuted(node: ExpNode): boolean {
	for (const out of Object.values(node.data?.outs ?? {})) if (typeof out.hash === "string" && out.hash) return true;
	for (const file of Object.values(node.data?.metrics ?? {})) if (file.data !== undefined) return true;
	return false;
}

/** The run's artifact pointers: every output DVC hashed, with the hash it recorded. */
export function artifactsOf(node: ExpNode): { path: string; hash: string; size: number | null }[] {
	const out: { path: string; hash: string; size: number | null }[] = [];
	for (const [path, entry] of Object.entries(node.data?.outs ?? {})) {
		if (typeof entry.hash === "string" && entry.hash) {
			out.push({ path, hash: entry.hash, size: typeof entry.size === "number" ? entry.size : null });
		}
	}
	return out;
}

// ---------------------------------------------------------------------------------------------------
// git: the two pointers DVC does not report. Both read a *revision*, not the working tree, so a run's
// own bytes are found after the fact — its temporary workspace is long gone.
// ---------------------------------------------------------------------------------------------------

/** git's answer, or `undefined` for a refusal (a path that is not in the revision, a bad rev). */
function git(repo: string, args: string[]): string | undefined {
	try {
		return execFileSync("git", ["-C", repo, ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return undefined;
	}
}

/** The commit the run starts from: git's answer at the moment the run's identity is reserved. */
export function headCommit(repo: string): string {
	const head = git(repo, ["rev-parse", "HEAD"]);
	if (!head) throw new Error(`${repo} has no HEAD commit: git cannot name the commit the run starts from`);
	return head;
}

/** The hash of one path inside a revision — the lock pointer. Absent means the run wrote no lock. */
export function hashInRev(repo: string, rev: string, path: string): string | undefined {
	return git(repo, ["rev-parse", `${rev}:${path}`]);
}

/** The bytes of one path inside a revision, for a metric file DVC does not declare itself. */
export function fileInRev(repo: string, rev: string, path: string): string | undefined {
	return git(repo, ["show", `${rev}:${path}`]);
}
