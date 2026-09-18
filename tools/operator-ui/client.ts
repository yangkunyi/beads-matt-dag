/**
 * The one client post for every tagged write.
 *
 * The page never pulls `bd`. A form posts one tagged JSON object; the door writes the store or
 * refuses. A new intent is implementation behind that door, not another client module.
 */

export async function postOperatorAction(endpoint: string, body: object): Promise<void> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || String(res.status));
	}
}
