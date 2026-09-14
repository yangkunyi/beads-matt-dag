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
import { htmlToText, metaRedirect, pageTitle } from "../html-text";
import type { Provider, Source } from "../retrieval";
import { arxivAbs } from "./arxiv";
import { openalexSearch, openalexWork } from "./openalex";

/** A page is quotable only once it is text: the receipt keeps the text and says how it got it, because a
 *  quote has to be re-found through the same extraction. */
function urlSource(requested: string): Source {
	let url = requested;
	let fetched = fetchText(url, { proxy: proxyFromEnv(), timeoutSec: 45 });
	if (fetched.status !== 200) throw new Error(`${url} answered ${fetched.status}${fetched.via ? ` (via ${fetched.via})` : ""}`);
	let text = htmlToText(fetched.body);
	// A stub that only redirects answers 200 and would make a worthless receipt. One hop, no more — and
	// the receipt names both URLs rather than pretending the reader asked for the second one.
	const hop = text.length < 600 ? metaRedirect(fetched.body, url) : undefined;
	if (hop) {
		fetched = fetchText(hop, { proxy: proxyFromEnv(), timeoutSec: 45 });
		if (fetched.status !== 200) throw new Error(`${hop} answered ${fetched.status} after ${requested} redirected to it`);
		text = htmlToText(fetched.body);
		url = hop;
	}
	return {
		id: `url:${requested}`,
		aliases: [],
		url,
		kind: "url",
		http: fetched.status,
		extract: "html → text",
		title: pageTitle(fetched.body, url),
		text,
		...(url === requested ? {} : { redirectedFrom: requested }),
	};
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
