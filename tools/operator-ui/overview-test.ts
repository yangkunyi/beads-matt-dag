#!/usr/bin/env bun
/**
 * The overview's seams: the graph is `bd`, never jsonl; the page filters by type / status / label / feature;
 * a selected issue's default reading is the human face (handle, title, domain, status, labels,
 * neighbours as issues, comment thread), with documents reachable and unoptimized; a live drain / inquiry / experiment run
 * overlays from the run lock, Archon status, artefacts and attempted — not a pack publish API;
 * an operator reply is `bd comment` on the selected issue, never `bd human respond`; the one
 * tagged write door refuses `closed`, `reading:`, and unknown intents without writing; create
 * requires a type (the domain), lands as `needs-triage` without the gate, and writes handle,
 * slug, and a body of prose with no status; a same-domain selection starts that domain's existing
 * run with those ids as the allow-list; mixed-domain, empty, and a held Target do not start; start
 * does not claim, merge, or stamp `closed`; issues left out keep their triage; triage moves one of
 * the five labels, replacing the rest of the family; `wontfix` is a label, not a close; a non-triage
 * label write is refused; close / `reading:` / other domain labels stay the session's; same-domain
 * `blocks` and crossing `relates-to` / `discovered-from` go through that door; cross-domain `blocks`
 * and `parent-child` are refused with no write; the page is a React app with a shadcn-style kit;
 * the graph is React Flow projecting the store; a connect proposes into the door and a refusal does
 * not stay on the canvas; coordinates stay in the view; issues sit in three domain lanes; a
 * selection frames its neighbourhood and Show all opts into the full graph.
 *
 *   bun tools/operator-ui/overview-test.ts
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { documentsFor, bodyRel, issueNames, noteRel, recordRel } from "./documents";
import {
	assembleLive,
	assembleOverview,
	filterOverview,
	issueDetail,
	neighboursOf,
	type LiveRun,
	type StoreComment,
	type StoreIssue,
} from "./model";
import { fetchLive, gitDirOf, parseArchonLog, RUN_LOCK_NAME, summariseArchonLog } from "./overlay";
import { applyOperatorAction, OperatorActionRefused } from "./actions";
import { postOperatorAction } from "./client";
import { planDelete, planDeleteAll } from "./delete";
import { DOMAIN_LANES, framedIssueIds, projectGraph, proposeConnect } from "./graph-view";
import {
	CLIENT_ASSETS,
	clientAssets,
	pageCachesClient,
	pageCarriesDetail,
	pageCarriesList,
	pageCarriesLive,
	pageCoversThreeDomains,
	pageCreateStaysInDomWhileClosed,
	pageGraphIsReactFlow,
	pageHasFilters,
	pageIsReactApp,
	pageClientIsModule,
	pageOffersCreate,
	pageOffersPalette,
	pageOffersRefresh,
	pageOffersReply,
	pageOffersStart,
	renderPage,
} from "./page";
import type { RunLaunch } from "./start";
import { MarkdownBody } from "./ui/markdown";
import { commentFrom, IssueDetail, withNewlyOffered, type PageOverview } from "./ui/App.tsx";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createOverviewServer, handleOverviewRequest } from "./serve";
import { fetchStore, type BdRunner, type BdWriteRunner } from "./store";

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

function issue(partial: Partial<StoreIssue> & Pick<StoreIssue, "id">): StoreIssue {
	return {
		title: partial.title ?? partial.id,
		type: partial.type ?? "task",
		status: partial.status ?? "open",
		labels: partial.labels ?? [],
		handle: partial.handle,
		slug: partial.slug,
		commentCount: partial.commentCount ?? 0,
		dependencies: partial.dependencies ?? [],
		...partial,
		id: partial.id,
	};
}

const blocker = issue({
	id: "a",
	title: "the question",
	type: "decision",
	status: "open",
	labels: ["answer:draft"],
	handle: "inquiry/01",
	slug: "the-question",
});
const experiment = issue({
	id: "b",
	title: "the run",
	type: "experiment",
	status: "closed",
	labels: ["experiment", "reading:none"],
	handle: "lab/02",
	slug: "the-run",
	dependencies: [{ id: "a", type: "relates-to" }],
});
const work = issue({
	id: "c",
	title: "the drain work",
	type: "task",
	status: "in_progress",
	labels: ["ready-for-agent"],
	handle: "drain/03",
	slug: "the-drain-work",
	commentCount: 1,
	dependencies: [{ id: "a", type: "blocks" }],
});

const comment: StoreComment = {
	id: "c1",
	author: "op",
	createdAt: "2026-09-16T00:00:00Z",
	text: "leave this on the ticket",
};

const files = new Map<string, string>([
	[join(".scratch", "inquiry", "issues", "01-the-question.md"), "# the question\n"],
	[join(".scratch", "inquiry", "notes", "the-question.md"), "note body\n"],
	[join(".scratch", "lab", "results", "02-the-run.md"), "measured: 1\n"],
	[join(".scratch", "drain", "issues", "03-the-drain-work.md"), "# drain work\n"],
]);

const probe = {
	exists: (rel: string) => files.has(rel),
	read: (rel: string) => files.get(rel) ?? "",
};

const overview = assembleOverview([blocker, experiment, work], new Map([["c", [comment]]]), (item) =>
	documentsFor(item, probe),
);

expectEqual(
	"three issues in the graph",
	overview.issues.map((item) => item.id),
	["a", "b", "c"],
);
expectEqual(
	"blocks edge points from blocker to dependent",
	overview.edges.filter((edge) => edge.type === "blocks"),
	[{ from: "a", to: "c", type: "blocks" }],
);
expectEqual("relates-to is kept, not dropped", overview.edges.some((edge) => edge.type === "relates-to"), true);
expectEqual("domains follow type", overview.issues.map((item) => item.domain), [
	"inquiry",
	"experiment",
	"development",
]);
expectEqual("comments join onto the issue", issueDetail(overview, "c")?.comments, [comment]);
expectEqual(
	"work is blocked by the decision as that issue",
	neighboursOf(overview, "c")
		.filter((neighbour) => neighbour.role === "blocked-by")
		.map((neighbour) => ({ id: neighbour.id, handle: neighbour.handle, title: neighbour.title })),
	[{ id: "a", handle: "inquiry/01", title: "the question" }],
);
expectEqual(
	"work blocks nobody",
	neighboursOf(overview, "c").filter((neighbour) => neighbour.role === "blocks"),
	[],
);
expectEqual(
	"experiment's crossing neighbour is the decision issue, not only its id",
	neighboursOf(overview, "b")
		.filter((neighbour) => neighbour.role === "crossing")
		.map((neighbour) => ({
			id: neighbour.id,
			handle: neighbour.handle,
			title: neighbour.title,
			relation: neighbour.relation,
		})),
	[{ id: "a", handle: "inquiry/01", title: "the question", relation: "relates-to" }],
);
expectEqual(
	"decision blocks the work as that issue",
	neighboursOf(overview, "a")
		.filter((neighbour) => neighbour.role === "blocks")
		.map((neighbour) => ({ handle: neighbour.handle, title: neighbour.title })),
	[{ handle: "drain/03", title: "the drain work" }],
);

const names = issueNames(work);
expect("work issue has names", Boolean(names));
if (names) {
	expectEqual("body path is derived, not discovered", bodyRel(names), join(".scratch", "drain", "issues", "03-the-drain-work.md"));
}
const workDocs = documentsFor(work, probe);
expectEqual(
	"work documents are the body",
	workDocs.map((doc) => doc.kind),
	["body"],
);
expectEqual("body exists", workDocs[0]?.exists, true);
expectEqual("body text is the file", workDocs[0]?.text, "# drain work\n");

const decisionDocs = documentsFor(blocker, probe);
expectEqual(
	"decision documents are body and note",
	decisionDocs.map((doc) => doc.kind),
	["body", "note"],
);
expectEqual("note path is derived", decisionDocs[1]?.rel, noteRel(issueNames(blocker)!));

const experimentDocs = documentsFor(experiment, probe);
expectEqual(
	"experiment documents are body and record",
	experimentDocs.map((doc) => doc.kind),
	["body", "record"],
);
expectEqual("record path is derived", experimentDocs[1]?.rel, recordRel(issueNames(experiment)!));
expectEqual("missing body is listed as missing", experimentDocs[0]?.exists, false);

const byType = filterOverview(overview, { types: new Set(["decision"]) });
expectEqual("type filter keeps decisions", byType.issues.map((item) => item.id), ["a"]);
expectEqual("type filter drops edges whose other end vanished", byType.edges, []);

const byStatus = filterOverview(overview, { statuses: new Set(["closed"]) });
expectEqual("status filter keeps closed", byStatus.issues.map((item) => item.id), ["b"]);

const byLabel = filterOverview(overview, { labels: new Set(["ready-for-agent"]) });
expectEqual("label filter keeps matching labels", byLabel.issues.map((item) => item.id), ["c"]);

const byFeature = filterOverview(overview, { features: new Set(["drain"]) });
expectEqual("feature filter keeps matching handles", byFeature.issues.map((item) => item.id), ["c"]);
expectEqual("feature filter drops edges whose other end vanished", byFeature.edges, []);
expectEqual(
	"canvas nodes follow the feature filter",
	projectGraph(byFeature).nodes.map((node) => node.id),
	["c"],
);
const byFeatures = filterOverview(overview, { features: new Set(["inquiry", "lab"]) });
expectEqual("feature filter keeps each selected feature", byFeatures.issues.map((item) => item.id), ["a", "b"]);

const unlabeled = assembleOverview(
	[issue({ id: "u", labels: [], type: "task", status: "open" })],
	new Map(),
	() => [],
);
expectEqual(
	"empty-string label is unlabeled",
	filterOverview(unlabeled, { labels: new Set([""]) }).issues.map((item) => item.id),
	["u"],
);
expectEqual(
	"a real label hides unlabeled",
	filterOverview(unlabeled, { labels: new Set(["ready-for-agent"]) }).issues.map((item) => item.id),
	[],
);
expectEqual(
	"empty-string feature is no handle",
	filterOverview(unlabeled, { features: new Set([""]) }).issues.map((item) => item.id),
	["u"],
);
expectEqual(
	"a real feature hides no-handle",
	filterOverview(unlabeled, { features: new Set(["drain"]) }).issues.map((item) => item.id),
	[],
);

const html = renderPage(overview);
expect("page has type/status/label/feature filters", pageHasFilters(html));
expect("static snapshot does not offer a reply endpoint", !pageOffersReply(html));
expect("static snapshot does not offer a refresh endpoint", !pageOffersRefresh(html));
expect("static snapshot does not offer create", !pageOffersCreate(html));
expect("static snapshot does not offer the palette", !pageOffersPalette(html));
expect("static snapshot does not offer start", !pageOffersStart(html));
expect("static snapshot carries its client, so the file stands alone", !pageCachesClient(html));
expect("page is a React app with a shadcn-style kit", pageIsReactApp(html));
expect("client script is type=module so bun's ESM hydrate runs", pageClientIsModule(html));
expect("graph is React Flow", pageGraphIsReactFlow(html));
expect("page carries the DAG nodes", html.includes('"id":"a"') && html.includes('"id":"c"'));
expect("page carries the windowed issue list", pageCarriesList(html));
expect("the list has a row per issue in the head of the list", html.includes('data-issue="a"') && html.includes('data-issue="c"'));
expect("a row carries the status word beside its icon", html.includes('aria-label="status open"') && html.includes(">in_progress<"));
expect("a blocked dependent is marked in the list", html.includes('aria-label="blocked"'));

// Markdown: a comment reads as prose, and raw HTML stays text. Documents stay unoptimized; the
// detail pane's default reading is the human face, so this renders a comment rather than a body.
const mdHtml = renderToString(createElement(MarkdownBody, { text: "**bold** and <b>raw</b>" }));
expect("a comment body renders as markdown", mdHtml.includes("<strong>bold</strong>"));
// React separates adjacent text nodes with an empty comment, so read the text, not the raw HTML.
const mdText = mdHtml.replaceAll("<!-- -->", "");
expect(
	"raw HTML in a body stays text",
	!mdText.includes("<b>raw</b>") && mdText.includes("&lt;b&gt;raw&lt;/b&gt;"),
);
const scriptText = renderToString(createElement(MarkdownBody, { text: "<script>alert(1)</script>" })).replaceAll(
	"<!-- -->",
	"",
);
expect(
	"a script tag in a body stays text",
	scriptText.includes("&lt;script&gt;alert(1)&lt;/script&gt;") && !scriptText.includes("<script>"),
);
expect(
	"MarkdownBody still renders a heading when a comment has one",
	renderToString(createElement(MarkdownBody, { text: "# the doc\n" })).includes("<h1>the doc</h1>"),
);

const projected = projectGraph(overview);
expectEqual(
	"React Flow nodes are the store issues",
	projected.nodes.map((node) => node.id),
	["a", "b", "c"],
);
expect(
	"blocks edge is projected, not invented",
	projected.edges.some((edge) => edge.source === "a" && edge.target === "c" && edge.relation === "blocks"),
);
expect(
	"crossing relates-to still renders as handoff",
	projected.edges.some((edge) => edge.source === "a" && edge.target === "b" && edge.relation === "relates-to"),
);
expect(
	"every node has a view position",
	projected.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)),
);
expect(
	"store issues do not carry coordinates",
	overview.issues.every((item) => !("position" in item) && !("x" in item) && !("y" in item)),
);
expectEqual("three domain lanes", projected.lanes.map((lane) => lane.id), [...DOMAIN_LANES]);
expect(
	"lanes stack inquiry, development, experiments",
	projected.lanes[0] !== undefined &&
		projected.lanes[1] !== undefined &&
		projected.lanes[2] !== undefined &&
		projected.lanes[0].position.y < projected.lanes[1].position.y &&
		projected.lanes[1].position.y < projected.lanes[2].position.y,
);
function inLane(id: string, domain: (typeof DOMAIN_LANES)[number]): boolean {
	const node = projected.nodes.find((item) => item.id === id);
	const lane = projected.lanes.find((item) => item.id === domain);
	if (node === undefined || lane === undefined) return false;
	return node.position.y >= lane.position.y && node.position.y < lane.position.y + lane.height;
}
expect("inquiry issue sits in the inquiry lane", inLane("a", "inquiry"));
expect("development issue sits in the development lane", inLane("c", "development"));
expect("experiment issue sits in the experiments lane", inLane("b", "experiment"));
expectEqual(
	"empty selection shows all — pinned",
	[...framedIssueIds(overview)].sort(),
	["a", "b", "c"],
);
expectEqual(
	"empty selection ignores showAll because there is nothing to frame",
	projectGraph(overview, { selected: [], showAll: false }).nodes.map((node) => node.id),
	["a", "b", "c"],
);
const aroundC = projectGraph(overview, { selected: ["c"] });
expectEqual(
	"a selection frames the issue and one hop",
	aroundC.nodes.map((node) => node.id).sort(),
	["a", "c"],
);
expect("the two-hop experiment stays out of the neighbourhood", !aroundC.nodes.some((node) => node.id === "b"));
expect(
	"a hop edge remains in the neighbourhood",
	aroundC.edges.some((edge) => edge.source === "a" && edge.target === "c"),
);
expect(
	"a handoff out of the neighbourhood is dropped",
	!aroundC.edges.some((edge) => edge.source === "a" && edge.target === "b"),
);
expectEqual(
	"Show all with a selection is the full graph",
	projectGraph(overview, { selected: ["c"], showAll: true }).nodes.map((node) => node.id),
	["a", "b", "c"],
);

const layered = assembleOverview(
	[
		issue({ id: "q", title: "question", type: "decision", status: "open" }),
		issue({ id: "t", title: "work", type: "task", status: "open", dependencies: [{ id: "q", type: "blocks" }] }),
		issue({ id: "t2", title: "later", type: "task", status: "open", dependencies: [{ id: "t", type: "blocks" }] }),
	],
	new Map(),
	() => [],
);
const layeredProjection = projectGraph(layered);
const pos = (id: string) => layeredProjection.nodes.find((node) => node.id === id)?.position;
const qPos = pos("q");
const tPos = pos("t");
const t2Pos = pos("t2");
expect(
	"intra-domain blocks still layer left to right inside a lane",
	Boolean(tPos && t2Pos && tPos.x < t2Pos.x),
);
expect(
	"cross-domain blocks do not decide a layer across lanes",
	Boolean(qPos && tPos && t2Pos && tPos.x - qPos.x < (t2Pos.x - tPos.x) / 2),
);
expect(
	"cross-domain blocks still render",
	layeredProjection.edges.some((edge) => edge.source === "q" && edge.target === "t" && edge.relation === "blocks"),
);
const qLane = layeredProjection.lanes.find((lane) => lane.id === "inquiry");
const tLane = layeredProjection.lanes.find((lane) => lane.id === "development");
expect(
	"the crossing pair occupy different lanes",
	Boolean(
		qPos &&
			tPos &&
			qLane &&
			tLane &&
			qPos.y >= qLane.position.y &&
			qPos.y < qLane.position.y + qLane.height &&
			tPos.y >= tLane.position.y &&
			tPos.y < tLane.position.y + tLane.height,
	),
);

// The filter rule, driven directly. Unchecking must survive a re-read: the live poll re-reads every five
// seconds while a run is moving, so a rule that re-selects whatever the selection is missing would turn
// the operator's own choice back on under them.
const afterUncheck = { seen: new Set(["open", "closed"]), selected: new Set(["closed"]) };
expectEqual(
	"a re-read that offers nothing new changes nothing",
	withNewlyOffered(afterUncheck.seen, afterUncheck.selected, ["open", "closed"]),
	undefined,
);
const grew = withNewlyOffered(afterUncheck.seen, afterUncheck.selected, ["open", "closed", "in_progress"]);
expectEqual("a value the store has never offered is selected", [...(grew?.selected ?? [])].sort(), [
	"closed",
	"in_progress",
]);
expect(
	"and a value the operator unchecked stays unchecked",
	grew !== undefined && !grew.selected.has("open") && grew.seen.has("open"),
	JSON.stringify(grew && [...grew.selected]),
);
const afterFeatureUncheck = { seen: new Set(["drain", "lab"]), selected: new Set(["lab"]) };
expectEqual(
	"unchecking a feature survives a re-read",
	withNewlyOffered(afterFeatureUncheck.seen, afterFeatureUncheck.selected, ["drain", "lab"]),
	undefined,
);

// A `blocks` cycle. d3-dag refuses a cyclic graph, and the fallback for that is a single column — which
// would cost the whole graph its shape because one pair of issues points at each other. Only the edge
// that closes the loop is set aside; everything else keeps its columns.
const cycled = assembleOverview(
	[
		issue({ id: "p", title: "p", type: "task", status: "open" }),
		issue({ id: "q", title: "q", type: "task", status: "open", dependencies: [{ id: "p", type: "blocks" }] }),
		issue({ id: "r", title: "r", type: "task", status: "open", dependencies: [{ id: "q", type: "blocks" }] }),
		// `p` is blocked by `r`, which closes the loop p -> q -> r -> p.
		issue({ id: "s", title: "s", type: "task", status: "open" }),
	],
	new Map(),
	() => [],
);
const cycledProjection = projectGraph({
	...cycled,
	edges: [...cycled.edges.filter((edge) => edge.type === "blocks"), { from: "r", to: "p", type: "blocks" }],
});
const positionOf = (id: string) => cycledProjection.nodes.find((node) => node.id === id)?.position;
const p = positionOf("p");
const q = positionOf("q");
const r = positionOf("r");
expect(
	"a cycle still lays out every node",
	cycledProjection.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)),
);
expect(
	"and does not collapse the graph to one column",
	p !== undefined && q !== undefined && r !== undefined && p.x !== q.x && q.x !== r.x,
);
expect(
	"the unclosed part of the loop keeps its order",
	Boolean(p && q && r && p.x < q.x && q.x < r.x),
);
expect(
	"the edge that closed the loop is still projected",
	cycledProjection.edges.some((edge) => edge.source === "r" && edge.target === "p" && edge.relation === "blocks"),
);
expectEqual(
	"same-domain connect proposes blocks",
	proposeConnect("c", "d", "development", "development"),
	{ from: "c", to: "d", type: "blocks" },
);
expectEqual(
	"cross-domain connect does not default to blocks",
	proposeConnect("a", "c", "inquiry", "development"),
	{ from: "a", to: "c", pick: ["relates-to", "discovered-from"] },
);
const selected = issueDetail(overview, "c");
expect("selected issue is in the model", selected !== undefined);
if (selected) {
	expect("click payload has status, comments, documents", pageCarriesDetail(html, selected));
	expect("status is in the page", html.includes("in_progress"));
	expect("comment text is in the page", html.includes("leave this on the ticket"));
	expect("document path is in the page", html.includes(join(".scratch", "drain", "issues", "03-the-drain-work.md")));
}

const pageOverview: PageOverview = {
	...overview,
	commentEndpoint: null,
	overviewEndpoint: null,
	actor: null,
};
const workFace = renderToString(createElement(IssueDetail, { overview: pageOverview, selected: ["c"] }));
const faceAt = workFace.indexOf('id="issue-face"');
const docsAt = workFace.indexOf('id="issue-documents"');
expect("detail pane has a human face", faceAt >= 0 && docsAt > faceAt);
const faceSlice = workFace.slice(faceAt, docsAt);
const docsSlice = workFace.slice(docsAt);
expect("face shows handle, title, domain, status, labels", faceSlice.includes("drain/03") && faceSlice.includes("the drain work") && faceSlice.includes("development") && faceSlice.includes("in_progress") && faceSlice.includes("ready-for-agent"));
expect(
	"neighbour is the blocking issue, not only its id",
	faceSlice.includes("inquiry/01") && faceSlice.includes("the question") && faceSlice.includes('data-neighbour="a"'),
);
expect("face does not open the body", !faceSlice.includes("# drain work") && !faceSlice.includes("machine body"));
expect("comments live in the face as conversation", faceSlice.includes("leave this on the ticket") && faceSlice.includes("data-from"));
expect("comments are not a second document", !faceSlice.includes('class="doc"') && !faceSlice.includes("machine body"));
expect("documents are reachable behind closed details", docsSlice.includes("<details") && !/<details[^>]*\sopen/.test(docsSlice));
expect("documents are the unoptimized machine body", docsSlice.includes("machine body") && docsSlice.includes("# drain work"));
expect("documents are not restyled markdown", !workFace.includes("<h1>drain work</h1>"));
const experimentFace = renderToString(createElement(IssueDetail, { overview: pageOverview, selected: ["b"] }));
expect(
	"crossing neighbour is the other issue plus the relation",
	experimentFace.includes("inquiry/01") && experimentFace.includes("the question") && experimentFace.includes("relates-to"),
);
expect("experiment record stays a reachable machine document", experimentFace.includes('data-doc-kind="record"'));

const calls: string[][] = [];
const listJson = JSON.stringify([
	{
		id: "from-bd",
		title: "From bd",
		status: "open",
		issue_type: "task",
		labels: ["ready-for-agent"],
		metadata: { handle: "demo/01", slug: "from-bd" },
		dependencies: [],
		comment_count: 1,
	},
]);
const showJson = JSON.stringify([
	{
		id: "from-bd",
		title: "From bd",
		status: "open",
		issue_type: "task",
		labels: ["ready-for-agent"],
		metadata: { handle: "demo/01", slug: "from-bd" },
		dependencies: [],
		comment_count: 1,
		comments: [
			{
				id: "n1",
				issue_id: "from-bd",
				author: "op",
				text: "store comment",
				created_at: "2026-09-16T00:00:00Z",
			},
		],
	},
]);
const runner: BdRunner = (args) => {
	calls.push(args);
	const joined = args.join(" ");
	if (joined.includes("issues.jsonl") || args.includes("export")) {
		throw new Error(`store runner was asked for the jsonl export: ${joined}`);
	}
	if (args[0] === "list") return listJson;
	if (args[0] === "show") return showJson;
	throw new Error(`unexpected bd ${joined}`);
};

const fetched = fetchStore(runner);
expectEqual("list is bd list --all --json --limit 0", calls[0], ["list", "--all", "--json", "--limit", "0"]);
expect("comments come from bd show", calls.some((args) => args[0] === "show" && args.includes("--include-comments")));
expectEqual("issues come from bd", fetched.issues.map((item) => item.id), ["from-bd"]);
expectEqual("comments come from bd show", fetched.commentsById.get("from-bd")?.map((item) => item.text), [
	"store comment",
]);
expect(
	"no store call names the jsonl export",
	!calls.some((args) => args.join(" ").includes("jsonl")),
);

const tmp = mkdtempSync(join(tmpdir(), "operator-ui-"));
mkdirSync(join(tmp, ".beads"), { recursive: true });
writeFileSync(
	join(tmp, ".beads", "issues.jsonl"),
	`${JSON.stringify({ id: "from-jsonl", title: "From jsonl", status: "open" })}\n`,
);
mkdirSync(join(tmp, ".scratch", "demo", "issues"), { recursive: true });
writeFileSync(join(tmp, ".scratch", "demo", "issues", "01-from-bd.md"), "body from disk\n");
const fakeBd = join(tmp, "fake-bd");
writeFileSync(
	fakeBd,
	`#!/usr/bin/env bun
const args = process.argv.slice(2);
if (args.includes("list")) {
  process.stdout.write(${JSON.stringify(listJson)});
  process.exit(0);
}
if (args.includes("show")) {
  process.stdout.write(${JSON.stringify(showJson)});
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(fakeBd, 0o755);
const out = join(tmp, "overview.html");
const renderPath = join(dirname(fileURLToPath(import.meta.url)), "render.ts");
const spawned = spawnSync(process.execPath, [renderPath, "--dir", tmp, "--store", fakeBd, "--out", out], {
	encoding: "utf8",
});
expectEqual("render exits 0", spawned.status, 0);
if (spawned.status !== 0) {
	console.error(spawned.stderr);
}
const page = spawned.status === 0 ? readFileSync(out, "utf8") : "";
expect("CLI page is from bd, not jsonl", page.includes("From bd") && !page.includes("From jsonl"));
expect("CLI page has filters", pageHasFilters(page));
expect("CLI page embeds the store comment", page.includes("store comment"));
expect("CLI page embeds the body document", page.includes("body from disk"));

const help = spawnSync(process.execPath, [renderPath, "--help"], { encoding: "utf8" });
expectEqual("help exits 0", help.status, 0);
expect("help names bd, not jsonl", (help.stdout ?? "").includes("via bd") || (help.stdout ?? "").includes("jsonl export"));
expect("help names the overlay sources", (help.stdout ?? "").includes("run lock") && (help.stdout ?? "").includes("Archon"));

const drainLive: LiveRun = {
	kind: "drain",
	id: "run-drain",
	status: "running",
	workflow: "beads-dag-drain",
	pid: 9,
	artifactsDir: join("artifacts", "runs", "run-drain"),
	attempted: ["c"],
	report: { rel: "summary.md", text: "drain last report: merged one" },
	log: null,
};
expectEqual(
	"no lock means no overlay",
	assembleLive({ lock: undefined, archon: [{ id: "run-drain", workflow: "beads-dag-drain", status: "running" }], artifacts: undefined }),
	null,
);
expectEqual(
	"lock without a matching Archon run is not live",
	assembleLive({
		lock: { pid: 9, run: "run-drain" },
		archon: [{ id: "other", workflow: "beads-dag-drain", status: "running" }],
		artifacts: undefined,
	}),
	null,
);
expectEqual(
	"a non-executor workflow is not this overlay",
	assembleLive({
		lock: { pid: 9, run: "run-x" },
		archon: [{ id: "run-x", workflow: "archon-ship", status: "running" }],
		artifacts: undefined,
	}),
	null,
);

const joinedDrain = assembleLive({
	lock: { pid: 9, run: "run-drain" },
	archon: [{ id: "run-drain", workflow: "beads-dag-drain", status: "running" }],
	artifacts: {
		dir: drainLive.artifactsDir!,
		record: { pid: 9, run: "run-drain" },
		attempted: ["c"],
		reports: [
			{ rel: "summary.md", text: "drain last report: merged one" },
			{ rel: "report.md", text: "not the drain report" },
		],
	},
});
expectEqual("drain overlay kind", joinedDrain?.kind, "drain");
expectEqual("drain overlay id", joinedDrain?.id, "run-drain");
expectEqual("drain overlay attempted", joinedDrain?.attempted, ["c"]);
expectEqual("drain last report is summary.md", joinedDrain?.report, drainLive.report);

const joinedInquiry = assembleLive({
	lock: { pid: 8, run: "run-inq" },
	archon: [{ id: "run-inq", workflow: "beads-dag-inquiry", status: "running" }],
	artifacts: {
		dir: "artifacts/runs/run-inq",
		record: { pid: 8, run: "run-inq" },
		attempted: ["a"],
		reports: [{ rel: "report.md", text: "inquiry last report: one draft" }],
	},
});
expectEqual("inquiry overlay kind", joinedInquiry?.kind, "inquiry");
expectEqual("inquiry last report is report.md", joinedInquiry?.report?.rel, "report.md");

const joinedExperiment = assembleLive({
	lock: { pid: 7, run: "run-exp" },
	archon: [{ id: "run-exp", workflow: "beads-dag-experiment", status: "paused" }],
	artifacts: {
		dir: "artifacts/runs/run-exp",
		record: { pid: 7, run: "run-exp" },
		attempted: ["b"],
		reports: [{ rel: "report.md", text: "experiment last report: one row" }],
	},
});
expectEqual("experiment overlay kind", joinedExperiment?.kind, "experiment");
expectEqual("experiment last report is report.md", joinedExperiment?.report?.rel, "report.md");

expectEqual(
	"a run-lock record for another run is not this overlay's artefacts",
	assembleLive({
		lock: { pid: 9, run: "run-drain" },
		archon: [{ id: "run-drain", workflow: "beads-dag-drain", status: "running" }],
		artifacts: {
			dir: "wrong",
			record: { pid: 1, run: "someone-else" },
			attempted: ["nope"],
			reports: [{ rel: "summary.md", text: "wrong report" }],
		},
	})?.attempted,
	[],
);

const liveOverview = assembleOverview(
	[blocker, experiment, work],
	new Map([["c", [comment]]]),
	(item) => documentsFor(item, probe),
	joinedDrain,
);
expectEqual("live overlay rides on the same graph", liveOverview.live?.id, "run-drain");
expectEqual(
	"filter keeps the overlay",
	filterOverview(liveOverview, { types: new Set(["task"]) }).live?.kind,
	"drain",
);
expectEqual(
	"filter still shows all three domains on the unfiltered page",
	liveOverview.issues.map((item) => item.domain),
	["inquiry", "experiment", "development"],
);

const liveHtml = renderPage(liveOverview);
expect("page still covers inquiry, experiment, and drain", pageCoversThreeDomains(liveHtml));
expect("page has type/status/label/feature filters with overlay", pageHasFilters(liveHtml));
expect("page carries the live drain and its last report", joinedDrain !== null && pageCarriesLive(liveHtml, joinedDrain!));
expect("page still carries issue detail", pageCarriesDetail(liveHtml, issueDetail(liveOverview, "c")!));
expect("page does not invent a pack publish API", !liveHtml.includes("publish API") || liveHtml.includes("not a pack publish API"));

const overlaySrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "overlay.ts"), "utf8");
expect(
	"overlay does not import the pack",
	!overlaySrc.includes(".archon/workflows") && !overlaySrc.includes("beads-dag/scripts"),
);
expect("overlay reads the run-lock record", overlaySrc.includes("run-lock.json"));
expect("overlay reads attempted", overlaySrc.includes("attempted-ids.json"));
expect("overlay reads Archon workflow status", overlaySrc.includes("workflow") && overlaySrc.includes("status"));
expect(
	"overlay reads Archon's run JSONL, not a log of its own",
	overlaySrc.includes("logs") && overlaySrc.includes(".jsonl") && !overlaySrc.includes("events.jsonl"),
);

const logEvents = parseArchonLog(
	[
		JSON.stringify({ type: "workflow_start", workflow_id: "run-drain", ts: "t0" }),
		"not json",
		JSON.stringify({ type: "node_start", step: "open", workflow_id: "run-drain", ts: "t1" }),
		JSON.stringify({ type: "exec_output", step: "open", workflow_id: "run-drain" }),
		JSON.stringify({ nope: true }),
		JSON.stringify({ type: "node_start", step: "pick", workflow_id: "run-drain", ts: "t2" }),
	].join("\n"),
);
expectEqual(
	"a bad log line is skipped",
	logEvents.map((event) => event.type),
	["workflow_start", "node_start", "exec_output", "node_start"],
);
expectEqual(
	"the current step is the last node_start not yet complete",
	summariseArchonLog(logEvents, "run-drain"),
	{ rel: "logs/run-drain.jsonl", lastType: "node_start", lastStep: "pick", currentStep: "pick" },
);
expectEqual("an empty log is no log", summariseArchonLog([], "run-drain"), null);
expectEqual(
	"a named operator comment is a user post",
	commentFrom("op", "op"),
	"user",
);
expectEqual("any other author is an assistant post", commentFrom("agent", "op"), "assistant");
expectEqual("an empty author is an assistant post", commentFrom("", "op"), "assistant");

const liveTmp = mkdtempSync(join(tmpdir(), "operator-ui-live-"));
const inited = spawnSync("git", ["-C", liveTmp, "init", "-q"], { encoding: "utf8" });
expectEqual("overlay fixture is a git repo", inited.status, 0);
const gitDir = gitDirOf(liveTmp);
expect("overlay fixture has a git dir", typeof gitDir === "string" && gitDir.length > 0);
const runId = "live-run-id";
if (gitDir) writeFileSync(join(gitDir, RUN_LOCK_NAME), `${process.pid}\n${runId}\n`);
const artifactsDir = join(liveTmp, "artifacts", "runs", runId);
mkdirSync(artifactsDir, { recursive: true });
writeFileSync(
	join(artifactsDir, "run-lock.json"),
	`${JSON.stringify({ run: runId, pid: process.pid, path: join(gitDir ?? "", RUN_LOCK_NAME) })}\n`,
);
writeFileSync(join(artifactsDir, "attempted-ids.json"), `${JSON.stringify(["c"])}\n`);
writeFileSync(join(artifactsDir, "summary.md"), "drain last report: merged one\n");
const statusJson = JSON.stringify({
	runs: [
		{
			id: runId,
			workflow_name: "beads-dag-drain",
			status: "running",
			output_root: liveTmp,
		},
	],
});
const fetchedLive = fetchLive(liveTmp, {
	archonRunner: (args) => {
		expectEqual("Archon is asked for workflow status", args, ["workflow", "status", "--json"]);
		return statusJson;
	},
});
expectEqual("fetchLive kind", fetchedLive?.kind, "drain");
expectEqual("fetchLive id", fetchedLive?.id, runId);
expectEqual("fetchLive attempted from artefacts", fetchedLive?.attempted, ["c"]);
expectEqual("fetchLive last report from artefacts", fetchedLive?.report, {
	rel: "summary.md",
	text: "drain last report: merged one\n",
});
expectEqual("fetchLive artefacts dir", fetchedLive?.artifactsDir, artifactsDir);
expectEqual("a missing Archon log is no log, not a failed overlay", fetchedLive?.log, null);

mkdirSync(join(liveTmp, "logs"), { recursive: true });
writeFileSync(
	join(liveTmp, "logs", `${runId}.jsonl`),
	`${JSON.stringify({ type: "workflow_start", workflow_id: runId })}
${JSON.stringify({ type: "node_start", step: "open", workflow_id: runId })}
`,
);
const fetchedWithLog = fetchLive(liveTmp, { archonRunner: () => statusJson });
expectEqual("fetchLive joins Archon's run JSONL", fetchedWithLog?.log?.rel, `logs/${runId}.jsonl`);
expectEqual("fetchLive current step is the last node_start", fetchedWithLog?.log?.currentStep, "open");
expectEqual("the log does not drop the last report", fetchedWithLog?.report?.rel, "summary.md");

writeFileSync(join(gitDir ?? liveTmp, RUN_LOCK_NAME), `2147483646\n${runId}\n`);
expectEqual("a dead lock holder is not in progress", fetchLive(liveTmp, { archonRunner: () => statusJson }), null);

const fakeArchon = join(liveTmp, "fake-archon");
writeFileSync(
	fakeArchon,
	`#!/usr/bin/env bun
const args = process.argv.slice(2);
if (args[0] === "workflow" && args[1] === "status") {
  process.stdout.write(${JSON.stringify(statusJson)});
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(fakeArchon, 0o755);
writeFileSync(join(gitDir ?? liveTmp, RUN_LOCK_NAME), `${process.pid}\n${runId}\n`);
mkdirSync(join(liveTmp, ".beads"), { recursive: true });
writeFileSync(
	join(liveTmp, ".beads", "issues.jsonl"),
	`${JSON.stringify({ id: "from-jsonl", title: "From jsonl", status: "open" })}\n`,
);
const liveBd = join(liveTmp, "fake-bd");
writeFileSync(
	liveBd,
	`#!/usr/bin/env bun
const args = process.argv.slice(2);
if (args.includes("list")) {
  process.stdout.write(${JSON.stringify(listJson)});
  process.exit(0);
}
if (args.includes("show")) {
  process.stdout.write(${JSON.stringify(showJson)});
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(liveBd, 0o755);
const liveOut = join(liveTmp, "overview.html");
const liveSpawned = spawnSync(
	process.execPath,
	[renderPath, "--dir", liveTmp, "--store", liveBd, "--archon", fakeArchon, "--out", liveOut],
	{ encoding: "utf8" },
);
expectEqual("live render exits 0", liveSpawned.status, 0);
if (liveSpawned.status !== 0) console.error(liveSpawned.stderr);
const livePage = liveSpawned.status === 0 ? readFileSync(liveOut, "utf8") : "";
expect("CLI page overlays the live drain", livePage.includes("run-drain") === false && livePage.includes(runId));
expect("CLI page carries the last report", livePage.includes("drain last report: merged one"));
expect("CLI page still covers inquiry, experiment, and drain", pageCoversThreeDomains(livePage));
expect("CLI page is still from bd, not jsonl", livePage.includes("From bd") && !livePage.includes("From jsonl"));

const writes: { args: string[]; stdin: string | undefined }[] = [];
let listStdout = "[]";
const writeRunner: BdWriteRunner = (args, stdin) => {
	writes.push({ args, stdin });
	if (args[0] === "list") return listStdout;
	return "";
};
applyOperatorAction(writeRunner, JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this" }));
expectEqual("comment intent is bd comment", writes, [{ args: ["comment", "from-bd", "--stdin"], stdin: "leave this" }]);
expect(
	"comment intent is not human respond, close, or a label",
	writes.every(
		(call) =>
			call.args[0] === "comment" &&
			!call.args.includes("human") &&
			!call.args.includes("respond") &&
			!call.args.includes("close") &&
			!call.args.includes("label") &&
			!call.args.includes("update"),
	),
);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "comment", id: "from-bd", text: "named" }),
	{ actor: "bob" },
);
expectEqual("comment intent passes the door's actor", writes, [
	{ args: ["--actor", "bob", "comment", "from-bd", "--stdin"], stdin: "named" },
]);

function refusedAction(raw: string, extras: { dir?: string; issues?: StoreIssue[] } = {}): { refused: boolean; message: string } {
	try {
		applyOperatorAction(writeRunner, raw, extras);
		return { refused: false, message: "" };
	} catch (error) {
		return {
			refused: error instanceof OperatorActionRefused,
			message: error instanceof Error ? error.message : String(error),
		};
	}
}

writes.length = 0;
const closedField = refusedAction(JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this", closed: true }));
expect("closed field is refused", closedField.refused);
expect("closed field names closed", closedField.message.includes("closed"));
expectEqual("closed field does not write", writes, []);

writes.length = 0;
const smuggledAuthor = refusedAction(JSON.stringify({ intent: "comment", id: "from-bd", text: "x", author: "eve" }));
expect("body author is refused", smuggledAuthor.refused);
expect("body author names the door", smuggledAuthor.message.includes("door"));
expectEqual("body author does not write", writes, []);
writes.length = 0;
const smuggledActor = refusedAction(JSON.stringify({ intent: "comment", id: "from-bd", text: "x", actor: "eve" }));
expect("body actor is refused", smuggledActor.refused);
expectEqual("body actor does not write", writes, []);

writes.length = 0;
const emptyComment = refusedAction(JSON.stringify({ intent: "comment", id: "from-bd", text: "   " }));
expect("empty comment is refused", emptyComment.refused);
expectEqual("empty comment does not write", writes, []);

const deletable = [issue({ id: "from-bd", status: "open" })];
expectEqual("an open issue with no dependents can be deleted", planDelete("from-bd", deletable), {
	ok: true,
	id: "from-bd",
});
expectEqual("an open set with no dependents can be deleted", planDeleteAll(["from-bd"], deletable), {
	ok: true,
	id: "from-bd",
});
expectEqual("an empty set is not a delete", planDeleteAll([], deletable), {
	ok: false,
	reason: "delete needs an issue id",
});
writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "delete", id: "from-bd", confirm: true }),
	{ issues: deletable },
);
expectEqual("delete is bd delete --force", writes, [{ args: ["delete", "from-bd", "--force"], stdin: undefined }]);
expect("delete is not cascade", !writes[0]?.args.includes("--cascade"));

writes.length = 0;
const noConfirm = refusedAction(JSON.stringify({ intent: "delete", id: "from-bd" }), { issues: deletable });
expect("delete without confirm is refused", noConfirm.refused);
expectEqual("delete without confirm does not write", writes, []);

writes.length = 0;
const claimed = refusedAction(JSON.stringify({ intent: "delete", id: "from-bd", confirm: true }), {
	issues: [issue({ id: "from-bd", status: "in_progress" })],
});
expect("in_progress delete is refused", claimed.refused && claimed.message.includes("in_progress"));
expectEqual("in_progress delete does not write", writes, []);

writes.length = 0;
const blockedDelete = refusedAction(JSON.stringify({ intent: "delete", id: "from-bd", confirm: true }), {
	issues: [issue({ id: "from-bd" }), issue({ id: "child", dependencies: [{ id: "from-bd", type: "blocks" }] })],
});
expect("a dependent blocks delete", blockedDelete.refused && blockedDelete.message.includes("dependents"));
expectEqual("a dependent delete does not write", writes, []);
expectEqual(
	"a set containing in_progress is refused",
	planDeleteAll(
		["open-one", "claimed"],
		[issue({ id: "open-one", status: "open" }), issue({ id: "claimed", status: "in_progress" })],
	),
	{ ok: false, reason: "in_progress is refused" },
);
expectEqual(
	"a set containing a blocker of an outsider is refused",
	planDeleteAll(
		["from-bd"],
		[issue({ id: "from-bd" }), issue({ id: "child", dependencies: [{ id: "from-bd", type: "blocks" }] })],
	),
	{ ok: false, reason: "issue has dependents" },
);
expectEqual(
	"a set of two open issues with no dependents can be deleted",
	planDeleteAll(
		["from-bd", "other"],
		[issue({ id: "from-bd", status: "open" }), issue({ id: "other", status: "open" })],
	),
	{ ok: true, id: "from-bd" },
);

writes.length = 0;
const cascadeBody = refusedAction(JSON.stringify({ intent: "delete", id: "from-bd", confirm: true, cascade: true }), {
	issues: deletable,
});
expect("cascade on the body is refused", cascadeBody.refused);
expectEqual("cascade on the body does not write", writes, []);
writes.length = 0;
const forceBody = refusedAction(JSON.stringify({ intent: "delete", id: "from-bd", confirm: true, force: true }), {
	issues: deletable,
});
expect("force on the body is refused", forceBody.refused);
expectEqual("force on the body does not write", writes, []);

writes.length = 0;
const closeField = refusedAction(JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this", close: true }));
expect("close field is refused", closeField.refused);
expectEqual("close field does not write", writes, []);

writes.length = 0;
const closedIntent = refusedAction(JSON.stringify({ intent: "closed", id: "from-bd", text: "leave this" }));
expect("closed intent is refused", closedIntent.refused);
expectEqual("closed intent does not write", writes, []);

writes.length = 0;
const readingField = refusedAction(JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this", "reading:": "none" }));
expect("reading: field is refused", readingField.refused);
expect("reading: field names reading:", readingField.message.includes("reading:"));
expectEqual("reading: field does not write", writes, []);

writes.length = 0;
const readingLabel = refusedAction(
	JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this", labels: ["reading:none"] }),
);
expect("reading: label is refused", readingLabel.refused);
expectEqual("reading: label does not write", writes, []);

writes.length = 0;
const readingIntent = refusedAction(JSON.stringify({ intent: "reading:", id: "from-bd", text: "leave this" }));
expect("reading: intent is refused", readingIntent.refused);
expectEqual("reading: intent does not write", writes, []);

writes.length = 0;
const unknownIntent = refusedAction(JSON.stringify({ intent: "explode", id: "from-bd", text: "leave this" }));
expect("unknown intent is refused", unknownIntent.refused);
expect("unknown intent names unknown", unknownIntent.message.includes("unknown intent"));
expectEqual("unknown intent does not write", writes, []);

writes.length = 0;
const connectIntent = refusedAction(JSON.stringify({ intent: "connect", from: "a", to: "c" }));
expect("connect intent is refused", connectIntent.refused);
expectEqual("connect intent does not write", writes, []);

const taskOne = issue({ id: "t1", title: "one", type: "task" });
const taskTwo = issue({ id: "t2", title: "two", type: "task" });
const decisionOne = issue({ id: "q1", title: "question", type: "decision" });
const experimentOne = issue({ id: "e1", title: "run", type: "experiment" });
const edgeIssues = [taskOne, taskTwo, decisionOne, experimentOne];

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "add-edge", from: "t1", to: "t2", type: "blocks" }),
	{ issues: edgeIssues },
);
expectEqual("same-domain blocks is dep add of dependent onto blocker", writes, [
	{ args: ["dep", "add", "t2", "t1"], stdin: undefined },
]);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "remove-edge", from: "t1", to: "t2", type: "blocks" }),
	{
		issues: [
			taskOne,
			issue({ id: "t2", title: "two", type: "task", dependencies: [{ id: "t1", type: "blocks" }] }),
			decisionOne,
			experimentOne,
		],
	},
);
expectEqual("same-domain blocks remove is dep remove", writes, [
	{ args: ["dep", "remove", "t2", "t1"], stdin: undefined },
]);

writes.length = 0;
const crossBlocks = refusedAction(
	JSON.stringify({ intent: "add-edge", from: "q1", to: "t1", type: "blocks" }),
	{ issues: edgeIssues },
);
expect("cross-domain blocks is refused", crossBlocks.refused);
expect("cross-domain blocks names blocks", crossBlocks.message.includes("blocks"));
expectEqual("cross-domain blocks does not write", writes, []);

writes.length = 0;
const parentChild = refusedAction(
	JSON.stringify({ intent: "add-edge", from: "t1", to: "t2", type: "parent-child" }),
	{ issues: edgeIssues },
);
expect("parent-child is refused", parentChild.refused);
expect("parent-child names parent-child", parentChild.message.includes("parent-child"));
expectEqual("parent-child does not write", writes, []);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "add-edge", from: "e1", to: "t1", type: "relates-to" }),
	{ issues: edgeIssues },
);
expectEqual("crossing relates-to is dep relate", writes, [
	{ args: ["dep", "relate", "e1", "t1"], stdin: undefined },
]);
expect(
	"relates-to is not a blocking dep add",
	writes.every((call) => call.args[1] === "relate" && !call.args.includes("blocks")),
);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "remove-edge", from: "e1", to: "t1", type: "relates-to" }),
	{
		issues: [
			taskOne,
			taskTwo,
			decisionOne,
			issue({ id: "e1", title: "run", type: "experiment", dependencies: [{ id: "t1", type: "relates-to" }] }),
		],
	},
);
expectEqual("relates-to remove is unrelate", writes, [
	{ args: ["dep", "unrelate", "e1", "t1"], stdin: undefined },
]);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "add-edge", from: "e1", to: "t1", type: "discovered-from" }),
	{ issues: edgeIssues },
);
expectEqual("crossing discovered-from is dep add of derived onto source", writes, [
	{ args: ["dep", "add", "t1", "e1", "--type", "discovered-from"], stdin: undefined },
]);
expect("discovered-from does not write blocks", !writes.some((call) => call.args.includes("blocks")));

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "remove-edge", from: "e1", to: "t1", type: "discovered-from" }),
	{
		issues: [
			issue({ id: "t1", title: "one", type: "task", dependencies: [{ id: "e1", type: "discovered-from" }] }),
			taskTwo,
			decisionOne,
			experimentOne,
		],
	},
);
expectEqual("discovered-from remove is dep remove", writes, [
	{ args: ["dep", "remove", "t1", "e1"], stdin: undefined },
]);

writes.length = 0;
const missingRelation = refusedAction(
	JSON.stringify({ intent: "remove-edge", from: "t1", to: "t2", type: "blocks" }),
	{ issues: edgeIssues },
);
expect("removing a missing relation is refused", missingRelation.refused);
expectEqual("removing a missing relation does not write", writes, []);

writes.length = 0;
const parentChildRemove = refusedAction(
	JSON.stringify({ intent: "remove-edge", from: "t1", to: "t2", type: "parent-child" }),
	{
		issues: [
			taskOne,
			issue({ id: "t2", title: "two", type: "task", dependencies: [{ id: "t1", type: "parent-child" }] }),
			decisionOne,
			experimentOne,
		],
	},
);
expect("parent-child remove is refused", parentChildRemove.refused);
expectEqual("parent-child remove does not write", writes, []);

writes.length = 0;
const alreadyRelated = refusedAction(
	JSON.stringify({ intent: "add-edge", from: "t1", to: "t2", type: "relates-to" }),
	{
		issues: [
			taskOne,
			issue({ id: "t2", title: "two", type: "task", dependencies: [{ id: "t1", type: "blocks" }] }),
			decisionOne,
			experimentOne,
		],
	},
);
expect("a second relation on the same pair is refused", alreadyRelated.refused);
expectEqual("a second relation does not write", writes, []);

writes.length = 0;
const missingIntent = refusedAction(JSON.stringify({ id: "from-bd", text: "leave this" }));
expect("missing intent is refused", missingIntent.refused);
expectEqual("missing intent does not write", writes, []);

writes.length = 0;
const humanRespond = refusedAction(JSON.stringify({ intent: "human-respond", id: "from-bd", text: "leave this" }));
expect("human-respond intent is refused", humanRespond.refused);
expectEqual("human-respond intent does not write", writes, []);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "triage", id: "from-bd", label: "ready-for-agent" }),
);
expectEqual("ready-for-agent replaces the family", writes, [
	{
		args: [
			"update",
			"from-bd",
			"--add-label",
			"ready-for-agent",
			"--remove-label",
			"needs-triage",
			"--remove-label",
			"needs-info",
			"--remove-label",
			"ready-for-human",
			"--remove-label",
			"wontfix",
		],
		stdin: undefined,
	},
]);
expect(
	"ready-for-agent is not a close",
	writes.every((call) => call.args[0] === "update" && !call.args.includes("close") && !call.args.includes("closed")),
);

writes.length = 0;
applyOperatorAction(writeRunner, JSON.stringify({ intent: "triage", id: "from-bd", label: "needs-info" }));
expectEqual("needs-info brake replaces the family", writes, [
	{
		args: [
			"update",
			"from-bd",
			"--add-label",
			"needs-info",
			"--remove-label",
			"needs-triage",
			"--remove-label",
			"ready-for-agent",
			"--remove-label",
			"ready-for-human",
			"--remove-label",
			"wontfix",
		],
		stdin: undefined,
	},
]);

writes.length = 0;
applyOperatorAction(writeRunner, JSON.stringify({ intent: "triage", id: "from-bd", label: "needs-triage" }));
expectEqual("needs-triage brake replaces the family", writes, [
	{
		args: [
			"update",
			"from-bd",
			"--add-label",
			"needs-triage",
			"--remove-label",
			"needs-info",
			"--remove-label",
			"ready-for-agent",
			"--remove-label",
			"ready-for-human",
			"--remove-label",
			"wontfix",
		],
		stdin: undefined,
	},
]);

writes.length = 0;
applyOperatorAction(writeRunner, JSON.stringify({ intent: "triage", id: "from-bd", label: "ready-for-human" }));
expectEqual("ready-for-human replaces the family", writes, [
	{
		args: [
			"update",
			"from-bd",
			"--add-label",
			"ready-for-human",
			"--remove-label",
			"needs-triage",
			"--remove-label",
			"needs-info",
			"--remove-label",
			"ready-for-agent",
			"--remove-label",
			"wontfix",
		],
		stdin: undefined,
	},
]);

writes.length = 0;
applyOperatorAction(writeRunner, JSON.stringify({ intent: "triage", id: "from-bd", label: "wontfix" }));
expectEqual("wontfix replaces the family", writes, [
	{
		args: [
			"update",
			"from-bd",
			"--add-label",
			"wontfix",
			"--remove-label",
			"needs-triage",
			"--remove-label",
			"needs-info",
			"--remove-label",
			"ready-for-agent",
			"--remove-label",
			"ready-for-human",
		],
		stdin: undefined,
	},
]);
expect(
	"wontfix is a label, not a close",
	writes.every(
		(call) =>
			call.args[0] === "update" &&
			call.args.includes("--add-label") &&
			call.args.includes("wontfix") &&
			!call.args.includes("close") &&
			!call.args.includes("closed") &&
			!call.args.includes("status"),
	),
);

writes.length = 0;
const missingTriageLabel = refusedAction(JSON.stringify({ intent: "triage", id: "from-bd" }));
expect("triage without a label is refused", missingTriageLabel.refused);
expectEqual("triage without a label does not write", writes, []);

writes.length = 0;
const ideaTriage = refusedAction(JSON.stringify({ intent: "triage", id: "from-bd", label: "idea:bare" }));
expect("idea:* label write is refused", ideaTriage.refused);
expectEqual("idea:* does not write", writes, []);

writes.length = 0;
const readingTriage = refusedAction(JSON.stringify({ intent: "triage", id: "from-bd", label: "reading:none" }));
expect("reading: via triage is refused", readingTriage.refused);
expectEqual("reading: via triage does not write", writes, []);

writes.length = 0;
const experimentTriage = refusedAction(JSON.stringify({ intent: "triage", id: "from-bd", label: "experiment" }));
expect("non-triage label write is refused", experimentTriage.refused);
expectEqual("non-triage label does not write", writes, []);

writes.length = 0;
const ideaOnComment = refusedAction(
	JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this", labels: ["idea:argued"] }),
);
expect("idea:* on a comment is refused", ideaOnComment.refused);
expectEqual("idea:* on a comment does not write", writes, []);

writes.length = 0;
const ideaField = refusedAction(
	JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this", "idea:bare": true }),
);
expect("idea:* field is refused", ideaField.refused);
expectEqual("idea:* field does not write", writes, []);

writes.length = 0;
const badWrite = refusedAction("not-json");
expect("non-JSON write is refused", badWrite.refused);
expectEqual("non-JSON write does not write", writes, []);

function createArgs(): string[] {
	return writes.find((call) => call.args[0] === "create")?.args ?? [];
}
function flagAfter(args: string[], name: string): string | undefined {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
}

writes.length = 0;
const createNoType = refusedAction(JSON.stringify({ intent: "create", feature: "drain", title: "the work" }));
expect("create without a type is refused", createNoType.refused);
expect("create without a type names type", createNoType.message.includes("type"));
expectEqual("create without a type does not write", writes, []);

writes.length = 0;
const createClosed = refusedAction(
	JSON.stringify({ intent: "create", type: "task", feature: "drain", title: "the work", closed: true }),
);
expect("create carrying closed is refused", createClosed.refused);
expectEqual("create carrying closed does not write", writes, []);

const createDir = mkdtempSync(join(tmpdir(), "operator-ui-create-"));
writes.length = 0;
listStdout = "[]";
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", type: "task", feature: "drain", title: "the work" }),
	{ dir: createDir },
);
const taskCreated = createArgs();
expect("create task wrote a bead", taskCreated[0] === "create");
expectEqual("create task type", flagAfter(taskCreated, "--type"), "task");
expectEqual("create task labels", flagAfter(taskCreated, "--labels"), "needs-triage");
expect("create does not apply the gate", !taskCreated.includes("ready-for-agent") && !(flagAfter(taskCreated, "--labels") ?? "").includes("ready-for-agent"));
const taskMeta = JSON.parse(flagAfter(taskCreated, "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("create task handle", taskMeta.handle, "drain/01");
expectEqual("create task slug", taskMeta.slug, "the-work");
const taskBody = join(createDir, ".scratch", "drain", "issues", "01-the-work.md");
expect("create task wrote the body", existsSync(taskBody));
const taskText = existsSync(taskBody) ? readFileSync(taskBody, "utf8") : "";
expect("task body carries the handle", taskText.includes("drain/01"));
expect("task body carries the prose", taskText.includes("the work"));
expect("task body has no status", !/status\s*:/i.test(taskText));
expect(
	"create listed then created",
	writes[0]?.args[0] === "list" && writes.some((call) => call.args[0] === "create"),
);

const experimentDir = mkdtempSync(join(tmpdir(), "operator-ui-create-exp-"));
writes.length = 0;
listStdout = "[]";
applyOperatorAction(
	writeRunner,
	JSON.stringify({
		intent: "create",
		type: "experiment",
		feature: "lab",
		title: "the run",
		prose: "measure x against the pin",
	}),
	{ dir: experimentDir },
);
const experimentCreated = createArgs();
expectEqual("create experiment type", flagAfter(experimentCreated, "--type"), "experiment");
expectEqual("create experiment labels", flagAfter(experimentCreated, "--labels"), "needs-triage,experiment");
expect("experiment create does not apply the gate", !(flagAfter(experimentCreated, "--labels") ?? "").includes("ready-for-agent"));
const experimentMeta = JSON.parse(flagAfter(experimentCreated, "--metadata") ?? "{}") as {
	handle?: string;
	slug?: string;
};
expectEqual("create experiment handle", experimentMeta.handle, "lab/01");
expectEqual("create experiment slug", experimentMeta.slug, "the-run");
const experimentBody = join(experimentDir, ".scratch", "lab", "issues", "01-the-run.md");
expect("create experiment wrote the body", existsSync(experimentBody));
const experimentText = existsSync(experimentBody) ? readFileSync(experimentBody, "utf8") : "";
expect("experiment body carries the handle", experimentText.includes("lab/01"));
expect("experiment body carries the prose", experimentText.includes("measure x against the pin"));
expect("experiment body has no status", !/status\s*:/i.test(experimentText));

const allocDir = mkdtempSync(join(tmpdir(), "operator-ui-create-alloc-"));
writes.length = 0;
listStdout = JSON.stringify([
	{ id: "x", metadata: { handle: "lab/02", slug: "later" } },
	{ id: "y", metadata: { handle: "lab/01", slug: "earlier" } },
	{ id: "z", metadata: { handle: "drain/09", slug: "other" } },
]);
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", type: "decision", feature: "lab", title: "next question" }),
	{ dir: allocDir },
);
const allocMeta = JSON.parse(flagAfter(createArgs(), "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("create allocates the next unused NN", allocMeta.handle, "lab/03");
expectEqual("create slug from title", allocMeta.slug, "next-question");
expectEqual("create decision labels are triage only", flagAfter(createArgs(), "--labels"), "needs-triage");

const fileAllocDir = mkdtempSync(join(tmpdir(), "operator-ui-create-file-"));
mkdirSync(join(fileAllocDir, ".scratch", "lab", "issues"), { recursive: true });
writeFileSync(join(fileAllocDir, ".scratch", "lab", "issues", "03-existing.md"), "# lab/03 — existing\n");
writes.length = 0;
listStdout = "[]";
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", type: "task", feature: "lab", title: "after a body" }),
	{ dir: fileAllocDir },
);
const fileAllocMeta = JSON.parse(flagAfter(createArgs(), "--metadata") ?? "{}") as { handle?: string };
expectEqual("create skips a body file's NN", fileAllocMeta.handle, "lab/04");
listStdout = "[]";

const servedHtml = renderPage(overview, { commentEndpoint: "/comment", overviewEndpoint: "/overview" });
expect("served page offers a reply endpoint", pageOffersReply(servedHtml));
expect("served page offers a refresh endpoint", pageOffersRefresh(servedHtml));
expect("served page offers the palette", pageOffersPalette(servedHtml));
expect(
	"the create dialog is in the served DOM while it is closed",
	pageCreateStaysInDomWhileClosed(servedHtml),
);
expect("served page offers create", pageOffersCreate(servedHtml));
expect("create form requires a type", servedHtml.includes('id="create-type"') && servedHtml.includes("Select a type"));
expect("served page offers start", pageOffersStart(servedHtml));
expect("served page still carries issue detail", pageCarriesDetail(servedHtml, issueDetail(overview, "c")!));
expect("served page still has filters", pageHasFilters(servedHtml));
expect(
	"served page has no close or label control",
	!servedHtml.includes('name="close"') &&
		!servedHtml.includes("bd close") &&
		!servedHtml.includes('name="labels"') &&
		!servedHtml.includes("bd human"),
);
const taggedWrites = [
	{ intent: "comment", id: "from-bd", text: "leave this" },
	{ intent: "create", type: "task", feature: "drain", title: "the work", prose: "" },
	{ intent: "start", ids: ["c", "d"] },
	{ intent: "add-edge", from: "t1", to: "t2", type: "blocks" },
	{ intent: "remove-edge", from: "t1", to: "t2", type: "blocks" },
	{ intent: "triage", id: "from-bd", label: "ready-for-agent" },
	{ intent: "delete", id: "from-bd", confirm: true },
];
const originalFetch = globalThis.fetch;
const clientPosts: { method: string; contentType: string; body: unknown }[] = [];
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
	const headers = new Headers(init?.headers);
	clientPosts.push({
		method: init?.method ?? "GET",
		contentType: headers.get("content-type") ?? "",
		body: JSON.parse(String(init?.body ?? "null")),
	});
	return new Response("", { status: 204 });
}) as typeof fetch;
try {
	for (const body of taggedWrites) {
		await postOperatorAction("/comment", body);
	}
} finally {
	globalThis.fetch = originalFetch;
}
expectEqual(
	"one client post is POST json",
	clientPosts.map((entry) => ({ method: entry.method, contentType: entry.contentType })),
	taggedWrites.map(() => ({ method: "POST", contentType: "application/json" })),
);
expectEqual("one client post carries every tagged write", clientPosts.map((entry) => entry.body), taggedWrites);
globalThis.fetch = (async () => new Response("closed is refused", { status: 400 })) as unknown as typeof fetch;
let clientRefusal = "";
try {
	await postOperatorAction("/comment", { intent: "comment", id: "from-bd", text: "leave this", closed: true });
} catch (error) {
	clientRefusal = error instanceof Error ? error.message : String(error);
} finally {
	globalThis.fetch = originalFetch;
}
expect("one client post surfaces the door's refusal", clientRefusal.includes("closed is refused"));
const clientDir = dirname(fileURLToPath(import.meta.url));
const clientSrc = readFileSync(join(clientDir, "client.ts"), "utf8");
expect(
	"the client post does not pull the door or the store",
	!clientSrc.includes("./store") && !clientSrc.includes("./actions") && !clientSrc.includes("child_process"),
);
function perIntentClientGone(name: string): boolean {
	const path = join(clientDir, name);
	if (!existsSync(path)) return true;
	const text = readFileSync(path, "utf8");
	return !text.includes("export function") && !text.includes("JSON.stringify") && !text.includes("fetch(");
}
expect(
	"per-intent client modules are gone",
	perIntentClientGone("client-comment.ts") &&
		perIntentClientGone("client-create.ts") &&
		perIntentClientGone("client-delete.ts") &&
		perIntentClientGone("client-edge.ts") &&
		perIntentClientGone("client-start.ts") &&
		perIntentClientGone("client-triage.ts"),
);
expect("served page offers the comment door", pageOffersReply(servedHtml));
const graphSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "Graph.tsx"), "utf8");
expect("graph uses React Flow", graphSrc.includes("@xyflow/react"));
expect("graph connect does not addEdge as the record", !/\baddEdge\b/.test(graphSrc));
expect("graph connect proposes into operator-actions", graphSrc.includes("proposeConnect"));
expect("graph offers a show-all control", graphSrc.includes("graph-show-all"));
expect(
	"graph frames a neighbourhood unless show-all is on",
	graphSrc.includes("showAll") && graphSrc.includes("projectGraph"),
);
expect(
	"a successful edge write re-reads the store instead of reloading",
	graphSrc.includes("onWritten()") && !graphSrc.includes("location.reload"),
);
const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "App.tsx"), "utf8");
expect(
	"a write invalidates the overview query rather than reloading the page",
	appSrc.includes("invalidateQueries") && !appSrc.includes("location.reload"),
);
expect(
	"the page polls only while a run is live",
	appSrc.includes("refetchInterval") && appSrc.includes("state.data?.live"),
);
expect(
	"a refused remove is not applied onto React edges",
	graphSrc.includes('change.type !== "remove"') && graphSrc.includes("writeEdge(\"remove-edge\""),
);
expect(
	"dragging a box selects the issues inside it",
	graphSrc.includes("selectionOnDrag") && !graphSrc.includes("selectionOnDrag={false}"),
);
expect("Shift adds to the box selection", graphSrc.includes('multiSelectionKeyCode="Shift"'));
expect("box selection is reported to the page", graphSrc.includes("onSelectionChange"));
expect(
	"an edge write does not refit the canvas",
	!/^\s*fitView\s*$/m.test(graphSrc) && graphSrc.includes("fitView()"),
);
expect(
	"Delete on selected nodes opens confirm delete",
	graphSrc.includes("onAskDelete") && appSrc.includes("onAskDelete"),
);
expect(
	"confirm delete takes the selected set",
	appSrc.includes("planDeleteAll") &&
		appSrc.includes('intent: "delete"') &&
		appSrc.includes("confirm: true"),
);
expect("surface has a triage form", appSrc.includes('id="triage-form"'));
expect("surface posts through the one client", appSrc.includes("postOperatorAction"));
expect("surface offers the five triage labels", appSrc.includes("TRIAGE_LABELS"));
expect("surface can mark wontfix as a label", appSrc.includes("wontfix"));
expect("surface does not close from triage", !appSrc.includes("bd close") && !appSrc.includes('name="close"'));
expect(
	"writes report through one toast path",
	appSrc.includes("toast.success") && appSrc.includes("toast.error"),
);
expect(
	"the inline status line survives the toast",
	appSrc.includes('id="triage-status"') && appSrc.includes('id="reply-status"'),
);
expect(
	"the palette is cmdk and posts only the door's intents",
	appSrc.includes('from "cmdk"') && appSrc.includes("postOperatorAction"),
);
expect(
	"the palette opens on Cmd or Ctrl K",
	appSrc.includes("metaKey") && appSrc.includes('event.key.toLowerCase() === "k"'),
);
const mdSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "markdown.tsx"), "utf8");
const mdImports = mdSrc
	.split("\n")
	.filter((line) => line.startsWith("import "))
	.join("\n");
expect(
	"markdown is react-markdown with no raw-HTML plugin",
	mdImports.includes('from "react-markdown"') &&
		!mdImports.includes("rehype") &&
		!mdImports.includes("remark"),
);
expect(
	"the surface imports icons by name so only the used ones can bundle",
	appSrc.includes('from "lucide-react"') && !appSrc.includes("import * as"),
);
expect(
	"the list is windowed with react-virtual",
	appSrc.includes('from "@tanstack/react-virtual"') && appSrc.includes("useVirtualizer"),
);
expect(
	"the list columns are react-table",
	appSrc.includes('from "@tanstack/react-table"') && appSrc.includes("useReactTable"),
);
expect(
	"comments render as Message / Bubble, not a bare article.comment",
	appSrc.includes('from "./message.tsx"') &&
		appSrc.includes('from "./bubble.tsx"') &&
		!appSrc.includes('className="comment"'),
);
expect(
	"documents stay closed details of raw text, not restyled markdown",
	appSrc.includes("machine body") &&
		appSrc.includes("data-doc-kind") &&
		appSrc.includes("<pre>{doc.text}</pre>") &&
		!appSrc.includes("<MarkdownBody text={doc.text} />"),
);
const serveSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "serve.ts"), "utf8");
expect("the listener is Bun.serve, not node:http", serveSrc.includes("Bun.serve") && !serveSrc.includes("node:http"));
expect(
	"delete is a tagged intent behind confirm, not a canvas key",
	appSrc.includes('intent: "delete"') &&
		appSrc.includes("confirm: true") &&
		readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "Graph.tsx"), "utf8").includes('change.type !== "remove"'),
);
const listSrc = appSrc.slice(appSrc.indexOf("function IssueList"), appSrc.indexOf("function Filters"));
expect("the list exists and only selects: no write goes out from it", listSrc.length > 0 && !listSrc.includes("post"));
expect("create form stays in the page module", appSrc.includes("function CreateForm"));
expect(
	"the page does not import a per-intent client",
	!appSrc.includes("client-comment") &&
		!appSrc.includes("client-create") &&
		!appSrc.includes("client-delete") &&
		!appSrc.includes("client-edge") &&
		!appSrc.includes("client-start") &&
		!appSrc.includes("client-triage") &&
		graphSrc.includes("postOperatorAction") &&
		!graphSrc.includes("client-edge"),
);
const kitSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "kit.tsx"), "utf8");
expect("a dialog closes on Escape", kitSrc.includes("Escape"));
const familySrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "triage-labels.ts"), "utf8");
expect("gate is on the surface", familySrc.includes("ready-for-agent") && appSrc.includes("TRIAGE_LABELS"));
expect(
	"a brake is on the surface",
	familySrc.includes("needs-info") && familySrc.includes("needs-triage") && appSrc.includes("TRIAGE_LABELS"),
);

const doorWrites: { args: string[]; stdin: string | undefined }[] = [];
const handler = {
	write: ((args: string[], stdin?: string) => {
		doorWrites.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () =>
		renderPage(overview, { commentEndpoint: "/comment", overviewEndpoint: "/overview", cacheClient: true }),
	overview: () => JSON.stringify({ ...overview, commentEndpoint: "/comment", overviewEndpoint: "/overview" }),
	assets: () => clientAssets(),
};
const getPage = await handleOverviewRequest({ method: "GET", url: "/" }, "", handler);
expectEqual("GET / is 200", getPage.status, 200);
expect("GET / offers a reply endpoint", pageOffersReply(getPage.body));
expect("GET / offers create", pageOffersCreate(getPage.body));
expect("GET / links its client instead of carrying 1.2 MB of it", pageCachesClient(getPage.body));
expect("GET / is still a module script, now fetched", pageClientIsModule(getPage.body));
const getJs = await handleOverviewRequest({ method: "GET", url: CLIENT_ASSETS.js }, "", handler);
expectEqual("GET /app.js is 200", getJs.status, 200);
expect(
	"the client is served as JavaScript, not as HTML",
	getJs.headers["content-type"] === "text/javascript; charset=utf-8",
);
expect("the client is revalidated, not trusted blind", getJs.headers["cache-control"] === "no-cache");
expect("the client carries a strong validator", (getJs.headers["etag"] ?? "").startsWith('"'));
expect("the served script is the built module, not a stub", getJs.body.includes("createElement"));
// A development React in the served client is a silent 263 KB: react-dom's exports map picks the
// development build unless the build defines NODE_ENV, and nothing else would notice.
expect(
	"the client ships the production React, not the development one",
	!getJs.body.includes("Each child in a list") &&
		readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "build.ts"), "utf8").includes(
			"process.env.NODE_ENV",
		),
);
const getCss = await handleOverviewRequest({ method: "GET", url: CLIENT_ASSETS.css }, "", handler);
expectEqual("GET /app.css is 200", getCss.status, 200);
expect("the sheet is served as CSS", getCss.headers["content-type"] === "text/css; charset=utf-8");
expect(
	"the sheet carries the legacy components and React Flow's own",
	getCss.body.includes("issue-node") && getCss.body.includes("react-flow"),
);
const revalidated = await handleOverviewRequest(
	{ method: "GET", url: CLIENT_ASSETS.js, headers: { "if-none-match": getJs.headers["etag"] ?? "" } },
	"",
	handler,
);
expectEqual("an unchanged client is 304, not a second 1.2 MB", revalidated.status, 304);
expectEqual("a 304 carries no body", revalidated.body, "");
const staleJs = await handleOverviewRequest(
	{ method: "GET", url: CLIENT_ASSETS.js, headers: { "if-none-match": '"a-different-build"' } },
	"",
	handler,
);
expectEqual("a stale validator gets the client again", staleJs.status, 200);
const inlined = await handleOverviewRequest({ method: "GET", url: CLIENT_ASSETS.js }, "", {
	write: handler.write,
	page: handler.page,
});
expectEqual("a server that inlines its client has no /app.js", inlined.status, 404);
const getOverview = await handleOverviewRequest({ method: "GET", url: "/overview" }, "", handler);
expectEqual("GET /overview is 200", getOverview.status, 200);
expect("GET /overview is the snapshot, not the page", getOverview.body.includes('"commentEndpoint"'));
expect("GET /overview carries the store's issues", getOverview.body.includes("the drain work"));
expect(
	"GET /overview is not cacheable: it is what a write re-reads",
	getOverview.headers["cache-control"] === "no-store",
);
const posted = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "operator reply" }),
	handler,
);
expectEqual("POST /comment is 204", posted.status, 204);
expectEqual("POST /comment writes only bd comment", doorWrites, [
	{ args: ["comment", "from-bd", "--stdin"], stdin: "operator reply" },
]);
doorWrites.length = 0;
const postedActor = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "named" }),
	{ ...handler, actor: "carol" },
);
expectEqual("POST with the door's actor is 204", postedActor.status, 204);
expectEqual("POST stamps --actor", doorWrites, [
	{ args: ["--actor", "carol", "comment", "from-bd", "--stdin"], stdin: "named" },
]);
expect(
	"POST /comment is not human respond",
	doorWrites.every(
		(call) => call.args.includes("comment") && !call.args.includes("human") && !call.args.includes("respond"),
	),
);
const closedPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "operator reply", closed: true }),
	handler,
);
expectEqual("POST carrying closed is 400", closedPost.status, 400);
expectEqual("POST carrying closed does not write", doorWrites.length, 1);
const readingPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "operator reply", labels: ["reading:none"] }),
	handler,
);
expectEqual("POST carrying reading: is 400", readingPost.status, 400);
expectEqual("POST carrying reading: does not write", doorWrites.length, 1);
const unknownPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "explode", id: "from-bd", text: "operator reply" }),
	handler,
);
expectEqual("POST unknown intent is 400", unknownPost.status, 400);
expectEqual("POST unknown intent does not write", doorWrites.length, 1);
const triagePost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "triage", id: "from-bd", label: "needs-info" }),
	handler,
);
expectEqual("POST triage is 204", triagePost.status, 204);
expectEqual("POST triage writes the brake", doorWrites[1], {
	args: [
		"update",
		"from-bd",
		"--add-label",
		"needs-info",
		"--remove-label",
		"needs-triage",
		"--remove-label",
		"ready-for-agent",
		"--remove-label",
		"ready-for-human",
		"--remove-label",
		"wontfix",
	],
	stdin: undefined,
});
const ideaPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "triage", id: "from-bd", label: "idea:bare" }),
	handler,
);
expectEqual("POST idea:* is 400", ideaPost.status, 400);
expectEqual("POST idea:* does not write", doorWrites.length, 2);
const wontfixPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "triage", id: "from-bd", label: "wontfix" }),
	handler,
);
expectEqual("POST wontfix is 204", wontfixPost.status, 204);
expect(
	"POST wontfix is a label write, not a close",
	doorWrites[2]?.args[0] === "update" && (doorWrites[2]?.args.includes("wontfix") ?? false),
);
const emptyPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "" }),
	handler,
);
expectEqual("empty POST is 400", emptyPost.status, 400);
expectEqual("empty POST does not write", doorWrites.length, 3);
const missing = await handleOverviewRequest({ method: "POST", url: "/close" }, "", handler);
expectEqual("unknown path is 404", missing.status, 404);

const deleteWrites: { args: string[]; stdin: string | undefined }[] = [];
const deleteHandler = {
	write: ((args: string[], stdin?: string) => {
		deleteWrites.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () => renderPage(overview, { commentEndpoint: "/comment" }),
	issues: () => [issue({ id: "from-bd", status: "open" })],
};
const deleted = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "delete", id: "from-bd", confirm: true }),
	deleteHandler,
);
expectEqual("POST delete is 204", deleted.status, 204);
expectEqual("POST delete writes bd delete --force", deleteWrites, [
	{ args: ["delete", "from-bd", "--force"], stdin: undefined },
]);
const claimedPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "delete", id: "from-bd", confirm: true }),
	{ ...deleteHandler, issues: () => [issue({ id: "from-bd", status: "in_progress" })] },
);
expectEqual("POST in_progress delete is 400", claimedPost.status, 400);
expectEqual("POST in_progress delete does not write again", deleteWrites.length, 1);

const edgeWrites: { args: string[]; stdin: string | undefined }[] = [];
const edgeHandler = {
	write: ((args: string[], stdin?: string) => {
		edgeWrites.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () => renderPage(overview, { commentEndpoint: "/comment" }),
	issues: () => edgeIssues,
};
const addedBlocks = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "add-edge", from: "t1", to: "t2", type: "blocks" }),
	edgeHandler,
);
expectEqual("POST same-domain blocks is 204", addedBlocks.status, 204);
expectEqual("POST same-domain blocks writes dep add", edgeWrites, [
	{ args: ["dep", "add", "t2", "t1"], stdin: undefined },
]);
const refusedCross = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "add-edge", from: "q1", to: "t1", type: "blocks" }),
	edgeHandler,
);
expectEqual("POST cross-domain blocks is 400", refusedCross.status, 400);
expectEqual("POST cross-domain blocks does not write", edgeWrites.length, 1);
const refusedParent = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "add-edge", from: "t1", to: "t2", type: "parent-child" }),
	edgeHandler,
);
expectEqual("POST parent-child is 400", refusedParent.status, 400);
expectEqual("POST parent-child does not write", edgeWrites.length, 1);
const addedRelate = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "add-edge", from: "e1", to: "t1", type: "relates-to" }),
	edgeHandler,
);
expectEqual("POST crossing relates-to is 204", addedRelate.status, 204);
expectEqual("POST crossing relates-to writes dep relate", edgeWrites[1], {
	args: ["dep", "relate", "e1", "t1"],
	stdin: undefined,
});
const addedDiscovered = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "add-edge", from: "e1", to: "t1", type: "discovered-from" }),
	edgeHandler,
);
expectEqual("POST crossing discovered-from is 204", addedDiscovered.status, 204);
expectEqual("POST crossing discovered-from writes typed dep add", edgeWrites[2], {
	args: ["dep", "add", "t1", "e1", "--type", "discovered-from"],
	stdin: undefined,
});
const removeWrites: { args: string[]; stdin: string | undefined }[] = [];
const removeHandler = {
	write: ((args: string[], stdin?: string) => {
		removeWrites.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () => renderPage(overview, { commentEndpoint: "/comment" }),
	issues: () => [
		taskOne,
		issue({ id: "t2", title: "two", type: "task", dependencies: [{ id: "t1", type: "blocks" }] }),
		decisionOne,
		issue({ id: "e1", title: "run", type: "experiment", dependencies: [{ id: "t1", type: "relates-to" }] }),
	],
};
const removedBlocks = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "remove-edge", from: "t1", to: "t2", type: "blocks" }),
	removeHandler,
);
expectEqual("POST same-domain blocks remove is 204", removedBlocks.status, 204);
expectEqual("POST same-domain blocks remove writes dep remove", removeWrites, [
	{ args: ["dep", "remove", "t2", "t1"], stdin: undefined },
]);
const removedRelate = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "remove-edge", from: "e1", to: "t1", type: "relates-to" }),
	removeHandler,
);
expectEqual("POST relates-to remove is 204", removedRelate.status, 204);
expectEqual("POST relates-to remove writes unrelate", removeWrites[1], {
	args: ["dep", "unrelate", "e1", "t1"],
	stdin: undefined,
});
const refusedRemoveMissing = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "remove-edge", from: "t1", to: "t2", type: "blocks" }),
	edgeHandler,
);
expectEqual("POST remove of a missing relation is 400", refusedRemoveMissing.status, 400);
expectEqual("POST remove of a missing relation does not write", edgeWrites.length, 3);
const refusedRemoveParent = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "remove-edge", from: "t1", to: "t2", type: "parent-child" }),
	removeHandler,
);
expectEqual("POST parent-child remove is 400", refusedRemoveParent.status, 400);
expectEqual("POST parent-child remove does not write", removeWrites.length, 2);

const doorCreateDir = mkdtempSync(join(tmpdir(), "operator-ui-door-create-"));
const doorCreateWrites: { args: string[]; stdin: string | undefined }[] = [];
const createHandler = {
	write: ((args: string[], stdin?: string) => {
		doorCreateWrites.push({ args, stdin });
		if (args[0] === "list") return "[]";
		return "";
	}) satisfies BdWriteRunner,
	page: () => renderPage(overview, { commentEndpoint: "/comment" }),
	dir: doorCreateDir,
};
const createNoTypePost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "create", feature: "drain", title: "the work" }),
	createHandler,
);
expectEqual("POST create without a type is 400", createNoTypePost.status, 400);
expectEqual("POST create without a type does not write", doorCreateWrites.length, 0);
const createdPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "create", type: "task", feature: "drain", title: "the work" }),
	createHandler,
);
expectEqual("POST create is 204", createdPost.status, 204);
const doorCreate = doorCreateWrites.find((call) => call.args[0] === "create")?.args ?? [];
expectEqual("POST create type", flagAfter(doorCreate, "--type"), "task");
expectEqual("POST create labels", flagAfter(doorCreate, "--labels"), "needs-triage");
expect("POST create does not apply the gate", !(flagAfter(doorCreate, "--labels") ?? "").includes("ready-for-agent"));
const doorMeta = JSON.parse(flagAfter(doorCreate, "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("POST create handle", doorMeta.handle, "drain/01");
expectEqual("POST create slug", doorMeta.slug, "the-work");
const doorBody = join(doorCreateDir, ".scratch", "drain", "issues", "01-the-work.md");
expect("POST create wrote the body", existsSync(doorBody));
const doorBodyText = existsSync(doorBody) ? readFileSync(doorBody, "utf8") : "";
expect("POST create body has no status", !/status\s*:/i.test(doorBodyText));

const commentTmp = mkdtempSync(join(tmpdir(), "operator-ui-comment-"));
const commentLog = join(commentTmp, "comment.log");
const commentBd = join(commentTmp, "fake-bd");
writeFileSync(
	commentBd,
	`#!/usr/bin/env bun
const fs = require("fs");
const args = process.argv.slice(2);
if (args[0] === "comment") {
  const stdin = fs.readFileSync(0, "utf8");
  fs.appendFileSync(${JSON.stringify(commentLog)}, JSON.stringify({ args, stdin }) + "\\n");
  process.exit(0);
}
if (args.includes("human") || args.includes("respond") || args[0] === "close" || args[0] === "update" || args[0] === "label") {
  process.stderr.write("forbidden " + args.join(" "));
  process.exit(2);
}
if (args.includes("list")) {
  process.stdout.write(${JSON.stringify(listJson)});
  process.exit(0);
}
if (args.includes("show")) {
  process.stdout.write(${JSON.stringify(showJson)});
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(commentBd, 0o755);
const commentServer = createOverviewServer({ dir: commentTmp, store: commentBd });
const commentPort = await new Promise<number>((resolve, reject) => {
	commentServer.once("error", reject);
	commentServer.listen(0, "127.0.0.1", () => {
		const address = commentServer.address();
		if (typeof address === "object" && address !== null) resolve(address.port);
		else reject(new Error("server has no port"));
	});
});
const commentGet = await fetch(`http://127.0.0.1:${commentPort}/`);
expectEqual("live GET / is 200", commentGet.status, 200);
const commentPage = await commentGet.text();
expect("live page offers a reply endpoint", pageOffersReply(commentPage));
expect("live page offers create", pageOffersCreate(commentPage));
expect("live page is from bd, not jsonl", commentPage.includes("From bd") && !commentPage.includes("From jsonl"));
const livePost = await fetch(`http://127.0.0.1:${commentPort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "comment", id: "from-bd", text: "operator reply" }),
});
expectEqual("live POST /comment is 204", livePost.status, 204);
const logged = existsSync(commentLog) ? readFileSync(commentLog, "utf8").trim() : "";
const recorded = logged === "" ? null : JSON.parse(logged.split("\n")[0] ?? logged);
expectEqual("live write is bd comment", recorded?.args, ["comment", "from-bd", "--stdin"]);
expectEqual("live write stdin is the reply", recorded?.stdin, "operator reply");
expect("live write is not human respond", recorded !== null && !(recorded.args as string[]).includes("human"));
const liveClosed = await fetch(`http://127.0.0.1:${commentPort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "comment", id: "from-bd", text: "operator reply", closed: true }),
});
expectEqual("live POST carrying closed is 400", liveClosed.status, 400);
const liveUnknown = await fetch(`http://127.0.0.1:${commentPort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "explode", id: "from-bd", text: "operator reply" }),
});
expectEqual("live POST unknown intent is 400", liveUnknown.status, 400);
const loggedAfterRefuse = existsSync(commentLog) ? readFileSync(commentLog, "utf8").trim() : "";
expectEqual("refused live POSTs do not write", loggedAfterRefuse, logged);
await new Promise<void>((resolve, reject) => commentServer.close((err) => (err ? reject(err) : resolve())));

const liveCreateTmp = mkdtempSync(join(tmpdir(), "operator-ui-live-create-"));
const liveCreateLog = join(liveCreateTmp, "create.log");
const liveCreateBd = join(liveCreateTmp, "fake-bd");
writeFileSync(
	liveCreateBd,
	`#!/usr/bin/env bun
const fs = require("fs");
const args = process.argv.slice(2);
if (args[0] === "create") {
  fs.appendFileSync(${JSON.stringify(liveCreateLog)}, JSON.stringify({ args }) + "\\n");
  process.stdout.write("new-id\\n");
  process.exit(0);
}
if (args.includes("ready-for-agent") || args.includes("human") || args.includes("respond") || args[0] === "close" || args[0] === "update" || args[0] === "label") {
  process.stderr.write("forbidden " + args.join(" "));
  process.exit(2);
}
if (args.includes("list")) {
  process.stdout.write("[]");
  process.exit(0);
}
if (args.includes("show")) {
  process.stdout.write("[]");
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(liveCreateBd, 0o755);
const liveCreateServer = createOverviewServer({ dir: liveCreateTmp, store: liveCreateBd });
const liveCreatePort = await new Promise<number>((resolve, reject) => {
	liveCreateServer.once("error", reject);
	liveCreateServer.listen(0, "127.0.0.1", () => {
		const address = liveCreateServer.address();
		if (typeof address === "object" && address !== null) resolve(address.port);
		else reject(new Error("server has no port"));
	});
});
const liveCreatePost = await fetch(`http://127.0.0.1:${liveCreatePort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "create", type: "experiment", feature: "lab", title: "the run" }),
});
expectEqual("live POST create is 204", liveCreatePost.status, 204);
const liveCreateLogged = existsSync(liveCreateLog) ? readFileSync(liveCreateLog, "utf8").trim() : "";
const liveCreateRecorded = liveCreateLogged === "" ? null : JSON.parse(liveCreateLogged.split("\n")[0] ?? liveCreateLogged);
const liveCreateArgs = (liveCreateRecorded?.args ?? []) as string[];
expectEqual("live create type", flagAfter(liveCreateArgs, "--type"), "experiment");
expectEqual("live create labels", flagAfter(liveCreateArgs, "--labels"), "needs-triage,experiment");
expect("live create does not apply the gate", !liveCreateArgs.includes("ready-for-agent"));
const liveCreateMeta = JSON.parse(flagAfter(liveCreateArgs, "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("live create handle", liveCreateMeta.handle, "lab/01");
expectEqual("live create slug", liveCreateMeta.slug, "the-run");
const liveCreateBody = join(liveCreateTmp, ".scratch", "lab", "issues", "01-the-run.md");
expect("live create wrote the body", existsSync(liveCreateBody));
const liveCreateText = existsSync(liveCreateBody) ? readFileSync(liveCreateBody, "utf8") : "";
expect("live create body carries the handle", liveCreateText.includes("lab/01"));
expect("live create body has no status", !/status\s*:/i.test(liveCreateText));
const liveCreateNoType = await fetch(`http://127.0.0.1:${liveCreatePort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "create", feature: "lab", title: "the run" }),
});
expectEqual("live POST create without a type is 400", liveCreateNoType.status, 400);
const liveCreateLoggedAfter = existsSync(liveCreateLog) ? readFileSync(liveCreateLog, "utf8").trim() : "";
expectEqual("refused live create does not write", liveCreateLoggedAfter, liveCreateLogged);
await new Promise<void>((resolve, reject) => liveCreateServer.close((err) => (err ? reject(err) : resolve())));

const servePath = join(dirname(fileURLToPath(import.meta.url)), "serve.ts");
const serveHelp = spawnSync(process.execPath, [servePath, "--help"], { encoding: "utf8" });
expectEqual("serve help exits 0", serveHelp.status, 0);
expect("serve help names bd comment", (serveHelp.stdout ?? "").includes("bd comment"));
expect("serve help names create", (serveHelp.stdout ?? "").includes("Create requires a type"));
expect("serve help does not name human respond", !(serveHelp.stdout ?? "").includes("human respond"));
expect("serve help names the tagged door", (serveHelp.stdout ?? "").includes("tagged door"));

const startIssues = [
	{ id: "a", type: "decision" },
	{ id: "b", type: "experiment" },
	{ id: "c", type: "task" },
	{ id: "d", type: "bug" },
	{ id: "gated", type: "task" },
];
const launches: RunLaunch[] = [];
const launchRun = (launch: RunLaunch) => {
	launches.push(launch);
};
const startExtras = { launchRun, issues: startIssues, targetHeld: false };

function startAction(raw: string, extras = startExtras): { refused: boolean; message: string } {
	try {
		applyOperatorAction(writeRunner, raw, extras);
		return { refused: false, message: "" };
	} catch (error) {
		return {
			refused: error instanceof OperatorActionRefused,
			message: error instanceof Error ? error.message : String(error),
		};
	}
}

writes.length = 0;
launches.length = 0;
const startedDrain = startAction(JSON.stringify({ intent: "start", ids: ["c"] }));
expect("same-domain development start is accepted", !startedDrain.refused);
expectEqual("development start launches drain", launches, [
	{ kind: "drain", workflow: "beads-dag-drain", allowList: ["c"] },
]);
expectEqual("development start does not write the store", writes, []);

writes.length = 0;
launches.length = 0;
const startedInquiry = startAction(JSON.stringify({ intent: "start", ids: ["a"] }));
expect("same-domain inquiry start is accepted", !startedInquiry.refused);
expectEqual("decision start launches inquiry", launches, [
	{ kind: "inquiry", workflow: "beads-dag-inquiry", allowList: ["a"] },
]);
expectEqual("inquiry start does not write the store", writes, []);

writes.length = 0;
launches.length = 0;
const startedExperiment = startAction(JSON.stringify({ intent: "start", ids: ["b"] }));
expect("same-domain experiment start is accepted", !startedExperiment.refused);
expectEqual("experiment start launches the experiment run", launches, [
	{ kind: "experiment", workflow: "beads-dag-experiment", allowList: ["b"] },
]);
expectEqual("experiment start does not write the store", writes, []);

writes.length = 0;
launches.length = 0;
const startedSameDomainTypes = startAction(JSON.stringify({ intent: "start", ids: ["c", "d"] }));
expect("two development types start as one drain", !startedSameDomainTypes.refused);
expectEqual("drain allow-list is the selected ids", launches, [
	{ kind: "drain", workflow: "beads-dag-drain", allowList: ["c", "d"] },
]);

writes.length = 0;
launches.length = 0;
const mixedStart = startAction(JSON.stringify({ intent: "start", ids: ["a", "c"] }));
expect("mixed-domain start is refused", mixedStart.refused);
expect("mixed-domain start names mixed-domain", mixedStart.message.includes("mixed-domain"));
expectEqual("mixed-domain start does not launch", launches, []);
expectEqual("mixed-domain start does not write", writes, []);

writes.length = 0;
launches.length = 0;
const emptyStart = startAction(JSON.stringify({ intent: "start", ids: [] }));
expect("empty selection is refused", emptyStart.refused);
expect("empty selection names empty", emptyStart.message.includes("empty selection"));
expectEqual("empty selection does not launch", launches, []);
expectEqual("empty selection does not write", writes, []);

writes.length = 0;
launches.length = 0;
const missingIds = startAction(JSON.stringify({ intent: "start" }));
expect("missing ids is empty selection", missingIds.refused);
expectEqual("missing ids does not launch", launches, []);

writes.length = 0;
launches.length = 0;
const heldStart = startAction(JSON.stringify({ intent: "start", ids: ["c"] }), {
	...startExtras,
	targetHeld: true,
});
expect("held Target start is refused", heldStart.refused);
expect("held Target start names held", heldStart.message.includes("Target already held"));
expectEqual("held Target does not launch", launches, []);
expectEqual("held Target does not write", writes, []);

writes.length = 0;
launches.length = 0;
const startClosed = startAction(JSON.stringify({ intent: "start", ids: ["c"], closed: true }));
expect("start carrying closed is refused", startClosed.refused);
expectEqual("start carrying closed does not launch", launches, []);
expectEqual("start carrying closed does not write", writes, []);

writes.length = 0;
launches.length = 0;
const leftOut = startAction(JSON.stringify({ intent: "start", ids: ["c"] }));
expect("starting one of two gated issues is accepted", !leftOut.refused);
expect(
	"start does not claim, merge, close, or label",
	writes.every(
		(call) =>
			!call.args.includes("claim") &&
			!call.args.includes("close") &&
			!call.args.includes("update") &&
			!call.args.includes("label") &&
			!call.args.includes("merge"),
	) && writes.length === 0,
);
expectEqual("unselected gated issue is not written", writes, []);

const startLaunches: RunLaunch[] = [];
const startHandler = {
	write: ((args: string[], stdin?: string) => {
		doorWrites.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () => renderPage(overview, { commentEndpoint: "/comment" }),
	launchRun: (launch: RunLaunch) => {
		startLaunches.push(launch);
	},
	issues: () => startIssues,
	targetHeld: () => false,
};
const startPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["c"] }),
	startHandler,
);
expectEqual("POST start is 204", startPost.status, 204);
expectEqual("POST start launches drain with the allow-list", startLaunches, [
	{ kind: "drain", workflow: "beads-dag-drain", allowList: ["c"] },
]);
expectEqual("POST start does not write the store", doorWrites.length, 3);

startLaunches.length = 0;
const mixedPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["a", "c"] }),
	startHandler,
);
expectEqual("POST mixed-domain start is 400", mixedPost.status, 400);
expect("POST mixed-domain names mixed-domain", mixedPost.body.includes("mixed-domain"));
expectEqual("POST mixed-domain does not launch", startLaunches, []);
expectEqual("POST mixed-domain does not write", doorWrites.length, 3);

const emptyPostStart = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: [] }),
	startHandler,
);
expectEqual("POST empty selection is 400", emptyPostStart.status, 400);
expectEqual("POST empty selection does not launch", startLaunches, []);

startHandler.targetHeld = () => true;
const heldPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["c"] }),
	startHandler,
);
expectEqual("POST held Target is 400", heldPost.status, 400);
expectEqual("POST held Target does not launch", startLaunches, []);
startHandler.targetHeld = () => false;

const startTmp = mkdtempSync(join(tmpdir(), "operator-ui-start-"));
const startLog = join(startTmp, "start.log");
const startBdLog = join(startTmp, "bd.log");
const startBd = join(startTmp, "fake-bd");
writeFileSync(
	startBd,
	`#!/usr/bin/env bun
const fs = require("fs");
const args = process.argv.slice(2);
if (args[0] === "--readonly") args.shift();
fs.appendFileSync(${JSON.stringify(startBdLog)}, JSON.stringify({ args }) + "\\n");
if (args.includes("human") || args.includes("respond") || args[0] === "close" || args[0] === "update" || args[0] === "label" || args[0] === "claim") {
  process.stderr.write("forbidden " + args.join(" "));
  process.exit(2);
}
if (args.includes("list")) {
  process.stdout.write(${JSON.stringify(listJson)});
  process.exit(0);
}
if (args.includes("show")) {
  process.stdout.write(${JSON.stringify(showJson)});
  process.exit(0);
}
process.stderr.write("unexpected " + args.join(" "));
process.exit(1);
`,
);
chmodSync(startBd, 0o755);
const startArchon = join(startTmp, "fake-archon");
writeFileSync(
	startArchon,
	`#!/usr/bin/env bun
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(startLog)}, JSON.stringify({ args }) + "\\n");
process.exit(0);
`,
);
chmodSync(startArchon, 0o755);
const startServer = createOverviewServer({
	dir: startTmp,
	store: startBd,
	archon: startArchon,
	targetHeld: () => false,
});
const startPort = await new Promise<number>((resolve, reject) => {
	startServer.once("error", reject);
	startServer.listen(0, "127.0.0.1", () => {
		const address = startServer.address();
		if (typeof address === "object" && address !== null) resolve(address.port);
		else reject(new Error("server has no port"));
	});
});
const liveStart = await fetch(`http://127.0.0.1:${startPort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "start", ids: ["from-bd"] }),
});
expectEqual("live POST start is 204", liveStart.status, 204);
const startLogged = existsSync(startLog) ? readFileSync(startLog, "utf8").trim() : "";
const startRecorded = startLogged === "" ? null : JSON.parse(startLogged.split("\n")[0] ?? startLogged);
expectEqual("live start is archon workflow run drain", startRecorded?.args, [
	"workflow",
	"run",
	"beads-dag-drain",
	"--detach",
	"--input",
	'allow_list=["from-bd"]',
]);
const bdLogged = existsSync(startBdLog) ? readFileSync(startBdLog, "utf8").trim() : "";
const bdLines = bdLogged === "" ? [] : bdLogged.split("\n").map((line) => JSON.parse(line) as { args: string[] });
expect(
	"live start does not claim, close, update, or label",
	bdLines.every(
		(line) =>
			line.args[0] !== "close" &&
			line.args[0] !== "update" &&
			line.args[0] !== "label" &&
			line.args[0] !== "claim" &&
			!line.args.includes("human"),
	),
);
const liveMixed = await fetch(`http://127.0.0.1:${startPort}/comment`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ intent: "start", ids: [] }),
});
expectEqual("live POST empty selection is 400", liveMixed.status, 400);
const startLoggedAfter = existsSync(startLog) ? readFileSync(startLog, "utf8").trim() : "";
expectEqual("refused live start does not launch again", startLoggedAfter, startLogged);
await new Promise<void>((resolve, reject) => startServer.close((err) => (err ? reject(err) : resolve())));

const contract = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "agents", "issue-tracker.md"), "utf8");
expect("contract: UI writes bd comment", contract.includes("write `bd comment`"));
expect("contract: human respond is not used", contract.includes("`bd human respond` is not used"));
expect(
	"contract: close, reading:, and labels stay with the session",
	contract.includes("Close, `reading:`, and other domain label acts") && contract.includes("stay the session's"),
);

if (failed > 0) {
	console.error(`${failed} failure(s)`);
	process.exit(1);
}
console.log("ok");
