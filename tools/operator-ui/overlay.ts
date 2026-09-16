/**
 * The live overlay's I/O: the Target lock, Archon workflow status, the run's artefacts, attempted.
 *
 * Nothing here publishes. The pack already writes `beads-dag-run.lock`, `run-lock.json`,
 * `attempted-ids.json`, `summary.md` / `report.md`, and Archon already answers `workflow status`.
 * This module reads those four and joins them; it does not import the pack and does not add a fifth
 * file for the UI to consume.
 */

import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
	assembleLive,
	kindOfWorkflow,
	type LiveArchonRun,
	type LiveArtifacts,
	type LiveLock,
	type LiveReport,
	type LiveRun,
} from "./model";

/** The run lock the three executors share, inside the Target's git directory. */
export const RUN_LOCK_NAME = "beads-dag-run.lock";

/** The run-lock record the holder writes into ARTIFACTS_DIR. */
const RUN_LOCK_RECORD = "run-lock.json";

/** The ids this run has claimed, beside the run and never in the store. */
const ATTEMPTED_FILE = "attempted-ids.json";

/** The two report names the overlay knows: drain summary, inquiry/experiment report. */
const REPORT_RELS = ["summary.md", "report.md"] as const;

export type ArchonRunner = (args: string[]) => string;

function isExecutableFile(path: string): boolean {
	try {
		if (!statSync(path).isFile()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function findOnPath(name: string): string | undefined {
	for (const dir of (process.env.PATH ?? "").split(delimiter).filter((entry) => entry !== "")) {
		const path = join(dir, name);
		if (isExecutableFile(path)) return path;
	}
	return undefined;
}

/**
 * Resolve the Archon binary: `--archon` / explicit override first, then PATH. An override that is not
 * an executable fails rather than falling back. Unset and not on PATH is not an error — the overlay
 * is absent, the graph is still the graph.
 */
export function resolveArchon(target: string, override?: string): string | undefined {
	if (override !== undefined && override !== "") {
		const path = isAbsolute(override) ? override : resolve(target, override);
		if (isExecutableFile(path)) return path;
		throw new Error(`cannot find the archon binary: ${path} is not an executable file`);
	}
	return findOnPath("archon");
}

/** The Target's git directory: where the run lock lives, the same path the pack already uses. */
export function gitDirOf(target: string): string | undefined {
	const result = spawnSync("git", ["-C", target, "rev-parse", "--absolute-git-dir"], { encoding: "utf8" });
	if (result.error || result.status !== 0) return undefined;
	const dir = (result.stdout ?? "").trim();
	return dir === "" ? undefined : dir;
}

/**
 * A lock file's holder: pid on the first line, the run id after it. Unreadable or unusable is no
 * holder — a half-written lock is a dead one, the same rule the pack uses.
 */
export function readLockHolder(path: string): LiveLock | undefined {
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch {
		return undefined;
	}
	const lines = raw.split("\n");
	const pid = Number((lines[0] ?? "").trim());
	if (!Number.isInteger(pid) || pid <= 0) return undefined;
	const run = lines.slice(1).join("\n").trim();
	if (run === "") return undefined;
	return { pid, run };
}

/**
 * Whether the process that wrote the lock is still there. EPERM is alive (another user's pid); a
 * missing pid is gone.
 */
export function lockHolderAlive(holder: LiveLock | undefined): boolean {
	if (holder === undefined) return false;
	try {
		process.kill(holder.pid, 0);
		return true;
	} catch (error) {
		return (error as { code?: string }).code === "EPERM";
	}
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value !== "" ? value : undefined;
}

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
}

/** The run-lock.json record, when the artefacts directory holds one that names a run. */
export function readRunLockRecord(artifactsDir: string): LiveLock | undefined {
	const raw = readJson(join(artifactsDir, RUN_LOCK_RECORD));
	if (typeof raw !== "object" || raw === null) return undefined;
	const record = raw as Record<string, unknown>;
	const run = text(record.run);
	if (run === undefined) return undefined;
	const pid = typeof record.pid === "number" && Number.isInteger(record.pid) && record.pid > 0 ? record.pid : 0;
	return { pid, run };
}

/** attempted-ids.json: an unreadable or absent file is an empty list, never a failure. */
export function readAttempted(artifactsDir: string): string[] {
	const raw = readJson(join(artifactsDir, ATTEMPTED_FILE));
	if (!Array.isArray(raw)) return [];
	return raw.filter((id): id is string => typeof id === "string");
}

function readReports(artifactsDir: string): LiveReport[] {
	const reports: LiveReport[] = [];
	for (const rel of REPORT_RELS) {
		const path = join(artifactsDir, rel);
		if (!existsSync(path)) continue;
		try {
			reports.push({ rel, text: readFileSync(path, "utf8") });
		} catch {
			/* a report we cannot read is not a report */
		}
	}
	return reports;
}

/** Archon's per-run artefacts directory: `<output_root>/artifacts/runs/<run-id>/`. */
export function artifactsDirFor(outputRoot: string, runId: string): string {
	return join(outputRoot, "artifacts", "runs", runId);
}

export function readArtifacts(artifactsDir: string): LiveArtifacts {
	return {
		dir: artifactsDir,
		record: readRunLockRecord(artifactsDir),
		attempted: readAttempted(artifactsDir),
		reports: readReports(artifactsDir),
	};
}

function toArchonRun(raw: unknown): LiveArchonRun | undefined {
	if (typeof raw !== "object" || raw === null) return undefined;
	const row = raw as Record<string, unknown>;
	const id = text(row.id);
	const workflow = text(row.workflow_name) ?? text(row.workflow);
	const status = text(row.status);
	if (id === undefined || workflow === undefined || status === undefined) return undefined;
	return { id, workflow, status };
}

export function outputRootOf(raw: unknown): string | undefined {
	if (typeof raw !== "object" || raw === null) return undefined;
	const row = raw as Record<string, unknown>;
	return text(row.output_root) ?? text(row.outputRoot);
}

/** Parse `archon workflow status --json`: `{ runs: [...] }` or a bare array. */
export function parseArchonStatus(stdout: string): { run: LiveArchonRun; outputRoot: string | undefined }[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		return [];
	}
	const rows = Array.isArray(parsed)
		? parsed
		: typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { runs?: unknown }).runs)
			? ((parsed as { runs: unknown[] }).runs)
			: [];
	const out: { run: LiveArchonRun; outputRoot: string | undefined }[] = [];
	for (const row of rows) {
		const run = toArchonRun(row);
		if (run === undefined) continue;
		out.push({ run, outputRoot: outputRootOf(row) });
	}
	return out;
}

