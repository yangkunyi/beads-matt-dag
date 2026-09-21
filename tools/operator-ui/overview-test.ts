#!/usr/bin/env bun
/**
 * The write door and store graph: `bd` never jsonl; live overlay from the run lock, Archon, artefacts
 * and attempted; tagged writes refuse `closed`, `reading:`, and unknown intents; create captures a
 * decision; start/grill launch the domain run; triage is the five labels; same-domain `blocks` and
 * crossing `relates-to` / `discovered-from` write, cross-domain `blocks` and `parent-child` do not.
 * The human face is attention-ui, not this directory.
 *
 *   bun tools/operator-ui/overview-test.ts
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
	kindOfWorkflow,
	neighboursOf,
	type LiveRun,
	type StoreComment,
	type StoreIssue,
} from "./model";
import { fetchLive, gitDirOf, parseArchonLog, RUN_LOCK_NAME, summariseArchonLog } from "./overlay";
import { applyOperatorAction, OperatorActionRefused, type OperatorIssue } from "./actions";
import { postOperatorAction } from "./client";
import { planDelete, planDeleteAll } from "./delete";
import { DOMAIN_LANES, framedIssueIds, projectGraph, proposeConnect } from "./graph-view";
import { roundFromComments, serializeGrillAnswers, serializeGrillRound } from "./round";
import { renderRound as renderPackRound } from "../../.archon/workflows/beads-dag/beads-dag-grill/scripts/rounds.ts";
import type { RunLaunch } from "./start";
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

const roundQuestions = [
	{
		n: 1,
		title: "Scope",
		body: "What stays in?",
		choices: ["keep it", "drop it"],
		recommended: "keep it",
	},
	{
		n: 2,
		title: "Name",
		body: "What do we call it?",
		choices: ["round", "quiz"],
		recommended: "round",
	},
];
const roundComment: StoreComment = {
	id: "r1",
	author: "agent",
	createdAt: "2026-09-18T00:00:00Z",
	text: serializeGrillRound(roundQuestions),
};
const answersComment: StoreComment = {
	id: "r2",
	author: "op",
	createdAt: "2026-09-18T00:01:00Z",
	text: serializeGrillAnswers([
		{ n: 1, choice: "keep it" },
		{ n: 2, choice: "round" },
	]),
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
expectEqual("an issue with no round has none", issueDetail(overview, "c")?.round, null);

const grilled = assembleOverview(
	[blocker],
	new Map([
		[
			"a",
			[roundComment, comment],
		],
	]),
	(item) => documentsFor(item, probe),
);
expectEqual("round questions join onto the issue", grilled.issues[0]?.round?.questions.map((q) => q.n), [1, 2]);
expectEqual("round choices are data", grilled.issues[0]?.round?.questions[0]?.choices, ["keep it", "drop it"]);
expectEqual("recommended answer is on the question", grilled.issues[0]?.round?.questions[0]?.recommended, "keep it");
expectEqual("a round whose comment carries no marker has no number", grilled.issues[0]?.round?.n, null);
expectEqual(
	"round comments are not the conversation",
	grilled.issues[0]?.comments.map((entry) => entry.text),
	[comment.text],
);

const answered = assembleOverview([blocker], new Map([["a", [roundComment, answersComment]]]), () => []);
expectEqual("a re-read shows the answers", answered.issues[0]?.round?.questions.map((q) => q.answer), [
	"keep it",
	"round",
]);

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
const grilledIssue = issueDetail(grilled, "a");
expect("grilled issue is in the model", grilledIssue !== undefined);
// ---- The seam: what the grill run writes is what this surface reads. -------------------------------
// The review of the range that landed the grill run found the two halves agreeing only with themselves: the
// run's producer and this consumer were never tested against each other. This is that test.
const writtenByRun = renderPackRound(
	2,
	[
		{ title: "Name", body: "what is this called?", choices: ["widget", "gadget"], recommended: "widget" },
		{ title: "Scope", body: "does it cover returns?", choices: ["yes", "no"], recommended: "no" },
	],
	"abc1234",
);
const fromRun = roundFromComments([
	{ id: "run-1", author: "agent", createdAt: "2026-09-19T00:00:00Z", text: writtenByRun },
]);
expectEqual("the run's own comment parses to a round", fromRun.round?.questions.length, 2);
expectEqual("and its number comes off the run's own marker", fromRun.round?.n, 2);
expectEqual("numbered by the node, not by the turn", fromRun.round?.questions[0]?.n, 1);
expectEqual("with the question's title", fromRun.round?.questions[0]?.title, "Name");
expectEqual("its body, with no commit line in it", fromRun.round?.questions[0]?.body, "what is this called?");
expectEqual("its choices", fromRun.round?.questions[0]?.choices, ["widget", "gadget"]);
expectEqual("its recommended answer, exactly one of them", fromRun.round?.questions[0]?.recommended, "widget");
expectEqual("and the second question keeps its own", fromRun.round?.questions[1]?.recommended, "no");
expectEqual("the round comment is the round, not conversation", fromRun.conversation.length, 0);
expect(
	"every question has choices to pick, so a pick can complete the form",
	(fromRun.round?.questions ?? []).every((question) => question.choices.length >= 2),
);
const roundOneText = renderPackRound(1, [
	{ title: "Scope", body: "what stays in?", choices: ["keep it", "drop it"], recommended: "keep it" },
	{ title: "Name", body: "what do we call it?", choices: ["round", "quiz"], recommended: "round" },
]);
const roundTwoText = renderPackRound(2, [
	{ title: "Scope", body: "what stays in?", choices: ["keep it", "drop it"], recommended: "drop it" },
	{ title: "Name", body: "what do we call it?", choices: ["round", "quiz"], recommended: "quiz" },
]);
const roundOneComment: StoreComment = {
	id: "n1",
	author: "agent",
	createdAt: "2026-09-20T00:00:00Z",
	text: roundOneText,
};
const roundOneAnswersComment: StoreComment = {
	id: "n2",
	author: "op",
	createdAt: "2026-09-20T00:01:00Z",
	text: serializeGrillAnswers([
		{ n: 1, choice: "keep it" },
		{ n: 2, choice: "round" },
	]),
};
const roundTwoComment: StoreComment = {
	id: "n3",
	author: "agent",
	createdAt: "2026-09-20T00:02:00Z",
	text: roundTwoText,
};
const answeredRound = roundFromComments([roundOneComment, roundOneAnswersComment]);
const nextRound = roundFromComments([roundOneComment, roundOneAnswersComment, roundTwoComment]);
expectEqual("the round's number comes off the comment's marker", answeredRound.round?.n, 1);
expectEqual("a later round on the same issue is the current one", nextRound.round?.n, 2);
expectEqual(
	"and it is asked afresh: the previous round's answers are not on it",
	(nextRound.round?.questions ?? []).filter((question) => question.answer !== undefined).length,
	0,
);
const projected = projectGraph(overview, { showAll: true });
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
	"empty selection shows open issues, not closed",
	[...framedIssueIds(overview)].sort(),
	["a", "c"],
);
expectEqual(
	"empty selection with Show all off still hides closed",
	projectGraph(overview, { selected: [], showAll: false }).nodes.map((node) => node.id).sort(),
	["a", "c"],
);
const aroundC = projectGraph(overview, { selected: ["c"] });
expectEqual(
	"a selection keeps every open issue",
	aroundC.nodes.map((node) => node.id).sort(),
	["a", "c"],
);
expect("a closed two-hop stays out unless it is a neighbour", !aroundC.nodes.some((node) => node.id === "b"));
expect(
	"a hop edge among the open issues remains",
	aroundC.edges.some((edge) => edge.source === "a" && edge.target === "c"),
);
expect(
	"a handoff to a closed two-hop is dropped",
	!aroundC.edges.some((edge) => edge.source === "a" && edge.target === "b"),
);
const aroundA = projectGraph(overview, { selected: ["a"] });
expectEqual(
	"a closed one-hop neighbour of the selection comes in",
	aroundA.nodes.map((node) => node.id).sort(),
	["a", "b", "c"],
);
expectEqual(
	"Show all with a selection is the full graph",
	projectGraph(overview, { selected: ["c"], showAll: true }).nodes.map((node) => node.id),
	["a", "b", "c"],
);
expectEqual(
	"Show all with nothing selected is still the full graph",
	[...framedIssueIds(overview, { selected: [], showAll: true })].sort(),
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

expectEqual(
	"each pack executor maps to its kind",
	["beads-dag-drain", "beads-dag-inquiry", "beads-dag-experiment", "beads-dag-grill", "archon-ship"].map(
		kindOfWorkflow,
	),
	["drain", "inquiry", "experiment", "grill", undefined],
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

const joinedGrill = assembleLive({
	lock: { pid: 6, run: "run-grill" },
	archon: [{ id: "run-grill", workflow: "beads-dag-grill", status: "running" }],
	artifacts: {
		dir: "artifacts/runs/run-grill",
		record: { pid: 6, run: "run-grill" },
		attempted: ["a"],
		reports: [{ rel: "report.md", text: "grill last report: round two" }],
	},
});
expectEqual("grill overlay kind", joinedGrill?.kind, "grill");
expectEqual("grill overlay attempted", joinedGrill?.attempted, ["a"]);
expectEqual("grill last report is report.md", joinedGrill?.report?.rel, "report.md");

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

const writes: { args: string[]; stdin: string | undefined }[] = [];
let listStdout = "[]";
const writeRunner: BdWriteRunner = (args, stdin) => {
	writes.push({ args, stdin });
	if (args[0] === "list") return listStdout;
	if (args[0] === "create") return "new-id";
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

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({
		intent: "answer-round",
		id: "from-bd",
		answers: [
			{ n: 1, choice: "keep it" },
			{ n: 2, choice: "round" },
		],
	}),
);
expectEqual("answer-round is bd comment", writes, [
	{
		args: ["comment", "from-bd", "--stdin"],
		stdin: serializeGrillAnswers([
			{ n: 1, choice: "keep it" },
			{ n: 2, choice: "round" },
		]),
	},
]);
expect(
	"answer-round is not human respond, close, or a label",
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
const reread = roundFromComments([
	roundComment,
	{ id: "written", author: "op", createdAt: "2026-09-18T00:02:00Z", text: writes[0]?.stdin ?? "" },
]);
expectEqual("written answers survive a re-read", reread.round?.questions.map((q) => q.answer), [
	"keep it",
	"round",
]);

writes.length = 0;
applyOperatorAction(
	writeRunner,
	JSON.stringify({
		intent: "answer-round",
		id: "from-bd",
		answers: [{ n: 1, choice: "keep it" }],
	}),
	{ actor: "bob" },
);
expectEqual("answer-round passes the door's actor", writes, [
	{
		args: ["--actor", "bob", "comment", "from-bd", "--stdin"],
		stdin: serializeGrillAnswers([{ n: 1, choice: "keep it" }]),
	},
]);

function refusedAction(raw: string, extras: { dir?: string; issues?: ReadonlyArray<OperatorIssue> } = {}): { refused: boolean; message: string } {
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
const emptyAnswers = refusedAction(JSON.stringify({ intent: "answer-round", id: "from-bd", answers: [] }));
expect("empty answers are refused", emptyAnswers.refused);
expectEqual("empty answers do not write", writes, []);

writes.length = 0;
// The door's own shape check, not the comment helper's. `comment.ts` refuses a malformed id too, so this
// was never a 500 - but it refused in the comment layer's name ("comment needs an issue id") after the
// answer body had been accepted. The door refuses it here, as `answer-round`, before the store layer runs.
const malformedRoundId = refusedAction(
	JSON.stringify({ intent: "answer-round", id: "not an id!", answers: [{ n: 1, choice: "keep it" }] }),
);
expect("answer-round with a malformed id is refused", malformedRoundId.refused);
expect(
	"answer-round with a malformed id is refused in its own name, not the comment layer's",
	malformedRoundId.message.startsWith("answer-round needs"),
);
expectEqual("answer-round with a malformed id does not write", writes, []);

writes.length = 0;
const roundClosed = refusedAction(
	JSON.stringify({ intent: "answer-round", id: "from-bd", answers: [{ n: 1, choice: "keep it" }], closed: true }),
);
expect("answer-round carrying closed is refused", roundClosed.refused);
expectEqual("answer-round carrying closed does not write", writes, []);

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
const createClosed = refusedAction(
	JSON.stringify({ intent: "create", feature: "drain", title: "the work", closed: true }),
);
expect("create carrying closed is refused", createClosed.refused);
expectEqual("create carrying closed does not write", writes, []);

const createDir = mkdtempSync(join(tmpdir(), "operator-ui-create-"));
writes.length = 0;
listStdout = "[]";
applyOperatorAction(writeRunner, JSON.stringify({ intent: "create", feature: "drain", title: "the work" }), {
	dir: createDir,
});
const captured = createArgs();
expect("create wrote a bead", captured[0] === "create");
expectEqual("create is a decision", flagAfter(captured, "--type"), "decision");
expect("create does not stamp triage labels", !captured.includes("--labels"));
expect(
	"create does not apply the gate",
	!captured.includes("ready-for-agent"),
);
expectEqual("create writes description", flagAfter(captured, "--description"), "the work");
const capturedMeta = JSON.parse(flagAfter(captured, "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("create handle", capturedMeta.handle, "drain/01");
expectEqual("create slug", capturedMeta.slug, "the-work");
const capturedBody = join(createDir, ".scratch", "drain", "issues", "01-the-work.md");
expect("create does not write a sidecar body", !existsSync(capturedBody));
expectEqual(
	"create parks the question as deferred",
	writes[writes.length - 1]?.args,
	["update", "new-id", "-s", "deferred"],
);
expect(
	"create listed then created",
	writes[0]?.args[0] === "list" && writes.some((call) => call.args[0] === "create"),
);

writes.length = 0;
listStdout = "[]";
const growDevDir = mkdtempSync(join(tmpdir(), "operator-ui-grow-dev-"));
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", feature: "lab", title: "what next", from: "t1" }),
	{ dir: growDevDir, issues: [{ id: "t1", type: "task" }] },
);
expectEqual("grow from development is discovered-from", flagAfter(createArgs(), "--deps"), "discovered-from:t1");
expectEqual("grow from development still captures a decision", flagAfter(createArgs(), "--type"), "decision");

writes.length = 0;
listStdout = "[]";
const growExpDir = mkdtempSync(join(tmpdir(), "operator-ui-grow-exp-"));
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", feature: "lab", title: "what the result means", from: "e1" }),
	{ dir: growExpDir, issues: [{ id: "e1", type: "experiment" }] },
);
expectEqual("grow from experiment is discovered-from", flagAfter(createArgs(), "--deps"), "discovered-from:e1");

writes.length = 0;
listStdout = "[]";
const growQDir = mkdtempSync(join(tmpdir(), "operator-ui-grow-q-"));
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", feature: "lab", title: "follow-up", from: "q1" }),
	{ dir: growQDir, issues: [{ id: "q1", type: "decision" }] },
);
expectEqual("grow from inquiry is blocks", flagAfter(createArgs(), "--deps"), "q1");

writes.length = 0;
const growUnknown = refusedAction(
	JSON.stringify({ intent: "create", feature: "lab", title: "orphan", from: "missing" }),
	{ dir: mkdtempSync(join(tmpdir(), "operator-ui-grow-miss-")), issues: [{ id: "t1", type: "task" }] },
);
expect("grow from an unknown issue is refused", growUnknown.refused);
expect("grow from an unknown issue names the issue", growUnknown.message.includes("known issue"));
expectEqual("grow from an unknown issue does not write", writes, []);

const allocDir = mkdtempSync(join(tmpdir(), "operator-ui-create-alloc-"));
writes.length = 0;
listStdout = JSON.stringify([
	{ id: "x", metadata: { handle: "lab/02", slug: "later" } },
	{ id: "y", metadata: { handle: "lab/01", slug: "earlier" } },
	{ id: "z", metadata: { handle: "drain/09", slug: "other" } },
]);
applyOperatorAction(writeRunner, JSON.stringify({ intent: "create", feature: "lab", title: "next question" }), {
	dir: allocDir,
});
const allocMeta = JSON.parse(flagAfter(createArgs(), "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("create allocates the next unused NN", allocMeta.handle, "lab/03");
expectEqual("create slug from title", allocMeta.slug, "next-question");
expect("create still does not stamp triage labels", !createArgs().includes("--labels"));

writes.length = 0;
listStdout = "[]";
applyOperatorAction(
	writeRunner,
	JSON.stringify({ intent: "create", feature: "lab", title: "the map", map: true, prose: "Fog remains." }),
	{ dir: allocDir },
);
const mapCaptured = createArgs();
const mapMeta = JSON.parse(flagAfter(mapCaptured, "--metadata") ?? "{}") as { handle?: string; slug?: string };
expectEqual("map handle", mapMeta.handle, "lab/map");
expectEqual("map slug", mapMeta.slug, "map");
expectEqual("map description", flagAfter(mapCaptured, "--description"), "Fog remains.");
expectEqual("map is pinned", writes[writes.length - 1]?.args, ["update", "new-id", "-s", "pinned"]);
listStdout = "[]";

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

// Grill is the other launch: the same door, one seed instead of a list, handed to the grill run as
// its own `seed` input. It writes nothing to the store either — the run writes the round, not the
// page — and it does not narrow a selection the operator did not narrow.
writes.length = 0;
launches.length = 0;
const grilledSeed = startAction(JSON.stringify({ intent: "grill", ids: ["a"] }));
expect("grilling one seed is accepted", !grilledSeed.refused);
expectEqual("grill launches the grill run with the selected seed", launches, [
	{ kind: "grill", workflow: "beads-dag-grill", seed: "a" },
]);
expectEqual("grill does not write the store", writes, []);

writes.length = 0;
launches.length = 0;
const grilledTask = startAction(JSON.stringify({ intent: "grill", ids: ["c"] }));
expect("a task can be grilled: the run refuses a non-decision seed, not the page", !grilledTask.refused);
expectEqual("grill takes the id it was given", launches, [
	{ kind: "grill", workflow: "beads-dag-grill", seed: "c" },
]);

expect(
	"grill does not claim, merge, close, or label",
	writes.length === 0 &&
		writes.every(
			(call) =>
				!call.args.includes("claim") &&
				!call.args.includes("close") &&
				!call.args.includes("update") &&
				!call.args.includes("label") &&
				!call.args.includes("merge"),
		),
);

writes.length = 0;
launches.length = 0;
const emptyGrill = startAction(JSON.stringify({ intent: "grill", ids: [] }));
expect("empty selection does not grill", emptyGrill.refused);
expect("empty selection names empty", emptyGrill.message.includes("empty selection"));
expectEqual("empty selection grills nothing", launches, []);
expectEqual("empty selection writes nothing", writes, []);

writes.length = 0;
launches.length = 0;
const missingGrillIds = startAction(JSON.stringify({ intent: "grill" }));
expect("missing ids is empty selection for grill", missingGrillIds.refused);
expectEqual("missing ids grills nothing", launches, []);

writes.length = 0;
launches.length = 0;
const twoSeeds = startAction(JSON.stringify({ intent: "grill", ids: ["c", "d"] }));
expect("two seeds are refused, not silently narrowed", twoSeeds.refused);
expect("two seeds names one seed", twoSeeds.message.includes("one seed"));
expectEqual("two seeds grill nothing", launches, []);
expectEqual("two seeds write nothing", writes, []);

writes.length = 0;
launches.length = 0;
const unknownSeed = startAction(JSON.stringify({ intent: "grill", ids: ["nope"] }));
expect("an unknown seed is refused", unknownSeed.refused);
expectEqual("an unknown seed grills nothing", launches, []);

writes.length = 0;
launches.length = 0;
const heldGrill = startAction(JSON.stringify({ intent: "grill", ids: ["a"] }), {
	...startExtras,
	targetHeld: true,
});
expect("a held Target does not grill", heldGrill.refused);
expect("held Target names held", heldGrill.message.includes("Target already held"));
expectEqual("held Target grills nothing", launches, []);
expectEqual("held Target writes nothing", writes, []);

writes.length = 0;
launches.length = 0;
const grillClosed = startAction(JSON.stringify({ intent: "grill", ids: ["a"], closed: true }));
expect("grill carrying closed is refused", grillClosed.refused);
expectEqual("grill carrying closed launches nothing", launches, []);
expectEqual("grill carrying closed writes nothing", writes, []);

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
