/**
 * The queue, executed — and what came out of it, run by run.
 *
 *   bun tools/experiments/collect.ts --metric metrics.json:acc --jobs 2
 *   bun tools/experiments/collect.ts --metric acc --registration /path/to/artifacts/experiments/sweep-a.json
 *
 * Executes the run queue (`dvc exp run --run-all -j <jobs>`, which implies `--temp`) and reports the runs
 * the registrations name: per run, the deciding metric's **value and the file it was read from**, the
 * parameters, the code commit the run started from, the lock hash, and the artifact pointers. The queue is
 * the parallel path on purpose — the runs happen in temporary workspaces, side by side, and the operator's
 * working tree is left holding none of them (a plain `dvc exp run` applies its result to the workspace).
 *
 * The metric comes out of `dvc exp show --json`. An entry that is an **error** rather than a value is
 * reported empty — `value: null`, with the reason — never as a number: DVC calls a run that produced no
 * output Success, so an error read as a zero is a silently wrong result. When DVC does not declare the file
 * at all, the ticket's declared metric file is read from the run's own revision (`git show <rev>:<file>`);
 * absent there too, empty again. Nothing here ever guesses a number.
 *
 * One JSON blob on stdout: `{verb, metric, executed, runs[]}`. DVC's own log stays on stderr.
 */

import { resolve } from "node:path";
import { UsageError, askedForHelp, flag, flags, refuse } from "./cli";
import { artifactsOf, describeError, dvc, experimentNodes, expShow, fileInRev, firstLine, forward, hashInRev, nodeRev, paramsOf, type ExpNode } from "./dvc";
import { readRegistrations, registrationsIn, type Registration } from "./registration";

const VERB = "collect";
const USAGE = `usage: bun tools/experiments/${VERB}.ts --metric <[file:]key> [--registration <path>]... [--jobs <n>] [--repo <dir>] [--artifacts <dir>]

  --metric [file:]key    the deciding metric the ticket declared (required; no file means: whatever file holds it)
  --registration <path>  a registration written by register.ts, repeatable
                         (default: every registration under $ARTIFACTS_DIR/experiments/)
  --jobs <n>             how many runs DVC executes at once (default 1)
  --repo <dir>           the experiment's repository (default: the working directory)
  --artifacts <dir>      where the run's registrations live (default: $ARTIFACTS_DIR)`;

type MetricSpec = { file?: string; key: string };

/** `[file:]key`, the way DVC itself spells a metric. */
function parseMetric(text: string): MetricSpec {
	const at = text.lastIndexOf(":");
	if (at < 0) return { key: text };
	const file = text.slice(0, at);
	const key = text.slice(at + 1);
	if (!file || !key) throw new UsageError(`--metric ${text}: expected [file:]key`);
	return { file, key };
}

type MetricReport = { file: string | null; key: string; value: unknown; source: string | null; error: string | null };

function emptyMetric(spec: MetricSpec, file: string | null, error: string): MetricReport {
	return { file, key: spec.key, value: null, source: null, error };
}

/**
 * The ticket's declared metric file, read out of the run's own revision. This is the path for a file DVC
 * does not declare as a metric at all; a file that is not in the revision either reads as empty.
 */
function metricFromRev(repo: string, node: ExpNode, spec: MetricSpec & { file: string }): MetricReport {
	const rev = nodeRev(node);
	if (!rev) return emptyMetric(spec, spec.file, "the run has no revision to read it from");
	const text = fileInRev(repo, rev, spec.file);
	if (text === undefined) {
		return emptyMetric(spec, spec.file, `no ${spec.file} at ${rev}, and DVC does not declare it either`);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return emptyMetric(spec, spec.file, `${spec.file} at ${rev} is not JSON`);
	}
	if (typeof parsed === "object" && parsed !== null && spec.key in parsed) {
		return {
			file: spec.file,
			key: spec.key,
			value: (parsed as Record<string, unknown>)[spec.key],
			source: `git show ${rev}:${spec.file}`,
			error: null,
		};
	}
	return emptyMetric(spec, spec.file, `${spec.file} at ${rev} holds no '${spec.key}'`);
}

