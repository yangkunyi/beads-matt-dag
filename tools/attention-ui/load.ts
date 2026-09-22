/**
 * Load the Target's attention snapshot through the public loom verb. Tools never import pack
 * modules; compose stays behind `bun tools/flow.ts attention --json`.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAttentionSnapshot, type AttentionSnapshot } from "./snapshot";

const FLOW = join(dirname(fileURLToPath(import.meta.url)), "..", "flow.ts");

/** Fresh enough for the page and its follow-up GET /attention; a write busts it. */
const SNAPSHOT_TTL_MS = 5000;

type CachedSnapshot = { dir: string; at: number; snapshot: AttentionSnapshot };
let cached: CachedSnapshot | undefined;

export function invalidateAttentionSnapshot(dir?: string): void {
	if (dir === undefined || cached?.dir === resolve(dir)) cached = undefined;
}

export function loadAttentionSnapshot(dir: string): AttentionSnapshot {
	const root = resolve(dir);
	const now = Date.now();
	if (cached !== undefined && cached.dir === root && now - cached.at < SNAPSHOT_TTL_MS) return cached.snapshot;
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
	cached = { dir: root, at: now, snapshot };
	return snapshot;
}
