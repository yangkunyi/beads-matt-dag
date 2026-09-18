/**
 * The overview as a self-contained HTML page: a React app with a shadcn-style kit, React Flow for
 * the DAG, the three filters, live overlay, and a click-for-detail panel.
 *
 * All data is embedded. A static snapshot has no socket — a browser talking to that file is looking
 * at what `bd` already answered, and the client is inlined so the file stands alone. A served page
 * fetches that same client from `CLIENT_ASSETS` instead, so one 1.2 MB script is cached and
 * revalidated rather than re-sent with every response. A served page posts tagged intents through the
 * write door: a comment as `bd comment`, create (type is the domain; needs-triage; no gate), start
 * (that domain's existing run with the selected ids as the allow-list), store deps, or one of the five
 * triage labels replacing the rest of the family. Beads stays the only graph and the only comment
 * store. Coordinates stay in the view. A refused connect does not land on the canvas.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const FLOW_CSS = readFileSync(require.resolve("@xyflow/react/dist/style.css"), "utf8");

let cachedAssets: ClientAssets | undefined;

/** Where a served page fetches its client. Two files a browser can hold on to. */
export const CLIENT_ASSETS = { js: "/app.js", css: "/app.css" } as const;

export type ClientAsset = {
	/** The request path this answers. */
	path: string;
	body: string;
	contentType: string;
	/** Strong validator: the client is rebuilt whenever the server starts, so a cached copy is revalidated, not trusted. */
	etag: string;
};

export type ClientAssets = { js: ClientAsset; css: ClientAsset };

/**
 * The built client, once per process: `main.js` and one sheet holding the Tailwind build of
 * `main.tsx`'s import, the legacy component sheet, and React Flow's own, concatenated so a page
 * needs a single link. `bun build` on the command line takes no plugins, so the build lives in
 * `ui/build.ts` and this spawns it.
 */
export function clientAssets(): ClientAssets {
	if (cachedAssets !== undefined) return cachedAssets;
	const outDir = mkdtempSync(join(tmpdir(), "operator-ui-client-"));
	const result = spawnSync(process.execPath, [join(here, "ui", "build.ts"), outDir], { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`operator-ui client build failed: ${result.stderr || result.stdout}`);
	}
	const js = readFileSync(join(outDir, "main.js"), "utf8");
	const css = `${readFileSync(join(outDir, "main.css"), "utf8")}\n${FLOW_CSS}`;
	cachedAssets = {
		js: { path: CLIENT_ASSETS.js, body: js, contentType: "text/javascript; charset=utf-8", etag: etagOf(js) },
		css: { path: CLIENT_ASSETS.css, body: css, contentType: "text/css; charset=utf-8", etag: etagOf(css) },
	};
	return cachedAssets;
}

/** Content-derived, so the same build answers the same validator and a rebuild answers a new one. */
function etagOf(body: string): string {
	return `"${createHash("sha1").update(body).digest("hex")}"`;
}

/** The client inline, script-close escaped: what a snapshot needs to stand alone in one file. */
function clientBundle(): ClientAssets {
	const assets = clientAssets();
	return {
		js: { ...assets.js, body: assets.js.body.replace(/<\/script/gi, "<\\/script") },
		css: assets.css,
	};
}

export type RenderPageOptions = {
	/** When set, the page posts tagged comment, create, triage, and start intents here. Absent on a static snapshot. */
	commentEndpoint?: string;
	/** When set, a write re-reads this for a fresh snapshot instead of reloading the page. Absent on a static snapshot. */
	overviewEndpoint?: string;
	/** The door's actor, so a comment can tell a human operator from anyone else. Absent on a snapshot. */
	actor?: string;
	/**
	 * Fetch the client from `CLIENT_ASSETS` rather than inlining it. A served page wants this: the
	 * client is the same bytes for every issue and every request. A snapshot does not, because it is
	 * one file someone will open from disk.
	 */
	cacheClient?: boolean;
};

export function renderPage(overview: Overview, options: RenderPageOptions = {}): string {
	const data: PageOverview = {
		...overview,
		commentEndpoint: options.commentEndpoint ?? null,
		overviewEndpoint: options.overviewEndpoint ?? null,
		actor: options.actor ?? null,
	};
	const app = renderToString(createElement(App, { overview: data }));
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	// The client is linked, not inlined, on a served page; its sheet would otherwise be 7 KB of every
	// response and its script 1.2 MB. Data stays embedded either way: it is what this request read.
	const client = options.cacheClient === true ? undefined : clientBundle();
	const head =
		client === undefined
			? `<link rel="stylesheet" href="${CLIENT_ASSETS.css}">`
			: `<style>${client.css.body}</style>`;
	const tail =
		client === undefined
			? `<script type="module" src="${CLIENT_ASSETS.js}"></script>`
			: `<script type="module">${client.js.body}</script>`;
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Target beads graph</title>
${head}
</head>
<body>
<div id="root" data-app="react" data-kit="shadcn">${app}</div>
<script type="application/json" id="overview">${json}</script>
${tail}
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

/** A served page re-reads the store after a write; a static snapshot has nothing to re-read. */
export function pageOffersRefresh(html: string): boolean {
	return html.includes('"overviewEndpoint":"/overview"');
}

/** A served page offers create; a static snapshot does not. */
export function pageOffersCreate(html: string): boolean {
	return html.includes('id="create-form"');
}

/** The create dialog's markup is in the served page while it is closed: a portalled dialog would be empty. */
export function pageCreateStaysInDomWhileClosed(html: string): boolean {
	const at = html.indexOf('id="create"');
	if (at < 0) return false;
	return html.slice(at, at + 200).includes('data-dialog="closed"') && html.includes('id="create-form"');
}

/** A served page carries the windowed list of what is in the store: the read surface, not the shape. */
export function pageCarriesList(html: string): boolean {
	return html.includes('id="issue-list"') && html.includes('class="issue-row ');
}

/** A served page carries the command palette, closed. */
export function pageOffersPalette(html: string): boolean {
	return html.includes('id="palette"');
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

/** bun build emits ESM; a classic script would SyntaxError on import/export. Linked or inline. */
export function pageClientIsModule(html: string): boolean {
	return html.includes('<script type="module"');
}

/**
 * A served page fetches its client instead of carrying it: the same bytes for every issue and every
 * request. A snapshot inlines it, so this must be false for one.
 */
export function pageCachesClient(html: string): boolean {
	return (
		html.includes(`<script type="module" src="${CLIENT_ASSETS.js}"></script>`) &&
		html.includes(`<link rel="stylesheet" href="${CLIENT_ASSETS.css}">`) &&
		!html.includes('<script type="module">')
	);
}

export function pageGraphIsReactFlow(html: string): boolean {
	return html.includes('data-graph="react-flow"');
}
