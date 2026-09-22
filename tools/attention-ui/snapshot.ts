/**
 * The attention object, as this UI consumes it: one ordered list. The first row is what a session
 * takes. Pack compose stays in the pack; this module does not import it.
 */
import { z } from "zod";

export const ATTENTION_NEXT = [
	"wait",
	"drain",
	"inquiry",
	"experiment",
	"grill",
	"release",
	"accept-draft",
	"read-result",
	"unstick",
] as const;

export type AttentionNext = (typeof ATTENTION_NEXT)[number];

const nextSchema = z.enum(ATTENTION_NEXT);

const workItem = z.object({
	id: z.string(),
	handle: z.string(),
	title: z.string(),
	next: nextSchema,
	type: z.string(),
	status: z.string(),
	domain: z.enum(["development", "inquiry", "experiments"]).optional(),
	waiting_on: z.array(z.object({ handle: z.string(), why: z.enum(["wontfix", "ungated"]) })).optional(),
	contract: z.enum(["present", "missing"]).optional(),
	attempts_failed: z.number().optional(),
});

const runSchema = z.union([
	z.object({ held: z.literal(false) }),
	z.object({
		held: z.literal(true),
		runId: z.string(),
		kind: z.enum(["drain", "inquiry", "experiment", "grill"]).optional(),
	}),
]);

export const attentionSnapshotSchema = z.object({
	target: z.string(),
	run: runSchema,
	work: z.array(workItem),
});

export type AttentionSnapshot = z.infer<typeof attentionSnapshotSchema>;

export type AttentionRow = z.infer<typeof workItem>;

export type DoorIssue = { id: string; type: string };

export function emptySnapshot(target = "/tmp/target"): AttentionSnapshot {
	return { target, run: { held: false }, work: [] };
}

export function parseAttentionSnapshot(raw: string): AttentionSnapshot {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("attention is not JSON");
	}
	const result = attentionSnapshotSchema.safeParse(parsed);
	if (!result.success) throw new Error(`attention JSON is not a snapshot: ${result.error.message}`);
	return result.data;
}

/** Ids the write door can start, typed from the row. */
export function doorIssues(snapshot: AttentionSnapshot): DoorIssue[] {
	return snapshot.work.map((row) => ({ id: row.id, type: row.type === "" ? "task" : row.type }));
}

export function isLaunchNext(next: AttentionNext): next is "drain" | "inquiry" | "experiment" | "grill" {
	return next === "drain" || next === "inquiry" || next === "experiment" || next === "grill";
}
