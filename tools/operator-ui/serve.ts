#!/usr/bin/env bun
/**
 * Serve the Target's beads graph as a React page so an operator can comment or create without a
 * session, and a same-domain selection can start that domain's existing run.
 *
 *   bun tools/operator-ui/serve.ts [--dir <target>] [--store <bd>] [--archon <bin>] [--port <n>] [--host <addr>]
 *
 * The graph is `bd list` / `bd show`, never `.beads/issues.jsonl`. The page is a React app with a
 * shadcn-style kit; React Flow projects the store. Writes go through one tagged door: a comment is
 * `bd comment`; create requires a type (the domain) and lands as `needs-triage` without the gate;
 * start launches drain, inquiry, or experiment with those ids as the allow-list and does not claim,
 * merge, or stamp `closed`. Mixed-domain, empty, and a held Target are refused. Same-domain `blocks`
 * and crossing `relates-to` / `discovered-from` are store deps; triage moves one of the five labels,
 * replacing the rest of the family; `closed`, `reading:`, non-triage labels, unknown intents,
 * cross-domain `blocks`, and `parent-child` are refused. `wontfix` is a label, not a close. Close,
 * `reading:`, and other domain labels stay the session's.
 */

import http from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { applyOperatorAction, OperatorActionRefused, type OperatorIssue } from "./actions";
import { documentsFor } from "./documents";
import { assembleOverview, type Overview } from "./model";
import { fetchLive, makeArchonRunner, resolveArchon, targetRunHeld } from "./overlay";
import { renderPage } from "./page";
import { launchWithArchon, type RunLauncher } from "./start";
import { fetchStore, makeRunner, makeWriteRunner, resolveBd, type BdWriteRunner } from "./store";

const USAGE = `usage: bun tools/operator-ui/serve.ts [--dir <target>] [--store <bd>] [--archon <bin>] [--port <n>] [--host <addr>]

  --dir <target>    the Target whose store is read and commented (default: the working directory)
  --store <bd>      the store binary (default: store: in .scratch/beads-dag.yaml, then PATH)
  --archon <bin>    the Archon binary (default: PATH); used only to read workflow status
  --port <n>        listen port (default: 8765)
  --host <addr>     listen address (default: 127.0.0.1)

Routes: GET / is the page, GET /overview is the same snapshot as JSON — what a write re-reads
instead of reloading the page — and POST /comment is the tagged write door.

The graph is read via bd, not the jsonl export. Writes go through one tagged door. An operator
reply is bd comment on the selected issue. Create requires a type (the domain), writes a body of
handle and prose, and lands as needs-triage without the gate. A same-domain selection starts that
domain's existing run with those ids as the allow-list. Mixed-domain, empty, and a held Target
are refused. Start does not claim, merge, or stamp closed. Same-domain blocks and crossing relates-to /
discovered-from are store deps. Triage moves one of the five labels, replacing the rest of the
family. wontfix is a label, not a close. closed, reading:, non-triage labels, unknown intents,
cross-domain blocks, and parent-child are refused. Close, reading:, and other domain labels stay
the session's. Beads is the only graph and the only comment store.`;

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

export type OverviewHandler = {
	write: BdWriteRunner;
	page: () => string;
	/** The same overview the page embeds, as JSON: what a write re-reads instead of reloading. Absent when nothing can produce one, and then /overview is a 404 like any other unknown path. */
	overview?: () => string;
	/** Target root. Create writes the body file here. */
	dir?: string;
	launchRun?: RunLauncher;
	issues?: () => ReadonlyArray<OperatorIssue>;
	targetHeld?: () => boolean;
};

export type OverviewResponse = {
	status: number;
	headers: Record<string, string>;
	body: string;
};

/**
 * One request: GET / is the page, GET /overview is the same snapshot as JSON so a write can re-read
 * the store instead of reloading the page, POST /comment is the tagged write door. A comment intent
 * is `bd comment`. A create intent writes the body and `bd create`. A start intent launches that
 * domain's existing run with the selected ids as the allow-list. Edge intents are store deps.
 * A triage intent moves one of the five labels, replacing the rest of the family. `closed`,
 * `reading:`, non-triage labels, unknown intents, cross-domain `blocks`, and `parent-child`
 * are refused and do not write.
 */
