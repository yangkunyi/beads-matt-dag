/**
 * Load the Target's attention snapshot through the public loom verb. Tools never import pack
 * modules; compose stays behind `bun tools/flow.ts attention --json`.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAttentionSnapshot, type AttentionSnapshot } from "./snapshot";

const FLOW = join(dirname(fileURLToPath(import.meta.url)), "..", "flow.ts");

/**
 * One snapshot per generation: the attention verb costs over a second, more than any fresh window,
 * so a TTL made every visit pay it again. Dropped by a write through the door; a write made outside
 * the door lands on the next door write or server start.
 */
type CachedSnapshot = { dir: string; snapshot: AttentionSnapshot };
let cached: CachedSnapshot | undefined;

export function invalidateAttentionSnapshot(dir?: string): void {
	if (dir === undefined || cached?.dir === resolve(dir)) cached = undefined;
}

export function loadAttentionSnapshot(dir: string): AttentionSnapshot {
	const root = resolve(dir);
	if (cached !== undefined && cached.dir === root) return cached.snapshot;
	const result = spawnSync(process.execPath, [FLOW, "attention", "--json", "--dir", root], {
		encoding: "utf8",
		env: { ...process.env, BD_READONLY: "1" },
	});
	if (result.error) throw new Error(`cannot run attention: ${result.error.message}`);
	if (result.status !== 0) {
		const detail = (result.stderr || result.stdout || "").trim();
		throw new Error(detail === "" ? `attention exited ${result.status}` : detail);
	}
	const snapshot = parseAttentionSnapshot(result.stdout);
	cached = { dir: root, snapshot };
	return snapshot;
}
