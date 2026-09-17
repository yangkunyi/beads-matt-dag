#!/usr/bin/env bun
/**
 * The overview's seams: the graph is `bd`, never jsonl; the page filters by type / status / label;
 * a selected issue carries status, comments and documents; a live drain / inquiry / experiment run
 * overlays from the run lock, Archon status, artefacts and attempted — not a pack publish API;
 * an operator reply is `bd comment` on the selected issue, never `bd human respond`; the one
 * tagged write door refuses `closed`, `reading:`, and unknown intents without writing; a same-domain
 * selection starts that domain's existing run with those ids as the allow-list; mixed-domain, empty,
 * and a held Target do not start; start does not claim, merge, or stamp `closed`; issues left out
 * keep their triage; close / `reading:` / labels stay the session's; the page is a React app with a
 * shadcn-style kit; the graph is React Flow projecting the store and does not write an edge on
 * connect; coordinates stay in the view.
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
	type LiveRun,
	type StoreComment,
	type StoreIssue,
} from "./model";
import { fetchLive, gitDirOf, RUN_LOCK_NAME } from "./overlay";
import { applyOperatorAction, OperatorActionRefused } from "./actions";
import { commentWriteBody } from "./client-comment";
import { startWriteBody } from "./client-start";
import { addComment, parseCommentBody } from "./comment";
import { projectGraph, writeForConnect } from "./graph-view";
import {
	pageCarriesDetail,
	pageCarriesLive,
	pageCoversThreeDomains,
	pageGraphIsReactFlow,
	pageHasFilters,
	pageIsReactApp,
	pageOffersReply,
	pageOffersStart,
	renderPage,
} from "./page";
import type { RunLaunch } from "./start";
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

const html = renderPage(overview);
expect("page has type/status/label filters", pageHasFilters(html));
expect("static snapshot does not offer a reply endpoint", !pageOffersReply(html));
expect("static snapshot does not offer start", !pageOffersStart(html));
expect("page is a React app with a shadcn-style kit", pageIsReactApp(html));
expect("graph is React Flow", pageGraphIsReactFlow(html));
expect("page carries the DAG nodes", html.includes('"id":"a"') && html.includes('"id":"c"'));

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
	"every node has a view position",
	projected.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)),
);
expect(
	"store issues do not carry coordinates",
	overview.issues.every((item) => !("position" in item) && !("x" in item) && !("y" in item)),
);
const nodeA = projected.nodes.find((node) => node.id === "a");
const nodeC = projected.nodes.find((node) => node.id === "c");
expect("blocker sits to the left of its dependent", Boolean(nodeA && nodeC && nodeA.position.x < nodeC.position.x));
expectEqual("connecting two issues does not write an edge", writeForConnect("a", "c"), null);
const selected = issueDetail(overview, "c");
expect("selected issue is in the model", selected !== undefined);
if (selected) {
	expect("click payload has status, comments, documents", pageCarriesDetail(html, selected));
	expect("status is in the page", html.includes("in_progress"));
	expect("comment text is in the page", html.includes("leave this on the ticket"));
	expect("document path is in the page", html.includes(join(".scratch", "drain", "issues", "03-the-drain-work.md")));
}

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
expect("page has type/status/label filters with overlay", pageHasFilters(liveHtml));
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
const writeRunner: BdWriteRunner = (args, stdin) => {
	writes.push({ args, stdin });
	return "";
};
addComment(writeRunner, "from-bd", "operator reply");
expectEqual("reply is bd comment", writes, [{ args: ["comment", "from-bd", "--stdin"], stdin: "operator reply" }]);
expect(
	"reply is not human respond, close, or a label",
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
let refused = false;
try {
	addComment(writeRunner, "from-bd", "   ");
} catch {
	refused = true;
}
expect("empty reply is refused", refused);
expectEqual("empty reply does not write", writes, []);

writes.length = 0;
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

function refusedAction(raw: string): { refused: boolean; message: string } {
	try {
		applyOperatorAction(writeRunner, raw);
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

writes.length = 0;
const missingIntent = refusedAction(JSON.stringify({ id: "from-bd", text: "leave this" }));
expect("missing intent is refused", missingIntent.refused);
expectEqual("missing intent does not write", writes, []);

writes.length = 0;
const humanRespond = refusedAction(JSON.stringify({ intent: "human-respond", id: "from-bd", text: "leave this" }));
expect("human-respond intent is refused", humanRespond.refused);
expectEqual("human-respond intent does not write", writes, []);

let badBody = false;
try {
	parseCommentBody("not-json");
} catch {
	badBody = true;
}
expect("non-JSON comment body is refused", badBody);

writes.length = 0;
const badWrite = refusedAction("not-json");
expect("non-JSON write is refused", badWrite.refused);
expectEqual("non-JSON write does not write", writes, []);

const servedHtml = renderPage(overview, { commentEndpoint: "/comment" });
expect("served page offers a reply endpoint", pageOffersReply(servedHtml));
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
expectEqual(
	"comment write body is the tagged intent",
	commentWriteBody("from-bd", "leave this"),
	JSON.stringify({ intent: "comment", id: "from-bd", text: "leave this" }),
);
expect("served page offers the comment door", pageOffersReply(servedHtml));
const graphSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui", "Graph.tsx"), "utf8");
expect("graph uses React Flow", graphSrc.includes("@xyflow/react"));
expect(
	"graph connect does not fetch or write",
	!graphSrc.includes("fetch(") && graphSrc.includes("writeForConnect"),
);

const doorWrites: { args: string[]; stdin: string | undefined }[] = [];
const handler = {
	write: ((args: string[], stdin?: string) => {
		doorWrites.push({ args, stdin });
		return "";
	}) satisfies BdWriteRunner,
	page: () => renderPage(overview, { commentEndpoint: "/comment" }),
};
const getPage = await handleOverviewRequest({ method: "GET", url: "/" }, "", handler);
expectEqual("GET / is 200", getPage.status, 200);
expect("GET / offers a reply endpoint", pageOffersReply(getPage.body));
const posted = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "operator reply" }),
	handler,
);
expectEqual("POST /comment is 204", posted.status, 204);
expectEqual("POST /comment writes only bd comment", doorWrites, [
	{ args: ["comment", "from-bd", "--stdin"], stdin: "operator reply" },
]);
expect(
	"POST /comment is not human respond",
	doorWrites.every((call) => call.args[0] === "comment" && !call.args.includes("human") && !call.args.includes("respond")),
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
const emptyPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "comment", id: "from-bd", text: "" }),
	handler,
);
expectEqual("empty POST is 400", emptyPost.status, 400);
expectEqual("empty POST does not write", doorWrites.length, 1);
const missing = await handleOverviewRequest({ method: "POST", url: "/close" }, "", handler);
expectEqual("unknown path is 404", missing.status, 404);

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

const servePath = join(dirname(fileURLToPath(import.meta.url)), "serve.ts");
const serveHelp = spawnSync(process.execPath, [servePath, "--help"], { encoding: "utf8" });
expectEqual("serve help exits 0", serveHelp.status, 0);
expect("serve help names bd comment", (serveHelp.stdout ?? "").includes("bd comment"));
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
expectEqual(
	"start write body is the tagged intent",
	startWriteBody(["c", "d"]),
	JSON.stringify({ intent: "start", ids: ["c", "d"] }),
);

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
expectEqual("POST start does not write the store", doorWrites.length, 1);

startLaunches.length = 0;
const mixedPost = await handleOverviewRequest(
	{ method: "POST", url: "/comment" },
	JSON.stringify({ intent: "start", ids: ["a", "c"] }),
	startHandler,
);
expectEqual("POST mixed-domain start is 400", mixedPost.status, 400);
expect("POST mixed-domain names mixed-domain", mixedPost.body.includes("mixed-domain"));
expectEqual("POST mixed-domain does not launch", startLaunches, []);
expectEqual("POST mixed-domain does not write", doorWrites.length, 1);

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
