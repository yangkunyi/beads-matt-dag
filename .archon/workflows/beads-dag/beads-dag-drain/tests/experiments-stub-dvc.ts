#!/usr/bin/env bun
/**
 * The `dvc` the experiments repro pins the two verbs against — a stub, with no DVC behind it.
 *
 * It answers the three calls the verbs make — `exp run --queue`, `exp show --json`, `exp run --run-all` —
 * with the shapes DVC 3.67.1 really printed (measured 2026-09-15; the shape is documented in
 * `tools/experiments/dvc.ts`): a column tree whose runs are nested under `experiments[].revs[]`, params
 * and metrics keyed per file and either `{data}` or `{error}`, a queued run with no metric data and no
 * output hashes, and the revision a run's bytes live at. The revision it reports is the repository's real
 * HEAD, because the lock hash is read out of that revision with git.
 *
 * The queue lives in `.stub-dvc.json` in the repository it is called from, so it survives between the
 * calls of one repro. Two modes, by environment: `STUB_DVC_RUN_AT_QUEUE=1` makes `--queue` execute what it
 * queues (the shape `register` has to refuse), and a run whose name contains `broken` reports an error
 * metric entry while one named `undeclared` declares no metric file at all.
 *
 * Not a repro: the suite runs `*-repro.ts`, and this file is the thing one of them puts on PATH.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Point = { key: string; value: string };
type Queued = { name: string; points: Point[]; copies: string[]; executed: boolean };
type State = { runs: Queued[]; calls: string[] };

const root = process.cwd();
const statePath = join(root, ".stub-dvc.json");
const state: State = existsSync(statePath)
	? (JSON.parse(readFileSync(statePath, "utf8")) as State)
	: { runs: [], calls: [] };
const argv = process.argv.slice(2);
state.calls.push(argv.join(" "));

function fail(message: string): never {
	console.error(`stub dvc: ${message}`);
	process.exit(2);
}

function valuesOf(flag: string): string[] {
	const out: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] !== flag) continue;
		const value = argv[i + 1];
		if (value !== undefined) out.push(value);
		i++;
	}
	return out;
}

const valueOf = (flag: string): string | undefined => valuesOf(flag).at(-1);
const save = (): void => writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
const head = (): string => execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const hashOf = (text: string): string => createHash("sha1").update(text).digest("hex");

/** `-S key=v1,v2` is a list, and several of them multiply — DVC's own sweep expansion, in miniature. */
function combinations(sets: string[]): Point[][] {
	let combos: Point[][] = [[]];
	for (const set of sets) {
		const at = set.indexOf("=");
		if (at < 0) fail(`not a param override: ${set}`);
		const key = set.slice(0, at);
		const parts = set.slice(at + 1).split(",");
		combos = combos.flatMap((combo) => parts.map((part) => [...combo, { key, value: part }]));
	}
	return combos;
}

function paramsOf(run: Queued): Record<string, { data: Record<string, unknown> }> {
	if (!run.points.length) return {};
	const values: Record<string, unknown> = {};
	for (const point of run.points) values[point.key] = Number.isNaN(Number(point.value)) ? point.value : Number(point.value);
	return { "params.yaml": { data: values } };
}

function metricsOf(run: Queued): Record<string, unknown> {
	if (run.name.includes("broken")) {
		return { "metrics.json": { error: { type: "FileNotFoundError", msg: "No storage files available: 'metrics.json'" } } };
	}
	if (run.name.includes("undeclared")) return {};
	const acc = Number(run.points.at(-1)?.value ?? "0.5");
	return { "metrics.json": { data: { acc: Number.isNaN(acc) ? 0.5 : acc } } };
}

function node(run: Queued, rev: string): unknown {
	return {
		rev,
		name: run.name,
		data: {
			rev,
			timestamp: "2026-09-15T00:00:00+00:00",
			params: paramsOf(run),
			metrics: run.executed ? metricsOf(run) : {},
			deps: {},
			outs: {
				"model.bin": {
					hash: run.executed ? hashOf(run.name) : null,
					size: run.executed ? 3 : null,
					nfiles: null,
					use_cache: true,
					is_data_source: false,
				},
			},
			meta: {},
		},
		error: null,
		experiments: null,
	};
}

function queue(): void {
	const name = valueOf("-n") ?? fail("--queue without -n");
	const combos = combinations(valuesOf("-S"));
	const copies = valuesOf("-C");
	for (const [i, points] of combos.entries()) {
		const runName = combos.length > 1 ? `${name}-${i + 1}` : name;
		state.runs.push({ name: runName, points, copies, executed: false });
		console.log(`Queued experiment '${runName}' for future execution.`);
	}
	if (process.env.STUB_DVC_RUN_AT_QUEUE === "1") for (const run of state.runs) run.executed = true;
	save();
}

function runAll(): void {
	for (const run of state.runs) run.executed = true;
	save();
	console.log(`Ran experiment(s): ${state.runs.map((run) => run.name).join(", ")}`);
}

function show(): void {
	const rev = head();
	const column = (name: string | null, experiments: unknown): unknown => ({
		rev: name === null ? "workspace" : rev,
		name,
		data: { rev: name === null ? "workspace" : rev, timestamp: null, params: {}, metrics: {}, deps: {}, outs: {}, meta: {} },
		error: null,
		experiments,
	});
	console.log(JSON.stringify([column(null, null), column("main", [{ revs: state.runs.map((run) => node(run, rev)) }])]));
}

if (argv[0] !== "exp" || !argv[1]) fail(`unknown command: ${argv.join(" ")}`);
if (argv[1] === "run" && argv.includes("--queue")) queue();
else if (argv[1] === "run" && argv.includes("--run-all")) runAll();
else if (argv[1] === "show") show();
else fail(`unknown command: ${argv.join(" ")}`);
