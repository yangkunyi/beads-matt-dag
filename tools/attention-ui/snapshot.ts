/**
 * The attention object, as this UI consumes it: parse the JSON a session boots from, walk buckets
 * in boot order, name the first nonempty pile. Pack compose stays in the pack; this module does not
 * import it and does not recompute a frontier.
 */
import { z } from "zod";

export const ATTENTION_NEXT = [
	"wait",
	"drain",
	"inquiry",
	"experiment",
	"grill",
	"triage",
	"accept-or-edit-or-reject",
	"read-or-decline",
] as const;

export type AttentionNext = (typeof ATTENTION_NEXT)[number];

export const BUCKET_ORDER = [
	"leftovers",
	"stuck",
	"drafts",
	"ready.development",
	"ready.inquiry",
	"ready.experiments",
	"unread_experiments",
	"braked",
] as const;

export type BucketKey = (typeof BUCKET_ORDER)[number];

const nextSchema = z.enum(ATTENTION_NEXT);

const leftoverItem = z.object({
	id: z.string(),
	handle: z.string(),
	type: z.string(),
	domain: z.enum(["development", "inquiry", "experiments"]),
	next: nextSchema,
});

const stuckItem = z.object({
	id: z.string(),
	handle: z.string(),
	waiting_on: z.array(z.object({ handle: z.string(), why: z.enum(["wontfix", "braked"]) })),
	next: nextSchema,
});

const titledItem = z.object({
	id: z.string(),
	handle: z.string(),
	title: z.string(),
	next: nextSchema,
});

const readyDevelopmentItem = titledItem.extend({
	contract: z.enum(["present", "missing"]),
	attempts_failed: z.number(),
});

const brakedItem = z.object({
	id: z.string(),
	handle: z.string(),
	labels: z.array(z.string()),
	next: nextSchema,
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
	buckets: z.object({
		leftovers: z.array(leftoverItem),
		stuck: z.array(stuckItem),
		drafts: z.array(titledItem),
		ready: z.object({
			development: z.array(readyDevelopmentItem),
			inquiry: z.array(titledItem),
			experiments: z.array(titledItem),
		}),
		unread_experiments: z.array(titledItem),
		braked: z.array(brakedItem),
	}),
});

export type AttentionSnapshot = z.infer<typeof attentionSnapshotSchema>;

export type AttentionRow = {
	id: string;
	handle: string;
	next: AttentionNext;
	bucket: BucketKey;
	title?: string;
	type?: string;
	domain?: string;
	contract?: "present" | "missing";
	attempts_failed?: number;
	waiting_on?: { handle: string; why: "wontfix" | "braked" }[];
	labels?: string[];
};

export type DoorIssue = { id: string; type: string };

export function emptySnapshot(target = "/tmp/target"): AttentionSnapshot {
	return {
		target,
		run: { held: false },
		buckets: {
			leftovers: [],
			stuck: [],
			drafts: [],
			ready: { development: [], inquiry: [], experiments: [] },
			unread_experiments: [],
			braked: [],
		},
	};
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

export function rowsIn(snapshot: AttentionSnapshot, key: BucketKey): AttentionRow[] {
	const { buckets } = snapshot;
	if (key === "leftovers") {
		return buckets.leftovers.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			type: item.type,
			domain: item.domain,
		}));
	}
	if (key === "stuck") {
		return buckets.stuck.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			waiting_on: item.waiting_on,
		}));
	}
	if (key === "drafts") {
		return buckets.drafts.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			title: item.title,
		}));
	}
	if (key === "ready.development") {
		return buckets.ready.development.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			title: item.title,
			contract: item.contract,
			attempts_failed: item.attempts_failed,
		}));
	}
	if (key === "ready.inquiry") {
		return buckets.ready.inquiry.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			title: item.title,
		}));
	}
	if (key === "ready.experiments") {
		return buckets.ready.experiments.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			title: item.title,
		}));
	}
	if (key === "unread_experiments") {
		return buckets.unread_experiments.map((item) => ({
			id: item.id,
			handle: item.handle,
			next: item.next,
			bucket: key,
			title: item.title,
		}));
	}
	return buckets.braked.map((item) => ({
		id: item.id,
		handle: item.handle,
		next: item.next,
		bucket: key,
		labels: item.labels,
	}));
}

export function bucketCounts(snapshot: AttentionSnapshot): Record<BucketKey, number> {
	const counts = {} as Record<BucketKey, number>;
	for (const key of BUCKET_ORDER) counts[key] = rowsIn(snapshot, key).length;
	return counts;
}

/** Boot order: first nonempty bucket, then stop. Same walk a session uses. */
export function firstNonempty(snapshot: AttentionSnapshot): { key: BucketKey; rows: AttentionRow[] } | undefined {
	for (const key of BUCKET_ORDER) {
		const rows = rowsIn(snapshot, key);
		if (rows.length > 0) return { key, rows };
	}
	return undefined;
}

function typeForBucket(key: BucketKey, row: AttentionRow): string {
	if (key === "leftovers" && row.type !== undefined && row.type !== "") return row.type;
	if (key === "drafts" || key === "ready.inquiry") return "decision";
	if (key === "ready.experiments" || key === "unread_experiments") return "experiment";
	return "task";
}

/** Ids the existing write door can start or grill, typed from the bucket they sit in. */
export function doorIssues(snapshot: AttentionSnapshot): DoorIssue[] {
	const seen = new Set<string>();
	const issues: DoorIssue[] = [];
	for (const key of BUCKET_ORDER) {
		for (const row of rowsIn(snapshot, key)) {
			if (seen.has(row.id)) continue;
			seen.add(row.id);
			issues.push({ id: row.id, type: typeForBucket(key, row) });
		}
	}
	return issues;
}

export function isLaunchNext(next: AttentionNext): next is "drain" | "inquiry" | "experiment" | "grill" {
	return next === "drain" || next === "inquiry" || next === "experiment" || next === "grill";
}
