/**
 * The live path: discovery through OpenAlex, then a receipt for every source actually read.
 *
 *   FRONT_END_PROXY=socks5h://127.0.0.1:23379 bun tools/front-end/fetch.ts \
 *     --query "attention is all you need" --sources arxiv:1706.03762,doi:10.5555/x --corpus .scratch/<effort>
 *
 * The reading is not here: this stops at the receipts, and the note is the reader's product. Nothing here
 * touches the store either — the AFK leg's output is documents, which is why it can run read-only.
 *
 * A search prints its candidates with the ids that name them; it does not write receipts for work nobody
 * chose to read.
 */

import { join } from "node:path";
import { writeReceipt } from "./corpus";
import { liveProvider, proxyInUse } from "./providers/live";

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
	const at = args.indexOf(`--${name}`);
	return at >= 0 ? args[at + 1] : undefined;
};

const query = arg("query");
const sources = (arg("sources") ?? "")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
const corpusDir = arg("corpus") ?? join(process.cwd(), ".scratch/research-flow/live-corpus");

console.log(`proxy:  ${proxyInUse() ?? "(none — OpenAlex and plain URLs answer; arxiv will refuse)"}`);
console.log(`corpus: ${corpusDir}`);

if (!query && sources.length === 0) {
	console.log("\nnothing to do: pass --query <text>, --sources <id,id>, or both");
	process.exitCode = 2;
} else {
	if (query) {
		const found = await liveProvider.search(query);
		console.log(`\nsearch "${query}" — ${found.length} work(s), best first (OpenAlex relevance is not good;`);
		console.log("treat these as candidates, not as an answer):");
		for (const s of found) {
			const abstract = s.text.length > s.title.length ? "abstract" : "no abstract";
			console.log(`  ${s.id}  [${abstract}]  ${s.title.slice(0, 72)}`);
		}
	}
	for (const id of sources) {
		try {
			const src = await liveProvider.fetchSource(id);
			const thin = src.text.length <= src.title.length + 2;
			console.log(`\nreceipt  ${writeReceipt(corpusDir, src)}`);
			console.log(
				`         ${src.http} · ${src.text.length} chars · ${src.title.slice(0, 72)}` +
					(thin ? "  ⚠ metadata only — no abstract came down, so nothing here is quotable" : ""),
			);
			if (src.redirectedFrom) {
				console.log(`         ↪ the page sent the fetch to ${src.url}`);
			}
		} catch (err) {
			console.log(`\nFAILED   ${id}: ${(err as Error).message}`);
			process.exitCode = 1;
		}
	}
}
