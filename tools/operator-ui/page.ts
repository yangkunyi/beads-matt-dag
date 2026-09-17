/**
 * The overview as a self-contained HTML page: a React app with a shadcn-style kit, React Flow for
 * the DAG, the three filters, live overlay, and a click-for-detail panel.
 *
 * All data is embedded. A static snapshot has no socket — a browser talking to that file is looking
 * at what `bd` already answered. A served page posts tagged intents through the write door: a comment
 * is `bd comment`; start launches that domain's existing run with the selected ids as the allow-list.
 * Beads stays the only comment store. Coordinates stay in the view.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { LiveRun, Overview, OverviewIssue } from "./model";
import { App, type PageOverview } from "./ui/App.tsx";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const KIT_CSS = readFileSync(join(here, "ui", "styles.css"), "utf8");
const FLOW_CSS = readFileSync(require.resolve("@xyflow/react/dist/style.css"), "utf8");

let cachedClient: string | undefined;

function clientScript(): string {
	if (cachedClient !== undefined) return cachedClient;
	const outDir = mkdtempSync(join(tmpdir(), "operator-ui-client-"));
	const result = spawnSync(
		process.execPath,
		["build", join(here, "ui", "main.tsx"), "--outdir", outDir, "--target", "browser", "--minify"],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) {
		throw new Error(`operator-ui client build failed: ${result.stderr || result.stdout}`);
	}
	cachedClient = readFileSync(join(outDir, "main.js"), "utf8").replace(/<\/script/gi, "<\\/script");
	return cachedClient;
}

export type RenderPageOptions = {
	/** When set, the detail panel posts a tagged comment intent here as `bd comment`. Absent on a static snapshot. */
	commentEndpoint?: string;
};

export function renderPage(overview: Overview, options: RenderPageOptions = {}): string {
	const data: PageOverview = {
		...overview,
		commentEndpoint: options.commentEndpoint ?? null,
	};
	const app = renderToString(createElement(App, { overview: data }));
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Target beads graph</title>
<style>${KIT_CSS}
${FLOW_CSS}</style>
</head>
<body>
<div id="root" data-app="react" data-kit="shadcn">${app}</div>
<script type="application/json" id="overview">${json}</script>
<script>${clientScript()}</script>
</body>
</html>
`;
}

/** Values the page must carry so a click can show them without another fetch. */
export function pageCarriesDetail(html: string, issue: OverviewIssue): boolean {
	if (!html.includes(issue.id)) return false;
	if (!html.includes(issue.status)) return false;
	for (const comment of issue.comments) {
		if (!html.includes(comment.text)) return false;
	}
	for (const doc of issue.documents) {
		if (!html.includes(doc.rel)) return false;
	}
	return true;
}

export function pageHasFilters(html: string): boolean {
	return html.includes("<legend>Type</legend>") && html.includes("<legend>Status</legend>") && html.includes("<legend>Label</legend>");
}

/** A served page posts replies; a static snapshot does not. */
export function pageOffersReply(html: string): boolean {
	return html.includes('"commentEndpoint":"/comment"');
}

/** A served page can start a selection; a static snapshot does not. */
export function pageOffersStart(html: string): boolean {
	return html.includes('id="start"') && html.includes("Start selection");
}

/** The page still names all three domains even when a live run of one kind is overlaid. */
export function pageCoversThreeDomains(html: string): boolean {
	return html.includes("inquiry") && html.includes("experiment") && html.includes("drain");
}

/** Values the live overlay must carry so the graph can show the run and its last report. */
export function pageCarriesLive(html: string, live: LiveRun): boolean {
	if (!html.includes(live.id)) return false;
	if (!html.includes(live.kind)) return false;
	if (!html.includes(live.status)) return false;
	for (const id of live.attempted) {
		if (!html.includes(id)) return false;
	}
	if (live.report !== null && !html.includes(live.report.text)) return false;
	return html.includes("Last report");
}

export function pageIsReactApp(html: string): boolean {
	return html.includes('data-app="react"') && html.includes('data-kit="shadcn"');
}

export function pageGraphIsReactFlow(html: string): boolean {
	return html.includes('data-graph="react-flow"');
}
