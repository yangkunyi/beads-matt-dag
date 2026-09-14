/**
 * The mock, driven end to end: one question in, a corpus out.
 *
 * Run it with the AFK leg's own environment, which is the point of it running at all:
 *
 *   BD_READONLY=1 bun tools/inquiry/run.ts
 *
 * Nothing here touches the store — a reader's whole output is documents — so the run must not notice
 * the read-only mode. That is the claim this driver demonstrates; the claim it *refuses*, and the
 * challenge it keeps, are the other two.
 */

import { join } from "node:path";
import { writeNote, writeReceipt, type Claim } from "./corpus";
import { mockProvider } from "./retrieval";

const QUESTION = "Does a short, fixed-budget loop beat one long job for agent-run experiments?";
const SLUG = "short-budget-vs-long-job";
const corpusDir = process.argv[2] ?? join(process.cwd(), ".scratch/research-flow/mock-corpus");

console.log(`read-only mode: ${process.env.BD_READONLY === "1" ? "on (the AFK leg's environment)" : "off"}`);
console.log(`question: ${QUESTION}`);
console.log(`corpus:   ${corpusDir}\n`);

const sources = await mockProvider.search(QUESTION);
for (const src of sources) {
	console.log(`receipt   ${writeReceipt(corpusDir, src)}`);
}

const claims: Claim[] = [
	{
		// c1
		statement: "Short fixed-budget loops converged more often than long jobs in the same task set.",
		sourceId: "doi:10.5555/onwards.2024.11",
		locator: "abstract",
		quote: "the short loop reached a usable result in 71% of attempts, while the long job reached one in 43%",
	},
	{
		// c2 — anchored, but the claim it challenges (c3) was refused, so the challenge goes with it
		statement: "The advantage is reported to disappear above an eight-hour budget — untested here.",
		sourceId: "doi:10.5555/onwards.2024.11",
		locator: "abstract",
		quote: "the gap closes above an eight-hour budget, which no run in this study used",
		challenges: "c3",
	},
	{
		// c3 — nobody wrote this; the run must refuse it
		statement: "The loop should be capped at eight hours in this project.",
		sourceId: "doi:10.5555/onwards.2024.11",
		locator: "abstract",
		quote: "we recommend an eight-hour cap for all agent-run loops",
	},
	{
		// c4 — anchored, and it contradicts c1 on the record rather than in the reader's head
		statement: "An independent lab could not reproduce the split; its sweep was noise-dominated.",
		sourceId: "url:https://example-lab.github.io/notes/ablation-budget",
		locator: "opening",
		quote: "We could not reproduce the 71%/43% split on our hardware",
		challenges: "c1",
	},
];

const { path, kept, refused, droppedChallenges } = writeNote(corpusDir, SLUG, { question: QUESTION, claims });

console.log(`\nnote      ${path}`);
console.log(`kept      ${kept.join(", ")} — each anchored against the receipt it cites, c4 challenging c1`);
for (const r of refused) {
	console.log(`REFUSED   "${r.statement}"`);
	console.log(`          quote not found in ${r.sourceId}: "${r.quote}"`);
}
for (const c of droppedChallenges) {
	console.log(`DROPPED   a challenge by "${c.statement}" — its target never made it into the note`);
}
console.log("\na refused claim stays out of the note, and a challenge to one goes with it — the reader is told "
	+ "either fact instead of the corpus carrying it");
