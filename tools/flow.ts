#!/usr/bin/env bun
/**
 * The flow's installer, and the check that proves it.
 *
 * Two things on a machine are copies of this checkout, and both go stale silently:
 *
 *   ~/.agents/skills/<member>       a copy of skills/<member> — the members this repo ships
 *   ~/.archon/workflows/beads-dag   a symlink to .archon/workflows/beads-dag — the pack itself
 *
 * `install` refreshes both; `check` reads them and says what differs, exiting non-zero when anything
 * does. Neither verb writes the member list down: it is whatever `skills/` holds — a directory with a
 * `SKILL.md` in it — so the check cannot disagree with the set it checks.
 *
 * Run from this repo's root:
 *
 *   bun tools/flow.ts install
 *   bun tools/flow.ts check
 *
 * The staleness is invisible by looking: `cp -a` gives the installed file the source's mtime, so an
 * install a day behind reads as fresh. Comparing bytes is the only way to see it, which is why
 * `install` runs `check` on its way out rather than trusting itself.
 */

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(REPO, "skills");
const PACK = join(REPO, ".archon", "workflows", "beads-dag");

const USAGE = `usage: bun tools/flow.ts <install|check> [--dest <dir>] [--archon-home <dir>]

  install   copy every member of skills/ into the shared root, then check; point the pack link
  check     compare the installed members and the pack link against this checkout, and report

  --dest <dir>         where skills are installed (default $HOME/.agents/skills)
  --archon-home <dir>  where the pack link lives (default $HOME/.archon/workflows)`;

function home(): string {
  const h = process.env.HOME;
  if (!h) {
    console.error("no HOME in the environment: pass --dest and --archon-home");
    process.exit(2);
  }
  return h;
}

/** The set: every directory under `skills/` that holds a `SKILL.md`. Read, never written down. */
function members(): string[] {
  if (!existsSync(SKILLS)) {
    console.error(`no skills/ in ${REPO} — run this from the repository root`);
    process.exit(2);
  }
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(SKILLS, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

function filesUnder(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const next = rel ? join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) walk(next);
      else out.push(next);
    }
  };
  walk("");
  return out.sort();
}

type Verdict = { member: string; state: "identical" | "differs" | "missing"; detail: string[] };

/** Byte comparison of one member's folder against its installed copy, file by file. */
function compareMember(member: string, dest: string): Verdict {
  const src = join(SKILLS, member);
  if (!existsSync(dest)) return { member, state: "missing", detail: ["no installed copy"] };

  const detail: string[] = [];
  const source = filesUnder(src);
  const installed = new Set(filesUnder(dest));
  for (const file of source) {
    if (!installed.has(file)) detail.push(`missing in dest: ${file}`);
    else if (!readFileSync(join(src, file)).equals(readFileSync(join(dest, file))))
      detail.push(`differs: ${file}`);
  }
  const known = new Set(source);
  for (const file of installed) if (!known.has(file)) detail.push(`only in dest: ${file}`);

  return { member, state: detail.length === 0 ? "identical" : "differs", detail };
}

/** The pack's install is a link, so "what version is the pack" is answered by git, not by a copy. */
function inspectPackLink(archonHome: string): { ok: boolean; note: string } {
  const link = join(archonHome, "beads-dag");
  const stat = lstatSafe(link);
  if (!stat) return { ok: false, note: `missing — ${link} does not exist` };
  if (!stat.isSymbolicLink())
    return { ok: false, note: `${link} is a real directory, and a copy there shadows the pack: remove it, then install` };
  const target = readlinkSync(link);
  if (resolve(target) !== PACK) return { ok: false, note: `${link} -> ${target} (expected ${PACK})` };
  if (!existsSync(PACK)) return { ok: false, note: `${link} points into this checkout, but ${PACK} is gone` };
  return { ok: true, note: `${link} -> ${target}` };
}

function lstatSafe(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

function report(dest: string, archonHome: string): boolean {
  const rows = members().map((m) => compareMember(m, join(dest, m)));
  const byState = { identical: 0, differs: 0, missing: 0 };
  for (const row of rows) {
    byState[row.state]++;
    if (row.state !== "identical") {
      console.log(`FAIL ${row.member}`);
      for (const line of row.detail) console.log(`       ${line}`);
    }
  }
  const pack = inspectPackLink(archonHome);
  if (!pack.ok) console.log(`FAIL pack\n       ${pack.note}`);
  else console.log(`pack   ${pack.note}`);

  console.log(
    `check  ${rows.length} members: ${byState.identical} identical, ${byState.differs} differ, ${byState.missing} missing` +
      ` — pack link ${pack.ok ? "ok" : "broken"}`,
  );
  return byState.identical === rows.length && pack.ok;
}

function install(dest: string, archonHome: string): boolean {
  const list = members();
  mkdirSync(dest, { recursive: true });
  for (const member of list) {
    const target = join(dest, member);
    rmSync(target, { recursive: true, force: true });
    cpSync(join(SKILLS, member), target, { recursive: true, preserveTimestamps: true });
  }
  console.log(`installed ${list.length} members into ${dest}`);

  const link = join(archonHome, "beads-dag");
  const existing = lstatSafe(link);
  if (existing && !existing.isSymbolicLink()) {
    console.error(`refusing: ${link} is a real directory, not a link — move it aside first, then install`);
    return false;
  }
  if (!existing || resolve(readlinkSync(link)) !== PACK) {
    mkdirSync(archonHome, { recursive: true });
    rmSync(link, { force: true });
    symlinkSync(PACK, link);
    console.log(`linked ${link} -> ${PACK}`);
  }
  return report(dest, archonHome);
}

const argv = process.argv.slice(2);
const verb = argv[0];
function flag(name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

if (!verb || verb === "--help" || verb === "-h") {
  console.log(USAGE);
  process.exit(verb ? 0 : 2);
}

const dest = flag("--dest") ?? join(home(), ".agents", "skills");
const archonHome = flag("--archon-home") ?? join(home(), ".archon", "workflows");

const ok =
  verb === "install" ? install(dest, archonHome) : verb === "check" ? report(dest, archonHome) : undefined;

if (ok === undefined) {
  console.error(USAGE);
  process.exit(2);
}
process.exit(ok ? 0 : 1);
