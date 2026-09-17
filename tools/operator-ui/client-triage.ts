/**
 * The tagged triage body the page posts through the write door.
 *
 * Kept off the Node write runner so the React app can import it without pulling `bd`.
 */

import type { TriageLabel } from "./triage-labels.ts";

export { TRIAGE_LABELS, type TriageLabel } from "./triage-labels.ts";

export function triageWriteBody(id: string, label: TriageLabel): string {
	return JSON.stringify({ intent: "triage", id, label });
}

export async function postTriage(endpoint: string, id: string, label: TriageLabel): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: triageWriteBody(id, label),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
