# What mechanisms exist today for packaging and distributing a multi-part agent workflow — skills, reference documents, command-line tools, workflow/run definitions and per-repo configuration — as one installable, versionable unit that several repos can adopt and later update?

## Claims

- **c1** A pi package is the harness's unit for sharing extensions, skills, prompt templates and themes through npm or git.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:5)
  > Pi packages bundle extensions, skills, prompt templates, and themes so you can share them through npm or git.

- **c2** A pi package declares its resources in package.json under the `pi` key, or relies on conventional directories.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:5)
  > A package can declare resources in `package.json` under the `pi` key, or use conventional directories.

- **c3** Pi accepts three package source types: npm, git and local paths.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:54)
  > Pi accepts three source types in settings and `pi install`.

- **c4** npm-style pi packages pin versions in the spec, and pinned specs are skipped by package updates.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:63)
  > Versioned specs are pinned and skipped by package updates (`pi update --extensions`, `pi update --all`).

- **c5** Pi installs npm packages into a per-scope directory: ~/.pi/agent/npm/ for user installs, .pi/npm/ for project installs.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:64)
  > User installs go under `~/.pi/agent/npm/`.
- Project installs go under `.pi/npm/`.

- **c6** git-source pi packages are pinned to a tag or commit, and pi's update commands reconcile the clone to that pinned ref rather than moving it.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:90)
  > Refs are pinned tags or commits. `pi update --extensions` and `pi update --all` do not move them to newer refs, but they do reconcile an existing clone to the configured ref.

- **c7** Moving a git-source pi package to a newer version is an explicit reinstall naming the new ref.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:91)
  > Use `pi install git:host/user/repo@new-ref` to update settings and move an existing package to a new pinned ref.

- **c8** git-source pi packages are cloned under ~/.pi/agent/git/<host>/<path> globally, or .pi/git/<host>/<path> for project installs.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:92)
  > Cloned to `~/.pi/agent/git/<host>/<path>` (global) or `.pi/git/<host>/<path>` (project).

- **c9** When a git-source package's checkout changes, pi resets and cleans the clone and runs npm install if the package has a package.json.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:93)
  > When reconciliation changes the checkout, pi resets and cleans the clone, then runs `npm install` if `package.json` exists.

- **c10** pi install defaults to user settings; -l writes the package declaration to project settings .pi/settings.json.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:43)
  > By default, `install` and `remove` write to user settings (`~/.pi/agent/settings.json`). Use `-l` to write to project settings (`.pi/settings.json`) instead.

- **c11** Project settings can be committed for a team, and pi installs any missing declared packages automatically on startup after the project is trusted.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:43)
  > Project settings can be shared with your team, and pi installs any missing packages automatically on startup after the project is trusted.

- **c12** A local-path pi package is added to settings without copying it.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:114)
  > Local paths point to files or directories on disk and are added to settings without copying.

- **c13** When pi installs a package from npm or git it runs npm install, so the package's declared dependencies are installed with it.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:169)
  > When pi installs a package from npm or git, it runs `npm install`, so those dependencies are installed automatically.

- **c14** Packages tagged `pi-package` are listed in the package gallery at pi.dev/packages.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:137)
  > The [package gallery](https://pi.dev/packages) displays packages tagged with `pi-package`.

- **c15** Pi warns that packages run with full system access: extensions execute arbitrary code and skills can instruct the model to run executables.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:20)
  > Pi packages run with full system access. Extensions execute arbitrary code, and skills can instruct the model to perform any action including running executables. Review source code before installing third-party packages.

- **c16** Pi loads skills from global locations including ~/.agents/skills/, and from project locations including .agents/skills/ in the cwd and ancestor directories up to the git repo root.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md:24)
  > Pi loads skills from:

- Global:
  - `~/.pi/agent/skills/`
  - `~/.agents/skills/`
- Project (only after the project is trusted):
  - `.pi/skills/`
  - `.agents/skills/` in `cwd` and ancestor directories (up to git repo root, or filesystem root when not in a repo)

- **c17** A pi package can contribute skills through a skills/ directory or a pi.skills entry in package.json.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md:32)
  > Packages: `skills/` directories or `pi.skills` entries in `package.json`

- **c18** When two skill locations declare the same name, pi warns and keeps the first skill found.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md:189)
  > Name collisions (same name from different locations) warn and keep the first skill found.

- **c19** A skill is a directory whose only required file is SKILL.md; everything else in the folder is freeform.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md:95)
  > A skill is a directory with a `SKILL.md` file. Everything else is freeform.

- **c20** Pi implements the Agent Skills standard, warning about violations but remaining lenient.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md:7)
  > Pi implements the [Agent Skills standard](https://agentskills.io/specification), warning about most violations but remaining lenient.

- **c21** Pi extensions are TypeScript modules that can subscribe to lifecycle events, register custom tools callable by the LLM, and add commands.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md:5)
  > Extensions are TypeScript modules that extend pi's behavior. They can subscribe to lifecycle events, register custom tools callable by the LLM, add commands, and more.

- **c22** Pi extensions run with the user's full system permissions and can execute arbitrary code.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md:111)
  > Extensions run with your full system permissions and can execute arbitrary code. Only install from sources you trust.

- **c23** Extensions are shared through npm or git as pi packages.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md:137)
  > To share extensions via npm or git as pi packages, see [packages.md](packages.md).

