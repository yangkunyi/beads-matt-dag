/**
 * Build claims.json for note.ts by extracting quotes from the receipts.
 *
 * A claim's quote is never retyped: the spec gives `from`/`to` markers that must each occur exactly
 * once in the receipt, and the quote is the text between them. For a `file:` source the locator is
 * computed from the original file (line number of the quote's first character) so local citations are
 * `path:line` facts, not approximations.
 *
 * Usage: bun .scratch/packaging/mkclaims.ts <corpusDir> <spec.json> <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { receiptPath } from "../../tools/inquiry/corpus";

type Spec = {
	statement: string;
	sourceId: string;
	locator?: string;
	from: string;
	to: string;
};

const [corpusDir, specPath, outPath] = process.argv.slice(2);
if (!corpusDir || !specPath || !outPath) {
	console.error("usage: bun .scratch/packaging/mkclaims.ts <corpusDir> <spec.json> <out.json>");
	process.exit(2);
}

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

const specs = JSON.parse(readFileSync(specPath, "utf8")) as Spec[];
const claims: Claim[] = [];
const problems: string[] = [];

type Claim = { statement: string; sourceId: string; locator: string; quote: string };

for (const [i, spec] of specs.entries()) {
	const label = `claim ${i + 1}: ${spec.statement.slice(0, 60)}`;
	let receipt: string;
	try {
		receipt = readFileSync(receiptPath(corpusDir, spec.sourceId), "utf8");
	} catch {
		problems.push(`${label}: no receipt for ${spec.sourceId}`);
		continue;
	}
	if (count(receipt, spec.from) !== 1) {
		problems.push(`${label}: "from" occurs ${count(receipt, spec.from)}x in receipt`);
		continue;
	}
	if (count(receipt, spec.to) < 1) {
		problems.push(`${label}: "to" not found in receipt`);
		continue;
	}
	const start = receipt.indexOf(spec.from);
	const end = receipt.indexOf(spec.to, start);
	if (end < 0) {
		problems.push(`${label}: "to" does not follow "from"`);
		continue;
	}
	const quote = receipt.slice(start, end + spec.to.length);

	let locator = spec.locator ?? "";
	if (spec.sourceId.startsWith("file:") && locator === "") {
		const file = spec.sourceId.slice("file:".length);
		const text = readFileSync(file, "utf8");
		const at = text.indexOf(quote);
		if (at < 0) {
			problems.push(`${label}: quote not found in ${file} (cannot compute line)`);
			continue;
		}
		const line = text.slice(0, at).split("\n").length;
		locator = `${file}:${line}`;
	}
	if (!locator) {
		problems.push(`${label}: no locator for url source`);
		continue;
	}
	claims.push({ statement: spec.statement, sourceId: spec.sourceId, locator, quote });
}

writeFileSync(outPath, JSON.stringify(claims, null, 2));
console.log(`claims: ${claims.length}/${specs.length} extracted → ${outPath}`);
for (const p of problems) console.error(`PROBLEM ${p}`);
if (problems.length) process.exitCode = 1;
