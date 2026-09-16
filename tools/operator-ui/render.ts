#!/usr/bin/env bun
/**
 * Render the Target's beads graph as a local HTML page.
 *
 *   bun tools/operator-ui/render.ts [--dir <target>] [--store <bd>] [--archon <bin>] [--out <file>]
 *
 * The graph is `bd list` / `bd show`, never `.beads/issues.jsonl`. The live overlay is the run lock,
 * Archon status, the run's artefacts and attempted. Write `--out` or stdout.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { documentsFor } from "./documents";
import { assembleOverview } from "./model";
import { fetchLive, resolveArchon } from "./overlay";
import { renderPage } from "./page";
import { fetchStore, makeRunner, resolveBd } from "./store";

const USAGE = `usage: bun tools/operator-ui/render.ts [--dir <target>] [--store <bd>] [--archon <bin>] [--out <file>]

  --dir <target>    the Target whose store is read (default: the working directory)
  --store <bd>      the store binary (default: store: in .scratch/beads-dag.yaml, then PATH)
  --archon <bin>    the Archon binary (default: PATH); used only to read workflow status
  --out <file>      write the page here (default: stdout)

The graph is read via bd, not the jsonl export. The live overlay is the run lock, Archon status,
the run's artefacts, and attempted — not a pack publish API. One page covers inquiry, experiment, and drain.`;

class UsageError extends Error {}

function flag(argv: string[], name: string): string | undefined {
	let found: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] !== name) continue;
		const value = argv[i + 1];
		if (value === undefined || value.startsWith("-")) throw new UsageError(`${name} needs a value`);
		found = value;
		i++;
	}
	return found;
}

function unknownFlags(argv: string[], known: string[]): string[] {
	const extra: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i] ?? "";
		if (!token.startsWith("-")) {
			extra.push(token);
			continue;
		}
		if (known.includes(token)) {
			if (token === "-h" || token === "--help") continue;
			i++;
			continue;
		}
		extra.push(token);
	}
	return extra;
}

function renderHtml(dir: string, store: string, archon?: string): string {
	const fetched = fetchStore(makeRunner(store, dir));
	const live = fetchLive(dir, { archon });
	const overview = assembleOverview(
		fetched.issues,
		fetched.commentsById,
		(issue) => documentsFor(issue, dir),
		live,
	);
	return renderPage(overview);
}

const argv = process.argv.slice(2);
try {
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(USAGE + "\n");
		process.exit(0);
	}
	const extra = unknownFlags(argv, ["--dir", "--store", "--archon", "--out", "--help", "-h"]);
	if (extra.length > 0) throw new UsageError(`unknown argument: ${extra.join(" ")}`);
	const dir = resolve(flag(argv, "--dir") ?? process.cwd());
	const out = flag(argv, "--out");
	const store = resolveBd(dir, flag(argv, "--store"));
	const archonFlag = flag(argv, "--archon");
	if (archonFlag !== undefined) resolveArchon(dir, archonFlag);
	const html = renderHtml(dir, store, archonFlag);
	if (out === undefined || out === "-") process.stdout.write(html);
	else {
		const path = resolve(out);
		writeFileSync(path, html);
		process.stderr.write(`wrote ${path}\n`);
	}
} catch (error) {
	if (error instanceof UsageError) {
		process.stderr.write(`${error.message}\n${USAGE}\n`);
		process.exit(2);
	}
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
}
