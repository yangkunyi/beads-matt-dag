/**
 * Local-file receipts for the packaging reading.
 *
 * The inquiry corpus's rule is that a quote must re-anchor against a receipt; the live provider only
 * fetches URLs, and curl answers 0 for file://. So a local primary source is receipted here with the
 * same writeReceipt the corpus already uses: text is the file verbatim (extract: "verbatim"), the id
 * is `file:<absolute path>`, and the locator a claim cites is `<path>:<line>`.
 *
 * Usage: bun .scratch/packaging/mkreceipt.ts <corpusDir> <file> [file...]
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { writeReceipt } from "../../tools/inquiry/corpus";

const [corpusDir, ...files] = process.argv.slice(2);
if (!corpusDir || files.length === 0) {
	console.error("usage: bun .scratch/packaging/mkreceipt.ts <corpusDir> <file> [file...]");
	process.exit(2);
}

for (const file of files) {
	const abs = resolve(file);
	const text = readFileSync(abs, "utf8");
	const path = writeReceipt(corpusDir, {
		id: `file:${abs}`,
		aliases: [],
		url: `file://${abs}`,
		kind: "url",
		http: 200,
		extract: "verbatim",
		title: basename(abs),
		text,
	});
	console.log(`${path}  ${text.length} chars  ${abs}`);
}
