/**
 * The tagged create body the page posts through the write door.
 *
 * Kept off the Node write runner so the React app can import it without pulling `bd`.
 */

export type CreateWriteInput = {
	type: string;
	feature: string;
	title: string;
	prose?: string;
};

export function createWriteBody(input: CreateWriteInput): string {
	return JSON.stringify({
		intent: "create",
		type: input.type,
		feature: input.feature,
		title: input.title,
		prose: input.prose ?? "",
	});
}

export async function postCreate(endpoint: string, input: CreateWriteInput): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: createWriteBody(input),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
