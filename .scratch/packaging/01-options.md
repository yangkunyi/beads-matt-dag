# Packaging a multi-part agent workflow — what mechanisms exist

**Question.** What mechanisms exist today for packaging and distributing a multi-part agent workflow —
skills + reference documents + command-line tools + workflow/run definitions + per-repo configuration —
as one installable, versionable unit that several repos can adopt and later update?

**Method.** Read-only. Every fact below is one anchored claim from `.scratch/packaging/notes/packaging.md`
(c1–c98); each claim carries a verbatim quote from the receipt named beside it. Receipts live in
`.scratch/packaging/sources/<slug>.md`. Local primary sources are cited as `file:line` — pi's docs are
under `/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/`
(shortened to `pi-docs/` below). Archon source was read at `main` on 2026-09-15, which contains the same
marketplace-install code the installed v0.10.1 binary carries (strings checked, not quoted here).

---

## 0. The baseline this repo runs today (for comparison, not as a candidate)

- The seven skills are a **folder copy**: `skills/` is the source, and each machine carries one installed
  copy of every member under `~/.agents/skills/`, the shared root every agent reads (c93;
  `skills/README.md:3`). The install is a copy of each folder whole, `SKILL.md`, `agents/` and every
  reference file (c94; `skills/README.md:17`).
- The proof of install is `diff -rq` between source and installed copy, expected empty; a stale install is
  invisible to a timestamp look because `cp -a` preserves the source's mtimes (c95; `skills/README.md:42,60`).
- Documented failure modes: a second copy under the same name is silently dead — the first one found wins
  and it is not the project's — and a copy under a new name leaves two skills for one job (c96;
  `skills/README.md:74-84`).
- The beads-dag pack is installed as a **symlink** from `~/.archon/workflows/beads-dag` into a checkout,
  so the checkout itself is the installed version (c44; `.archon/workflows/beads-dag/README.md:11`), and
  updating is `git pull` in that checkout, nothing to re-copy (c45; same file:17).
- The per-repo contract document (`docs/agents/issue-tracker.md`) and `tools/inquiry/` are copied per
  Target; no mechanism in this repo currently versions or updates them (repo state, not a claim).

---

## 1. pi packages (this harness)

**Unit.** An npm package or git repository (or local directory) that declares resources in `package.json`
under the `pi` key, or uses conventional directories (c1, c2; `pi-docs/packages.md:5`). It is not a folder
copy and not a manifest-only pointer: the package is the unit and pi loads resources out of it.

**Carries.** Extensions, skills, prompt templates, themes — exactly those four resource kinds (c1, c2).
In addition: extensions are TypeScript modules that subscribe to lifecycle events, register custom tools
the LLM can call, and add commands (c21; `pi-docs/extensions.md:5`); packages can contribute skills via
`skills/` or `pi.skills` (c17; `pi-docs/skills.md:32`) and prompts via `prompts/` or `pi.prompts` (c24;
`pi-docs/prompt-templates.md:13`). Skill folders are freeform beyond `SKILL.md`, so they can carry scripts
and references (c19; `pi-docs/skills.md:95`). Runtime dependencies are declared in `package.json` and
installed by pi's own `npm install` (c13; `pi-docs/packages.md:169`). The fetched docs name no
workflow-definition resource type; the four kinds above are the ones the manifest documents (c1, c2).

**Install / update.** Sources: npm (`npm:pkg@1.2.3`), git (`git:host/user/repo@ref`), absolute/relative
paths (c3; `pi-docs/packages.md:54`). npm packages land in `~/.pi/agent/npm/` or `.pi/npm/` (c5;
`pi-docs/packages.md:64`); git packages clone to `~/.pi/agent/git/...` or `.pi/git/...` (c8; line 92). A
local path is added to settings **without copying** (c12; line 114), so the checkout is the installed
version. `pi install` defaults to user settings; `-l` writes the declaration to project settings
`.pi/settings.json` (c10; line 43), which can be committed so teammates get it — pi installs missing
packages automatically on startup once the project is trusted (c11; line 43). Update is
`pi update --extensions` / `--all`: pinned npm specs are skipped (c4; line 63), git refs are reconciled to
the pinned ref but not moved (c6; line 90), and moving one is an explicit
`pi install git:host/user/repo@new-ref` (c7; line 91). When a git checkout changes, pi resets and cleans
it and runs `npm install` if there is a `package.json` (c9; line 93).