const STATUS_ARGS = ["workflow", "status", "--json"];

export function fetchArchonStatus(archon: ArchonRunner): { run: LiveArchonRun; outputRoot: string | undefined }[] {
	return parseArchonStatus(archon(STATUS_ARGS));
}

export function runArchon(binary: string, cwd: string, args: string[]): string {
	const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
	const command = [binary, ...args].join(" ");
	if (result.error) throw new Error(`cannot run ${command}: ${result.error.message}`);
	if (result.status !== 0) {
		const reason = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
		throw new Error(`${command} failed (exit ${result.status})${reason ? `: ${reason}` : ""}`);
	}
	return result.stdout ?? "";
}

export function makeArchonRunner(binary: string, cwd: string): ArchonRunner {
	return (args) => runArchon(binary, cwd, args);
}

export type FetchLiveOpts = {
	/** `--archon` / an explicit binary. Unset, PATH is searched; missing means no overlay. */
	archon?: string;
	/** Injected Archon runner. Unset, the resolved binary is spawned. */
	archonRunner?: ArchonRunner;
	/** Injected lock. Unset, the Target's git directory is read. */
	lock?: LiveLock;
	/** Injected artefacts. Unset, the Archon row's output_root locates them. */
	artifacts?: LiveArtifacts;
};

function lockFromTarget(target: string): LiveLock | undefined {
	const gitDir = gitDirOf(target);
	if (gitDir === undefined) return undefined;
	const holder = readLockHolder(join(gitDir, RUN_LOCK_NAME));
	if (holder === undefined || !lockHolderAlive(holder)) return undefined;
	return holder;
}

/**
 * The live overlay for one Target, or null when nothing is in progress.
 *
 * A missing lock, a dead holder, Archon not listing that run, or a workflow that is not an executor
 * are all "nothing in progress" — the graph still renders. A named `--archon` that cannot be run is
 * thrown so the flag cannot silently drop the overlay; an unset PATH miss is just no overlay.
 */
export function fetchLive(target: string, opts: FetchLiveOpts = {}): LiveRun | null {
	const lock = opts.lock ?? lockFromTarget(target);
	if (lock === undefined || !lockHolderAlive(lock)) return null;

	let archonRows: { run: LiveArchonRun; outputRoot: string | undefined }[];
	if (opts.archonRunner !== undefined) {
		archonRows = fetchArchonStatus(opts.archonRunner);
	} else {
		const binary = resolveArchon(target, opts.archon);
		if (binary === undefined) return null;
		try {
			archonRows = fetchArchonStatus(makeArchonRunner(binary, target));
		} catch (error) {
			if (opts.archon !== undefined && opts.archon !== "") throw error;
			return null;
		}
	}

	const matched = archonRows.find((row) => row.run.id === lock.run);
	if (matched === undefined || kindOfWorkflow(matched.run.workflow) === undefined) return null;

	let artifacts = opts.artifacts;
	if (artifacts === undefined) {
		const outputRoot = matched.outputRoot;
		if (outputRoot !== undefined && outputRoot !== "") {
			const dir = artifactsDirFor(outputRoot, matched.run.id);
			if (existsSync(dir)) artifacts = readArtifacts(dir);
		}
	}

	return assembleLive({
		lock,
		archon: archonRows.map((row) => row.run),
		artifacts,
	});
}
