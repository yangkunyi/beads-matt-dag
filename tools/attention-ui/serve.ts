#!/usr/bin/env bun
/**
 * Serve the Target's attention object as an inbox. Same JSON a session boots from; first nonempty
 * bucket is the home screen. The beads graph sits on the same page. Writes reuse the tagged door.
 * Not a second frontier.
 *
 *   bun tools/attention-ui/serve.ts [--dir <target>] [--store <bd>] [--archon <bin>] [--actor <name>] [--port <n>] [--host <addr>]
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { applyOperatorAction, OperatorActionRefused, type OperatorIssue } from "../operator-ui/actions";
import { resolveCommentActor } from "../operator-ui/comment";
import { documentsFor } from "../operator-ui/documents";
import { assembleOverview, type Overview } from "../operator-ui/model";
import { fetchLive, makeArchonRunner, resolveArchon } from "../operator-ui/overlay";
import { launchWithArchon, type RunLauncher } from "../operator-ui/start";
import { fetchStore, makeRunner, makeWriteRunner, resolveBd, type BdWriteRunner } from "../operator-ui/store";
import { ATTENTION_UI_PORT, listenLocalUi, parseListenPort } from "../ui-port";
import { invalidateAttentionSnapshot, loadAttentionSnapshot } from "./load";
import { clientAssets, renderAttentionPage, type ClientAssets } from "./page";
import { type AttentionSnapshot } from "./snapshot";

const USAGE = `usage: bun tools/attention-ui/serve.ts [--dir <target>] [--store <bd>] [--archon <bin>] [--actor <name>] [--port <n>] [--host <addr>]

  --dir <target>    the Target whose attention object is shown (default: the working directory)
  --store <bd>      the store binary (default: store: in .scratch/beads-dag.yaml, then PATH)
  --archon <bin>    the Archon binary (default: PATH); used only to launch a domain run
  --actor <name>    stamped on bd comment as --actor
  --port <n>        listen port (default: 8770; if taken, try the next few. 0 = ephemeral)
  --host <addr>     listen address (default: 127.0.0.1)

Routes: GET / is the inbox and graph on one page, GET /attention is the snapshot JSON,
GET /overview is the beads graph JSON after a write, POST /comment is the tagged write door. The
store reads behind the page are cached: warmed at listen, rebuilt after a door write; a store write
from outside the door becomes visible then or at the next server start.
Capture is a deferred decision or a pinned map. Run-reading undefer + leg=research. Close-map
unpins then closes. Start/grill launch the existing domain run.`;

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

export type AttentionHandler = {
	write: BdWriteRunner;
	actor?: string;
	page: () => string;
	snapshot: () => AttentionSnapshot;
	assets?: () => ClientAssets;
	overview?: () => string;
	onWrite?: () => void;
	dir?: string;
	launchRun?: RunLauncher;
	issues?: () => ReadonlyArray<OperatorIssue>;
	targetHeld?: () => boolean;
};

function writeNeedsIssues(raw: string): boolean {
	try {
		const parsed = JSON.parse(raw) as { intent?: unknown };
		const intent = parsed.intent;
		return (
			intent === "create" ||
			intent === "start" ||
			intent === "grill" ||
			intent === "add-edge" ||
			intent === "remove-edge" ||
			intent === "delete" ||
			intent === "run-reading" ||
			intent === "close-map"
		);
	} catch {
		return true;
	}
}

function etagMatches(header: string | string[] | undefined, etag: string): boolean {
	const value = Array.isArray(header) ? header.join(",") : header;
	if (value === undefined) return false;
	return value.split(",").some((candidate) => candidate.trim() === etag);
}

export type AttentionResponse = {
	status: number;
	headers: Record<string, string>;
	body: string;
};

export async function handleAttentionRequest(
	req: { method?: string; url?: string; headers?: Record<string, string | string[] | undefined> },
	body: string,
	handler: AttentionHandler,
): Promise<AttentionResponse> {
	const path = (req.url ?? "/").split("?")[0] ?? "/";
	const method = req.method ?? "GET";
	if ((method === "GET" || method === "HEAD") && (path === "/" || path === "/index.html")) {
		return {
			status: 200,
			headers: { "content-type": "text/html; charset=utf-8" },
			body: method === "HEAD" ? "" : handler.page(),
		};
	}
	if (method === "GET" && path === "/attention") {
		return {
			status: 200,
			headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
			body: JSON.stringify(handler.snapshot()),
		};
	}
	if (method === "GET" && path === "/overview" && handler.overview !== undefined) {
		return {
			status: 200,
			headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
			body: handler.overview(),
		};
	}
	if ((method === "GET" || method === "HEAD") && handler.assets !== undefined) {
		const assets = handler.assets();
		for (const asset of [assets.js, assets.css]) {
			if (path !== asset.path) continue;
			const headers = { "cache-control": "no-cache", etag: asset.etag };
			if (etagMatches(req.headers?.["if-none-match"], asset.etag)) {
				return { status: 304, headers, body: "" };
			}
			return {
				status: 200,
				headers: { ...headers, "content-type": asset.contentType },
				body: method === "HEAD" ? "" : asset.body,
			};
		}
	}
	if (method === "POST" && path === "/comment") {
		try {
			applyOperatorAction(handler.write, body, {
				dir: handler.dir,
				launchRun: handler.launchRun,
				issues: writeNeedsIssues(body) ? (handler.issues?.() ?? []) : [],
				targetHeld: handler.targetHeld?.() ?? false,
				actor: handler.actor,
			});
			if (handler.dir !== undefined) invalidateAttentionSnapshot(handler.dir);
			handler.onWrite?.();
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
	actor?: string;
	write?: BdWriteRunner;
	page?: () => string;
	snapshot?: () => AttentionSnapshot;
	assets?: () => ClientAssets;
	launchRun?: RunLauncher;
	issues?: () => ReadonlyArray<OperatorIssue>;
	targetHeld?: () => boolean;
};

function defaultLaunchRun(dir: string, archon?: string): RunLauncher {
	return (launch) => {
		const binary = resolveArchon(dir, archon);
		if (binary === undefined) throw new Error("cannot find the archon binary");
		launchWithArchon(makeArchonRunner(binary, dir), launch);
	};
}

export type AttentionServer = {
	listen(port: number, host?: string, listeningListener?: () => void): AttentionServer;
	address(): { port: number; address: string; family: string } | null;
	close(callback?: (err?: Error) => void): AttentionServer;
	once(event: "error", listener: (err: Error) => void): AttentionServer;
};

export function createAttentionServer(options: ServeOptions): AttentionServer {
	const write = options.write ?? makeWriteRunner(options.store, options.dir);
	const actor = options.actor;
	const snapshot = options.snapshot ?? (() => loadAttentionSnapshot(options.dir));
	const page =
		options.page ??
		(() =>
			renderAttentionPage(snapshot(), {
				commentEndpoint: "/comment",
				attentionEndpoint: "/attention",
				overviewEndpoint: "/overview",
				graph: loadOverview(),
				cacheClient: true,
				actor,
			}));
	const assets = options.assets ?? (() => clientAssets());
	const targetHeld = options.targetHeld ?? (() => snapshot().run.held);
	const launchRun = options.launchRun ?? defaultLaunchRun(options.dir, options.archon);
	const buildOverview = (): Overview => {
		const fetched = fetchStore(makeRunner(options.store, options.dir));
		const live = fetchLive(options.dir, { archon: options.archon });
		return assembleOverview(fetched.issues, fetched.commentsById, (issue) => documentsFor(issue, options.dir), live);
	};
	// One store read per generation: a TTL cannot carry this — the read costs more than any fresh
	// window, so every request paid it again. Warmed at listen, dropped by a write through the door.
	let overviewValue: Overview | undefined;
	const loadOverview = (): Overview => (overviewValue ??= buildOverview());
	const issues = options.issues ?? (() => loadOverview().issues);
	const handler: AttentionHandler = {
		write,
		actor,
		page,
		snapshot,
		assets,
		overview: () =>
			JSON.stringify({
				...loadOverview(),
				commentEndpoint: "/comment",
				overviewEndpoint: "/overview",
				actor: actor ?? null,
			}),
		onWrite: () => {
			overviewValue = undefined;
		},
		dir: options.dir,
		launchRun,
		issues,
		targetHeld,
	};
	let server: ReturnType<typeof Bun.serve> | undefined;
	let onError: ((err: Error) => void) | undefined;
	const api: AttentionServer = {
		once(event, listener) {
			if (event === "error") onError = listener;
			return api;
		},
		listen(port, host, listeningListener) {
			try {
				server = Bun.serve({
					port,
					hostname: host ?? "127.0.0.1",
					async fetch(req) {
						const url = new URL(req.url);
						const headers: Record<string, string | string[] | undefined> = {};
						req.headers.forEach((value, key) => {
							headers[key.toLowerCase()] = value;
						});
						const raw = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
						const out = await handleAttentionRequest(
							{ method: req.method, url: `${url.pathname}${url.search}`, headers },
							raw,
							handler,
						);
						return new Response(out.body, { status: out.status, headers: out.headers });
					},
				});
				// The first store reads are seconds of bd and the client build is more: pay them here, at
				// listen, so no first screen pays for them. A failure here is not fatal — the first
				// request retries it and reports.
				if (options.snapshot === undefined) {
					try {
						snapshot();
					} catch {
						// the first request retries the read and reports
					}
				}
				try {
					loadOverview();
				} catch {
					// the first request retries the read and reports
				}
				if (options.assets === undefined) {
					try {
						clientAssets();
					} catch {
						// the first request retries the build and reports
					}
				}
				listeningListener?.();
			} catch (error) {
				onError?.(error instanceof Error ? error : new Error(String(error)));
			}
			return api;
		},
		address() {
			if (server === undefined || server.port === undefined) return null;
			return { port: server.port, address: server.hostname ?? "127.0.0.1", family: "IPv4" };
		},
		close(callback) {
			try {
				server?.stop(true);
				server = undefined;
				callback?.();
			} catch (error) {
				callback?.(error instanceof Error ? error : new Error(String(error)));
			}
			return api;
		},
	};
	return api;
}

function invokedDirectly(): boolean {
	const entry = process.argv[1];
	if (entry === undefined) return false;
	return pathToFileURL(resolve(entry)).href === import.meta.url;
}

function parsePort(value: string | undefined): number {
	try {
		return parseListenPort(value, ATTENTION_UI_PORT);
	} catch (error) {
		throw new UsageError(error instanceof Error ? error.message : String(error));
	}
}

function main(): void {
	const argv = process.argv.slice(2);
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(USAGE + "\n");
		process.exit(0);
	}
	const extra = unknownFlags(argv, ["--dir", "--store", "--archon", "--actor", "--port", "--host", "--help", "-h"]);
	if (extra.length > 0) throw new UsageError(`unknown argument: ${extra.join(" ")}`);
	const dir = resolve(flag(argv, "--dir") ?? process.cwd());
	const store = resolveBd(dir, flag(argv, "--store"));
	const archonFlag = flag(argv, "--archon");
	if (archonFlag !== undefined) resolveArchon(dir, archonFlag);
	const host = flag(argv, "--host") ?? "127.0.0.1";
	const portFlag = flag(argv, "--port");
	const port = parsePort(portFlag);
	const gitName = spawnSync("git", ["-C", dir, "config", "user.name"], { encoding: "utf8" });
	const actor = resolveCommentActor(
		flag(argv, "--actor"),
		process.env,
		gitName.status === 0 ? gitName.stdout.trim() : undefined,
	);
	const server = createAttentionServer({ dir, store, archon: archonFlag, actor });
	listenLocalUi({
		server,
		host,
		port,
		explicit: portFlag !== undefined,
		name: "attention-ui",
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
