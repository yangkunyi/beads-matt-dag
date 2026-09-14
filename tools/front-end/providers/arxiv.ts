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
import type { Source } from "../retrieval";

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	"#39": "'",
	apos: "'",
	nbsp: " ",
};

/** The inner text of the first `<tag class="…marker…">`. arxiv's page is stable enough for this and no
 *  more: when the shape changes the caller gets "no abstract", never a wrong one. */
function blockWithClass(html: string, tag: string, marker: string): string {
	const re = new RegExp(`<${tag}[^>]*class="[^"]*${marker}[^"]*"[^>]*>([\\s\\S]*?)</${tag}>`, "i");
	return re.exec(html)?.[1] ?? "";
}

function plain(html: string): string {
	return html
		.replace(/<[^>]*>/g, " ")
		.replace(/&([a-z0-9#]+);/gi, (whole, entity: string) => ENTITIES[entity.toLowerCase()] ?? whole)
		.replace(/\s+/g, " ")
		.trim();
}

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
	const title = plain(blockWithClass(body, "h1", "title")).replace(/^Title:\s*/i, "");
	const abstract = plain(blockWithClass(body, "blockquote", "abstract")).replace(/^Abstract:\s*/i, "");
	if (!abstract) throw new Error(`no abstract on the arxiv page for ${arxivId} — the page answered, its shape changed`);
	return {
		id: `arxiv:${arxivId}`,
		aliases: [],
		url,
		kind: "arxiv",
		http: status,
		title: title || "(untitled)",
		text: `${title}\n\n${abstract}`,
	};
}