**Versions.** npm version specs, or git tags/commits as the pinned ref (c4, c6). The gallery at
pi.dev/packages lists packages tagged `pi-package` (c14; line 137).

**Interaction with `~/.agents/skills`.** pi loads skills from global locations including
`~/.agents/skills/`, and from project `.agents/skills/` up to the git repo root (c16;
`pi-docs/skills.md:24`). Package skills load from the package, not by being copied into that root. Name
collisions across locations warn and keep the first skill found (c18; `pi-docs/skills.md:189`).

**What it cannot do (per the fetched docs).** No documented per-consumer install/upgrade hook beyond
dependency install (c13) — packages load resources, they do not run a repo setup step. Packages run with
full system access (extensions execute arbitrary code; skills can instruct the model to run executables)
(c15; `pi-docs/packages.md:20`).

---

## 2. Claude Code plugins + plugin marketplaces

**Unit.** A plugin is a self-contained directory of components (c54; receipt `code.claude.com/docs/en/plugins-reference`);
its `.claude-plugin/plugin.json` manifest is optional — without it Claude Code auto-discovers components
and derives the name from the directory (c55). A marketplace is a catalog repository with
`.claude-plugin/marketplace.json`, whose plugin entries need at minimum a name and a source (c58; receipt
`code.claude.com/docs/en/plugin-marketplaces`).

**Carries.** Skills, agents, hooks, MCP servers, LSP servers, monitors (c54) — so tools are carried as MCP
and LSP servers, not as arbitrary executables. Plugins can also be npm packages whose Node dependencies
Claude Code installs when it caches the plugin (c60, c66).

**Install / update.** Add a marketplace (`/plugin marketplace add anthropics/skills`), install a plugin
(`/plugin install name@marketplace`) (c58, c71). Scopes are user, project and local; **project** scope
installs for all collaborators and writes the plugin into `.claude/settings.json`, which is committed
(c61; receipt `code.claude.com/docs/en/discover-plugins`; c62; receipt `code.claude.com/docs/en/settings`).
Sources for a plugin entry: relative paths inside the marketplace repo (c98), GitHub or other git URLs
(with a `ref` or exact commit `sha`), npm packages with a version or range (c59, c60), and HTTPS-hosted
zip archives (c97). Update: push to the marketplace repo, users refresh with
`/plugin marketplace update` (c63); marketplaces provide version tracking and background auto-updates
(c64); copied plugins are cached as one directory per resolved version (c65).

**Versions.** `plugin.json` `version` is optional semver; setting it pins the plugin so users only get
updates when the author bumps it, and `plugin.json` wins over the marketplace entry (c56). A plugin source
can be pinned to `ref` (branch/tag) or exact commit `sha`; the marketplace source itself supports `ref`
but not `sha` (c59).

**What it cannot do / failure modes.** The dependency install is constrained so that **no code from the
plugin or its packages executes during it** — `--ignore-scripts` blocks preinstall/install/postinstall —
so plugins are not a vehicle for an arbitrary consumer-repo install script (c66). Shadowing: a
`--plugin-dir` plugin with the same name as an installed marketplace plugin takes precedence for that
session (c67; receipt `code.claude.com/docs/en/plugins`). A plugin kept directly in a skills directory is
discovered in place, not copied into the cache, and loads with no marketplace or install step (c69, c70).
Official guidance treats standalone `.claude/` configuration as the iteration form and plugins as the
sharing form (c68). Anthropic's own `anthropics/skills` repo is consumed as a plugin marketplace, not by
copying folders (c71).

---

## 3. Agent Skills as a portable folder (the format), plus a third-party registry