- **c24** pi packages can also contribute prompt templates through a prompts/ directory or pi.prompts entries in package.json.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md:13)
  > Packages: `prompts/` directories or `pi.prompts` entries in `package.json`

- **c25** The settings key `packages` is an array of npm/git packages to load resources from.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/settings.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/settings.md:285)
  > | `packages` | array | `[]` | npm/git packages to load resources from |

- **c26** Pi can enable or disable resources from installed packages and local directories through the pi config command.
  Source: file:/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md (/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md:220)
  > Use `pi config` to enable or disable extensions, skills, prompt templates, and themes from installed packages and local directories.

- **c27** The Archon marketplace index is fetched from https://archon.diy/workflows.json by default.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), marketplace section)
  > const DEFAULT_MARKETPLACE_URL = 'https://archon.diy/workflows.json';

- **c28** The marketplace index URL can be overridden through the ARCHON_MARKETPLACE_URL environment variable.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), fetchMarketplace())
  > const url = process.env.ARCHON_MARKETPLACE_URL?? DEFAULT_MARKETPLACE_URL;

- **c29** Each marketplace entry carries slug, name, author, description, a GitHub sourceUrl, a commit sha, tags and an archonVersionCompat field.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), MarketplaceEntryJson)
  > interface MarketplaceEntryJson { slug: string; name: string; author: string; description: string; sourceUrl: string; sha: string; tags: string[]; archonVersionCompat: string; featured?: boolean; }

- **c30** The published marketplace index pins each entry to a full commit SHA of its source repository.
  Source: url:https://archon.diy/workflows.json (pocock-skills-workflow-family entry)
  > "sha":"629e57716ea72bb8cf2f77fc7728d3845aa2cf92"

