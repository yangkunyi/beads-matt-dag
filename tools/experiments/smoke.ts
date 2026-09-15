/**
 * The smoke run: both verbs against the DVC on this machine, on a tiny stage.
 *
 *   bun tools/experiments/smoke.ts [--dir <dir>] [--keep]
 *
 * It is not a gate and it does not run in the pack's suite — the suite pins the verbs against a stub, so
 * that it needs no DVC. This is the other half of that claim: the DVC on this machine really answers the
 * two commands the verbs are built on, and a run whose ignored input is missing really does produce a
 * different number while still reporting Success. The stage reads how many files `data/` holds, `data/` is
 * git-ignored, and the metric is `metrics.json:found`:
 *
 *   register --copy data --set pad=1   → the queued run sees it → found 1, one artifact, one param
 *   register                           → the queued run does not → found 0, and DVC calls both Success
 *
 * Exits non-zero if either number is wrong, or if a run reports no artifact, param, code commit or lock,
 * so the run is its own assertion.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERB = "smoke";
const USAGE = `usage: bun tools/experiments/${VERB}.ts [--dir <dir>] [--keep]

  --dir <dir>   where the throwaway experiment is built (default: a temp directory)
  --keep        leave the directory behind`;

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
	console.log(USAGE);
	process.exit(0);
}
const at = argv.indexOf("--dir");
const keep = argv.includes("--keep");
const root = at >= 0 ? argv[at + 1] : mkdtempSync(join(tmpdir(), "experiments-smoke-"));
if (!root) {
	console.error(`${VERB}: --dir needs a value\n${USAGE}`);
	process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));

function git(...args: string[]): void {
	execFileSync("git", ["-C", root as string, ...args], { encoding: "utf8" });
}

function dvc(...args: string[]): void {
	const r = spawnSync(process.env.DVC_BIN ?? "dvc", args, { cwd: root as string, encoding: "utf8" });
	if (r.status !== 0) throw new Error(`dvc ${args.join(" ")} failed: ${(r.stderr ?? "").trim()}`);
}

/** One verb, run the way the executor would: the repository as cwd, the run's artifacts in the environment. */
function verb(script: string, ...args: string[]): string {
	const r = spawnSync(process.execPath, [join(here, script), ...args], {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "inherit"],
		env: { ...process.env, ARTIFACTS_DIR: join(root as string, "artifacts") },
	});
	if (r.status !== 0) throw new Error(`${script} ${args.join(" ")} failed (exit ${r.status})`);
	return r.stdout ?? "";
}

try {
	console.log(`smoke: the DVC on this machine, in ${root}\n`);
	mkdirSync(root, { recursive: true });
	mkdirSync(join(root, "data"), { recursive: true });
	writeFileSync(join(root, "data", "one.txt"), "a\n");
	writeFileSync(join(root, "params.yaml"), "pad: 0\n");
	writeFileSync(
		join(root, "count.sh"),
		'#!/bin/sh\nfound=$(ls data 2>/dev/null | wc -l | tr -d " ")\nprintf \'{"found": %s}\\n\' "$found" > metrics.json\nprintf \'%s\\n\' "$found" > model.txt\n',
	);
	git("init", "-q", "-b", "main");
	git("config", "user.name", "smoke");
	git("config", "user.email", "smoke@example.com");
	dvc("init", "-q");
	// The input is ignored and the metric is an output: DVC tracks neither, which is the whole trap.
	writeFileSync(join(root, ".gitignore"), "/data/\n/metrics.json\n/model.txt\n");
	dvc("stage", "add", "-n", "count", "-p", "pad", "-m", "metrics.json", "-o", "model.txt", "sh count.sh");
	git("add", "-A");
	git("commit", "-qm", "a stage that counts what it can see");

	console.log("register smoke-copied   --copy data --set pad=1   (the run sees the ignored input)");
	verb("register.ts", "--name", "smoke-copied", "--copy", "data", "--set", "pad=1");
	console.log("register smoke-uncopied                          (the run sees only tracked bytes)");
	verb("register.ts", "--name", "smoke-uncopied");
	console.log("\ncollect --metric metrics.json:found\n");

	const collected = JSON.parse(verb("collect.ts", "--metric", "metrics.json:found")) as {
		runs: {
			name: string;
			metric: { value: unknown; file: string | null; error: string | null };
			params: Record<string, Record<string, unknown>>;
			code: string;
			lock: { hash: string | null };
			artifacts: { path: string; hash: string }[];
		}[];
	};
	const run = (name: string) => collected.runs.find((r) => r.name === name);
	const value = (name: string) => run(name)?.metric.value;
	const problems: string[] = [];
	if (value("smoke-copied") !== 1) problems.push(`smoke-copied read ${JSON.stringify(value("smoke-copied"))}, want 1`);
	if (value("smoke-uncopied") !== 0) problems.push(`smoke-uncopied read ${JSON.stringify(value("smoke-uncopied"))}, want 0`);
	for (const name of ["smoke-copied", "smoke-uncopied"]) {
		const reported = run(name);
		if (!reported) {
			problems.push(`${name} is not in the report`);
			continue;
		}
		if (!reported.code) problems.push(`${name} reported no code commit`);
		if (!reported.lock.hash) problems.push(`${name} reported no lock hash`);
		if (!reported.artifacts.length) problems.push(`${name} reported no artifact`);
		if (!Object.keys(reported.params).length) problems.push(`${name} reported no parameter`);
	}

	console.log(JSON.stringify(collected, null, 2));
	if (problems.length) {
		console.error(`\n${VERB}: ${problems.join("; ")}`);
		process.exitCode = 1;
	} else {
		console.log("\nthe ignored input reached the run that was given it, and only that one");
	}
} catch (error) {
	console.error(`${VERB}: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
} finally {
	if (keep) console.log(`\nkept: ${root}`);
	else rmSync(root, { recursive: true, force: true });
}