**Unit and carries.** The Agent Skills specification defines the unit as a directory with a required
`SKILL.md` and optional `scripts/`, `references/`, `assets/` plus arbitrary files and directories (c72,
c74; receipt `agentskills.io/specification`). Frontmatter is `name` + `description`; extra fields are
free-form `metadata` — there is no version field, the spec shows `version: "1.0"` stored under `metadata`
(c74).

**Distribution.** The spec itself does not mandate where skill directories live — "it only defines what
goes inside them" — and recommends scanning `.agents/skills/` so skills installed by other compliant
clients are visible (c73; receipt `agentskills.io/integrate-skills`). Distribution is therefore whatever
the installer does: the current repo's copy+diff convention (c93–c96), or beads' `bd setup` (c87), or a
cloned skill repo (c91). A third-party directory, skills.sh, offers `npx skills add <owner/repo>` (c75;
receipt `skills.sh`).

**Update / versions.** No mechanism in the format: no install command, no update command, no version
field (c72–c74). Versioning exists only if the surrounding tool adds it (git tag, npm package, marketplace
entry). What goes stale is the copy: stale installs are invisible by timestamp and only `diff` catches
them (c95), and same-name copies silently lose to the first-found copy (c96).

---

## 4. Archon packs + the workflow marketplace

**Unit.** A pack is a folder `.archon/workflows/<pack>/<workflow>/` holding exactly one workflow YAML plus
`commands/` and `scripts/`; bare `command:` and named `script:` references resolve only inside that
package, with no cross-scope fallback (c42; receipt `archon.diy/guides/authoring-workflows/`). In this
repo's pack the folder holds the YAML, the `scripts/` whose entry scripts are nodes the YAML declares, and
`tests/` for the drain (c43; `.archon/workflows/beads-dag/README.md:426`).

**Carries.** Workflow definitions (YAML), command prompts (markdown), named scripts (c42) — and the
marketplace installer routes a pack's subdirectories by name: `commands/` → `.archon/commands`,
`scripts/` → `.archon/scripts`, any other subdirectory (the code names skills as the example) →
`.archon/<name>` (c34; receipt `raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts`).
The marketplace index is `https://archon.diy/workflows.json`, overridable with `ARCHON_MARKETPLACE_URL`
(c27, c28); each entry carries slug, name, author, description, a GitHub `sourceUrl`, a commit `sha`,
tags and `archonVersionCompat` (c29), and the published index pins entries to full commit SHAs (c30;
receipt `archon.diy/workflows.json`).

**Install / update.** `archon workflow install <slug>` must run inside a git repo (c37), resolves the repo
root and installs into that repo's `.archon` (c32): the main YAML to `.archon/workflows/<slug>.yaml` (c33),
support files routed as above (c34), fetched from GitHub at the pinned SHA (c38). Non-github sources are
refused (c31). Existing support files are **skipped** unless `--force` (c35); an existing main YAML fails
the install with "Use --force to overwrite" (c36). There is no update command in the fetched code: the
update paths are re-install with `--force`, or the home-scoped symlink + `git pull` (c44, c45). Archon
loads `~/.archon/workflows/`, `~/.archon/commands/` and `~/.archon/scripts/` globally from any repository
(c39), with load priority bundled default < global < repo-specific and the higher scope winning on a
same-named file (c40). Archon's own documented way to install home-scoped content is a dotfiles symlink
(c41). Archon also ships its own agent skill by copy: `archon skill install <repo>` writes
`.claude/skills/archon-cli` (c49; receipt `archon.diy/getting-started/overview/`); the CLI advertises
`skill install [path]` → `.claude/skills` and `.agents/skills`, and `--force` → overwrite existing file
for `workflow install` (c50; `.scratch/packaging/raw/archon-help.txt`).

**Versions.** The commit SHA pinned in the marketplace index (c30) plus the `archonVersionCompat` field
(c29). A planned `WORKFLOW.md` spec for shareable workflows appears on the roadmap, not in the shipped
installer (c51; receipt `archon.diy/roadmap/`).

