/**
 * The attention inbox as a self-contained HTML page: React + shadcn-style kit, the snapshot
 * embedded, the client cached on a served page.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { Overview } from "../operator-ui/model";
import type { AttentionSnapshot } from "./snapshot";
import { App, type PageAttention } from "./ui/App.tsx";

const here = dirname(fileURLToPath(import.meta.url));

export const CLIENT_ASSETS = { js: "/app.js", css: "/app.css" } as const;

export type ClientAsset = {
	path: string;
	body: string;
	contentType: string;
	etag: string;
};

export type ClientAssets = { js: ClientAsset; css: ClientAsset };

let cachedAssets: ClientAssets | undefined;

export function clientAssets(): ClientAssets {
	if (cachedAssets !== undefined) return cachedAssets;
	const outDir = mkdtempSync(join(tmpdir(), "attention-ui-client-"));
	const result = spawnSync(process.execPath, [join(here, "ui", "build.ts"), outDir], { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`attention-ui client build failed: ${result.stderr || result.stdout}`);
	}
	const js = readFileSync(join(outDir, "main.js"), "utf8");
	const css = readFileSync(join(outDir, "main.css"), "utf8");
	cachedAssets = {
		js: { path: CLIENT_ASSETS.js, body: js, contentType: "text/javascript; charset=utf-8", etag: etagOf(js) },
		css: { path: CLIENT_ASSETS.css, body: css, contentType: "text/css; charset=utf-8", etag: etagOf(css) },
	};
	return cachedAssets;
}

function etagOf(body: string): string {
	return `"${createHash("sha1").update(body).digest("hex")}"`;
}

export type RenderAttentionPageOptions = {
	commentEndpoint?: string;
	attentionEndpoint?: string;
	overviewEndpoint?: string;
	graph?: Overview;
	actor?: string;
	cacheClient?: boolean;
};

export function renderAttentionPage(snapshot: AttentionSnapshot, options: RenderAttentionPageOptions = {}): string {
	const data: PageAttention = {
		snapshot,
		commentEndpoint: options.commentEndpoint ?? null,
		attentionEndpoint: options.attentionEndpoint ?? null,
		overviewEndpoint: options.overviewEndpoint ?? null,
		graph: options.graph ?? null,
		actor: options.actor ?? null,
	};
	const app = renderToString(createElement(App, { attention: data }));
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	const assets = options.cacheClient === true ? undefined : clientAssets();
	const head =
		assets === undefined
			? `<link rel="stylesheet" href="${CLIENT_ASSETS.css}">`
			: `<style>${assets.css.body}</style>`;
	const tail =
		assets === undefined
			? `<script type="module" src="${CLIENT_ASSETS.js}"></script>`
			: `<script type="module">${assets.js.body.replace(/<\/script/gi, "<\\/script")}</script>`;
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Attention</title>
${head}
</head>
<body>
<div id="root">${app}</div>
<script type="application/json" id="attention-data">${json}</script>
${tail}
</body>
</html>
`;
}

export function pageIsReactApp(html: string): boolean {
	return html.includes('data-app="react"') && html.includes('data-kit="shadcn"');
}

export function pageFocusesBucket(html: string, key: string): boolean {
	return html.includes(`data-focus="${key}"`);
}

export function pageCarriesHandle(html: string, handle: string): boolean {
	return html.includes(`data-handle="${handle}"`);
}

export function pageOffersCreate(html: string): boolean {
	return html.includes('id="create-form"') && !html.includes("---\n");
}
