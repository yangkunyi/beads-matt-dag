#!/usr/bin/env bun
/**
 * The attention inbox seams: parse the public JSON, render the first row, launch one id through
 * the existing write door, refuse closed/held. Does not compose a frontier and does not import pack modules.
 *
 *   bun tools/attention-ui/attention-ui-test.ts
 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunLaunch } from "../operator-ui/start";
import type { BdWriteRunner } from "../operator-ui/store";
import { doorIssues, emptySnapshot, parseAttentionSnapshot, type AttentionRow, type AttentionSnapshot } from "./snapshot";
import { createAttentionServer, handleAttentionRequest } from "./serve";
import { pageCarriesHandle, pageIsReactApp, pageOffersCreate, renderAttentionPage } from "./page";

let failed = 0;

function expect(label: string, cond: unknown, detail?: unknown): void {
	if (cond) return;
	failed += 1;
	console.error(`FAIL ${label}${detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
}

function expectEqual(label: string, actual: unknown, expected: unknown): void {
	const a = JSON.stringify(actual);
	const b = JSON.stringify(expected);
	expect(label, a === b, { actual, expected });
}

function row(partial: Partial<AttentionRow> & Pick<AttentionRow, "id" | "handle" | "next">): AttentionRow {
	return {
		title: partial.title ?? partial.handle,
		type: partial.type ?? "task",
		status: partial.status ?? "open",
		...partial,
	};
}

function snapshotWith(work: AttentionRow[], run?: AttentionSnapshot["run"]): AttentionSnapshot {
	return { ...emptySnapshot(), ...(run === undefined ? {} : { run }), work };
}

const leftoverReady = snapshotWith([
	row({ id: "id-left", handle: "feat/04", type: "task", domain: "development", status: "in_progress", next: "drain" }),
	row({ id: "id-ready", handle: "feat/09", title: "ready work", contract: "present", attempts_failed: 0, next: "drain" }),
]);

expectEqual("empty work is an empty list", emptySnapshot().work, []);
expectEqual("the first row is what a session takes", leftoverReady.work[0]?.handle, "feat/04");

const onlyReady = snapshotWith([
	row({ id: "id-ready", handle: "feat/09", title: "ready work", contract: "missing", attempts_failed: 2, next: "drain" }),
]);
const parsed = parseAttentionSnapshot(JSON.stringify({ ...onlyReady, extra: true }));
expectEqual("parse keeps the row", parsed.work[0]?.handle, "feat/09");

let threw = false;
try {
	parseAttentionSnapshot("not json");
} catch {
	threw = true;
}
expect("parse rejects non-JSON", threw);

threw = false;
try {
	parseAttentionSnapshot(JSON.stringify({ target: "/tmp", run: { held: false } }));
} catch {
	threw = true;
}
expect("parse rejects a missing work list", threw);

expectEqual("door issues type rows from the list", doorIssues(leftoverReady), [
	{ id: "id-left", type: "task" },
	{ id: "id-ready", type: "task" },
]);

const inquirySnap = snapshotWith([row({ id: "q1", handle: "q/01", title: "a question", type: "decision", next: "inquiry" })]);
expectEqual("door issues type inquiry as decision", doorIssues(inquirySnap), [{ id: "q1", type: "decision" }]);

const html = renderAttentionPage(leftoverReady, { commentEndpoint: "/comment", attentionEndpoint: "/attention" });
expect("page is a React shadcn app", pageIsReactApp(html));
expect("page has no bucket tabs", !html.includes('data-bucket='));
expect("page carries leftover handle", pageCarriesHandle(html, "feat/04"));
expect("page names leftover next", html.includes('data-next="drain"'));
expect("rows still offer a comment form", html.includes('id="comment-form"'));
const releaseHtml = renderAttentionPage(
	snapshotWith([row({ id: "id-park", handle: "q/04", type: "decision", status: "deferred", next: "release" })]),
	{ commentEndpoint: "/comment" },
);
expect("a deferred row offers run reading", releaseHtml.includes('data-act="run-reading"') && releaseHtml.includes('id="comment-form"'));
expect("page offers create without a YAML fence", pageOffersCreate(html));
expect("create form has no type picker", !html.includes('id="create-type"'));
expect("SSR does not mount the canvas", !html.includes('data-graph="react-flow"'));
expect("page has a graph pane", html.includes('id="graph"'));
expect("page is not the operator graph route", !html.includes('id="graph-link"') && !html.includes('href="/graph"'));
const graphSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "Graph.tsx"), "utf8");
expect("canvas lives in attention-ui", graphSrc.includes("@xyflow/react") && graphSrc.includes("proposeConnect"));
expect("canvas connect does not addEdge as the record", !/\baddEdge\b/.test(graphSrc));
expect("canvas offers show-all", graphSrc.includes("graph-show-all"));
expect("canvas does not import the operator page", !graphSrc.includes("operator-ui/ui/"));
// React #185 came from two defects: an unstable `selected` array re-setting React Flow's store every
// render, and the page plus the store both owning selection. Both are pinned here.
const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "App.tsx"), "utf8");
expect("create can mark a map", appSrc.includes('id="create-map"') && appSrc.includes("map: true"));
expect("maps close through close-map", appSrc.includes('data-act="close-map"'));
expect("canvas memoises selection on the id, not on a fresh array", graphSrc.includes("selectedId === undefined ? [] : [selectedId]"));
expect("canvas writes selection only from clicks", graphSrc.includes("onNodeClick") && !graphSrc.includes("onSelectionChange={"));
expect("canvas does not pass a controlled selected flag", !graphSrc.includes("selected={selected}"));
expect("page keeps its refresh stable", !appSrc.includes("function refresh("));
expect("page shows a node's comments", appSrc.includes("function CommentList") && appSrc.includes("comment.text"));
expect("comment form is not gated on next", appSrc.includes('id="comment-form"') && appSrc.includes("function CommentForm"));
const grillSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "Grill.tsx"), "utf8");
expect("an open issue can start a grill", appSrc.includes("<Grill") && grillSrc.includes('data-act="grill"') && grillSrc.includes('intent: "grill"'));
expect("a round is choices posted as answer-round", grillSrc.includes('id="grill-round"') && grillSrc.includes('intent: "answer-round"') && grillSrc.includes('role="radiogroup"'));
expect("canvas fits the camera when the selection changes", graphSrc.includes("fitView") && graphSrc.includes("fittedSelection"));
expect("inbox rows are not a bulleted list", appSrc.includes('id="attention-list"') && appSrc.includes("list-none"));
expect("columns are resizable", appSrc.includes('from "react-resizable-panels"') && html.includes('id="panels"'));

const emptyHtml = renderAttentionPage(emptySnapshot(), { commentEndpoint: "/comment" });
expect("empty page says nothing is waiting", emptyHtml.includes("No work is waiting."));

const held = snapshotWith(
	[row({ id: "id-left", handle: "feat/04", type: "task", domain: "development", status: "in_progress", next: "wait" })],
	{ held: true, runId: "run-1", kind: "drain" },
);
const heldHtml = renderAttentionPage(held);
expect("held page names the run", heldHtml.includes("run-1") && heldHtml.includes("drain"));

const writes: { args: string[]; stdin?: string }[] = [];
const launches: RunLaunch[] = [];
const handler = {
	write: ((args: string[], stdin?: string) => {
		writes.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () => html,
	snapshot: () => leftoverReady,
	issues: () => doorIssues(leftoverReady),
	targetHeld: () => leftoverReady.run.held,
	launchRun: (launch: RunLaunch) => {
		launches.push(launch);
	},
	dir: "/tmp/target",
};

const getPage = await handleAttentionRequest({ method: "GET", url: "/" }, "", handler);
expectEqual("GET / is 200", getPage.status, 200);
expect("GET / is html", getPage.headers["content-type"]?.includes("text/html") === true);

const getJson = await handleAttentionRequest({ method: "GET", url: "/attention" }, "", handler);
expectEqual("GET /attention is 200", getJson.status, 200);
expectEqual("GET /attention is the snapshot", JSON.parse(getJson.body).work[0].handle, "feat/04");

const startPost = await handleAttentionRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["id-left"] }),
	handler,
);
expectEqual("POST start is 204", startPost.status, 204);
expectEqual("POST start launches drain for that one id", launches, [
	{ kind: "drain", workflow: "beads-dag-drain", allowList: ["id-left"] },
]);
expectEqual("POST start does not write the store", writes.length, 0);

launches.length = 0;
const closedPost = await handleAttentionRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["id-left"], closed: true }),
	handler,
);
expectEqual("POST closed is 400", closedPost.status, 400);
expectEqual("POST closed launches nothing", launches, []);

const heldHandler = { ...handler, snapshot: () => held, targetHeld: () => true, issues: () => doorIssues(held) };
const heldStart = await handleAttentionRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["id-left"] }),
	heldHandler,
);
expectEqual("POST start while held is 400", heldStart.status, 400);
expect("POST start while held names held", heldStart.body.includes("Target already held"));
expectEqual("POST start while held launches nothing", launches, []);

const missing = await handleAttentionRequest({ method: "GET", url: "/nope" }, "", handler);
expectEqual("unknown path is 404", missing.status, 404);

const graphGone = await handleAttentionRequest({ method: "GET", url: "/graph" }, "", handler);
expectEqual("GET /graph is not a route", graphGone.status, 404);

const cacheTmp = mkdtempSync(join(tmpdir(), "attention-cache-"));
const cacheLog = join(cacheTmp, "store.log");
const cacheBd = join(cacheTmp, "cache-bd");
const cacheListJson = JSON.stringify([
	{
		id: "from-bd",
		title: "From bd",
		status: "open",
		issue_type: "task",
		labels: [],
		metadata: { handle: "demo/01", slug: "from-bd" },
		dependencies: [],
		comment_count: 1,
	},
]);
const cacheShowJson = JSON.stringify([
	{
		id: "from-bd",
		title: "From bd",
		status: "open",
		issue_type: "task",
		labels: [],
		metadata: { handle: "demo/01", slug: "from-bd" },
		dependencies: [],
		comment_count: 1,
		comments: [{ id: "n1", issue_id: "from-bd", author: "op", text: "store comment", created_at: "2026-09-22T00:00:00Z" }],
	},
]);
writeFileSync(
	cacheBd,
	`#!/usr/bin/env bun
const fs = require("fs");
const args = process.argv.slice(2);
if (args[0] === "--readonly") args.shift();
fs.appendFileSync(${JSON.stringify(cacheLog)}, JSON.stringify(args) + "\\n");
if (args.includes("list")) {
  process.stdout.write(${JSON.stringify(cacheListJson)});
  process.exit(0);
}
if (args.includes("show")) {
  process.stdout.write(${JSON.stringify(cacheShowJson)});
  process.exit(0);
}
if (args.includes("comment")) {
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(cacheBd, 0o755);
const cacheServer = createAttentionServer({ dir: cacheTmp, store: cacheBd, snapshot: () => leftoverReady });
const cachePort = await new Promise<number>((resolve, reject) => {
	cacheServer.once("error", reject);
	cacheServer.listen(0, "127.0.0.1", () => {
		const address = cacheServer.address();
		if (typeof address === "object" && address !== null) resolve(address.port);
		else reject(new Error("server has no port"));
	});
});
const storeReads = () =>
	(existsSync(cacheLog) ? readFileSync(cacheLog, "utf8").trim() : "")
		.split("\n")
		.filter((line) => line !== "" && (JSON.parse(line) as string[]).includes("list")).length;
expectEqual("listening warms the overview with one store read", storeReads(), 1);
const cacheWarm = await fetch(`http://127.0.0.1:${cachePort}/`);
expectEqual("GET / on the warm cache is 200", cacheWarm.status, 200);
expectEqual("GET / serves the warm cache without another store read", storeReads(), 1);
const cacheJson = await fetch(`http://127.0.0.1:${cachePort}/overview`);
expectEqual("GET /overview is 200", cacheJson.status, 200);
expectEqual("GET /overview shares the same snapshot", storeReads(), 1);
const cachePost = await fetch(`http://127.0.0.1:${cachePort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "comment", id: "from-bd", text: "door reply" }),
});
expectEqual("POST /comment on the cache server is 204", cachePost.status, 204);
expectEqual("the write itself reads the store no more", storeReads(), 1);
const cacheAfter = await fetch(`http://127.0.0.1:${cachePort}/`);
expectEqual("a door write still answers the next GET", cacheAfter.status, 200);
expectEqual("a door write rebuilds the cache as the second store read", storeReads(), 2);
const cacheRefused = await fetch(`http://127.0.0.1:${cachePort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "close", id: "from-bd" }),
});
expectEqual("POST close on the cache server is 400", cacheRefused.status, 400);
const cacheRefusedAfter = await fetch(`http://127.0.0.1:${cachePort}/`);
expectEqual("a refused intent still answers the next GET", cacheRefusedAfter.status, 200);
expectEqual("a refused intent does not rebuild the cache", storeReads(), 2);
await new Promise<void>((resolve, reject) => cacheServer.close((err) => (err ? reject(err) : resolve())));

if (failed > 0) {
	console.error(`${failed} failed`);
	process.exit(1);
}
console.log("ok");
