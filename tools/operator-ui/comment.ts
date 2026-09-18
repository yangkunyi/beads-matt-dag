/**
 * An operator reply is `bd comment` on the selected issue. Beads is the only comment store.
 *
 * The tagged write door parses the body and refuses `closed`, `reading:`, non-triage labels,
 * and unknown intents before anything here runs. Close, `reading:`, and other domain labels
 * are the session's, not this write.
 */

import type { BdWriteRunner } from "./store";

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * Who the door will stamp as author: `--actor` on the process, else `BEADS_ACTOR`, else git
 * user.name, else `$USER`. Empty is absence — the store's own fallback then applies.
 */
export function resolveCommentActor(
	explicit: string | undefined,
	env: NodeJS.ProcessEnv = process.env,
	gitName?: string,
): string | undefined {
	for (const candidate of [explicit, env.BEADS_ACTOR, gitName, env.USER]) {
		const value = candidate?.trim();
		if (value) return value;
	}
	return undefined;
}

/**
 * Write the reply. The only store command is `bd comment <id> --stdin`. When the door names an
 * actor, that is `bd --actor <name> comment <id> --stdin` — the global flag, not a body field.
 */
export function addComment(bd: BdWriteRunner, id: string, text: string, actor?: string): void {
	if (!ISSUE_ID.test(id) || text.trim() === "") {
		throw new Error(text.trim() === "" ? "comment needs some text" : "comment needs an issue id");
	}
	const name = actor?.trim();
	if (name !== undefined && name !== "" && name.startsWith("-")) {
		throw new Error("comment needs an actor");
	}
	const args =
		name !== undefined && name !== ""
			? ["--actor", name, "comment", id, "--stdin"]
			: ["comment", id, "--stdin"];
	bd(args, text.trim());
}