**What it cannot do / failure modes.** A pack's install is file copying into one repo — it cannot carry a
global install for another repo's worktree: issue #1682 documents that workflows can be discovered from a
home path but commands have no global search path, so a workflow that bundles command prompts cannot be
installed globally and run against another repo (c46; receipt `github.com/coleam00/Archon/issues/1682`),
and as fetched on 2026-09-15 main's `getCommandFolderSearchPaths` still returns only project-relative
paths (c47). Issue #1959 documents discovery divergence: `workflow run` intermittently saw only the ~25
bundled defaults while `workflow list` saw the full ~46 (c48). Where a pack's extras live outside
`.archon/`, the installer does not see them at all: the marketplace's Matt Pocock pack keeps its 18 skill
directories under `.claude/skills/` and its own install step is `install.ps1` copying the pack into a
target repo (c52; receipt `raw.githubusercontent.com/seanrobertwright/archon-pocock-workflow/...README.md`),
and its documented skill update is manual re-copying (c53).

---

## 5. npm/npx-based installer (a CLI you install once, that scaffolds repos)

**Unit.** An npm package with an executable; the machine-wide install is the versioned unit, and the
scaffolded repo state is generated output (c78, c79; receipt `raw.githubusercontent.com/jsiovn/agent-workflow-beads/main/README.md`).

**Carries / does.** `agent-workflow-beads` installs skills, subagents and Beads task tracking into any
repo; install the CLI once, then `agent-workflow-beads bootstrap <repo> <prefix>` scaffolds (or refreshes)
the workflow inside that project (c78). Update is the npm package plus a refresh command:
`npm install -g agent-workflow-beads@latest` then `agent-workflow-beads update <repo>` (c79).

**Install hooks.** npm runs a package's `preinstall`/`install`/`postinstall` scripts on global install by
default (c76; receipt `docs.npmjs.com/cli/v11/using-npm/scripts`), so an npm package *can* run code at
install time on the machine; npm's own docs discourage it, recommending `.gyp` for compilation and
`prepare` otherwise (c77).

**Versions.** npm semver and the global install; the repo scaffold is refreshed by re-running the tool
(c78, c79). What it cannot do per the fetched docs: nothing about per-repo version pinning of the
scaffold was documented — the scaffold's currency is "run the refresh command" (c79).

---

## 6. git submodule

**Unit.** A submodule records *a particular commit* of another repository as an entry in the consumer
repo (c80; receipt `git-scm.com/book/en/v2/Git-Tools-Submodules`). It carries whatever the other repo
contains — skills, tools, definitions — as an ordinary checkout.

**Install / update.** Cloning does not populate submodules: the consumer runs `git submodule init` and
`git submodule update` (c81, or `git clone --recurse-submodules` per the same doc). Moving to the
upstream branch tip is `git submodule update --remote` (c82) — and that change has to be committed in the
consumer repo.

**Versions.** The recorded commit hash is the version (c80). Failure mode per the fetched doc: the
checkout is empty until init/update runs. No install/upgrade hook exists (the mechanism is git only).

---

## 7. dotfiles-style bootstrap (symlink or copy)

**Unit.** A git repository of config plus a setup script. Archon's own docs show the pattern for global
content: symlink `~/dotfiles/archon/workflows` to `~/.archon/workflows` and `~/dotfiles/archon/commands`
to `~/.archon/commands`, or copy them in the dotfiles install script (c41; receipt
`archon.diy/guides/global-workflows/`). This repo's pack uses the same shape: symlink the pack folder into
`~/.archon/workflows` and the checkout *is* the installed version, updated by `git pull` (c44, c45).

**Carries.** Anything in the checkout (c44 for the pack; c41 for dotfiles). **Update** is git in the
checkout (c45) plus re-running the link script when paths change. **Versions** are git refs; the fetched
docs do not describe a version-pinning mechanism beyond that. Failure mode shown in this repo's own
notes: a cloned Target carrying a stale pack copy shadows the installed pack (repo context; the
mechanism-level fact is the load-priority rule in c40 and the collision rule in c96).

