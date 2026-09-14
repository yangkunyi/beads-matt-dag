/**
 * The reader's side of the corpus: claims in, a note out.
 *
 *   bun tools/front-end/note.ts --corpus .scratch/<effort> --question "…" --claims claims.json
 *
 * `claims.json` is what a reader — an agent, a person — wrote down after reading the receipts in
 * `sources/`, one object per claim:
 *
 *   [{ "statement": "…", "sourceId": "url:https://…", "locator": "§Runs", "quote": "…" }]
 *
 * Every quote is checked against the receipt of the source it cites before anything is written. A claim
 * whose quote cannot be found again is refused and printed, and stays out of the note: the corpus never
 * carries something nobody can re-find. Nothing here interprets the refusals, invents a claim, or touches
 * the store — the reader who ran this is the one who has to say what happened.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { receiptPath, writeNote, type Claim } from "./corpus";

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
	const at = args.indexOf(`--${name}`);
	return at >= 0 ? args[at + 1] : undefined;
};

const READER = `usage: bun tools/front-end/note.ts --corpus <dir> --question "…" --claims <claims.json> --slug <slug>`;

const corpusDir = arg("corpus") ?? join(process.cwd(), ".scratch/research-flow/live-corpus");
const question = arg("question");
const claimsPath = arg("claims");
const slug = arg("slug");

function bad(message: string): never {
	console.error(`${message}\n${READER}`);
	process.exit(2);
}

if (!question || !claimsPath) bad("note.ts: --question and --claims are both required");
// No slug is derived from the question: a generated one loses what the question is about ("W&B" becomes
// "w-b") and is always too long. Naming the note is the reader's, like everything else here.
if (!slug) bad("note.ts: --slug is required — the note's file name is the reader's to choose");

const parsed: unknown = JSON.parse(readFileSync(claimsPath, "utf8"));
if (!Array.isArray(parsed)) bad(`note.ts: ${claimsPath} must hold an array of claims`);

const claims: Claim[] = parsed.map((entry, i) => {
	const c = entry as Partial<Claim>;
	for (const field of ["statement", "sourceId", "locator", "quote"] as const) {
		if (typeof c[field] !== "string" || !c[field]) {
			bad(`note.ts: claim ${i + 1} has no ${field}`);
		}
	}
	return {
		statement: c.statement as string,
		sourceId: c.sourceId as string,
		locator: c.locator as string,
		quote: c.quote as string,
		...(c.challenges ? { challenges: c.challenges } : {}),
	};
});

if (claims.length === 0) bad("note.ts: no claims — an empty note is not a reading");

const { path, kept, refused, droppedChallenges } = writeNote(corpusDir, slug, { question, claims });

console.log(`note:   ${path}`);
console.log(`kept:   ${kept.length}/${claims.length}  ${kept.join(", ")}`);
for (const c of refused) {
	// Two different failures, and the reader needs to know which: a citation to a source nobody fetched,
	// or a quote that is not in the source it cites. Neither is written down.
	const why = existsSync(receiptPath(corpusDir, c.sourceId))
		? `quote not found in ${c.sourceId}`
		: `no receipt for ${c.sourceId} — nothing was fetched from it`;
	console.log(`REFUSED ${c.sourceId}: ${why}`);
	console.log(`        "${c.statement}"`);
}
for (const c of droppedChallenges) {
	console.log(`DROPPED a challenge by "${c.statement}" — its target never made it into the note`);
}
