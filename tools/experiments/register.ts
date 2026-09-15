/**
 * The run's identity, reserved before anything executes.
 *
 *   bun tools/experiments/register.ts --name sweep-a --set train.n_est=100,200 --copy data
 *   ARTIFACTS_DIR=/path/to/run/artifacts bun tools/experiments/register.ts --name pilot -S seed=1
 *
 * `--set` is DVC's own `-S`: a point the run is queued with, and a comma list is a sweep — DVC expands it
 * into one queued run per point, named `<name>-1`, `<name>-2`. `--copy` is DVC's own `-C`: an ignored path
 * the queued run must see. A queued run works in a **temporary workspace** and gets only tracked bytes, so
 * a stage whose ignored input is absent produces a wrong number while DVC still reports Success — which is
 * why the paths go in here, and why they go in *now*: queue time is the only time `-C` works (measured on
 * 3.67.1, `-C` beside `--run-all` is ignored). A path that does not exist is refused rather than queued,
 * because a run whose input is absent is not a run.
 *
 * Nothing executes: `--queue` reserves the name. The queued runs are the **difference** between `dvc exp
 * show --json` before and after the queue call — never a name derived from DVC's naming rules — and a run
 * that comes back looking executed fails the verb, because registration must not be able to run anything.
 *
 * One JSON line on stdout, and the same registration at `$ARTIFACTS_DIR/experiments/<name>.json`.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { UsageError, askedForHelp, flag, flags, refuse } from "./cli";
import { dvc, experimentNodes, expShow, forward, headCommit, looksExecuted, nodeName, paramsOf, type ExpNode } from "./dvc";
import { registrationPath, writeRegistration, type Registration, type RegisteredRun } from "./registration";

const VERB = "register";
const USAGE = `usage: bun tools/experiments/${VERB}.ts --name <name> [--set <param=value>]... [--copy <path>]... [--repo <dir>] [--artifacts <dir>]

  --name <name>        the run's identity: the name the queue reserves (required)
  --set <param=value>  a point the run is queued with, repeatable (DVC's -S; a comma list is a sweep)
  --copy <path>        an ignored path the queued run must see, repeatable (DVC's -C)
  --repo <dir>         the experiment's repository (default: the working directory)
  --artifacts <dir>    where the registration is written (default: $ARTIFACTS_DIR)`;

/** The names in a tree, as a multiset: two runs may carry the same name, and one of them may be new. */
function names(tree: { name?: string | null }[]): string[] {
	return tree.map((node) => node.name).filter((name): name is string => typeof name === "string");
}

/** The runs the call queued: the names that appeared, counted — never a name we derived ourselves. */
function newRuns(before: string[], after: ExpNode[]): ExpNode[] {
	const had = new Map<string, number>();
	for (const name of before) had.set(name, (had.get(name) ?? 0) + 1);
	const fresh: ExpNode[] = [];
	for (const node of after) {
		const name = nodeName(node);
		if (name === null) continue;
		const left = had.get(name) ?? 0;
		if (left > 0) {
			had.set(name, left - 1);
			continue;
		}
		fresh.push(node);
	}
	// DVC lists the newest first; a sweep reads in point order, which is the order it was asked for.
	return fresh.sort((a, b) => (nodeName(a) ?? "").localeCompare(nodeName(b) ?? "", undefined, { numeric: true }));
}

function main(): void {
	const argv = process.argv.slice(2);
	if (askedForHelp(argv)) {
		console.log(USAGE);
		return;
	}
	const name = flag(argv, ["--name"]);
	if (!name) throw new UsageError("--name is required: it is the run's identity, and the queue reserves it");
	if (/[/\\\s]/.test(name)) throw new UsageError(`--name ${name} is not a run name: no slashes and no spaces`);
	const points = flags(argv, ["--set", "-S"]);
	const copies = flags(argv, ["--copy", "-C"]);
	const repo = resolve(flag(argv, ["--repo"]) ?? process.cwd());
	const artifacts = flag(argv, ["--artifacts"]) ?? process.env.ARTIFACTS_DIR;
	if (!artifacts) {
		throw new UsageError(
			"no artifacts directory: set ARTIFACTS_DIR to the run's own, or pass --artifacts <dir> — " +
				"a registration that lands nowhere is a run the record cannot name",
		);
	}

	const code = headCommit(repo);
	for (const copy of copies) {
		const path = isAbsolute(copy) ? copy : join(repo, copy);
		if (!existsSync(path)) {
			throw new Error(
				`--copy ${copy}: no such path in ${repo}. A queued run works in a temporary workspace and would read ` +
					"nothing from it, and DVC still reports Success — the wrong number this flag exists to prevent. " +
					"Nothing was queued.",
			);
		}
	}

	const before = names(experimentNodes(expShow(repo)));
	const queueArgs = [
		"exp",
		"run",
		"--queue",
		"-n",
		name,
		...points.flatMap((point) => ["-S", point]),
		...copies.flatMap((copy) => ["-C", copy]),
	];
	const queued = dvc(repo, queueArgs);
	forward(queued);
	if (queued.status !== 0) throw new Error(`dvc exp run --queue -n ${name} failed (exit ${queued.status})`);

	const fresh = newRuns(before, experimentNodes(expShow(repo)));
	if (fresh.length === 0) {
		throw new Error(`dvc lists no new run after queueing ${name}: the queue did not take it, and nothing is reserved`);
	}
	for (const node of fresh) {
		if (looksExecuted(node)) {
			throw new Error(
				`the queue executed '${nodeName(node)}': register reserves a run's identity and must not run it — ` +
					"nothing about the run is recorded",
			);
		}
	}

	const runs: RegisteredRun[] = fresh.map((node) => ({ name: nodeName(node) as string, params: paramsOf(node) }));
	const registration: Registration = {
		verb: "register",
		name,
		points,
		copies,
		code,
		runs,
		registeredAt: new Date().toISOString(),
		registration: registrationPath(resolve(artifacts), name),
	};
	writeRegistration(registration);
	console.log(JSON.stringify(registration));
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
