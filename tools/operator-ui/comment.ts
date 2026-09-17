/**
 * An operator reply is `bd comment` on the selected issue. Beads is the only comment store.
 *
 * This module writes the comment. The tagged write door (`actions.ts`) refuses `closed`,
 * `reading:`, non-triage labels, and unknown intents before anything here runs. Close,
 * `reading:`, and other domain labels are the session's, not this write.
 */

import type { BdWriteRunner } from "./store";

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export type CommentBody = {
	id: string;
	text: string;
};

/**
 * Pull an issue id and reply text out of a JSON object. The write door refuses `closed`,
 * `reading:`, and unknown intents before this runs; remaining extra fields are not a write.
 */
export function parseCommentBody(raw: string): CommentBody {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("comment body is not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("comment body is not an object");
	}
	const record = parsed as Record<string, unknown>;
	if (typeof record.id !== "string" || record.id.trim() === "") {
		throw new Error("comment needs an issue id");
	}
	const id = record.id.trim();
	if (!ISSUE_ID.test(id)) throw new Error("comment needs an issue id");
	if (typeof record.text !== "string" || record.text.trim() === "") {
		throw new Error("comment needs some text");
	}
	return { id, text: record.text.trim() };
}

/** Write the reply. The only store command is `bd comment <id> --stdin`. */
export function addComment(bd: BdWriteRunner, id: string, text: string): void {
	if (!ISSUE_ID.test(id) || text.trim() === "") {
		throw new Error(text.trim() === "" ? "comment needs some text" : "comment needs an issue id");
	}
	bd(["comment", id, "--stdin"], text.trim());
}
