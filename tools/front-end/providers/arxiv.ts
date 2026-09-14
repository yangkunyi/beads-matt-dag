/**
 * arxiv: the abstract page, and only through a proxy.
 *
 * Measured on this machine: with the BoostNet shell up (`127.0.0.1:23379`) `arxiv.org/abs/<id>` answers
 * 200 and the abstract comes down readable — over `http://` in ~8.6s, over `socks5h://` in ~0.4s, so the
 * address is the caller's and the faster scheme is theirs to choose. `export.arxiv.org/api` answered 429
 * even with a User-Agent and a polite delay, which is why discovery is OpenAlex's job and not the API's.
 *
 * With no proxy configured, arxiv does not answer at all — so this throws the sentence that says so
 * instead of waiting out a timeout. A caller who cannot reach a paper is better told than kept.
 */

import { fetchText, proxyFromEnv } from "../fetch-text";
import { blockWithClass, htmlToText } from "../html-text";
import type { Source } from "../retrieval";

export function arxivAbs(arxivId: string): Source {
	const proxy = proxyFromEnv();
	if (!proxy) {
		throw new Error(
			"arxiv answers only behind a proxy; set FRONT_END_PROXY (or https_proxy) to the BoostNet shell, " +
				"e.g. socks5h://127.0.0.1:23379",
		);
	}
	const url = `https://arxiv.org/abs/${arxivId}`;
	const { status, body, via } = fetchText(url, { proxy, timeoutSec: 45 });
	if (status !== 200) throw new Error(`arxiv answered ${status} for ${arxivId}${via ? ` (via ${via})` : ""}`);
	const title = htmlToText(blockWithClass(body, "h1", "title")).replace(/^Title:\s*/i, "");
	const abstract = htmlToText(blockWithClass(body, "blockquote", "abstract")).replace(/^Abstract:\s*/i, "");
	if (!abstract) throw new Error(`no abstract on the arxiv page for ${arxivId} — the page answered, its shape changed`);
	return {
		id: `arxiv:${arxivId}`,
		aliases: [],
		url,
		kind: "arxiv",
		http: status,
		extract: "abs page, title + abstract",
		title: title || "(untitled)",
		text: `${title}\n\n${abstract}`,
	};
}
