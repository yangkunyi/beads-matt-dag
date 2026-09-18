/**
 * The tagged delete body the page posts through the write door.
 *
 * Kept off the Node write runner so the React app can import it without pulling `bd`.
 */

export function deleteWriteBody(id: string): string {
	return JSON.stringify({ intent: "delete", id, confirm: true });
}

export async function postDelete(endpoint: string, id: string): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: deleteWriteBody(id),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
