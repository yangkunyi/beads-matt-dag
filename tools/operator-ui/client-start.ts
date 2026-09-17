/**
 * The tagged start body the page posts through the write door.
 *
 * Kept off the Node write runner so the React app can import it without pulling `bd`.
 */

export function startWriteBody(ids: string[]): string {
	return JSON.stringify({ intent: "start", ids });
}

export async function postStart(endpoint: string, ids: string[]): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: startWriteBody(ids),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
