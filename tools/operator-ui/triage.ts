/**
 * `ready-for-agent` and `wontfix`, one replacing the other.
 *
 * Applying one adds that label and removes the other. Other labels on the issue are left alone.
 * `wontfix` is a label, never a close.
 */

import type { BdWriteRunner } from "./store";
import { isTriageLabel, TRIAGE_LABELS, type TriageLabel } from "./triage-labels";

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export { isTriageLabel, TRIAGE_LABELS, type TriageLabel };

/**
 * Apply one of the two labels, removing the other. The only store command is
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
