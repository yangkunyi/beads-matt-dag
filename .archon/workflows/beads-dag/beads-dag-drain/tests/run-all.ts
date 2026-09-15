#!/usr/bin/env bun
/**
 * Run every repro in this folder the way the release gate does: one process each, several at a time.
 *
 * One process per file is the contract and it does not change: every repro builds its own temp Target
 * with its own store, and no repro may see another's state.
 *
 * What changed is the scheduling, because the gate's cost was almost entirely startup. A repro pays a
 * real `bd init` - about 3 s of Dolt startup - and every store command pays about half a second of it,
 * so a suite that spends 19 minutes serially is 19 minutes of processes starting, not of
 * logic. Startup parallelises (measured: eight init-plus-four-commands jobs ran in 5.7 s wall where
 * serial was 41 s), so the same suite takes a couple of minutes at REPRO_JOBS, and the gate stops
 * being the expensive part of a ticket.
 *
 * A repro that outlives its clock is killed and counted as a failure rather than holding the gate open
 * forever: the pack bounds the turns it runs, and the thing that checks the pack should be bounded too.
 *
 * `REPRO_JOBS` (default 8) is how many run at once; `REPRO_TIMEOUT_MS` (default 10 min) is one file's
 * budget. Neither changes what "passing" means: every file runs, one process each, and the exit status is
 * still 0 if and only if every repro passed.
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync(import.meta.dir)
  .filter((f) => f.endsWith("-repro.ts"))
  .sort();
const jobs = Math.max(1, Math.min(Number(process.env.REPRO_JOBS ?? 8) || 8, files.length));
const timeoutMs = Number(process.env.REPRO_TIMEOUT_MS ?? 10 * 60 * 1000) || 10 * 60 * 1000;

type Result = { code: number | null; out: string; err: string; timedOut: boolean };

/** One repro, as the gate runs it: its own process, its own clock, its output buffered for one line. */
function runRepro(file: string): Promise<Result> {
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    let timedOut = false;
    let settled = false;
    const child = spawn(process.execPath, [join(import.meta.dir, file)], {
      stdio: ["ignore", "pipe", "pipe"],
      // A group of its own, so the clock's kill reaches a runner or a shell the repro started - the same
      // rule the pack's own gate follows (verify.ts).
      detached: true,
    });

    const finish = (code: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, out, err, timedOut });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      // The whole group: a repro that started a runner or a shell must not outlive its own verdict.
      try {
        if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
      // A killed child normally closes promptly; a grandchild holding the pipe must not hold the gate.
      setTimeout(() => finish(null), 2000);
    }, timeoutMs);
    timer.unref();

    child.stdout?.on("data", (c) => (out += c.toString("utf8")));
    child.stderr?.on("data", (c) => (err += c.toString("utf8")));
    child.on("error", (e) => {
      err += e.message;
      finish(null);
    });
    child.on("close", (code) => finish(code));
  });
}

let failed = 0;
let next = 0;

const worker = async (): Promise<void> => {
  for (let file = files[next++]; file !== undefined; file = files[next++]) {
    const r = await runRepro(file);
    const ok = r.code === 0;
    if (!ok) failed++;
    const said = r.timedOut
      ? `timed out after ${timeoutMs}ms`
      : (r.out.trim() || r.err.trim() || "(no output)");
    console.log(`${ok ? "ok  " : "FAIL"} ${file}  ${said}`);
    if (!ok && r.err.trim() && !r.timedOut) console.error(r.err.trim());
  }
};

await Promise.all(Array.from({ length: jobs }, worker));
console.log(`${files.length - failed}/${files.length} repros passed`);
process.exitCode = failed === 0 ? 0 : 1;