/** The deciding metric of one run: a value with the file it came from, or empty with the reason. */
function readMetric(repo: string, node: ExpNode | undefined, spec: MetricSpec): MetricReport {
	if (!node?.data) return emptyMetric(spec, spec.file ?? null, "dvc exp show lists no such run");
	const declared = node.data.metrics ?? {};
	if (spec.file) {
		const entry = declared[spec.file];
		if (!entry) return metricFromRev(repo, node, { ...spec, file: spec.file });
		// An error is reported as empty and nothing else is tried: DVC could not read the file in that
		// revision, so a number read from anywhere else would not be this run's.
		if (entry.error) return emptyMetric(spec, spec.file, `dvc could not read it — ${describeError(entry.error)}`);
		const data = entry.data ?? {};
		if (spec.key in data) {
			return { file: spec.file, key: spec.key, value: data[spec.key], source: "dvc exp show", error: null };
		}
		return emptyMetric(spec, spec.file, `${spec.file} holds no '${spec.key}'`);
	}
	let unreadable: { file: string; error: { type?: string; msg?: string } } | undefined;
	for (const [file, entry] of Object.entries(declared)) {
		if (entry.data && spec.key in entry.data) {
			return { file, key: spec.key, value: entry.data[spec.key], source: "dvc exp show", error: null };
		}
		if (entry.error && !unreadable) unreadable = { file, error: entry.error };
	}
	if (unreadable) return emptyMetric(spec, unreadable.file, `dvc could not read it — ${describeError(unreadable.error)}`);
	return emptyMetric(spec, null, `no metric file in dvc exp show holds '${spec.key}'`);
}

/** The lock pointer: the run's `dvc.lock`, hashed as git hashes the blob inside the run's revision. */
function readLock(repo: string, node: ExpNode | undefined): { path: string; rev: string | null; hash: string | null; error: string | null } {
	const rev = node ? nodeRev(node) : null;
	if (!rev) return { path: "dvc.lock", rev: null, hash: null, error: "the run has no revision to read it from" };
	const hash = hashInRev(repo, rev, "dvc.lock");
	return { path: "dvc.lock", rev, hash: hash ?? null, error: hash ? null : `no dvc.lock at ${rev}` };
}

function main(): void {
	const argv = process.argv.slice(2);
	if (askedForHelp(argv)) {
		console.log(USAGE);
		return;
	}
	const metricText = flag(argv, ["--metric", "-m"]);
	if (!metricText) throw new UsageError("--metric is required: it is the deciding metric the ticket declared, as [file:]key");
	const spec = parseMetric(metricText);
	const jobsText = flag(argv, ["--jobs", "-j"]) ?? "1";
	const jobs = Number(jobsText);
	if (!Number.isInteger(jobs) || jobs < 1) throw new UsageError(`--jobs ${jobsText}: expected a whole number of runs, at least 1`);
	const repo = resolve(flag(argv, ["--repo"]) ?? process.cwd());
	const artifacts = flag(argv, ["--artifacts"]) ?? process.env.ARTIFACTS_DIR;
	const given = flags(argv, ["--registration", "-r"]).map((path) => resolve(path));
	if (!given.length && !artifacts) {
		throw new UsageError(
			"no registration to collect: pass --registration <path>, or set ARTIFACTS_DIR to the run's own " +
				"(its registrations live under experiments/)",
		);
	}

	const paths = given.length ? given : registrationsIn(resolve(artifacts as string));
	if (!paths.length) {
		throw new Error(`no registration under ${resolve(artifacts as string)}/experiments/: nothing was registered for this run`);
	}
	const registrations = readRegistrations(paths);
	const wanted = registrations.flatMap((registration: Registration) =>
		registration.runs.map((run) => ({ registration, name: run.name })),
	);

	const executed = dvc(repo, ["exp", "run", "--run-all", "-j", String(jobs)]);
	forward(executed);
	if (executed.status !== 0) {
		throw new Error(`dvc exp run --run-all failed (exit ${executed.status}): ${firstLine(executed.stderr) || firstLine(executed.stdout)}`);
	}

	// A run is matched by name and consumed once: two registrations can queue the same name, and each
	// reported run has to be a different one of them.
	const pool = experimentNodes(expShow(repo));
	const runs = wanted.map(({ registration, name }) => {
		const at = pool.findIndex((node) => node.name === name);
		const node = at >= 0 ? pool.splice(at, 1)[0] : undefined;
		return {
			name,
			rev: node ? nodeRev(node) : null,
			metric: readMetric(repo, node, spec),
			params: node ? paramsOf(node) : {},
			code: registration.code,
			lock: readLock(repo, node),
			artifacts: node ? artifactsOf(node) : [],
			registered: { name: registration.name, points: registration.points, copies: registration.copies },
			...(node ? {} : { error: "dvc exp show lists no such run" }),
		};
	});

	console.log(
		JSON.stringify(
			{
				verb: VERB,
				metric: spec.file ? { file: spec.file, key: spec.key } : { key: spec.key },
				executed: { jobs, exit: executed.status },
				runs,
			},
			null,
			2,
		),
	);
}

try {
	main();
} catch (error) {
	if (error instanceof UsageError) {
		console.error(`${VERB}: ${error.message}\n${USAGE}`);
		process.exit(2);
	}
	refuse(VERB, error);
}