---

## 8. Homebrew taps

**Unit.** A tap is a git repository of formulae, casks and external commands; `brew tap <user>/<repo>`
clones it and `brew update` refreshes it (c83; receipt `docs.brew.sh/Taps`). It distributes machine-level
software (the CLI), not a per-repo bundle: the fetched Taps doc documents tap mechanics and trust, not
formula versioning or per-project setup.

---

## 9. Standards for the *content* of the per-repo contract

- **AGENTS.md.** A simple, open Markdown format with no required fields; the closest file to the edited
  file wins, and nested per-project files take precedence (c84, c85; receipt `agents.md`). beads uses it
  as the delivery surface for its per-repo instructions (c88).
- **Per-repo config carrying in this stack.** pi: project `.pi/settings.json` declares packages and pi
  auto-installs them (c10, c11). Claude Code: project `.claude/settings.json` carries the plugins, hooks
  and env vars for the repo, committed for teammates (c61, c62). Archon: repo `.archon/config.yaml`
  exists per the directories reference (receipt `archon.diy/reference/archon-directories/`, not claimed
  here) and the beads-dag pack's own Target config lives at `.scratch/beads-dag.yaml` (pack README).
- **MCP** was named in the question as a possible content standard; it was not fetched, so this reading
  establishes nothing about it (gap, see below).

---

## 10. The beads angle: what is already published

- **beads itself** distributes a machine-wide `bd` CLI (script, Homebrew, npm) and a per-repo step:
  `bd init` creates or updates `AGENTS.md` and installs project Claude/Codex integrations unless
  `--skip-agents`/`--stealth` (c86, c88; receipts `raw.githubusercontent.com/gastownhall/beads/main/README.md`
  and `.../docs/getting-started/installation.md`). Its first-party per-project setup is `bd setup`:
  `bd setup codex` installs a skill, AGENTS.md guidance and hooks; `bd setup claude` installs
  hooks/settings (c87). It also ships an optional Claude Code plugin through a marketplace
  (`/plugin marketplace add gastownhall/beads`, `/plugin install beads`) (c89), and its own model is the
  CLI as foundation plus optional plugin and optional MCP server (c90).
- **Community bundles** exist: `mikezupper/beads-skill` is a beads skill distributed by `git clone` +
  copying `skills/beads` into a harness skills directory (c91), and its README documents the collision
  failure — for Codex the skill lives at `.agents/skills/` and `bd init` generates a same-named skill,
  overwriting it silently, so installing first does not protect the file (c92).
  `jsiovn/agent-workflow-beads` is the npm-CLI-plus-bootstrap pattern above (c78, c79).
- **The Archon marketplace** (index fetched 2026-09-15, receipt `archon.diy/workflows.json`) lists 14
  entries; none of them names beads, and the closest published skill-set packaging is the Matt Pocock pack
  covered in §4 (c52, c53). Nothing in the fetched Archon docs, beads docs or marketplace index documents
  a beads-based reusable *Archon pack*.

---

## Comparison of the mechanisms found

Facts only; each cell cites the claims that establish it. "Carries tools" means executables/tool
definitions the runtime can invoke; "carries workflow defs" means its own multi-step run/DAG definitions.

