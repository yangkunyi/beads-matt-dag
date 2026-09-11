#!/usr/bin/env bun
/** Run every repro in this folder the way the release gate does: one process each, in name order. */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync(import.meta.dir)
  .filter((f) => f.endsWith("-repro.ts"))
  .sort();

let failed = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, [join(import.meta.dir, file)], { encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${file}  ${(r.stdout ?? "").trim() || (r.stderr ?? "").trim()}`);
  if (!ok && r.stderr) console.error(r.stderr.trim());
}
console.log(`${files.length - failed}/${files.length} repros passed`);
process.exitCode = failed === 0 ? 0 : 1;
