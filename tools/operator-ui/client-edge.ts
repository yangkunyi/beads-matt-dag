/**
 * The tagged edge body the page posts through the write door.
 *
 * Kept off the Node write runner so the React app can import it without pulling `bd`.
 */

export type EdgeWriteIntent = "add-edge" | "remove-edge";

export function edgeWriteBody(intent: EdgeWriteIntent, from: string, to: string, type: string): string {
	return JSON.stringify({ intent, from, to, type });
}

export async function postEdge(
	endpoint: string,
	intent: EdgeWriteIntent,
	from: string,
	to: string,
	type: string,
): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: edgeWriteBody(intent, from, to, type),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
