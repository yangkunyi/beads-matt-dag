/**
 * The tagged comment body the page posts through the write door.
 *
 * Kept off the Node write runner so the React app can import it without pulling `bd`.
 */

export function commentWriteBody(id: string, text: string): string {
	return JSON.stringify({ intent: "comment", id, text });
}

export async function postComment(endpoint: string, id: string, text: string): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: commentWriteBody(id, text),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