| Mechanism | Unit | Carries tools? | Carries workflow defs? | Carries per-repo setup? | Update story | Version story |
|---|---|---|---|---|---|---|
| pi package | npm pkg / git repo / local dir with `pi` manifest (c1–c3) | Yes — extensions register LLM tools and commands (c21); deps installed by npm (c13) | No documented workflow-definition resource; the four kinds are extensions, skills, prompts, themes (c1, c2) | Yes — commit `.pi/settings.json`, pi auto-installs on trust (c10, c11); no package install hook documented (c13) | `pi update --extensions/--all` reconciles; pinned npm skipped, git refs moved only by reinstall `@new-ref` (c4, c6, c7) | npm version specs; git tag/commit refs (c4, c6) |
| Claude Code plugin + marketplace | plugin dir (optional `plugin.json`) listed in a marketplace repo (c54, c55, c58) | Yes — MCP servers, LSP servers, hooks; npm deps cached (c54, c60, c66) | No workflow-definition component type (c54) | Yes — project scope writes committed `.claude/settings.json` (c61, c62); dependency install runs no plugin code (c66) | `/plugin marketplace update` after push; background auto-update; per-version cache dirs (c63–c65) | optional `plugin.json` semver; plugin source ref or sha; marketplace source ref only (c56, c59) |
| Agent Skills folder (format only) | a directory with `SKILL.md` (c72) | Only as free-form files inside the skill folder (scripts/ etc.) (c72) | No (format carries instructions and assets only) (c72) | No — no install/update/version mechanics at all (c72–c74) | None; the copy goes stale silently (c95) | None in-format; version only via `metadata` or the surrounding tool (c74) |
| folder-copy into `~/.agents/skills` (this repo's convention) | source folder + per-machine copy (c93) | As copied files/scripts (c94) | No (c93) | No; copy is one-way and next pi process picks it up (c94–c96) | Re-run the copy; `diff -rq` is the check (c94, c95) | None; staleness is invisible to mtime and caught only by diff (c95) |
| Archon pack + marketplace | `.archon/workflows/<pack>/<workflow>/` folder; index entry pinned to a SHA (c42, c29, c30) | `scripts/` routed to `.archon/scripts` (c34, c42) | Yes — exactly one workflow YAML per packaged workflow (c42) | Yes — installs files into the consumer repo's `.archon` (c32–c34); a global install plus cross-repo run fails for command-bundling workflows (c46, c47) | Re-install `--force` overwrites; no update command; home-scoped symlink + `git pull` (c35, c36, c44, c45) | pinned commit SHA + `archonVersionCompat` (c29, c30) |
| npm/npx installer CLI | npm package with a bin; scaffold output in repos (c78) | Yes — it is a CLI; install scripts can run code (c76) | Whatever the scaffold writes (c78) | Yes — `bootstrap`/`update` commands (c78, c79) | `npm install -g ...@latest` then `update <repo>` (c79) | npm semver for the CLI; no documented pinning of the scaffold (c78, c79) |
| git submodule | a repo pinned as a commit entry (c80) | Checks out whatever the repo has (c80) | Whatever the repo has (c80) | No install hook; the consumer runs init/update (c81) | `git submodule update --remote`, committed in the consumer (c82) | the recorded commit (c80) |
| dotfiles bootstrap (symlink/copy) | config repo + setup script (c41) | Whatever is in the checkout (c44) | Whatever is in the checkout (c44, c45) | Link/copy commands in the setup script (c41) | `git pull` in the checkout; re-run the script (c41, c45) | git refs only (c41, c45) |
| Homebrew tap | git repo of formulae/casks/commands (c83) | Yes — installs software (c83) | No (c83) | No (c83) | `brew update` refreshes the tap (c83) | not established by the fetched doc |

---

## What this does not establish

- No mechanism above documents (in the sources read) an **arbitrary post-install/upgrade step that mutates
  a consumer repo**: pi package install runs `npm install` for dependencies and loads resources (c9, c13);
  Claude Code's plugin dependency install explicitly runs no plugin code (c66); Archon install only copies
  files (c32–c36). A repo-mutating step exists only in the npm-CLI-scaffold pattern, where a tool the user
  invokes does it (c78, c79).
- **Formula versioning for Homebrew taps**, **MCP's content conventions**, and **Archon's repo-level
  `.archon/config.yaml` in depth** were not read, so nothing here is established about them.
- The Archon source receipts are from `main` on 2026-09-15; the installed binary is v0.10.1 (build
  9820785c). The marketplace-install strings match, but this reading does not diff the two.
- Real-world precedents (mikezupper/beads-skill, jsiovn/agent-workflow-beads, the Pocock pack) are cited
  for what they *do*, not audited for quality or maintenance.
