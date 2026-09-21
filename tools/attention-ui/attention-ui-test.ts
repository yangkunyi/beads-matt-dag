#!/usr/bin/env bun
/**
 * The attention inbox seams: parse the public JSON, walk boot order, render the first nonempty
 * bucket, launch one id through the existing write door, refuse closed/held. Does not compose a
 * frontier and does not import pack modules.
 *
 *   bun tools/attention-ui/attention-ui-test.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunLaunch } from "../operator-ui/start";
import type { BdWriteRunner } from "../operator-ui/store";
import {
	bucketCounts,
	doorIssues,
	emptySnapshot,
	firstNonempty,
	parseAttentionSnapshot,
	type AttentionSnapshot,
} from "./snapshot";
import { handleAttentionRequest } from "./serve";
import { pageCarriesHandle, pageFocusesBucket, pageIsReactApp, pageOffersCreate, renderAttentionPage } from "./page";

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

function snapshotWith(partial: Partial<AttentionSnapshot["buckets"]> & { run?: AttentionSnapshot["run"]; target?: string }): AttentionSnapshot {
	const base = emptySnapshot(partial.target ?? "/tmp/target");
	return {
		...base,
		run: partial.run ?? base.run,
		buckets: { ...base.buckets, ...partial },
	};
}

const leftoverReady = snapshotWith({
	leftovers: [{ id: "id-left", handle: "feat/04", type: "task", domain: "development", next: "drain" }],
	ready: {
		development: [{ id: "id-ready", handle: "feat/09", title: "ready work", contract: "present", attempts_failed: 0, next: "drain" }],
		inquiry: [],
		experiments: [],
	},
});

expectEqual("empty has no first bucket", firstNonempty(emptySnapshot()), undefined);
expectEqual("leftovers beat ready", firstNonempty(leftoverReady)?.key, "leftovers");
expectEqual("leftovers beat ready handle", firstNonempty(leftoverReady)?.rows[0]?.handle, "feat/04");

const onlyReady = snapshotWith({
	ready: {
		development: [{ id: "id-ready", handle: "feat/09", title: "ready work", contract: "missing", attempts_failed: 2, next: "drain" }],
		inquiry: [],
		experiments: [],
	},
});
expectEqual("ready.development is after leftovers/stuck/drafts", firstNonempty(onlyReady)?.key, "ready.development");
expectEqual("counts leftovers empty", bucketCounts(onlyReady).leftovers, 0);
expectEqual("counts ready.development", bucketCounts(onlyReady)["ready.development"], 1);

const parsed = parseAttentionSnapshot(JSON.stringify({ ...onlyReady, extra: true }));
expectEqual("parse keeps ready handle", parsed.buckets.ready.development[0]?.handle, "feat/09");

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
expect("parse rejects a missing buckets object", threw);

expectEqual("door issues type development leftovers as their type", doorIssues(leftoverReady), [
	{ id: "id-left", type: "task" },
	{ id: "id-ready", type: "task" },
]);

const inquirySnap = snapshotWith({
	ready: {
		development: [],
		inquiry: [{ id: "q1", handle: "q/01", title: "a question", next: "inquiry" }],
		experiments: [],
	},
});
expectEqual("door issues type inquiry as decision", doorIssues(inquirySnap), [{ id: "q1", type: "decision" }]);

const html = renderAttentionPage(leftoverReady, { commentEndpoint: "/comment", attentionEndpoint: "/attention" });
expect("page is a React shadcn app", pageIsReactApp(html));
expect("page focuses leftovers", pageFocusesBucket(html, "leftovers"));
expect("page carries leftover handle", pageCarriesHandle(html, "feat/04"));
expect("page names leftover next", html.includes('data-next="drain"'));
expect("leftovers still offer a comment form", html.includes('id="comment-form"'));
const brakedHtml = renderAttentionPage(
	snapshotWith({
		braked: [{ id: "id-brake", handle: "feat/10", next: "triage", labels: ["needs-triage"] }],
	}),
	{ commentEndpoint: "/comment" },
);
expect("triage still offers a comment form", brakedHtml.includes('id="comment-form"') && brakedHtml.includes('data-act="triage"'));
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
expect("canvas fits the camera when the selection changes", graphSrc.includes("fitView") && graphSrc.includes("fittedSelection"));
expect("inbox rows are not a bulleted list", appSrc.includes('id="attention-list"') && appSrc.includes("list-none"));
expect("columns are resizable", appSrc.includes('from "react-resizable-panels"') && html.includes('id="panels"'));

const emptyHtml = renderAttentionPage(emptySnapshot(), { commentEndpoint: "/comment" });
expect("empty page says nothing is waiting", emptyHtml.includes("No work is waiting."));

const held = snapshotWith({
	run: { held: true, runId: "run-1", kind: "drain" },
	leftovers: [{ id: "id-left", handle: "feat/04", type: "task", domain: "development", next: "wait" }],
});
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
expectEqual("GET /attention is the snapshot", JSON.parse(getJson.body).buckets.leftovers[0].handle, "feat/04");

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

if (failed > 0) {
	console.error(`${failed} failed`);
	process.exit(1);
}
console.log("ok");
