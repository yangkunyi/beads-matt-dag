/**
 * The retrieval seam, mocked.
 *
 * One interface, two calls (`search`, `fetchSource`), one implementation here. The mock exists to settle
 * a *shape* question — what the retrieval layer hands to a reader, and what a receipt is made of — with
 * no network, no API key and no rate limit in the way. The real provider drops in behind the same two
 * calls, and the transport is whatever the environment says: `http_proxy` / `https_proxy` are honoured
 * when they are set (the machine's Clash lives at `127.0.0.1:7892` — see the `proxy_on` alias — and is
 * not running as of 2026-09-14).
 *
 * Facts this seam is built around (measured from this machine, 2026-09-14):
 *   - `api.openalex.org` answers directly (200) and needs no key; an abstract comes back as an inverted
 *     index (`abstract_inverted_index`) and has to be decoded. Relevance is mediocre on a
 *     natural-language query — it wants a title, a DOI or filters;
 *   - `api.semanticscholar.org` answers 429 unauthenticated — it works with a key;
 *   - arxiv is reachable **only through the BoostNet proxy on `127.0.0.1:23379`** (the `clash` shell;
 *     `http://` and `socks5h://` both work): `arxiv.org/abs/<id>` answers 200 and carries the abstract,
 *     while `export.arxiv.org/api` answers 429 even with a User-Agent. With that shell closed, nothing on
 *     arxiv answers, so a corpus has to survive on the copies — OpenAlex, a publisher, or
 *     `huggingface.co/papers/<id>` (200 for a real id). Whichever is fetched, the arxiv id stays an
 *     *alias* on the source, never the thing fetched.
 */

export type SourceKind = "doi" | "openalex" | "url";

export type Source = {
	/** The citable key — what a claim cites, and what the receipt is named after. */
	id: string;
	/** Other ids for the same work (an arxiv id beside a doi, say). Never fetched from. */
	aliases: string[];
	/** What was actually fetched. */
	url: string;
	kind: SourceKind;
	title: string;
	/** The fetched text, verbatim: a quote is anchored against this and nothing else. */
	text: string;
};

export interface Provider {
	search(query: string): Promise<Source[]>;
	fetchSource(id: string): Promise<Source>;
}

const MOCK: Source[] = [
	{
		id: "doi:10.5555/onwards.2024.11",
		aliases: [],
		url: "https://example-publisher.org/oa/onwards-2024.pdf",
		kind: "doi",
		title: "Budget, not model: what makes an agent-run experiment loop converge",
		text: [
			"Abstract. We compare fixed short-budget loops against single long jobs on a shared task set.",
			"Across 240 runs the short loop reached a usable result in 71% of attempts, while the long job",
			"reached one in 43%; the gap closes above an eight-hour budget, which no run in this study used.",
		].join(" "),
	},
	{
		id: "openalex:W4400012345",
		aliases: ["arxiv:2410.01234"],
		url: "https://huggingface.co/papers/2410.01234",
		kind: "openalex",
		title: "Repair at open: recovering work a killed run left behind",
		text: [
			"We describe a recovery pass that runs before any new work is claimed: a run reads its own",
			"record, decides from the artefact rather than the log, and either completes the interrupted",
			"step or returns the unit to the queue with a reason attached. In our deployment this removed",
			"the need for a human to notice a dead run at all.",
		].join(" "),
	},
	{
		id: "url:https://example-lab.github.io/notes/ablation-budget",
		aliases: [],
		url: "https://example-lab.github.io/notes/ablation-budget",
		kind: "url",
		title: "Lab notes: a budget ablation that did not replicate",
		text: [
			"We could not reproduce the 71%/43% split on our hardware; our budget sweep is dominated by",
			"queueing noise, and two of the three seeds failed to finish inside the wall clock.",
		].join(" "),
	},
];

export const mockProvider: Provider = {
	async search(query: string): Promise<Source[]> {
		// A mock does not rank: it hands back the set the shape question needs, and says so.
		void query;
		return MOCK;
	},
	async fetchSource(id: string): Promise<Source> {
		const found = MOCK.find((s) => s.id === id);
		if (!found) throw new Error(`mock: no source ${id}`);
		return found;
	},
};
