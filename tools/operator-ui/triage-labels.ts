/**
 * The five triage roles. One at a time: applying one replaces the other four of the family.
 * `wontfix` is a member of this family, not a close.
 */

export const TRIAGE_LABELS = [
	"needs-triage",
	"needs-info",
	"ready-for-agent",
	"ready-for-human",
	"wontfix",
] as const;

export type TriageLabel = (typeof TRIAGE_LABELS)[number];

export function isTriageLabel(value: string): value is TriageLabel {
	return (TRIAGE_LABELS as readonly string[]).includes(value);
}
