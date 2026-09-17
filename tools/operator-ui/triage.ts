/**
 * The five triage labels, one replacing one.
 *
 * Applying a role adds that label and removes the other four of the family. Other labels on the
 * issue are left alone. `wontfix` is a label, never a close. `reading:` and `idea:*` are not in
 * this family.
 */

import type { BdWriteRunner } from "./store";
import { isTriageLabel, TRIAGE_LABELS, type TriageLabel } from "./triage-labels";

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export { isTriageLabel, TRIAGE_LABELS, type TriageLabel };

export type TriageBody = {
	id: string;
	label: TriageLabel;
};

/**
 * Pull an issue id and one triage label out of a JSON object. The write door refuses `closed`,
 * `reading:`, and non-triage labels before this runs.
 */
export function parseTriageBody(raw: string): TriageBody {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("triage body is not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("triage body is not an object");
	}
	const record = parsed as Record<string, unknown>;
	if (typeof record.id !== "string" || record.id.trim() === "") {
		throw new Error("triage needs an issue id");
	}
	const id = record.id.trim();
	if (!ISSUE_ID.test(id)) throw new Error("triage needs an issue id");
	if (typeof record.label !== "string" || record.label.trim() === "") {
		throw new Error("triage needs a label");
	}
	const label = record.label.trim();
	if (!isTriageLabel(label)) throw new Error("non-triage label");
	return { id, label };
}

/**
 * Apply one triage label, removing the other four of the family. The only store command is
 * `bd update <id> --add-label <role> --remove-label …`. Not a close.
 */
export function applyTriage(bd: BdWriteRunner, id: string, label: TriageLabel): void {
	if (!ISSUE_ID.test(id)) throw new Error("triage needs an issue id");
	if (!isTriageLabel(label)) throw new Error("non-triage label");
	const args = ["update", id, "--add-label", label];
	for (const other of TRIAGE_LABELS) {
		if (other === label) continue;
		args.push("--remove-label", other);
	}
	bd(args);
}
