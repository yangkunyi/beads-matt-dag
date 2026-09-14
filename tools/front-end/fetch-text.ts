/**
 * The transport, one function wide: curl, because the machine's egress is the environment's business and
 * not this tool's.
 *
 * The proxy is read from the environment, never hard-coded here — `FRONT_END_PROXY` first (so one call
 * can be pointed at the BoostNet shell without exporting anything for the whole process), then
 * `https_proxy` / `http_proxy` / `all_proxy`. Curl takes an `http://` or a `socks5h://` address alike.
 *
 * Without a proxy the tool still works, for the sources that answer directly: OpenAlex and
 * `huggingface.co/papers`. arxiv does not, and a caller that needs it is told so rather than given a
 * timeout.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Fetched = {
	url: string;
	/** The status curl saw. A receipt states it; nothing here pretends it was a 200. */
	status: number;
	body: string;
	/** The proxy the call went through, when one was configured. */
	via?: string;
};

const USER_AGENT = "front-end-retrieval/0.1";

export function proxyFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
	return env.FRONT_END_PROXY || env.https_proxy || env.http_proxy || env.all_proxy || undefined;
}

/** The polite-pool address OpenAlex asks for; empty when the operator has not set one. */
export function contactFromEnv(env: NodeJS.ProcessEnv = process.env): string {
	return env.FRONT_END_MAILTO ?? "";
}

export function fetchText(url: string, opts: { proxy?: string; timeoutSec?: number } = {}): Fetched {
	const dir = mkdtempSync(join(tmpdir(), "front-end-fetch-"));
	const bodyPath = join(dir, "body");
	try {
		const args = [
			"-sSL",
			"--max-time",
			String(opts.timeoutSec ?? 30),
			"-A",
			USER_AGENT,
			"-o",
			bodyPath,
			"-w",
			"%{http_code}",
		];
		if (opts.proxy) args.push("-x", opts.proxy);
		args.push(url);
		const res = spawnSync("curl", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
		const status = Number.parseInt((res.stdout ?? "").trim(), 10);
		if (!Number.isFinite(status)) {
			throw new Error(`curl gave no status for ${url}: ${(res.stderr ?? "").trim() || "no output"}`);
		}
		return {
			url,
			status,
			body: readFileSync(bodyPath, "utf8"),
			...(opts.proxy ? { via: opts.proxy } : {}),
		};
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}