- **c31** Archon refuses a marketplace source that is not a github.com URL.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), workflowInstallCommand())
  > if (!entry.sourceUrl.startsWith('https://github.com/')) { throw new Error(`Untrusted source URL for '${slug}': ${entry.sourceUrl}\nOnly github.com sources are permitted.

- **c32** archon workflow install resolves the consumer repo root and installs into that repo's .archon directory.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), workflowInstallCommand())
  > const archonDir = join(repoRoot, '.archon');

- **c33** A directory-form pack installs its main workflow as .archon/workflows/<slug>.yaml in the consumer repo.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), installDirectory())
  > const destWorkflow = join(workflowsDir, `${slug}.yaml`);

- **c34** A pack's subdirectories are routed by name: commands/ to .archon/commands, scripts/ to .archon/scripts, and any other subdirectory (the code names skills as the example) to .archon/<name>.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), installDirectory())
  > if (subdir.name === 'commands') { targetDir = join(archonDir, 'commands'); } else if (subdir.name === 'scripts') { targetDir = join(archonDir, 'scripts'); } else { // Other subdirs (e.g. skills) go under.archon/ targetDir = join(archonDir, subdir.name); }

- **c35** Supporting pack files that already exist are skipped, not overwritten, unless --force is passed.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), installDirectory())
  > if (existsSync(destFile) &&!force) { console.log(` Skipped (exists): ${destFile}`); continue; }

- **c36** An already-installed main workflow YAML makes install fail with an instruction to use --force.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), installDirectory())
  > already exists at ${destWorkflow}.\nUse --force to overwrite.

- **c37** archon workflow install requires the consumer directory to be a git repository.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), workflowInstallCommand())
  > if (!repoRoot) { throw new Error('Not in a git repository. Run archon workflow install from within a git repo.');

- **c38** Directory-form installs list the source directory through the GitHub Contents API at the pinned SHA, so the installed content is the commit the index pinned.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/cli/src/commands/workflow.ts (workflow.ts (main branch, fetched 2026-09-15), fetchGitHubDirectory())
  > async function fetchGitHubDirectory(owner: string, repo: string, path: string, sha: string): Promise { const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${sha}`;

- **c39** Archon is documented as loading home-scoped workflows, commands and scripts globally, usable from any repository.
  Source: url:https://archon.diy/guides/global-workflows/ (Global Workflows, Commands, and Scripts, Overview)
  > Workflows placed in ~/.archon/workflows/, commands in ~/.archon/commands/, and scripts in ~/.archon/scripts/ are loaded globally — they appear in every project and can be invoked from any repository.

- **c40** Archon's documented load priority is bundled defaults, then global home-scoped definitions, then repo-specific definitions, with the higher scope winning on a same-named file.
  Source: url:https://archon.diy/guides/global-workflows/ (Global Workflows, Commands, and Scripts, Load Priority)
  > Bundled defaults (lowest priority) — the archon-* workflows/commands embedded in the Archon binary. Global / home-scoped — ~/.archon/workflows/, ~/.archon/commands/, ~/.archon/scripts/ (override bundled by filename). Repo-specific — &#x3C;repoRoot>/.archon/workflows/, &#x3C;repoRoot>/.archon/commands/, &#x3C;repoRoot>/.archon/scripts/ (override global by filename). Same-named legacy/shared files at a higher scope win.

- **c41** Archon's own documented way to install home-scoped content is symlinking a dotfiles checkout into ~/.archon/workflows and ~/.archon/commands.
  Source: url:https://archon.diy/guides/global-workflows/ (Global Workflows, Commands, and Scripts, Syncing with Dotfiles)
  > Then symlink during dotfiles setup: Terminal window ln -sf ~/dotfiles/archon/workflows ~/.archon/workflows

- **c42** A packaged workflow occupies .archon/workflows/<pack>/<workflow>/ and contains exactly one YAML definition, with bare command: and named script: references resolving only inside its own commands/ and scripts/ directories.
  Source: url:https://archon.diy/guides/authoring-workflows/ (Authoring Workflows, packaged layout)
  > A packaged workflow contains exactly one YAML definition; bare command: and named script: references resolve only from its own commands/ and scripts/ directories, with no shared or cross-scope fallback.

- **c43** A workflow folder in the beads-dag pack carries its YAML, its scripts/ directory (each entry script a node the folder's YAML declares), and its tests/ for the drain.
  Source: file:/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md (/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md:426)
  > A workflow folder holds its YAML, its `scripts/` (each entry script is a node that folder's YAML declares),

- **c44** The beads-dag README's install story is a symlink from ~/.archon/workflows/beads-dag to the pack folder in a checkout, so the checkout itself is the installed version.
  Source: file:/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md (/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md:11)
  > a checkout, so the checkout *is* the installed version:

- **c45** The beads-dag README states that updating the symlinked install is a git pull in the checkout: nothing to re-copy and no diff to run.
  Source: file:/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md (/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md:17)
  > Updating an install is `git pull` in that checkout: there is nothing to re-copy and no diff to run,

- **c46** The documented Archon failure mode for global installs is asymmetry: workflows can be discovered from a home path, but commands have no global search path, so a bundle of command prompts installed globally cannot run against another repo's worktree.
  Source: url:https://github.com/coleam00/Archon/issues/1682 (Issue #1682, Summary (closed))
  > The Workflow Marketplace install path treats workflows and commands asymmetrically: workflows can be discovered from a global path (~/.archon/.archon/workflows/), but commands have no global search path. Any community workflow that bundles command prompts (the common case — workflow YAML references command markdown by name) cannot be installed globally and then run against another repo's worktree.

- **c47** As fetched on 2026-09-15, main's getCommandFolderSearchPaths still returns only project-relative command paths, with no global parameter.
  Source: url:https://raw.githubusercontent.com/coleam00/Archon/main/packages/paths/src/archon-paths.ts (archon-paths.ts (main branch, fetched 2026-09-15), getCommandFolderSearchPaths())
  > export function getCommandFolderSearchPaths(configuredFolder?: string): string[] { const paths = ['.archon/commands', '.archon/commands/defaults']; // Add configured folder if specified (and not already in paths) if (configuredFolder && configuredFolder!== '.archon/commands' && configuredFolder!== '.archon/commands/defaults') { paths.push(configuredFolder); } return paths; }

- **c48** A separate documented Archon failure mode is discovery divergence: workflow run could see only the bundled defaults while workflow list saw the full set.
  Source: url:https://github.com/coleam00/Archon/issues/1959 (Issue #1959, body (closed))
  > run appears to see only the ~25 bundled defaults instead of the full set (~46 = bundled + global + project, including.archon/workflows/experimental/).

- **c49** Archon ships and installs its own agent skill by copying it into a consumer repo, either through archon setup or archon skill install <repo>, which writes .claude/skills/archon-cli.
  Source: url:https://archon.diy/getting-started/overview/ (Getting Started, Using With Claude Code (Skill))
  > run archon skill install /path/to/your/repo, or copy it by hand: Terminal window mkdir -p /path/to/your/repo/.claude/skills cp -r Archon/.claude/skills/archon-cli /path/to/your/repo/.claude/skills/

- **c50** The installed archon CLI advertises `workflow install <slug>` as installing a workflow from the marketplace, `skill install [path]` as installing archon-cli into .claude/skills and .agents/skills, and --force as overwriting an existing file for workflow install.
  Source: file:/data3/yky/beads-matt-dag/.scratch/packaging/raw/archon-help.txt (/data3/yky/beads-matt-dag/.scratch/packaging/raw/archon-help.txt:23)
  >   workflow install <slug>    Install a workflow from the marketplace
  workflow test [<name>|<folder>|<path>]
                             Run declared dry-run fixtures (fixtures/*.stubs.yaml) for a
                             workflow, a workflow folder or pack (by name or directory
                             path); relative paths resolve from the invoking directory before the
                             repository root. With no target, runs every fixture. Never creates a
                             run or contacts a provider; exec-code fixtures execute in a
                             scratch worktree of HEAD
  isolation list             List all active worktrees/environments
  isolation cleanup [days]   Remove stale environments (default: 7 days)
  isolation cleanup --merged Remove environments with branches merged into main
  complete <branch> [...]    Complete branch lifecycle (remove worktree + branches)
  serve                      Start the web UI server (downloads web UI on first run)
  skill install [path]       Install archon-cli into .claude/skills and .agents/skills
  doctor [--full]            Verify your Archon setup (Claude/Codex binaries, gh auth, DB, adapters; --full also probes the OpenCode runtime SDK)
  auth github                Connect your GitHub identity via device flow (multi-user installs)
  ai key set <provider>      Connect an AI provider API key (multi-user installs; key read from prompt/stdin)
  ai login <provider>        Connect a Claude, ChatGPT/Codex, or Copilot subscription
  ai list                    List your connected AI provider keys
  ai logout <provider>       Disconnect an AI provider key
  ai tier set <t> <p> <m>    Set a model tier (small/medium/large) → provider/model [--effort <e>] [--scope user|install]
  ai tier list [--json]      Show configured tiers (install + yours) vs built-in defaults
  ai tier unset <tier>       Unset a tier override (built-ins: claude/codex only) [--scope user|install]
  ai alias set <@n> <p> <m>  Set a @custom model alias [--effort <e>] [--scope user|install]
  ai alias list [--json]     Show configured @custom aliases (install + yours)
  ai alias unset <@name>     Remove a @custom alias [--scope user|install]
  ai default <p> [<model>]   Set the default assistant (+ chat model) [--scope user|install]
  telemetry status           Show anonymous telemetry state (enabled, reason, ID, host)
  telemetry reset            Rotate the anonymous install UUID
  validate workflows [name]  Validate workflow definitions and their references
  validate commands [name]   Validate command files
  version, --version, -V     Show version info (also -v when used alone)
  help                       Show this help message

Options:
  --cwd <path>               Override working directory (default: current directory)
  --branch, -b <name>        Create worktree for branch (or reuse existing)
  --from, --from-branch <name> Create new branch from specific start point
  --base <branch>            Per-dispatch base override for epic slices (worktree cut-from + PR target)
  --workflow-source <path>   Read the workflow, its commands and scripts from this directory
                             instead of --cwd (which stays the workspace the run acts on)
  --no-worktree              Run on branch directly without worktree isolation
  --folder                   Register the current non-git directory as a folder project and run in place
  --input <name>=<value>     Supply a declared workflow input; repeat per input (mutually exclusive with --resume)
  --model <name>=<spec>      Rebind small/medium/large or @alias for one run; repeat per binding
  --config <path>            Load a sparse YAML config layer for one fresh workflow run
  --resume                   Resume the most recent failed or paused run of the workflow (mutually exclusive with --branch)
  --adopt <run-id>           Start a new run adopting a terminal run's worktree/branch + artifacts ($ADOPTED_RUN_DIR)
  --supersedes <run-id>      Record this fresh run as replacing the prior run's open item (no lane inheritance)
  --dry-run                  Simulate workflow DAG control flow without creating a run or contacting a provider
  --stubs <path>             YAML node-output map for --dry-run
  --stubs-init <path>        Write a complete dry-run stub scaffold and exit
  --default-stubs            Fill missing reached nodes with validated placeholders during --dry-run
  --exec-code                Execute trusted bash/script nodes during --dry-run (default: require stubs)
  --pause-at-gates           Stop a dry-run at approval gates instead of auto-approving
  --spawn                    Open setup wizard in a new terminal window (for setup command)
  --quiet, -q                Reduce log verbosity to warnings and errors only
  --verbose, -v              Show debug-level output
  --json                     Output machine-readable JSON (list/status/get/wait/runs/approve/reject/respond/cancel/abandon/resume)
  --events                   For verbose JSON status/get: output raw event rows instead of node summaries
  --detach                   Run 'workflow run'/'approve'/'reject'/'respond'/'resume' in a detached background child (returns immediately)
  --all                      For 'workflow runs': list across all projects (ignore cwd scope)
  --status <status>          For 'workflow runs': filter to one status (running, completed, failed, ...)
  --open                     For 'workflow runs': the open-work inbox — failed runs nothing has adopted or superseded
  --limit <n>                For 'workflow runs': max rows (default 20)
  --timeout <seconds>        For 'workflow wait': give up after N seconds (default: wait indefinitely)
  --conversation-id <id>     Reuse a stable conversation scope across runs (enables
                             persist_session resume between separate CLI invocations)
  --port <port>              Override server port for 'serve' (default: 3090)
  --download-only            Download web UI without starting the server
  --force                    Overwrite existing file (for workflow install)

- **c51** Archon's roadmap lists a WORKFLOW.md spec as the standard format for shareable workflows in the planned marketplace work.
  Source: url:https://archon.diy/roadmap/ (Roadmap, v0.5 Workflow Marketplace (Planned))
  > WORKFLOW.md spec — standard format for shareable workflows

- **c52** The marketplace's Matt Pocock pack is an example of the limits of pack distribution: its 18 skill directories live under .claude/skills/ outside .archon/, and the pack README's own install step is install.ps1 copying the pack into a target repo.
  Source: url:https://raw.githubusercontent.com/seanrobertwright/archon-pocock-workflow/629e57716ea72bb8cf2f77fc7728d3845aa2cf92/README.md (What's in the box, install section)
  > .claude/skills/ 18 skill dirs copied from upstream mattpocock/skills @ v1.1.0 vendor/ the upstream clone, checked out at the v1.1.0 tag install.ps1 copy the pack into a target repo

- **c53** That pack's update procedure for its bundled skills is manual: clone upstream, check out the new tag, re-copy the 18 skill directories into .claude/skills, then run archon validate workflows.
  Source: url:https://raw.githubusercontent.com/seanrobertwright/archon-pocock-workflow/629e57716ea72bb8cf2f77fc7728d3845aa2cf92/README.md (Notes (skills update))
  > Update the skills: clone `mattpocock/skills` to `vendor/Matt_Pocock_Skills` (gitignored), check out the new tag, re-copy the 18 skill dirs into `.claude/skills/`, then `archon validate workflows`.

- **c54** A Claude Code plugin is a self-contained directory of components: skills, agents, hooks, MCP servers, LSP servers and monitors.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, intro)
  > A plugin is a self-contained directory of components that extends Claude Code with custom functionality. Plugin components include skills, agents, hooks, MCP servers, LSP servers, and monitors.

- **c55** A plugin manifest (.claude-plugin/plugin.json) is optional: without it Claude Code auto-discovers components in default locations and derives the plugin name from the directory name.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, Plugin manifest schema)
  > The manifest is optional. If omitted, Claude Code auto-discovers components in default locations and derives the plugin name from the directory name.

- **c56** A plugin's version is an optional semver string in plugin.json; setting it pins the plugin so users only receive updates when the author bumps it, and if it is also set in the marketplace entry plugin.json wins.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, manifest fields, version)
  > version string Optional. Semantic version. Setting this pins the plugin to that version string, so users only receive updates when you bump it, except for a command source; see Version management. If also set in the marketplace entry, plugin.json wins. If omitted, the version comes from the next source in Version management.

- **c57** A plugin can declare dependencies on other plugins with semver version constraints.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, manifest fields, dependencies)
  > Other plugins this plugin requires, optionally with semver version constraints. See Constrain plugin dependency versions

- **c58** A marketplace is declared by .claude-plugin/marketplace.json at the repository root; each plugin entry needs at minimum a name and a source that tells Claude Code where to fetch it.
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, Create the marketplace file)
  > Each plugin entry needs at minimum a name and a source that tells Claude Code where to fetch it from.

- **c59** A marketplace itself can be pinned to a branch or tag (ref) but not to a sha, while a plugin source listed in the marketplace can be pinned to either ref or exact commit sha.
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, Version resolution and release channels)
  > Git-based marketplace sources support ref (branch/tag) but not sha. Plugin source: where to fetch an individual plugin listed in the marketplace. Set in the source field of each plugin entry inside marketplace.json. Git-based plugin sources support both ref (branch/tag) and sha (exact commit).

- **c60** Plugins can also be distributed as npm packages, installed with npm install from the public or a private registry, and pinned with a version or range field.
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, Plugin sources, npm packages)
  > Plugins distributed as npm packages are installed using npm install. This works with any package on the public npm registry or a private registry your team hosts.

- **c61** Installing a plugin offers user, project and local scopes; project scope installs for all collaborators on the repository, which adds the plugin to .claude/settings.json.
  Source: url:https://code.claude.com/docs/en/discover-plugins (Discover and install plugins, install scopes)
  > Project scope: install for all collaborators on this repository, which adds the plugin to.claude/settings.json

- **c62** The shared project settings file .claude/settings.json is meant to be committed so teammates get the project's plugins, hooks and environment variables.
  Source: url:https://code.claude.com/docs/en/settings (Settings files and precedence, scope table)
  > Shared project.claude/settings.json Everyone working in the folder that contains it. In a git repository, commit it so teammates get it Team permissions, hooks, plugins, and the environment variables the project needs

- **c63** Updating a marketplace-based install is: push changes to the marketplace repository, then users refresh with /plugin marketplace update.
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, Overview)
  > Once your marketplace is live, you can update it by pushing changes to your repository. Users refresh their local copy with /plugin marketplace update.

- **c64** Marketplaces provide centralized discovery, version tracking, automatic updates and multiple source types including git repositories and local paths.
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, intro)
  > Marketplaces provide centralized discovery, version tracking, automatic updates, and support for multiple source types, including git repositories and local paths.

- **c65** For copied plugins, each installed version is a separate directory in the plugin cache, grouped by marketplace and plugin and named for the resolved version.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, plugin caching)
  > each installed version is a separate directory in the cache, grouped by marketplace and plugin and named for the resolved version

- **c66** Claude Code's dependency install for plugins is constrained so that no code from the plugin or its packages executes during it, with --ignore-scripts preventing preinstall, install and postinstall scripts.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, plugin caching, dependency install)
  > no code from the plugin or its packages executes during it, and bounds how long it can run: Frozen resolution: Bun and npm install exactly what the lockfile pins, and fail rather than re-resolve versions when package.json and the lockfile disagree. No lifecycle scripts: --ignore-scripts

- **c67** A local --plugin-dir plugin with the same name as an installed marketplace plugin takes precedence for that session.
  Source: url:https://code.claude.com/docs/en/plugins (Create plugins, testing)
  > When a --plugin-dir plugin has the same name as an installed marketplace plugin, the local copy takes precedence for that session.

- **c68** Claude Code's official guidance for sharing is standalone .claude/ configuration for iteration, converted to a plugin when ready to share.
  Source: url:https://code.claude.com/docs/en/plugins (Create plugins, standalone vs plugins table)
  > Start with standalone configuration in.claude/ for quick iteration, then convert to a plugin when you’re ready to share.

- **c69** A plugin can also live in a skills directory: claude plugin init scaffolds it under ~/.claude/skills and it loads with no marketplace or install step.
  Source: url:https://code.claude.com/docs/en/plugins (Create plugins, skills-directory plugins)
  > On the next session it loads as my-tool@skills-dir with no marketplace or install step.

- **c70** Unlike a copied marketplace install, a skills-directory plugin is discovered in place rather than copied into the plugin cache.
  Source: url:https://code.claude.com/docs/en/plugins-reference (Plugins reference, skills-directory plugins)
  > Unlike a copied marketplace install, the plugin is discovered in place rather than copied into the plugin cache.

- **c71** Anthropic's own skills repository is consumed in Claude Code by registering it as a plugin marketplace and installing its plugin(s), not by copying folders.
  Source: url:https://raw.githubusercontent.com/anthropics/skills/main/README.md (anthropics/skills README, Try in Claude Code)
  > You can register this repository as a Claude Code Plugin marketplace by running the following command in Claude Code: ``` /plugin marketplace add anthropics/skills

- **c72** The Agent Skills specification defines a skill as a directory containing at minimum SKILL.md, with optional scripts/, references/ and assets/ directories and any additional files.
  Source: url:https://agentskills.io/specification (Agent Skills specification, Directory structure)
  > A skill is a directory containing, at minimum, a SKILL.md file: skill-name/ ├── SKILL.md # Required: metadata + instructions ├── scripts/ # Optional: executable code

- **c73** The Agent Skills specification does not mandate where skill directories live, only what goes inside them; it recommends scanning .agents/skills/ so skills installed by other compliant clients are visible.
  Source: url:https://agentskills.io/integrate-skills (Adding skills support, Where to scan)
  > the Agent Skills specification does not mandate where skill directories live (it only defines what goes inside them), scanning.agents/skills/ means skills installed by other compliant clients are automatically visible to yours, and vice versa.

- **c74** The Agent Skills format has no version field; the spec suggests storing a version under the optional free-form metadata map.
  Source: url:https://agentskills.io/specification (Agent Skills specification, metadata field)
  > metadata field The optional metadata field: A map from string keys to string values Clients can use this to store additional properties not defined by the Agent Skills spec We recommend making your key names reasonably unique to avoid accidental conflicts Example: metadata: author: example-org version: "1.0"

- **c75** skills.sh is a third-party Agent Skills directory whose install command is npx skills add <owner/repo>.
  Source: url:https://skills.sh/ (skills.sh landing page)
  > Install them with a single command to enhance your agents with access to procedural knowledge. Try it now $ npx skills add <owner/repo>

- **c76** npm runs the install lifecycle scripts (preinstall, install, postinstall) of a globally installed npm package by default.
  Source: url:https://docs.npmjs.com/cli/v11/using-npm/scripts (npm Docs, scripts, Life Cycle Operation Order)
  > These also run when you run npm install -g <pkg-name> preinstall install postinstall

- **c77** npm's own docs discourage using install scripts for setup, recommending a .gyp file for compilation and prepare for anything else.
  Source: url:https://docs.npmjs.com/cli/v11/using-npm/scripts (npm Docs, scripts, Best Practices)
  > Don't use install. Use a.gyp file for compilation, and prepare for anything else.

- **c78** agent-workflow-beads is a real npm-distributed scaffold: a CLI installed once globally, then one command per repo scaffolds (or refreshes) the workflow inside that project.
  Source: url:https://raw.githubusercontent.com/jsiovn/agent-workflow-beads/main/README.md (agent-workflow-beads README, intro)
  > You install the `agent-workflow-beads` CLI once on your machine, then run one command per project to scaffold (or refresh) the workflow inside that project.

- **c79** That tool's version story is the global npm package: upgrade with npm install -g agent-workflow-beads@latest, then refresh downstream repos with agent-workflow-beads update <repo>.
  Source: url:https://raw.githubusercontent.com/jsiovn/agent-workflow-beads/main/README.md (agent-workflow-beads README, install/refresh)
  > Upgrade later the same way you upgrade any global package (`npm install -g agent-workflow-beads@latest`); there is no checkout to keep in sync and no shell alias to maintain. ### 2. Bootstrap a project Run this once per repo you want to use the workflow in: ```bash # myprefix = Beads issue-ID tag for this repo (acme → acme-1, acme-2) # Bootstrap: git init if needed → bd init + bd setup claude → scaffold Claude's.claude/ (skills + agents) agent-workflow-beads bootstrap /path/to/your-repo myprefix # Opt-in flags — also accepted by `update`, so you can adopt them later # (and are auto-detected on later runs once the surface exists): # --with-codex also scaffold Codex:.codex/ skills+agents + AGENTS.md + `bd setup codex` # --with-screenshots web/UI only: attach-web-screenshots skill + cleanup-screenshots.yml CI workflow agent-workflow-beads bootstrap /path/to/your-repo myprefix --with-codex --with-screenshots ``` ### 3. Refresh later When this template gets updates, upgrade the CLI (`npm install -g agent-workflow-beads@latest`) and refresh any downstream repo with: ```bash agent-workflow-beads update /path/to/your-repo

- **c80** A git submodule is recorded as a particular commit of the other repository, not as its contents.
  Source: url:https://git-scm.com/book/en/v2/Git-Tools-Submodules (Git Book, Git Tools - Submodules)
  > Instead, Git sees it as a particular commit from that repository.

- **c81** Cloning a project does not populate its submodules; the consumer must run git submodule init and git submodule update to check out the recorded commit.
  Source: url:https://git-scm.com/book/en/v2/Git-Tools-Submodules (Git Book, Git Tools - Submodules, Cloning a Project with Submodules)
  > You must run two commands from the main project: git submodule init to initialize your local configuration file, and git submodule update to fetch all the data from that project and check out the appropriate commit listed in your superproject

- **c82** A submodule can be moved to the upstream branch's tip with git submodule update --remote.
  Source: url:https://git-scm.com/book/en/v2/Git-Tools-Submodules (Git Book, Git Tools - Submodules, Working on a Project with Submodules)
  > If you run git submodule update --remote, Git will go into your submodules and fetch and update for you.

- **c83** A Homebrew tap is a git repository of formulae, casks and external commands that brew tap clones into Homebrew's tap directory and brew update refreshes.
  Source: url:https://docs.brew.sh/Taps (Homebrew Documentation, Taps)
  > The brew tap command adds repositories that Homebrew can use for formulae, casks and external commands. The one-argument form assumes a repository on GitHub, while the two-argument form accepts any URL supported by Git. Code in a tap can run with your user’s privileges. Read Tap Trust before using a non-official tap. The brew tap command brew tap without arguments lists the currently tapped repositories. It prints nothing when no taps are installed. $ brew tap petere/postgresql brew tap <user>/<repository> clones https://github.com/<user>/homebrew-<repository> into Homebrew’s tap directory. Homebrew updates the repository during brew update.

- **c84** AGENTS.md is a plain-Markdown convention with no required fields; the closest file to the edited file wins, so nested per-project files take precedence.
  Source: url:https://agents.md/ (AGENTS.md landing page)
  > A simple, open format for guiding coding agents, used by over 60k open-source projects. Think of AGENTS.md as a README for agents: a dedicated, predictable place to provide the context and instructions to help AI coding agents work on your project. Explore Examples View on GitHub # AGENTS.md ## Setup commands - Install deps: `pnpm install` - Start dev server: `pnpm dev` - Run tests: `pnpm test` ## Code style - TypeScript strict mode - Single quotes, no semicolons - Use functional patterns where possible Why AGENTS.md? README.md files are for humans: quick starts, project descriptions, and contribution guidelines. AGENTS.md complements this by containing the extra, sometimes detailed context coding agents need: build steps, tests, and conventions that might clutter a README or aren’t relevant to human contributors. We intentionally kept it separate to: Give agents a clear, predictable place for instructions. Keep READMEs concise and focused on human contributors. Provide precise, agent-focused guidance that complements existing README and docs. Rather than introducing another proprietary file, we chose a name and format that could work for anyone. If you’re building or using coding agents and find this helpful, feel free to adopt it. One AGENTS.md works across many agents Your agent definitions are compatible with a growing ecosystem of AI coding agents and tools: Codex from OpenAI Jules from Google Factory Aider goose opencode Zed Warp VS Code Devin from Cognition Autopilot & Coded Agents from UiPath Junie from JetBrains Codex from OpenAI Jules from Google Factory Aider goose opencode Zed Warp VS Code Devin from Cognition Autopilot & Coded Agents from UiPath Junie from JetBrains Amp Cursor RooCode Gemini CLI from Google Kilo Code Phoenix Semgrep Coding agent from GitHub Copilot Ona Windsurf from Cognition Augment Code Amp Cursor RooCode Gemini CLI from Google Kilo Code Phoenix Semgrep Coding agent from GitHub Copilot Ona Windsurf from Cognition Augment Code View all supported agents Examples # Sample AGENTS.md file ## Dev environment tips - Use `pnpm dlx turbo run where <project_name>` to jump to a package instead of scanning with `ls`. - Run `pnpm install --filter <project_name>` to add the package to your workspace so Vite, ESLint, and TypeScript can see it. - Use `pnpm create vite@latest <project_name> -- --template react-ts` to spin up a new React + Vite package with TypeScript checks ready. - Check the name field inside each package's package.json to confirm the right name—skip the top-level one. ## Testing instructions - Find the CI plan in the.github/workflows folder. - Run `pnpm turbo run test --filter <project_name>` to run every check defined for that package. - From the package root you can just call `pnpm test`. The commit should pass all tests before you merge. - To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`. - Fix any test or type errors until the whole suite is green. - After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript rules still pass. - Add or update tests for the code you change, even if nobody asked. ## PR instructions - Title format: [<project_name>] <Title> - Always run `pnpm lint` and `pnpm test` before committing. openai/codex General-purpose CLI tooling for AI coding agents. Rust + 607 apache/airflow Platform to programmatically author, schedule, and monitor workflows. Python + 4627 temporalio/sdk-java Java SDK for Temporal, workflow orchestration defined in code. Java + 153 PlutoLang/Pluto A superset of Lua 5.4 with a focus on general-purpose programming. C++ + 8 View 60k+ examples on GitHub How to use AGENTS.md? 1. Add AGENTS.md Create an AGENTS.md file at the root of the repository. Most coding agents can even scaffold one for you if you ask nicely. 2. Cover what matters Add sections that help an agent work effectively with your project. Popular choices: Project overview Build and test commands Code style guidelines Testing instructions Security considerations 3. Add extra instructions Commit messages or pull request guidelines, security gotchas, large datasets, deployment steps: anything you’d tell a new teammate belongs here too. 4. Large monorepo? Use nested AGENTS.md files for subprojects Place another AGENTS.md inside each package. Agents automatically read the nearest file in the directory tree, so the closest one takes precedence and every subproject can ship tailored instructions. For example, at time of writing the main OpenAI repo has 88 AGENTS.md files. About AGENTS.md emerged from collaborative efforts across the AI software development ecosystem, including OpenAI Codex, Amp, Jules from Google, Cursor, and Factory. We’re committed to helping maintain and evolve this as an open format that benefits the entire developer community, regardless of which coding agent you use. AGENTS.md is now stewarded by the Agentic AI Foundation under the Linux Foundation. Learn more → FAQ Are there required fields? No. AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide.

- **c85** AGENTS.md nests: agents automatically read the nearest file in the directory tree, so the closest one takes precedence and a subproject can ship tailored instructions.
  Source: url:https://agents.md/ (AGENTS.md landing page, How to use)
  > Agents automatically read the nearest file in the directory tree, so the closest one takes precedence and every subproject can ship tailored instructions.

- **c86** The beads CLI is installed machine-wide by script, Homebrew or npm, and bd init is then run inside each project to initialize the store.
  Source: url:https://raw.githubusercontent.com/gastownhall/beads/main/README.md (beads README, Installation/Quick Install)
  > curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash # Initialize in YOUR project cd your-project bd init

- **c87** beads' first-party per-project setup step is bd setup: bd setup codex installs a skill, AGENTS.md guidance and hooks; bd setup claude installs hooks/settings.
  Source: url:https://raw.githubusercontent.com/gastownhall/beads/main/README.md (beads README, optional agent instructions)
  > bd setup codex # Codex CLI - installs skill, AGENTS.md guidance, and hooks

- **c88** bd init creates or updates AGENTS.md and installs project Claude/Codex integrations by default, unless --skip-agents or --stealth is passed.
  Source: url:https://raw.githubusercontent.com/gastownhall/beads/main/docs/getting-started/installation.md (beads installation guide, bd init)
  > creates or updates `AGENTS.md` and installs project Claude/Codex integrations by default unless you use `--skip-agents` or `--stealth`

- **c89** beads also ships an optional Claude Code plugin through a marketplace: /plugin marketplace add gastownhall/beads then /plugin install beads.
  Source: url:https://raw.githubusercontent.com/gastownhall/beads/main/docs/getting-started/installation.md (beads installation guide, Claude Code Plugin (Optional))
  > /plugin marketplace add gastownhall/beads /plugin install beads

- **c90** beads' own model is a machine-wide bd CLI plus an optional per-harness plugin and an optional MCP server, with the CLI as the foundation.
  Source: url:https://raw.githubusercontent.com/gastownhall/beads/main/docs/getting-started/installation.md (beads installation guide, components table)
  > | **bd CLI** | Core command-line tool | Always - this is the foundation | | **Claude Code Plugin** | Slash commands + enhanced UX | Optional

- **c91** A community example of a beads skill is mikezupper/beads-skill, distributed by git clone and copying skills/beads into the harness skills directory; consumers need only skills/beads/.
  Source: url:https://raw.githubusercontent.com/mikezupper/beads-skill/main/README.md (beads-skill README, What's inside / Installation)
  > Consumers only need `skills/beads/`.** The submodule is a maintenance aid; a plain `git clone` without `--recurse-submodules` gives you a fully usable skill.

- **c92** That skill's README documents the collision failure mode: for Codex the skill goes to .agents/skills/ and bd init's generated skill has the same name, and installing first does not protect the file — bd init overwrites it silently.
  Source: url:https://raw.githubusercontent.com/mikezupper/beads-skill/main/README.md (beads-skill README, Install order vs bd init)
  > **Yes** — same skill name | **Installing first does not protect you.** Verified: `bd init` overwrites an existing `.agents/skills/beads/SKILL.md` silently — no prompt, no backup.

- **c93** The repo's skills/README.md defines the current convention: this folder is the source, and each machine carries one installed copy of every member under ~/.agents/skills/, the shared Agent Skills root every agent reads.
  Source: file:/data3/yky/beads-matt-dag/skills/README.md (/data3/yky/beads-matt-dag/skills/README.md:4)
  > carries one installed **copy** of every member under `~/.agents/skills/`

- **c94** The install is a copy of one folder per member, whole: SKILL.md, agents/ and every reference file.
  Source: file:/data3/yky/beads-matt-dag/skills/README.md (/data3/yky/beads-matt-dag/skills/README.md:19)
  > Copy one folder per member, whole: `SKILL.md`, `agents/`, and every reference file.

- **c95** The check that proves the install is diff -rq between every source folder and its installed copy, expected empty; a stale install is invisible to a timestamp look because cp -a preserves the source's mtimes.
  Source: file:/data3/yky/beads-matt-dag/skills/README.md (/data3/yky/beads-matt-dag/skills/README.md:60)
  > A stale install is an installed copy older than this source — someone edited here and did not
re-install. It is invisible by looking: `cp -a` preserves timestamps, so the installed files wear
the source's own mtimes and can read as fresh. The check is how it is noticed — the member stops
printing `identical`, and `diff` prints the differing file or the missing one.

- **c96** The documented bad outcomes of folder-copy into a shared root: a second copy under the same name is silently dead (the first one found wins, and it is not the project's), and a second copy under a new name shadows nothing but leaves two skills for one job.
  Source: file:/data3/yky/beads-matt-dag/skills/README.md (/data3/yky/beads-matt-dag/skills/README.md:80)
  > A second copy under the **same name** is silently dead: with the set installed globally, a
  project that carries its own `to-tickets` never runs — the one pi found first wins, and it is not
  the project's.
- A second copy under a **new name** shadows nothing and is shadowed by nothing: the machine then
  carries two skills for one job, and which one runs depends on the agent's pick

- **c97** A plugin can also be distributed as a zip archive downloaded over HTTPS, so installs work without git or npm on the user's machine.
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, Plugin sources, Zip archives)
  > Zip archives Use archive to distribute a plugin as a zip file that Claude Code downloads over HTTPS, so installs work without git or npm on the user’s machine.

- **c98** A marketplace entry can point a plugin at a relative path inside the marketplace repository (the walkthrough's example source is ./plugins/quality-review-plugin).
  Source: url:https://code.claude.com/docs/en/plugin-marketplaces (Plugin marketplaces, walkthrough marketplace.json)
  > "source": "./plugins/quality-review-plugin",
