#!/usr/bin/env bun
/**
 * The overview's seams: the graph is `bd`, never jsonl; the page filters by type / status / label;
 * a selected issue carries status, comments and documents.
 *
 *   bun tools/operator-ui/overview-test.ts
 */

import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { documentsFor, bodyRel, issueNames, noteRel, recordRel } from "./documents";
import {
	assembleOverview,
	filterOverview,
	issueDetail,
	type StoreComment,
	type StoreIssue,
} from "./model";
import { pageCarriesDetail, pageHasFilters, renderPage } from "./page";
import { fetchStore, type BdRunner } from "./store";

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
expect("page carries the DAG nodes", html.includes('"id":"a"') && html.includes('"id":"c"'));
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

if (failed > 0) {
	console.error(`${failed} failure(s)`);
	process.exit(1);
}
console.log("ok");
