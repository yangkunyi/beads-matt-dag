#!/usr/bin/env bun
/**
 * The flow's installer: one copy per machine, not one copy per Target.
 *
 *   ~/.agents/skills/<member>       a copy of skills/<member>
 *   ~/.archon/workflows/beads-dag   a symlink to this checkout's pack
 *
 * `install` refreshes both; `check` reports drift; `init` turns a git repo into a Target without
 * copying the tracker contract into it. The member list is whatever `skills/` holds — a directory
 * with a `SKILL.md` — so the check cannot disagree with the set it checks.
 *
 *   loom install
 *   loom check
 *   loom init [--dir <repo>] [--prefix <name>]
 *
 * `beads-dag` is an alias. Still works as `bun tools/flow.ts <verb>` from this checkout.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(REPO, "skills");
const PACK = join(REPO, ".archon", "workflows", "beads-dag");

const USAGE = `usage: loom <install|check|init> [options]

  install   copy every member of skills/ into the shared root, then check; point the pack link
  check     compare the installed members and the pack link against this checkout
  init      turn a git repo into a Target: store, yaml knobs, AGENTS.md pointers — no contract copy

  beads-dag is an alias for loom.

  --dest <dir>         where skills are installed (default $HOME/.agents/skills)
  --archon-home <dir>  where the pack link lives (default $HOME/.archon/workflows)
  --dir <dir>          init: the git repo (default cwd)
  --prefix <name>      init: beads issue prefix (default: directory name)`;

const FLOW_BEGIN = "<!-- BEGIN BEADS-DAG FLOW -->";
const FLOW_END = "<!-- END BEADS-DAG FLOW -->";

const FLOW_BLOCK = `## Agent skills

### Issue tracker

Beads store in this repo. The contract is the installed skill \`ask-loom/issue-tracker.md\` — one copy per machine, not a file in this repo. Flow vocabulary: \`ask-loom/flow-context.md\`. Landing: \`/ask-loom\`.

### Triage labels

The five canonical triage roles, each label string equal to its name. Vocabulary: installed \`ask-loom/triage-labels.md\`.

### Domain docs

Single-context: this repo's \`docs/CONTEXT.md\` is the **product** language, plus \`docs/adr/\`. See installed \`ask-loom/domain.md\`.

### The pack

Machine-global at \`~/.archon/workflows/beads-dag\` (\`loom install\`). This repo does not contain a copy. Knobs: \`.scratch/beads-dag.yaml\`.`;

const YAML_STUB = `# This Target's knobs for the machine-global beads-dag pack.
# The pack is not in this repo. Keys: model, thinkingLevel, concurrency, runner, store, verify, postMerge.
# Leave postMerge empty — install lives on the machine, not in a Target.
`;

function home(): string {
  const h = process.env.HOME;
  if (!h) {
    console.error("no HOME in the environment: pass --dest and --archon-home");
    process.exit(2);
  }
  return h;
}

function members(): string[] {
  if (!existsSync(SKILLS)) {
    console.error(`no skills/ in ${REPO} — run this from the loom checkout, or install the loom package`);
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
  // Names this set used to ship. Dest is the shared Agent Skills root and holds other people's
  // skills too, so install only deletes these, never an unknown folder.
  for (const retired of ["ask-matt", "setup-matt-pocock-skills"]) {
    rmSync(join(dest, retired), { recursive: true, force: true });
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

export function defaultPrefix(dir: string): string {
  const raw = basename(resolve(dir)).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (raw === "") return "beads";
  if (/^[0-9]/.test(raw)) return `p${raw}`.slice(0, 32);
  return raw.slice(0, 32);
}

export function upsertFlowBlock(existing: string): string {
  const wrapped = `${FLOW_BEGIN}\n${FLOW_BLOCK}\n${FLOW_END}\n`;
  const start = existing.indexOf(FLOW_BEGIN);
  const stop = existing.indexOf(FLOW_END);
  if (start !== -1 && stop !== -1 && stop > start) {
    const after = existing.slice(stop + FLOW_END.length).replace(/^\n/, "");
    return existing.slice(0, start) + wrapped + after;
  }
  const body = existing.trimEnd();
  if (body === "") return wrapped;
  const lines = body.split("\n");
  if (lines[0]?.startsWith("# ")) {
    let i = 1;
    while (i < lines.length && (lines[i]?.trim() ?? "") !== "") i++;
    return `${lines.slice(0, i).join("\n")}\n\n${wrapped}${lines.slice(i).join("\n").replace(/^\n/, "")}`;
  }
  return `${wrapped}\n${body}\n`;
}

function runBd(dir: string, args: string[]): { ok: boolean; text: string } {
  const result = spawnSync("bd", args, {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, BD_NON_INTERACTIVE: "1" },
  });
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.error) return { ok: false, text: result.error.message };
  if (result.status !== 0) return { ok: false, text: text || `bd ${args.join(" ")} exited ${result.status}` };
  return { ok: true, text };
}

function init(dir: string, prefix: string | undefined): boolean {
  const root = resolve(dir);
  if (root === REPO) {
    console.error("this checkout is the source of loom; run install, not init");
    return false;
  }
  if (!existsSync(join(root, ".git"))) {
    console.error(`not a git repo: ${root}`);
    return false;
  }
  const p = prefix ?? defaultPrefix(root);
  if (!/^[a-z][a-z0-9]{0,31}$/.test(p)) {
    console.error(`bad prefix ${JSON.stringify(p)} — pass --prefix <letter then alphanumerics>`);
    return false;
  }

  const hasStore = existsSync(join(root, ".beads"));
  if (!hasStore) {
    const made = runBd(root, ["init", "--prefix", p, "--non-interactive", "--quiet"]);
    if (!made.ok) {
      console.error(`bd init failed: ${made.text}`);
      return false;
    }
    console.log(`store  ${root}/.beads  prefix ${p}`);
  } else {
    console.log(`store  already present`);
  }

  const typed = runBd(root, ["config", "set", "types.custom", "experiment"]);
  if (!typed.ok) {
    console.error(`bd config set types.custom experiment failed: ${typed.text}`);
    return false;
  }

  const yaml = join(root, ".scratch", "beads-dag.yaml");
  if (!existsSync(yaml)) {
    mkdirSync(dirname(yaml), { recursive: true });
    writeFileSync(yaml, YAML_STUB);
    console.log(`wrote  ${yaml}`);
  }

  const agents = join(root, "AGENTS.md");
  const before = existsSync(agents) ? readFileSync(agents, "utf8") : "";
  const after = upsertFlowBlock(before);
  if (after !== before) {
    writeFileSync(agents, after.endsWith("\n") ? after : `${after}\n`);
    console.log(`wrote  ${agents} (pointers at the installed skills, not a contract copy)`);
  }

  const contract = join(root, "docs", "agents", "issue-tracker.md");
  if (existsSync(contract) && readFileSync(contract, "utf8").split("\n").length > 80) {
    console.log(`note   ${contract} looks like a copied contract; the installed skill is now the source — delete the copy when ready`);
  }

  console.log(`init   ${root} is a Target. Pack and skills stay on the machine.`);
  return true;
}

const argv = process.argv.slice(2);
const verb = argv[0];
function flag(name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

if (import.meta.main) {
  if (!verb || verb === "--help" || verb === "-h") {
    console.log(USAGE);
    process.exit(verb ? 0 : 2);
  }

  const dest = flag("--dest") ?? join(home(), ".agents", "skills");
  const archonHome = flag("--archon-home") ?? join(home(), ".archon", "workflows");

  const ok =
    verb === "install"
      ? install(dest, archonHome)
      : verb === "check"
        ? report(dest, archonHome)
        : verb === "init"
          ? init(flag("--dir") ?? process.cwd(), flag("--prefix"))
          : undefined;

  if (ok === undefined) {
    console.error(USAGE);
    process.exit(2);
  }
  process.exit(ok ? 0 : 1);
}