export async function handleOverviewRequest(
	req: { method?: string; url?: string },
	body: string,
	handler: OverviewHandler,
): Promise<OverviewResponse> {
	const path = (req.url ?? "/").split("?")[0] ?? "/";
	const method = req.method ?? "GET";
	if ((method === "GET" || method === "HEAD") && (path === "/" || path === "/index.html")) {
		return {
			status: 200,
			headers: { "content-type": "text/html; charset=utf-8" },
			body: method === "HEAD" ? "" : handler.page(),
		};
	}
	if (method === "GET" && path === "/overview" && handler.overview !== undefined) {
		return {
			status: 200,
			headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
			body: handler.overview(),
		};
	}
	if (method === "POST" && path === "/comment") {
		try {
			applyOperatorAction(handler.write, body, {
				dir: handler.dir,
				launchRun: handler.launchRun,
				issues: handler.issues?.() ?? [],
				targetHeld: handler.targetHeld?.() ?? false,
			});
			return { status: 204, headers: {}, body: "" };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const client = error instanceof OperatorActionRefused;
			return {
				status: client ? 400 : 500,
				headers: { "content-type": "text/plain; charset=utf-8" },
				body: message,
			};
		}
	}
	return { status: 404, headers: { "content-type": "text/plain; charset=utf-8" }, body: "not found" };
}

export type ServeOptions = {
	dir: string;
	store: string;
	archon?: string;
	write?: BdWriteRunner;
	page?: () => string;
	overview?: () => string;
	launchRun?: RunLauncher;
	issues?: () => ReadonlyArray<OperatorIssue>;
	targetHeld?: () => boolean;
};

function buildOverview(dir: string, store: string, archon?: string): Overview {
	const fetched = fetchStore(makeRunner(store, dir));
	const live = fetchLive(dir, { archon });
	return assembleOverview(fetched.issues, fetched.commentsById, (issue) => documentsFor(issue, dir), live);
}

function buildPage(dir: string, store: string, archon?: string): string {
	return renderPage(buildOverview(dir, store, archon), {
		commentEndpoint: "/comment",
		overviewEndpoint: "/overview",
	});
}

function buildOverviewJson(dir: string, store: string, archon?: string): string {
	return JSON.stringify({
		...buildOverview(dir, store, archon),
		commentEndpoint: "/comment",
		overviewEndpoint: "/overview",
	});
}

function defaultLaunchRun(dir: string, archon?: string): RunLauncher {
	return (launch) => {
		const binary = resolveArchon(dir, archon);
		if (binary === undefined) throw new Error("cannot find the archon binary");
		launchWithArchon(makeArchonRunner(binary, dir), launch);
	};
}

export function createOverviewServer(options: ServeOptions): http.Server {
	const write = options.write ?? makeWriteRunner(options.store, options.dir);
	const page = options.page ?? (() => buildPage(options.dir, options.store, options.archon));
	const overviewJson = options.overview ?? (() => buildOverviewJson(options.dir, options.store, options.archon));
	const dir = options.dir;
	const issues = options.issues ?? (() => fetchStore(makeRunner(options.store, options.dir)).issues);
	const targetHeld = options.targetHeld ?? (() => targetRunHeld(options.dir));
	const launchRun = options.launchRun ?? defaultLaunchRun(options.dir, options.archon);
	return http.createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer | string) => {
			chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
		});
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			void handleOverviewRequest({ method: req.method, url: req.url }, raw, {
				write,
				page,
				overview: overviewJson,
				dir,
				launchRun,
				issues,
				targetHeld,
			}).then((out) => {
				res.writeHead(out.status, out.headers);
				res.end(out.body);
			});
		});
		req.on("error", () => {
			res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
			res.end("bad request");
		});
	});
}

function invokedDirectly(): boolean {
	const entry = process.argv[1];
	if (entry === undefined) return false;
	return pathToFileURL(resolve(entry)).href === import.meta.url;
}

function parsePort(value: string | undefined): number {
	if (value === undefined) return 8765;
	const port = Number(value);
	if (!Number.isInteger(port) || port < 0 || port > 65535) throw new UsageError("--port needs an integer 0–65535");
	return port;
}

function main(): void {
	const argv = process.argv.slice(2);
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(USAGE + "\n");
		process.exit(0);
	}
	const extra = unknownFlags(argv, ["--dir", "--store", "--archon", "--port", "--host", "--help", "-h"]);
	if (extra.length > 0) throw new UsageError(`unknown argument: ${extra.join(" ")}`);
	const dir = resolve(flag(argv, "--dir") ?? process.cwd());
	const store = resolveBd(dir, flag(argv, "--store"));
	const archonFlag = flag(argv, "--archon");
	if (archonFlag !== undefined) resolveArchon(dir, archonFlag);
	const host = flag(argv, "--host") ?? "127.0.0.1";
	const port = parsePort(flag(argv, "--port"));
	const server = createOverviewServer({ dir, store, archon: archonFlag });
	server.listen(port, host, () => {
		const address = server.address();
		const actual = typeof address === "object" && address !== null ? address.port : port;
		process.stderr.write(`listening on http://${host}:${actual}\n`);
	});
}

if (invokedDirectly()) {
	try {
		main();
	} catch (error) {
		if (error instanceof UsageError) {
			process.stderr.write(`${error.message}\n${USAGE}\n`);
			process.exit(2);
		}
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exit(1);
	}
}
