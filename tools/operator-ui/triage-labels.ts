/**
 * The two labels a person still applies. One replaces the other.
 * `ready-for-agent` is the drain gate. `wontfix` is abandon, not a close.
 * Parking is `deferred`, not a label.
 */

export const TRIAGE_LABELS = ["ready-for-agent", "wontfix"] as const;

export type TriageLabel = (typeof TRIAGE_LABELS)[number];

export function isTriageLabel(value: string): value is TriageLabel {
	return (TRIAGE_LABELS as readonly string[]).includes(value);
}
