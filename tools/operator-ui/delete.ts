/**
 * Delete an issue from the operator surface. That is `bd delete`, not `closed`.
 *
 * `--force` is how bd actually deletes (without it the CLI is a preview). The door refuses
 * `in_progress` and any dependent first, so `--force` cannot orphan. `--cascade` is never passed.
 * Confirm is a body field: a POST without `confirm: true` is not a delete.
 */

import type { BdWriteRunner } from "./store";

const ISSUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export type DeleteIssue = {
	id: string;
	status?: string;
	dependencies?: ReadonlyArray<{ id: string; type: string }>;
};

export type DeletePlan =
	| { ok: true; id: string }
	| { ok: false; reason: string };

export function parseDeleteBody(raw: string): { id: string } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("delete body is not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("delete body is not an object");
	}
	const record = parsed as Record<string, unknown>;
	if (record.confirm !== true) throw new Error("delete needs confirm");
	if (typeof record.id !== "string" || record.id.trim() === "") {
		throw new Error("delete needs an issue id");
	}
	const id = record.id.trim();
	if (!ISSUE_ID.test(id)) throw new Error("delete needs an issue id");
	return { id };
}

export function planDelete(id: string, issues: ReadonlyArray<DeleteIssue>): DeletePlan {
	if (!ISSUE_ID.test(id)) return { ok: false, reason: "delete needs an issue id" };
	const issue = issues.find((entry) => entry.id === id);
	if (issue === undefined) return { ok: false, reason: "unknown issue" };
	if (issue.status === "in_progress") return { ok: false, reason: "in_progress is refused" };
	const dependent = issues.find(
		(entry) => entry.id !== id && (entry.dependencies ?? []).some((dep) => dep.id === id),
	);
	if (dependent !== undefined) return { ok: false, reason: "issue has dependents" };
	return { ok: true, id };
}

/** One plan for a set: the first refusal wins, never cascade. */
export function planDeleteAll(ids: ReadonlyArray<string>, issues: ReadonlyArray<DeleteIssue>): DeletePlan {
	if (ids.length === 0) return { ok: false, reason: "delete needs an issue id" };
	for (const id of ids) {
		const plan = planDelete(id, issues);
		if (!plan.ok) return plan;
	}
	const first = ids[0];
	if (first === undefined) return { ok: false, reason: "delete needs an issue id" };
	return { ok: true, id: first };
}

/** The only store command is `bd delete <id> --force`. Never `--cascade`. */
export function deleteIssue(bd: BdWriteRunner, id: string, issues: ReadonlyArray<DeleteIssue>): void {
	const plan = planDelete(id, issues);
	if (!plan.ok) throw new Error(plan.reason);
	bd(["delete", id, "--force"]);
}
