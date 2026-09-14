/**
 * The live provider: the two real sources behind the one seam, and the plain-URL reader beside them.
 *
 * Discovery is OpenAlex; a source named by id is fetched from the source that owns it — an `arxiv:` id
 * through the proxy, a `doi:` or `openalex:` id from OpenAlex, anything else as a URL. A page fetched by
 * URL is its own receipt, which is how a lab notebook or a vendor doc gets cited without pretending it
 * has a DOI.
 *
 * Degradation is explicit, not silent: with no proxy the arxiv path throws its own sentence, and the
 * caller decides whether the question can be answered from OpenAlex alone.
 */

import { fetchText, proxyFromEnv } from "../fetch-text";
import type { Provider, Source } from "../retrieval";
import { arxivAbs } from "./arxiv";
import { openalexSearch, openalexWork } from "./openalex";

function urlSource(url: string): Source {
	const { status, body, via } = fetchText(url, { proxy: proxyFromEnv(), timeoutSec: 45 });
	if (status !== 200) throw new Error(`${url} answered ${status}${via ? ` (via ${via})` : ""}`);
	const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.replace(/\s+/g, " ").trim() ?? url;
	return { id: `url:${url}`, aliases: [], url, kind: "url", http: status, title, text: body };
}

export const liveProvider: Provider = {
	async search(query: string): Promise<Source[]> {
		return openalexSearch(query);
	},
	async fetchSource(id: string): Promise<Source> {
		if (id.startsWith("arxiv:")) return arxivAbs(id.slice("arxiv:".length));
		if (id.startsWith("doi:") || id.startsWith("openalex:")) return openalexWork(id);
		if (id.startsWith("url:")) return urlSource(id.slice("url:".length));
		throw new Error(`no provider owns the id "${id}" — prefix it with arxiv:, doi:, openalex: or url:`);
	},
};

export function proxyInUse(): string | undefined {
	return proxyFromEnv();
}
