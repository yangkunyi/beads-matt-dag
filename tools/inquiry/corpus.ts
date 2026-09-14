/**
 * The corpus conventions, as code — the smallest thing that can be argued with.
 *
 *   sources/<slug>.md   one receipt per source: line 1 the URL, what was fetched, and a hash of it.
 *   notes/<slug>.md     one note per question: the claims, each citing a source, a locator and a quote,
 *                       and a claim that can challenge another one.
 *
 * The rule that makes the corpus a record rather than a pile: a quote must re-anchor against the source
 * that owns it — the same text, found again — or the claim does not enter the note. With a real provider
 * re-anchoring re-fetches (and the hash is what moves); the check is the same function either way.
 *
 * A challenge is a *reference between two claims*, not a verdict: the note shows the pair side by side
 * and decides nothing. Two readers disagreeing is information, and the reader of the note is the one who
 * weighs it.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Source } from "./retrieval";

/** The slug can lose detail — a DOI's slashes, an arxiv id's colon — so the id is written inside the
 *  receipt too and is never read back from the file name. */
export function sourceSlug(id: string): string {
	return id
		.toLowerCase()
		.replace(/[^a-z0-9.]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function receiptPath(corpusDir: string, id: string): string {
	return join(corpusDir, "sources", `${sourceSlug(id)}.md`);
}

export function writeReceipt(corpusDir: string, src: Source, fetchedAt = new Date()): string {
	mkdirSync(join(corpusDir, "sources"), { recursive: true });
	const path = receiptPath(corpusDir, src.id);
	const sha = createHash("sha256").update(src.text).digest("hex");
	writeFileSync(
		path,
		[
			`SOURCE-URL: ${src.url}`,
			`FETCHED: ${fetchedAt.toISOString()}`,
			`HTTP: ${src.http}`,
			`SOURCE-ID: ${src.id}`,
			`TITLE: ${src.title}`,
			...(src.aliases.length ? [`ALIASES: ${src.aliases.join(" ")}`] : []),
			...(src.extract ? [`EXTRACT: ${src.extract}`] : []),
			...(src.redirectedFrom ? [`REDIRECTED-FROM: ${src.redirectedFrom}`] : []),
			`SHA256: ${sha}`,
			"",
			src.text,
			"",
		].join("\n"),
	);
	return path;
}

const normalise = (text: string): string => text.replace(/\s+/g, " ").trim();

/** The one machine-checkable rule in the corpus. */
export function anchors(corpusDir: string, sourceId: string, quote: string): boolean {
	let receipt: string;
	try {
		receipt = readFileSync(receiptPath(corpusDir, sourceId), "utf8");
	} catch {
		return false;
	}
	return normalise(receipt).includes(normalise(quote));
}

export type Claim = {
	statement: string;
	sourceId: string;
	/** Where in the source: a page, a section, a paragraph. Human-readable, not a machine key. */
	locator: string;
	quote: string;
	/** The id (`c1`, `c2`, … in order) of the claim this one challenges, if any. */
	challenges?: string;
};

export type NoteDraft = { question: string; claims: Claim[] };

export type NoteResult = { path: string; kept: string[]; refused: Claim[]; droppedChallenges: Claim[] };

/** Writes the note. `refused` claims and `droppedChallenges` are returned, never written: a claim that
 *  cannot be anchored is not part of the record, and a challenge whose target never made it in has
 *  nothing to point at. The caller is the one who has to say either fact out loud. */
export function writeNote(corpusDir: string, slug: string, draft: NoteDraft): NoteResult {
	const ids = new Map<Claim, string>(draft.claims.map((c, i) => [c, `c${i + 1}`]));
	const kept = draft.claims.filter((c) => anchors(corpusDir, c.sourceId, c.quote));
	const refused = draft.claims.filter((c) => !anchors(corpusDir, c.sourceId, c.quote));
	const keptIds = new Set(kept.map((c) => ids.get(c)));

	const droppedChallenges = kept.filter((c) => c.challenges && !keptIds.has(c.challenges));
	for (const c of droppedChallenges) delete c.challenges;

	mkdirSync(join(corpusDir, "notes"), { recursive: true });
	const path = join(corpusDir, "notes", `${slug}.md`);
	const lines = [`# ${draft.question}`, "", "## Claims", ""];
	for (const c of kept) {
		lines.push(`- **${ids.get(c)}** ${c.statement}`);
		lines.push(`  Source: ${c.sourceId} (${c.locator})`);
		lines.push(`  > ${c.quote}`);
		const challengedBy = kept
			.filter((other) => other.challenges === ids.get(c))
			.map((other) => ids.get(other));
		if (challengedBy.length) lines.push(`  ⚠ challenged by ${challengedBy.join(", ")}`);
		if (c.challenges) lines.push(`  Challenges ${c.challenges}.`);
		lines.push("");
	}
	writeFileSync(path, lines.join("\n"));
	return { path, kept: [...keptIds] as string[], refused, droppedChallenges };
}
