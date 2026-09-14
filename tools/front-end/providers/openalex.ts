/**
 * OpenAlex: discovery, and metadata for anything with a DOI.
 *
 * It answers directly, needs no key, and returns an abstract as an *inverted index* — a term, then the
 * positions it sits at — which has to be decoded before it is text anybody can quote. Its relevance on a
 * natural-language query is poor (a probe for agent-loop budgets came back with a soil-microbiology
 * paper), so a query here should be a title, a DOI, or a filtered one: this module sends what it is given
 * and does not pretend the ranking is good.
 */

import { contactFromEnv, fetchText } from "../fetch-text";
import type { Source } from "../retrieval";

type Work = {
	id: string;
	doi?: string | null;
	title?: string | null;
	abstract_inverted_index?: Record<string, number[]> | null;
	best_oa_location?: { url?: string | null } | null;
	primary_location?: { landing_page_url?: string | null } | null;
};

const API = "https://api.openalex.org/works";

function decodeAbstract(inverted?: Record<string, number[]> | null): string {
	if (!inverted) return "";
	const at: Array<[number, string]> = [];
	for (const [term, positions] of Object.entries(inverted)) {
		for (const p of positions) at.push([p, term]);
	}
	return at
		.sort((a, b) => a[0] - b[0])
		.map(([, term]) => term)
		.join(" ");
}

/** OpenAlex hands a DOI back as a URL; a claim cites the DOI, so the prefix goes. */
function doiKey(doi?: string | null): string | undefined {
	return doi ? `doi:${doi.replace(/^https?:\/\/doi\.org\//, "")}` : undefined;
}

function toSource(work: Work, fallbackUrl: string, requested?: string): Source {
	const shortId = work.id.replace("https://openalex.org/", "");
	const doi = doiKey(work.doi);
	const abstract = decodeAbstract(work.abstract_inverted_index);
	const title = work.title ?? "(untitled)";
	// The id the caller asked for is the one a claim cites: a DOI stays a DOI even though OpenAlex was the
	// thing that answered. The other key rides along as an alias.
	const byDoi = requested?.startsWith("doi:") === true;
	return {
		id: byDoi && doi ? doi : `openalex:${shortId}`,
		aliases: byDoi && doi ? [`openalex:${shortId}`] : doi ? [doi] : [],
		url: work.best_oa_location?.url ?? work.primary_location?.landing_page_url ?? fallbackUrl,
		kind: byDoi ? "doi" : "openalex",
		http: 200,
		title,
		text: abstract ? `${title}\n\n${abstract}` : title,
	};
}

function request(url: string): { status: number; body: string } {
	const fetched = fetchText(url, { proxy: /* OpenAlex answers directly */ undefined, timeoutSec: 30 });
	return { status: fetched.status, body: fetched.body };
}

export function openalexSearch(query: string, limit = 5): Source[] {
	const mailto = contactFromEnv();
	const url = `${API}?search=${encodeURIComponent(query)}&per-page=${limit}${mailto ? `&mailto=${encodeURIComponent(mailto)}` : ""}`;
	const { status, body } = request(url);
	if (status !== 200) throw new Error(`OpenAlex search answered ${status} for ${query}`);
	const results = (JSON.parse(body) as { results?: Work[] }).results ?? [];
	return results.map((w) => toSource(w, url));
}

export function openalexWork(id: string): Source {
	const key = id.replace(/^openalex:/, "").replace(/^doi:/, "doi:");
	const { status, body } = request(`${API}/${encodeURIComponent(key)}`);
	if (status !== 200) throw new Error(`OpenAlex work ${id} answered ${status}`);
	return toSource(JSON.parse(body) as Work, `${API}/${key}`, id);
}
