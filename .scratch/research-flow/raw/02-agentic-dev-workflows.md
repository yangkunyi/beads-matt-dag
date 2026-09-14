# 02 — How people drive coding agents with a flow today, and what state model each flow uses

Researcher: child `02`. Every claim below carries the URL I actually read. Where a claim comes from a
vendor README or docs page rather than an independent source, it is marked **vendor**. Where I could only
read an abstract or a search-result snippet, it is marked **abstract only**. Anything I could not read is
prefixed `UNVERIFIED:`.

Frozen pack sources are cited as `raw/sources/<file>.md`; all of my new sources are prefixed `02-` and live
in the same directory, each with `SOURCE-URL:` on line 1 so any citation can be re-fetched.

---

## 1. Scope and method

**Axis.** How a coding agent is actually driven end to end — the unit of work, where state lives, what the
loop is, where humans sit, and what is documented as breaking — across (a) spec-driven-development
toolkits, (b) issue trackers used as agent state, (c) orchestrators/harnesses, (d) commercial cloud agents.
I did **not** design or recommend anything; I report what exists and what each thing assumes.

**What I read (counts).** 89 files under `raw/sources/02-*` created for this task, plus 12 files from the
frozen pack (see §1.3). The frozen pack supplied the READMEs for `spec-kit`, `openspec`, `beads`,
`bmad-method`, `ccpm`, `superclaude`, `claude-flow`, `archon`, `openhands`, `swe-agent`, `agent-os` and the
Kiro HTML. I did not read the pack's paper/repo files for MLE-bench, AI-Scientist, PaperQA, Aviary or the
ML/DL evaluation papers — those belong to other children's axes.

**Method.** `curl` only, `--max-time 25`, one fetch per source, cached as a file with a URL header. Discovery
used `api.github.com` (repo trees), `hn.algolia.com` (comment trees via `/api/v1/items/<id>`), vendor
`llms.txt` indexes (Kiro, Cursor, Devin, Tessl, Conductor, OpenHands), and `docs.tessl.io`'s GitBook `?ask=`
endpoint. HTML was converted to text locally (`ft.sh`), which flattens structure — where that mattered I
re-fetched the same page as Markdown (Kiro `.md`, Cursor `.md`, Devin `.md`, Conductor `.md`, OpenHands
`.md`). Each converted file says so in its header.

**Pack files re-read for this axis.** `repo-beads.md`, `repo-spec-kit.md`, `repo-openspec.md`,
`repo-ccpm.md`, `repo-bmad-method.md`, `repo-agent-os.md`, `repo-superclaude.md`, `repo-claude-flow.md`,
`repo-archon.md`, `repo-openhands.md`, `repo-swe-agent.md`, `docs-kiro.md`, plus the HN search JSON files.

**Citation convention.** A markdown link whose text is `02-something` or `repo-something` or `hn-something`
points at the local receipt file `raw/sources/<text>.md`; that file's line 1 carries the exact URL fetched,
line 2 the fetch timestamp, line 3 the HTTP status. 58 such link texts appear below and every one resolves to a
file on disk (checked with `os.path.exists`). URLs are given inline too where the claim is load-bearing enough
to re-read directly.

**Honest limits.**
- No tool was *installed or run*. Every loop below is read from documentation, not from observation. I did
  not reproduce a single flow.
- Vendor docs describe intent; independent evidence about whether the flows work is thin and is concentrated
  in §4 (METR, Stack Overflow, Chroma) — none of it tests a *flow*, only agents, developers, or models.
- `arxiv.org` is unreachable from this machine, so no primary paper text; `reddit.com` unreachable;
  `gitclear.com` and `faros.ai` returned 403; plain search engines return localized junk. I found no forum
  discussion of OpenSpec, Agent OS, or SuperClaude at all.

---

## 2. Comparison table

Legend: **UoW** = unit of work. Sources are the files in `raw/sources/`; the header of each file holds the
exact URL.

### 2.1 Spec-driven-development toolkits (plan artifacts in the repo)

| Flow | Unit of work | State store | Loop | Gates | Where it breaks (read, not inferred) | Source |
|---|---|---|---|---|---|---|
| **GitHub Spec Kit** | One *spec* = one feature/change, branch per spec; artifacts: `constitution` → `specify` → `plan` → `tasks` → `implement` → `converge`; `/speckit.taskstoissues` converts tasks to GitHub issues | Markdown in repo under `specs/` + `.specify/` templates; extensions/presets/bundles resolved at runtime | Repeat `implement` ↔ `converge` until converge reports "Converged"; bug extension = assess→fix→test; assess extension = intake→research→define→shape→decide → go/clarify/kill | Human review at every phase; `clarify`, `analyze`, `checklist` as "unit tests for English" | Reviewer reads *markdown*, not code: "I'd rather review code than all these markdown files"; one 3–5 point feature produced "8 files and 1,300 lines of text"; agent ignored plan notes and regenerated already-existing classes (duplicates); checklists are AI-interpreted so "no 100% guarantee"; a spec branch per spec implies spec lifetime = change request, not feature lifetime; "mostly unusable" on large brownfield codebases | [raw/sources/repo-spec-kit.md](https://raw.githubusercontent.com/github/spec-kit/main/README.md), [02-fowler-sdd-3-tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html), [02-marmelab-sdd-waterfall](https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html) |
| **Kiro specs (AWS)** | A *spec*: `.kiro/specs/<name>/` with `requirements.md` (or `bugfix.md`), `design.md`, `tasks.md` | Markdown in repo; steering files = persistent memory bank; task status inside `tasks.md` | Requirements → Design → Tasks, three phases, each approved; then task execution builds a **dependency graph of tasks and runs waves of independent tasks concurrently**; `Design-First` or `Requirements-First`; `Quick Spec` = all three artifacts, no approval gates | Approval between phases; `Analyze Requirements` (minutes, not seconds) for ambiguity/inconsistency; property-based tests for correctness; `Sync Files` to re-align tasks with changed requirements | Vendor's own FAQ: workflow choice is irreversible per spec ("No, you must choose a workflow when creating the spec"); independent: Kiro turned a small bug into 4 user stories / 16 acceptance criteria, "like using a sledgehammer to crack a nut" | [02-kiro-specs](https://kiro.dev/docs/specs.md), [02-kiro-specs-best-practices](https://kiro.dev/docs/specs/best-practices.md), [02-fowler-sdd-3-tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) |
| **Kiro Crew (agent runtime around it)** | A *task run* from a markdown spec file (`kirocrew run TASK.md`) | Run state in `~/.kiro/crew/tasks/runs.json`; `TASK_PROGRESS.md` next to the spec; git commits per step; worktree per run (`kirocrew/task/…`) | Spec → LLM decomposes → ordered steps → fresh session per step → test → independent reviewer reads `git diff HEAD~1` → commit, or revert + retry | `force_approval: true` steps block "even in YOLO mode"; auto-approve toggle is TTL-bounded (6h window, 24h ceiling); reviewer runs in a *separate session* and is fed the diff, not the self-report | Hard caps exist because the loop runs away otherwise: MAX_RETRIES 3, MAX_REPLAN 2, MAX_TOTAL_TASKS 50, cycle detection "3 identical errors → FAILED", stall watchdog (60 min warn, 2h session reset), "Designed for 10+ hours of unattended operation" | [02-kiro-crew-task-runner](https://kiro.dev/docs/crew/features/task-runner.md) |
| **OpenSpec** | A *change* folder: `openspec/changes/<name>/` with `proposal.md`, `specs/`, `design.md`, `tasks.md`; archived to `changes/archive/<date>-<name>/`; `openspec/specs/` is the accumulating truth | Markdown in the repo (or in a separate "Store" repo, beta, for cross-repo planning) | `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:archive`; OPSX schema (`schema.yaml` + templates) makes artifacts and their dependencies editable | Human agrees spec before code; expanded profile adds `/opsx:verify`; no rigid phase gates by design ("actions, not phases") | Vendor README states its own requirement: "OpenSpec benefits from a clean context window. Clear your context before starting implementation" — the flow assumes manual context hygiene; no independent critique found (see §6) | [raw/sources/repo-openspec.md](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/README.md), [02-openspec-opsx](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/opsx.md) |
| **Tessl** (Framework) | One *spec* per code file, 1:1; code marked `// GENERATED FROM SPEC - DO NOT EDIT` (as of Sept 2025) | Spec files + registry | `tessl document --code <file>` reverse-engineers a spec; `tessl build` generates the code | Spec review replaces code review at the stated ambition (labelled **vendor/position**: "the spec is the main source file … the human never touches the code") | Non-determinism survived even at 1:1 file granularity: "I have seen the non-determinism in action … when I generated code multiple times from the same spec"; compared to MDD's "inflexibility … and non-determinism". **The Framework no longer ships**: CLI v0.50.3 changelog — "The Framework functionality is no longer included"; v0.28.0 is archival, "development is paused". Current Tessl = skill/plugin registry + review + eval + CI gate | [02-fowler-sdd-3-tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html), [02-tessl-ask-framework-status](https://docs.tessl.io/introduction-to-tessl/set-up-tessl.md?ask=Does%20Tessl%20still%20ship%20a%20spec-driven%20development%20framework%20where%20specs%20generate%20code%3F), [02-tessl-gate-ci](https://docs.tessl.io/codifying-and-enforcing-your-skill-standards/gate-skill-quality-in-ci.md) |
| **BMAD-METHOD** (v6-era) | A *change*; sized to the work: small change → Build directly, big idea → Plan, vague notion → Clarify | Repo markdown artifacts (briefs, specs, architecture) carried forward between sessions; skills installed via `npx skills add` / plugin marketplaces | Delivery loop: Clarify → Plan → Build and verify → Learn and adjust → back to Plan; official modules incl. **BMad Loop: "builds, verifies, and retros a whole epic unattended"** | "Right-sized process" chosen by the human; structured workflows with multiple-agent discussions; `bmad doctor` to repair runtime | Practitioner critique aimed at role-per-agent designs of this shape: "You can try to divide agents into lots of different roles that roughly correspond to human job positions, like for example BMad does, or you can simply make each agent do a task … I've gotten much better results with agents that has a specific task to do" | [raw/sources/repo-bmad-method.md](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/README.md), [02-hn-claude-subagents-parallel-thread](https://hn.algolia.com/api/v1/items/45181577) |
| **CCPM (Claude Code PM)** | Task file per GitHub issue; PRD → epic → tasks → sub-issues; **one issue is explicitly not atomic** — one issue is run by 5 agents in streams | `.claude/prds/`, `.claude/epics/<feature>/*.md` (files are "the source of truth") **plus** GitHub issues after an explicit sync; worktree `../epic-<feature>/` | Brainstorm/PRD → epic → decompose (≤10 tasks, `depends_on`, `parallel`, `conflicts_with`) → sync to GitHub (epic issue + sub-issues) → execute with parallel agents → track (bash scripts: status/standup/next/blocked) → merge | Human at PRD/epic/sync/merge; deterministic bash scripts instead of LLM calls for status | Vendor claims are unaudited and self-scored ("eval score 100%", "89% less time lost to context switching", "75% reduction in bug rates"); the tool depends on a third-party `gh-sub-issue` extension and falls back to task lists without it | [raw/sources/repo-ccpm.md](https://raw.githubusercontent.com/automazeio/ccpm/main/README.md) |
| **Agent OS** | A *spec* shaped by "standards" extracted from the codebase; 4 steps: Discover standards → Inject standards → Product planning → Shape Spec | Standards as markdown discovered from the codebase and injected into context; no tracker | Human-run sequence of 4 steps; docs live on the vendor site, not in the repo README | Spec shaping runs "in plan mode" with the human answering shaping questions | Nothing independent found. The GitHub README is a redirect stub to `buildermethods.com` (1790 B) and the site is a marketing workflow page — no reported failure modes | [raw/sources/repo-agent-os.md](https://raw.githubusercontent.com/buildermethods/agent-os/main/README.md), [02-agent-os-site](https://buildermethods.com/agent-os) |
| **SuperClaude** | Loose: a command (`/sc:*`, 30 of them) over a project whose plan state is `PLANNING.md` + `TASK.md` + `KNOWLEDGE.md` | Three markdown files in the repo read at session start | Human-driven slash commands; 20 agents, 7 behavioural modes, 8 MCP servers | Human chooses command; no gate model | README contradicts itself on shipping state: "the TypeScript plugin system described in older documentation is not yet available (planned for v5.0)" while the badge says v4.3.0 | [02-superclaude](https://raw.githubusercontent.com/SuperClaude-Org/SuperClaude_Framework/master/README.md) |
| **claude-flow / Ruflo** | Agent spawn inside a swarm, under a goal | AgentDB + HNSW vector memory, "shared memory + SONA", GOAP state-space plan, 12 background workers | `ruflo init` → router → swarm → agents → memory; GOAP A* planner decomposes goals and replans on failure; queen topologies with consensus (Raft/Byzantine/Gossip) | Consensus protocols internally; "TEAM-GATEWAY-CHECKLIST: before-merge gates … witness manifest entry per merge" | All performance numbers are self-reported with links to the project's own audit doc (e.g. "~1.9x–4.7x faster … recall@10 ~0.99"); no independent evaluation found | [02-claude-flow](https://raw.githubusercontent.com/ruvnet/claude-flow/main/README.md) |

### 2.2 Issue trackers as agent state (native dependency modelling)

| Flow | Unit of work | State store | Loop | Gates | Where it breaks / notes | Source |
|---|---|---|---|---|---|---|
| **beads / `bd`** (the operator's tracker) | An *issue* ("bead") with hash ID, type, priority, labels, metadata; `parent-child` hierarchy for epics (`bd-a3f8.1.1`) | **Dolt** (versioned SQL, cell-level merge, branches) at `.beads/embeddeddolt` or a `dolt sql-server`; sync via `bd dolt push/pull` on `refs/dolt/data`; `.beads/issues.jsonl` is an export, "not the source of truth or a backup" | `bd create` → dependency graph → `bd ready` (issues with no open blockers) → `bd update --claim` (atomic: assignee + in_progress) → `bd close` → blockers released → next ready front | **Gates are issues**: `human`, `timer`, `gh:run`, `gh:pr`, `bead`. A gate blocks its waiters through a normal dependency edge, so "agents never need to poll or spin"; `bd gate check` closes satisfied gates; failed CI / closed-unmerged PR *escalate* and stay open for a human | Documented limits: `timeout` is enforced only for `timer` gates; cross-rig `bead` gates "cannot be checked … resolve these gates manually", and cross-rig await IDs "stay pending forever"; human gates never auto-close; agents must not use `bd edit` (interactive editor); schema-version guard exists because a stale binary produces cryptic SQL failures | [raw/sources/repo-beads.md](https://raw.githubusercontent.com/steveyegge/beads/main/README.md), [02-beads-deps](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/dependencies.md), [02-beads-workflows-gates](https://raw.githubusercontent.com/steveyegge/beads/main/docs/workflows/gates.md), [02-beads-skill-async-gates](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/ASYNC_GATES.md) |
| **beads — agent-facing conventions** | Same issue, but execution hints live in `metadata` | `bd show <id> --json` is the read path; `bd prime` prints workflow context + persistent memories; `bd remember` for memory (explicitly *not* MEMORY.md files) | Recommended session: `bd ready` → claim → work → `bd close` → check what unblocked; `bd doctor` cross-references open issues against `git log` to find **orphaned issues** (committed but never closed) | Quality-gate labels (`needs-review`, `needs-tests`, `breaking-change`); labels also act as a "state cache"; merge slots serialize conflict-prone work (one holder at a time) | Execution metadata keys (`execution_agent_type`, `execution_suggested_model`, `execution_reasoning_effort`, `execution_mode`, `execution_parallel_group`) must be read *before* spawning, because "a running subagent cannot change its model or reasoning effort after launch"; there is no agent registry — assignees are plain strings | [02-beads-agent-instructions](https://raw.githubusercontent.com/steveyegge/beads/main/AGENT_INSTRUCTIONS.md), [02-beads-labels](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/labels.md), [02-beads-multiagent-coordination](https://raw.githubusercontent.com/steveyegge/beads/main/docs/multi-agent/coordination.md), [02-beads-skill-workflows](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/WORKFLOWS.md) |
| **beads — "ready front" model** | Set of issues whose dependencies are all closed (a front, not a phase) | The dependency DAG itself is the execution plan; `bd graph` prints layers (layer 0 = startable, same layer = parallel) | "The dependency DAG IS the execution plan… As issues close, the front advances" | — | Fan-in/fan-out needs one `bd dep add` per edge; `bd swarm` exists for structured epic fan-out | [02-beads-skill-workflows](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/WORKFLOWS.md), [02-beads-deps](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/dependencies.md) |
| **GitHub Issues (native)** | Issue; sub-issue (parent/child, up to 8 nesting levels); dependency ("blocked by" / "blocking") | GitHub (server-side), fields + relationships; CLI: `gh issue create --parent`, `--blocked-by`, `gh issue edit --add-sub-issue`, `gh issue view --json blockedBy,blocking` | Whatever the team runs; GitHub itself runs no loop. Copilot cloud agent **is assignable to an issue like a person** and opens a PR when done | Blocked issues render a "Blocked" icon; PR review is the gate; enterprise metrics exist for "PRs created by Copilot merged" and median time to merge | No "ready" query primitive — determining what is startable is left to the client; dependency creation requires triage permission; sub-issue limits apply | [02-github-subissues](https://raw.githubusercontent.com/github/docs/main/content/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues.md), [02-github-issue-dependencies](https://raw.githubusercontent.com/github/docs/main/content/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies.md), [02-github-copilot-coding-agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent) |
| **Linear** | Issue; parent/sub-issue; relations: blocked/blocking/related/duplicate | Linear service; relations surfaced in the issue sidebar (orange "Blocked by", red "Blocks") | No loop of Linear's own; **agent dispatch is by assignment or @-command** (Cursor/Codex/Devin integrations turn tickets into PRs) | Team-level automations: "parent auto-close when all sub-issues are done", "sub-issue auto-close"; duplicates move to a reserved `Duplicate` status so they are visible as an outcome, not just a link | Sub-issues inherit team/priority/project but *not* labels; once a blocking issue is resolved the relationship "moves under Related" — i.e. resolved-blocker information is not retained as a blocking edge | [02-linear-issue-relations](https://linear.app/docs/issue-relations), [02-linear-subissues](https://linear.app/docs/parent-and-sub-issues), [02-devin-linear](https://docs.devin.ai/integrations/linear.md) |
| **Jira** | "Work item" (formerly issue): epic → story/task/bug → subtask; any work type can be a parent | Jira service | No agent loop; external agents attach via webhook integrations (OpenHands Jira Cloud needs a service account + API token + webhook config; Devin triggers on Jira issue created/updated/label added/status changed/assigned/commented) | Status workflow; `blocks/is blocked by` and `relates` links show dependencies on both work items | Hierarchy above epic is Premium-only; subtasks can only be children | [02-jira-issues-overview](https://www.atlassian.com/software/jira/guides/issues/overview), [02-devin-automations](https://docs.devin.ai/product-guides/automations.md), [02-openhands-event-automations](https://docs.openhands.dev/openhands/usage/automations/event-automations.md) |

### 2.3 Orchestrators and cloud agents

| Flow | Unit of work | State store | Loop | Gates | Where it breaks / notes | Source |
|---|---|---|---|---|---|---|
| **Archon** | A *workflow run* of a YAML DAG under `.archon/workflows/<pack>/<workflow>/` (19 bundled workflows; `archon-drain`-style packs are a first-class pattern) | SQLite/Postgres, 14 core tables (codebases, conversations, sessions, workflow runs, isolation environments, messages, workflow events, node sessions…) | Nodes with `depends_on`; `loop:` nodes with `until:` (e.g. `ALL_TASKS_COMPLETE`, `APPROVED`), `fresh_context: true` to reset a session per iteration; `bash:` nodes are deterministic, non-AI | Deterministic bash validation nodes between AI nodes; `interactive: true` approval loops pause for the human; "workflow_approval_resolved" is a telemetry event, i.e. approvals are modelled as data | Each run gets its own git worktree so 5 fixes run in parallel; the failure surface is operational: telemetry records `workflow_failed`, a categorical failure reason, and the failed node's type. (Local context, not a survey source: this repo's own pack README documents the hazards that appear once a drain is real — a run lock because two drains against one Target corrupt each other, derived blocked-ness recomputed at open because "a change made outside the drain cannot leave a stale answer behind", leftover claims repaired, and an open-time refusal if the graph lets closure cross domains.) | [raw/sources/repo-archon.md](https://raw.githubusercontent.com/coleam00/Archon/main/README.md), `/data3/yky/beads-matt-dag/.archon/workflows/beads-dag/README.md` |
| **Conductor** | A *workspace* = one shippable unit: own branch, worktree, files, terminal, app process, diff, review state, PR | Git branches/worktrees (macOS app and/or Conductor Cloud); notes/handoffs in a gitignored `.context` folder | "Break down the problem → **create one workspace per shippable unit** → run agents independently → verify/review/resolve conflicts → open PR, merge, archive"; workspaces are created *from* a GitHub/Linear issue, PR, or branch | Diff Viewer (Cmd+Shift+D) for manual review; `Review` action for an agent review; **Checks tab** aggregates git status, PR metadata, CI/status checks, deployments, GitHub/review comments, todos — "treat unresolved comments, failing checks, and open todos as blockers until you intentionally clear them" | Docs are explicit that isolation is not a boundary: "Workspace isolation is development isolation, not a security boundary … agents and commands still run on your Mac with your user permissions"; a new worktree "starts from tracked files", so `.env.local`, certs and other gitignored files do **not** come along | [02-conductor-workflow](https://conductor.build/docs/concepts/workflow.md), [02-conductor-issue-to-pr](https://conductor.build/docs/guides/issue-to-pr.md), [02-conductor-review-merge](https://conductor.build/docs/guides/review-and-merge.md), [02-conductor-git-worktrees](https://conductor.build/docs/concepts/git-worktrees.md) |
| **OpenHands Agent Canvas** | A conversation/session; automations create them; one Agent Server per host/port, several servers per Canvas | OpenHands server(s) + Automation Server; workspace/session state server-side; `~/.openhands` mount for local Docker | Automations decide *when* work runs and dispatch conversations to the Agent Server/SDK, which decides *what* runs; scheduled (cron) or event-based | None inherent; prebuilt automations (GitHub repo monitor, Slack channel monitor) and "automatically decomposing GitHub issues into tasks" | Vendor docs name the exact silent-failure mode: if the GitHub org is not **claimed** by a team org, "automations will appear to work (manual triggers succeed) but GitHub events will silently never arrive"; each GitHub org can be claimed by only one OpenHands team org | [raw/sources/repo-openhands.md](https://raw.githubusercontent.com/All-Hands-AI/OpenHands/main/README.md), [02-openhands-event-automations](https://docs.openhands.dev/openhands/usage/automations/event-automations.md), [02-openhands-automations-overview](https://docs.openhands.dev/openhands/usage/automations/overview.md) |
| **SWE-agent / mini-SWE-agent** | One task instance run in a container (a repo + an issue); batch mode runs a dataset | Trajectory files per instance; no tracker, no cross-task state | Single agent loop: action → observation → repeat, per task; "Made for research: simple & hackable" | None — success is the benchmark's tests/grader | SWE-agent's own README: "Most of our current development effort is on mini-swe-agent, which has superseded SWE-agent… Our general recommendation is to use mini-SWE-agent instead"; the scaffold itself was measured not to beat METR's simpler scaffold (see §4) | [raw/sources/repo-swe-agent.md](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md), [02-mini-swe-agent](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md), [02-metr-time-horizon-claude-codex](https://metr.org/notes/2026-02-13-measuring-time-horizon-using-claude-code-and-codex/) |
| **Devin** | A *session*; large changes are split into **stacked PRs**; many sessions can be orchestrated by a script | Cognition cloud (or self-hosted "Outposts"); knowledge + playbooks + skills (`SKILL.md` in repos) are shared across sessions; **Dynamic Workflows** are deterministic Python scripts that fan out sessions, pipe structured results between stages, and resume where they stopped | Session: plan → implement → PR → respond to review comments; automations = Trigger + Conditions + Action where Action ∈ {start session, message an existing session, triage agent that spawns child sub-devins} | PR review; Devin Review as a product; automations fire on label conditions ("only fire when the label is `bug`") | Vendor warning about the dispatch surface as an attack surface: GitHub automations default to private repos only because public repos "carry a higher prompt-injection risk"; `playbooks`, `sessions`, and automations are all org-level state that must be curated | [02-devin-automations](https://docs.devin.ai/product-guides/automations.md), [02-devin-dynamic-workflows](https://docs.devin.ai/work-with-devin/dynamic-workflows.md), [02-devin-stacked-prs](https://docs.devin.ai/work-with-devin/stacked-prs.md) |
| **Codex cloud** | A cloud *task/chat* in a configured environment for a repo | OpenAI cloud + the repo's own branch/PR; environment definitions (deps, tools, env vars, secrets, internet access) are the durable part | Delegate → runs in background → review summary + diff → either request follow-up or open a PR | Human reviews diff before PR; "Review before you merge" | Docs frame environment setup as the main lever and warn implicitly that an agent that "can't run tests, query services, or reach APIs cannot close the loop on its work"; no loop-control primitives documented beyond parallel tasks | [02-codex-cloud-md](https://developers.openai.com/codex/cloud.md) |
| **Cursor cloud agents** | An agent task in an isolated cloud VM with a full dev environment (multi-repo supported) | Cursor cloud + repo branch/PR; `.cursor/environment.json` (Dockerfile or snapshot) defines the environment; local parallel work uses git worktrees | Dispatch → agent works on a separate branch → **pushes changes to your repo for handoff**; you review then PR | PR review; "agent review" action locally | Docs' own framing: "Not setting up a development environment for your cloud agents is like not giving your engineers a computer" — i.e. the loop only closes if the environment can run the software; multi-repo environments cannot run long tasks yet | [02-cursor-cloud-agent](https://cursor.com/docs/cloud-agent.md), [02-cursor-worktrees](https://cursor.com/docs/configuration/worktrees.md), [02-cursor-automations](https://cursor.com/docs/cloud-agent/automations.md) |
| **claude-code-action (GitHub)** | A GitHub issue or PR comment (mentions, assignment) | GitHub | Action "intelligently detects when to activate based on your workflow context — whether responding to @claude mentions, issue assignments, or executing automation tasks with explicit prompts"; runs on your own runner | Human remains the reviewer on the PR; progress shown as checkboxes on the comment | No dependency model at all: it is a reaction function on GitHub events | [02-claude-code-action](https://raw.githubusercontent.com/anthropics/claude-code-action/main/README.md) |

---

## 3. Per-flow notes

### 3.1 beads/bd — the operator's tracker, read closely

**Data model.** A bead is a row: hash ID (`bd-a1b2`, collision-free across clones), issue type, priority
P0–P4, status (`open`, `in_progress`, `blocked`, `closed`, `deferred`), labels, free-form `metadata`,
description/design/notes/acceptance fields, plus a comment thread and an event audit trail. Hierarchy is
ID-encoded for epics (`bd-a3f8` → `bd-a3f8.1` → `bd-a3f8.1.1`). Issue *types* include `task`, `bug`,
`epic`, `gate`, and a `message` type with threading.
[raw/sources/repo-beads.md](https://raw.githubusercontent.com/steveyegge/beads/main/README.md),
[02-beads-issues](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/issues.md)

**Dependencies.** Blocking types affect `bd ready`: `blocks` (default), `parent-child`,
`conditional-blocks` (B runs only if A fails), `waits-for` (fan-in on all of A's children). Non-blocking
graph annotations: `related`, `tracks`, `discovered-from`, `caused-by`, `validates`, `supersedes`. Cycles are
rejected at write time, and `bd dep cycles` exists as a check. Cross-repo dependencies are possible via
`external:<project>:<capability>`, resolved at query time; "an unconfigured or unavailable project remains
blocking."
[02-beads-deps](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/dependencies.md)

**Gates.** The important design fact: *a gate is not a field on an issue, it is an issue*. It blocks its
waiters through an ordinary dependency edge, and it closes either manually (`bd gate resolve`) or by
`bd gate check` (timer elapsed, `gh:run` completed+success, `gh:pr` MERGED, `bead` closed). Failed CI runs
and closed-unmerged PRs **escalate** — the gate stays open and a human decides. Human gates never
auto-resolve. The documented motivation is explicitly about the decoupling of issue state from code state:
with Dolt, "closing a beads issue means 'work is done' but the code may still be on a feature branch,
waiting for PR review", so the wait is modelled as a wait *on the external condition*, not on the issue.
[02-beads-workflows-gates](https://raw.githubusercontent.com/steveyegge/beads/main/docs/workflows/gates.md),
[02-beads-deps](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/dependencies.md)

**Formulas / molecules / wisps.** Gates can be declared inside a TOML "formula" step (`[steps.gate]` with
`type`, `id`, `await_id`, `timeout`, `repo`); instantiating the formula creates the gate issue and wires it
as a blocker. Steps can fan in with `needs = [...]` or on dynamically-created children with
`waits_for = "all-children"`. Gates created ad hoc are "wisps" — ephemeral, not synced.
[02-beads-workflows-gates](https://raw.githubusercontent.com/steveyegge/beads/main/docs/workflows/gates.md),
[02-beads-skill-async-gates](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/ASYNC_GATES.md)

**Worktrees.** `bd worktree create .worktrees/<name> --branch feature/<name>`; linked worktrees share the
repo's `.beads/` workspace through Git common-directory discovery, so issue state is shared, not copied.
Issue data lives under `refs/dolt/data`, so protected-branch setups need no special branch.
[02-beads-skill-worktrees](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/WORKTREES.md)

**The flow beads itself documents for agents.** `bd prime` (workflow context + project memories) →
`bd ready` → `bd update --claim` → work → `bd close --reason` → `bd dolt push`. Multiple agents coordinate by
atomic claim (`bd ready --claim --json` is preferred over assignment when agents self-select), comments as
handoff notes, labels as status, and **merge slots** to serialize conflict-prone work.
[raw/sources/repo-beads.md](https://raw.githubusercontent.com/steveyegge/beads/main/README.md),
[02-beads-multiagent-coordination](https://raw.githubusercontent.com/steveyegge/beads/main/docs/multi-agent/coordination.md)

**What beads assumes.** (i) An agent process can be killed and restarted without losing the plan, so the
plan must be durable and queryable — hence a database, not chat. (ii) "Ready" is derivable, so no one has to
hand-assign work. (iii) The *external world* (CI, PR, human) is part of the dependency graph, so the graph
must be able to wait on things that are not issues. (iv) Concurrency is the normal case (hash IDs, atomic
claims, merge slots, cell-level merge). (v) Long histories must be compactable: "Semantic 'memory decay'
summarizes old closed tasks to save context window."

### 3.2 GitHub Spec Kit

Five core slash commands + `converge`; the loop is explicitly "Repeat steps 4 and 5 until `/speckit-converge`
reports **Converged**". Two bundled opt-in extensions matter for adjacent work: `bug` (assess → fix → test,
"each fix scoped, evidence-based") and `assess` (intake → research → define → shape → decide → **go /
needs-clarification / kill**), which is a research-shaped flow shipped inside a coding-agent toolkit:
"Good ideas deserve evidence before commitment, whether or not they become software."
Extensions/presets/bundles resolve by priority (project override > preset > extension > core), and templates
resolve at runtime while commands are written at install time. The project dogfoods itself but
"intentionally gitignores" `.specify/`, `specs/`, `.github/agents/` and `.github/prompts/` — the generated
artifacts are not part of their repo history.
[raw/sources/repo-spec-kit.md](https://raw.githubusercontent.com/github/spec-kit/main/README.md)

### 3.3 Kiro (specs) and Kiro Crew (the runtime)

Kiro is the most mechanised of the spec toolkits: task execution builds a **task dependency graph** and runs
independent tasks as concurrent *waves*, wave N+1 after wave N. It also ships `Analyze Requirements`
(ambiguity/inconsistency/gap analysis, "minutes not seconds") and property-based testing for the "unchanged
behaviour" clauses of a bugfix spec. Kiro Crew is the piece that turns a spec file into an unattended run:
decompose → per-step fresh session → test → **independent reviewer session reading the actual diff** →
commit or revert-and-retry, with per-step commits and a `git worktree` per task. The caps and watchdogs in
§2.1 are the honest part of the design: the loop is bounded (3 retries, 2 replans, 50 tasks), detects
repetition ("3 identical errors → FAILED"), and treats a silent step as a fault (60 min warning, 2h session
reset). State is on disk (`runs.json`, `TASK_PROGRESS.md`) and pause/resume is explicit.
[02-kiro-specs](https://kiro.dev/docs/specs.md),
[02-kiro-crew-task-runner](https://kiro.dev/docs/crew/features/task-runner.md),
[02-kiro-crew-subagents](https://kiro.dev/docs/crew/features/subagents.md)

### 3.4 OpenSpec

The distinguishing choice is *no phase gates*: "Actions, not phases — create, implement, update, archive — do
any of them anytime"; artifact dependencies "show what's possible, not what's required next". Artifacts are
plain markdown (requirements with WHEN/THEN scenarios), and OPSX moves the workflow definition itself into
`schema.yaml` + templates so a team can define its own artifacts and dependencies without waiting for a
release. OpenSpec also has a cross-repo mode ("Stores", beta) where planning lives in a repo of its own and
code repos read it — the same shape the specs propose for design docs elsewhere.
[raw/sources/repo-openspec.md](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/README.md),
[02-openspec-opsx](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/opsx.md)

### 3.5 Tessl

Read as a *history* rather than a live flow: the SDD framework existed (spec-as-source, 1:1 spec→file,
`// GENERATED FROM SPEC - DO NOT EDIT`), and it has been removed as an active product ("as of v0.50.3, 'The
Framework functionality is no longer included'"). What replaced it is governance around *agent context*:
skills/plugins are versioned artifacts, `review` scores how well a skill is written, `eval` measures "the
score difference to see whether a skill actually changes what an agent produces", and CI can fail a build
when a skill scores below a threshold. That is a gate on agent *instructions*, not on agent *output*.
[02-fowler-sdd-3-tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html),
[02-tessl-ask-framework-status](https://docs.tessl.io/introduction-to-tessl/set-up-tessl.md?ask=Does%20Tessl%20still%20ship%20a%20spec-driven%20development%20framework%20where%20specs%20generate%20code%3F),
[02-tessl-eval](https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios.md)

### 3.6 BMAD, CCPM, Agent OS, SuperClaude, claude-flow

These five are best read as five different answers to "where does durable context live":
- **BMAD**: in artifacts carried forward through a sizing-dependent loop (a `bmad` hub skill decides how much
  process the change needs); an official module runs a whole epic unattended.
  [raw/sources/repo-bmad-method.md](https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/README.md)
- **CCPM**: in a local mirror of the GitHub issue tree (`.claude/epics/…`) that is explicitly *synced* to
  GitHub, with a mapping file so file `1234.md` = issue #1234; deterministic bash scripts do status.
  [raw/sources/repo-ccpm.md](https://raw.githubusercontent.com/automazeio/ccpm/main/README.md)
- **Agent OS**: in *standards* extracted from the codebase and injected on demand; the spec is then shaped
  against those standards. [02-agent-os-site](https://buildermethods.com/agent-os)
- **SuperClaude**: in three named project files (`PLANNING.md`, `TASK.md`, `KNOWLEDGE.md`) that the agent is
  told to read at session start. [02-superclaude](https://raw.githubusercontent.com/SuperClaude-Org/SuperClaude_Framework/master/README.md)
- **claude-flow/Ruflo**: in a vector database plus planner state, i.e. the context is *retrieved*, not
  written down for a human. [02-claude-flow](https://raw.githubusercontent.com/ruvnet/claude-flow/main/README.md)

### 3.7 Archon, Conductor, OpenHands — three orchestrator shapes

- **Archon** makes the *process* the artifact: a committed YAML DAG with loop nodes, deterministic bash
  nodes, and interactive approval nodes; runs are recorded in a relational DB; each run is isolated in a git
  worktree; the same workflow can be triggered from CLI, web, Slack, Telegram or GitHub webhooks. Its
  argument is explicitly about variability: "When you ask an AI agent to 'fix this bug', what happens depends
  on the model's mood … The workflow defines the phases, validation gates, and artifacts."
  [raw/sources/repo-archon.md](https://raw.githubusercontent.com/coleam00/Archon/main/README.md)
- **Conductor** makes the *workspace* the artifact: one shippable unit = one worktree + branch + app process +
  diff + PR; the review surface is a diff viewer plus an aggregated "Checks" tab where unresolved comments,
  failing checks and open todos are explicitly blockers; local work is parallel because each workspace has
  its own checkout. [02-conductor-review-merge](https://conductor.build/docs/guides/review-and-merge.md)
- **OpenHands** makes *dispatch* the artifact: automations (cron or event) decide when work starts and the
  agent server decides what runs, with GitHub/Slack monitors prebuilt and a documented silent-failure mode
  when routing is unclaimed. [02-openhands-event-automations](https://docs.openhands.dev/openhands/usage/automations/event-automations.md)

### 3.8 Cloud agents (Devin, Codex, Cursor) — the state is "a branch and a PR"

All three put the working copy in a VM, hand back a branch/PR, and treat the human diff review as the
gate. They differ in dispatch: Devin's automations are an explicit Trigger + Conditions + Action model
(labels are first-class conditions; an action can be "message an existing session" rather than starting a
new one, which is how a long-lived triage agent stays warm); Cursor dispatches from eight surfaces including
`@cursor` comments in GitHub/Linear; Codex dispatches from web/GitHub/GitLab/Linear/Slack. Devin additionally
ships *stacked PRs* as the answer to large changes — i.e. the flow's answer to PR sprawl is to make the
sprawl ordered rather than to reduce it.
[02-devin-automations](https://docs.devin.ai/product-guides/automations.md),
[02-devin-stacked-prs](https://docs.devin.ai/work-with-devin/stacked-prs.md),
[02-cursor-cloud-agent](https://cursor.com/docs/cloud-agent.md),
[02-codex-cloud-md](https://developers.openai.com/codex/cloud.md)

### 3.9 Trackers: what native dependency modelling gives you (and does not)

GitHub and Linear both model parent/child *and* blocking, which is exactly the pair beads separates into
`parent-child` and `blocks`; both also treat "blocked" as a derived fact you can display (a blocked icon in
GitHub, an orange/red flag in Linear) but neither exposes a "ready frontier" query. Jira's model is
hierarchy-first (epic → story/task/bug → subtask, any type can parent) with `blocks/is blocked by` links.
None of the three has a *gate* concept — a first-class object representing "waiting on the outside world" —
which is the specific hole beads fills with gate issues.
[02-github-issue-dependencies](https://raw.githubusercontent.com/github/docs/main/content/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies.md),
[02-linear-issue-relations](https://linear.app/docs/issue-relations),
[02-jira-issues-overview](https://www.atlassian.com/software/jira/guides/issues/overview)

### 3.10 Dispatch: how an agent actually gets woken

Collected from the sources above, the concrete mechanisms in use:

| Mechanism | Used by | Notes |
|---|---|---|
| **Atomic claim from a ready queue** | beads (`bd ready --claim`), and the Fleet practitioner loop (§4) | preferred over assignment because it is idempotent and race-free |
| **Assignment** | GitHub (assign issue to Copilot as an assignee), Linear (assign to a coding agent), Jira (assign to Devin) | the tracker's own assignee field is the queue |
| **Mention / comment command** | `@claude` (claude-code-action), `@cursor`, `/devin`, `@tessl-code-review` | cheapest to wire, no state model |
| **Webhook / event trigger** | Archon (GitHub webhooks), OpenHands (GitHub events, custom webhooks), Devin (7 trigger sources) | Devin models it as Trigger + Conditions + Action |
| **Label / status condition** | Devin ("only fire when the label is `bug`"), beads quality-gate labels, Linear status automations | the operator's "gate label marks what may start" is a *policy* on top of a ready frontier, not something these trackers provide natively |
| **Schedule (cron)** | `bd gate check` on cron/CI, OpenHands scheduled automations, Devin schedules, Kiro Crew cron | the only mechanism that reliably closes timer gates and picks up merged PRs without a human |
| **Polling by the agent itself** | explicitly designed *out* of beads: a gate "blocks a step the same way any blocker does — the step leaves the ready frontier until the gate closes — so agents never need to poll or spin" | |

### 3.11 The "one PR per issue plus a git worktree" pattern, as it appears across sources

This is the single most-repeated mechanical pattern in the whole corpus, and it appears in four different
roles:

1. **As isolation for parallel agents** — Conductor creates one worktree per workspace and says the workspace
   "is the unit of delegation. The branch and pull request are the unit of integration"
   ([02-conductor-workflow](https://conductor.build/docs/concepts/workflow.md)); Kiro Crew puts each task on its
   own `kirocrew/task/` branch "in a worktree if a repo exists", commits per passed step, and
   `git reset --hard HEAD~1` on a failed review
   ([02-kiro-crew-task-runner](https://kiro.dev/docs/crew/features/task-runner.md)); the beads docs ship worktree
   guidance as a first-class feature and note that linked worktrees *share* the `.beads/` store
   ([02-beads-skill-worktrees](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/WORKTREES.md));
   CCPM "sets up a dedicated worktree (`../epic-notification-system/`)" during its GitHub sync step
   ([raw/sources/repo-ccpm.md](https://raw.githubusercontent.com/automazeio/ccpm/main/README.md)); Archon gives
   "every workflow run … its own git worktree" so five fixes run in parallel
   ([raw/sources/repo-archon.md](https://raw.githubusercontent.com/coleam00/Archon/main/README.md)); Cursor
   documents worktrees for local parallel agents ([02-cursor-worktrees](https://cursor.com/docs/configuration/worktrees.md)).
2. **As the merge unit for the practitioner drain in §4.2** — worker claims a bead → implements in a worktree →
   "the next worker, spawned automatically, validates the task is done, tests it, merges the worktree, closes
   the ticket and creates another one for a fix if required"
   ([02-hn-48520757](https://hn.algolia.com/api/v1/items/48520757)).
3. **As the review unit** — the workspace/PR carries the diff, the comments, the checks, and the archive action,
   and Conductor's guidance is to treat unresolved comments, failing checks and open todos as blockers
   ([02-conductor-review-merge](https://conductor.build/docs/guides/review-and-merge.md)).
4. **As the thing that breaks scale** — Devin's answer to a change too large for one PR is *stacked* PRs
   ([02-devin-stacked-prs](https://docs.devin.ai/work-with-devin/stacked-prs.md)), and the objections in §4.2 are
   about the volume of PRs and diffs a reviewer must absorb, not about worktrees themselves.

Two assumptions the pattern carries and that the sources surface rather than solve: a fresh worktree starts
from **tracked** files only (Conductor: `.env.local`, local certs and other gitignored files do not come along —
so every flow needs a setup step per worktree), and worktrees give *filesystem* isolation, not a security
boundary (Conductor states this explicitly).

---

## 4. Practitioner reports (labelled anecdotes) and independent evaluation

### 4.1 Independent evaluation (not vendor claims)

- **METR RCT, early-2025 tools (n=16 experienced OSS devs, 246 real issues):** developers allowed to use AI
  took **19% longer**, while *expecting* a 24% speedup and believing afterwards they had been sped up by 20%.
  The authors explicitly disclaim generality. METR has since published newer data and states the July-2025
  results "no longer reflect the current impact of AI models".
  [02-metr-devtools-rct](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- **METR, March 2026 — the review gate is not the benchmark gate:** four active maintainers from 3 SWE-bench
  Verified repos reviewed 296 AI-generated PRs that *passed the automated grader*; maintainer merge decisions
  ran about **24 percentage points below** the automated grader, i.e. roughly half of test-passing PRs would
  not be merged into main. Reviewers were blinded to human-vs-AI authorship, and results were normalised by a
  golden baseline of 47 real human PRs (68%) to control for reviewer noise. Caveat the authors state: agents
  get one shot, with no chance to iterate on feedback as a human would.
  [02-metr-swebench-prs](https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/)
- **METR, February 2026 — specialised scaffolds:** neither Claude Code nor Codex outperformed METR's own
  (simpler) ReAct/Triframe scaffolds on time-horizon measurements, despite being more elaborately prompted
  and explicitly optimised for their models. Relevant to any flow that assumes harness sophistication is the
  bottleneck. [02-metr-time-horizon-claude-codex](https://metr.org/notes/2026-02-13-measuring-time-horizon-using-claude-code-and-codex/)
- **Chroma, "Context Rot" (18 LLMs evaluated, incl. GPT-4.1, Claude 4, Gemini 2.5, Qwen3; "not all 18 models
  are included in each experiment"):** "models do not use their context uniformly; instead, their performance
  grows increasingly unreliable as input length grows"; *distractors* (topically related but non-answering
  content) have non-uniform impact; and models "perform better on shuffled haystacks than on logically
  structured ones", i.e. haystack structure itself changes results. This is the empirical backing for the
  "context rot" complaint practitioners make about long-lived agent sessions. I read the report page, not the
  paper; no peer review established.
  [02-chroma-context-rot](https://research.trychroma.com/context-rot)
- **Stack Overflow 2025 developer survey (self-reported; the fetched section does not state the sample size):** positive sentiment toward AI tools fell from 70%+ to 60%;
  **46% distrust** AI accuracy vs 33% who trust it (only 3% "highly trust"; experienced devs most cautious at
  2.6% highly-trust / 20% highly-distrust); the top frustration (66%) is "AI solutions that are almost right,
  but not quite", and the second (45%) is "debugging AI-generated code is more time-consuming"; only 17% say
  agents improved team collaboration, the lowest-rated impact.
  [02-stackoverflow-2025-ai](https://survey.stackoverflow.co/2025/ai) — also: 84% use or plan to use AI tools
  (up from 76%), 51% of professional developers use them daily, and 72% say they are not vibe coding.
- **DORA 2025** — I could only read the landing/abstract level: "AI's primary role is as an amplifier,
  magnifying an organization's existing strengths and weaknesses", returns depend on the organisational
  system rather than the tools. The report body itself was not reachable in text form from this machine.
  [02-dora-2025](https://dora.dev/research/2025/dora-report/)
- **Blocked, therefore unreported:** GitClear's code-quality research and Faros AI's engineering report both
  returned HTTP 403 from this machine. **UNVERIFIED:** their headline numbers, which I have seen quoted but
  could not read source-side, and I will not repeat them here.

### 4.2 Practitioner reports from HN (anecdotes, labelled as such)

All from flattened Algolia comment trees (`api/v1/items/<id>`), so quotes are verbatim from the API payload.

- **"Running 3 coding agents non-stop … Here is how" (Show HN, 3 days of operation).** A working drain over
  *beads*: headless mode (`claude -p`, `codex exec`) + an `ask_human` tool + **beads as the task queue**
  ("Beads helps prevent multiple tasks from being claimed by >1 worker") + per-task artifact directory
  (plan/status/knowledge/events.jsonl/stderr) so a restarted worker resumes + **git worktree per worker** +
  "an infinite loop constantly checking beads / config and triggering new workers". The next worker validates
  the task, tests it, **merges the worktree, closes the ticket and creates another one for a fix if
  required**. Cost finding: "3 coding agents can burn the Claude $200 subscription limit in 30 minutes";
  mitigated by a strong model for design/tickets, a local model as worker, a stronger model to validate.
  [02-hn-48520757](https://hn.algolia.com/api/v1/items/48520757)
- **Review burden.** "Because they output so much code. It's a wall. Using a coding agent can make your
  entire work day turn into doing nothing but code reviews. I.e. the least fun part: constant review of a
  junior dev that's on the brink of failing their probation period with random strokes of genius."
  [02-hn-claude-subagents-parallel-thread](https://hn.algolia.com/api/v1/items/45181577)
- **A drive-by agent on someone else's repo.** "Saw an initial PR come in, left some comments, more commits
  came in, tried it out, looked deeper at the code and realized it was garbage … the account is running
  around doing this with dozens of rejected PRs across many varied projects."
  [02-hn-46024884](https://hn.algolia.com/api/v1/items/46024884)
- **Subagents fail on brownfield, work on greenfield.** "Subagents SEEM good when you use them on greenfield
  projects … But when you have a complex project that handoff is the kiss of death." The same thread contains
  a cost blow-up anecdote: one fan-out into >40 subagents "re-read the script" each, "cost-wise (and
  speed-wise!) it was mayhem".
  [02-hn-claude-subagents-parallel-thread](https://hn.algolia.com/api/v1/items/45181577)
- **Task-shaped, not role-shaped, agents.** "For code review, I don't use a code reviewer agent, instead I've
  defined a dozen code reviewing tasks, that each runs as separate agents" — the same commenter argues this
  generalises against role-per-agent frameworks. And separately, a practitioner who automated a
  deterministic orchestration script: "one role for analyzing the problem and coming up with a high-level
  plan, and then another role for breaking that plan down into very small atomic steps … I can automate this
  with a small orchestration script (that does not depend on an LLM and is completely deterministic) … I can
  go to bed in the evening and launch it and wake up to a long list of commits."
  [02-hn-claude-subagents-parallel-thread](https://hn.algolia.com/api/v1/items/45181577)
- **The beads announcement thread (111 pts, 68 comments) — including a hybrid that merges two flows.** One
  practitioner: "I've been trying beads out for some projects, in tandem with [spec-kit] with pretty good
  results. **I set up spec-kit first, then updated its templates to tell it to use beads to track features** and
  all that instead of writing markdown files." Another, in the same thread: "it doesn't compete with gh issues
  as much as it competes with markdown specs. It's helpful for getting Claude code to work with tasks that will
  span multiple context windows." A third ran beads against spec-kit's premise: "I tell the agent the problem,
  ask them to write a set of tasks using beads, it creates the tasks and it creates the 'depends on' tree
  structure. Then I tell it to work on one task at a time and **require my review before continuing**." The
  counter-case in the same thread is the simplest possible state store: "[Claude Code's] TODO tool … seemed
  such a banal solution … but it works so well and allows even much smaller models to do well on long horizon
  tasks." [02-hn-beads-memory-upgrade](https://hn.algolia.com/api/v1/items/46075616)
- **The beads replacement thread (84 pts, 52 comments) — the strongest criticism of beads found.** The author
  ran coding agents for ~6 months, called beads "a massive unlock", then: "Beads grew massively in a short
  time and every release made it slower and more frustrating to use. I started battling it several times a
  week as its background daemon took to syncing the wrong things at the wrong times." He replaced it with a
  single bash script storing flat markdown, keeping only "the core concept I actually cared about (graph-based
  task dependencies)". Other commenters: "why not just use github issues?"; a maintainer-adjacent reply notes
  `git notes` lack merge logic; another notes the risk of *stale tickets* consuming agent tokens and asks for
  pruning ("move them to `.tickets-done` so if the agent is searching under `.tickets` it won't see them");
  another reports beads agents creating tickets in the wrong directory and landing in a global
  `~/.beads/default.db`. A parallel question in the same thread — "do they all work on the same files at the same
  time? won't that create a terrible mess? or do you like check out the codebase 8 times into separate
  directories and do a complicated PR flow type thing?" — drew the answer "git worktrees", against the
  alternative of several agents in one directory announcing which files they are editing (mcp_agent_mail).
  [02-hn-replaced-beads-markdown](https://hn.algolia.com/api/v1/items/46487580)
- **SDD criticism thread (191 comments under "Spec-Driven Development: The Waterfall Strikes Back").**
  Representative positions: "It wasn't the spec — it was the inability to change the spec"; "as soon as you
  want quick changes you have to abandon the spec"; "the best way to stay in control are small, iterative
  steps". Counter-position from a practitioner who does use specs: treat the spec as "a context entrypoint
  for LLMs", keep it updated as the code changes, and "now you are in agile again". A second camp argues the
  grounding should be *tests* rather than prose: "Once specs are captured as tests, the LLM can no longer
  hallucinate", with the immediate rebuttal "Except when it decides to remove all the tests, change their
  meaning to make them pass".
  [02-hn-sdd-waterfall-thread](https://hn.algolia.com/api/v1/items/45935763)
- **Verified SDD (VSDD) thread (118 comments).** The premise — attach verification steps to each spec
  assertion — attracted the expected objection that verification is where the cost is.
  [02-hn-vsdd-thread](https://hn.algolia.com/api/v1/items/47197595)
- **Fowler/Kiro/Spec-Kit/Tessl discussion (32 comments)** is worth reading alongside the article for the
  practitioner split on whether the markdown *is* the value or the ceremony.
  [02-hn-fowler-sdd-kiron-spec-kit-tessl-thread](https://hn.algolia.com/api/v1/items/45610996)

---

## 5. Three design disagreements

These are the live disagreements in the sources, stated as disagreements. None of them is settled by the
material I read.

**(1) Where the plan lives: a spec corpus, a tracker graph, or a workflow file.**
The spec toolkits put the plan in long-form markdown artifacts in the code repo (Spec Kit, Kiro, OpenSpec,
BMAD, Agent OS). The tracker family puts it in a queryable graph with statuses and a derived "ready" set
(beads; GitHub/Linear/Jira to a lesser degree). The orchestrators put the *process* in a committed file
(Archon's YAML; Kiro Crew's spec file; Devin's Dynamic Workflows are a script) and keep run state in a
database. The disagreement is about what must be *diffable in review* (markdown), what must be *queryable at
run time* (graph), and what must be *deterministic* (workflow file). Fowler's review of the markdown approach
finds the artifacts repeating each other and the existing code, and marmelab counts "8 files and 1,300 lines"
for one small UI change; beads' own docs argue that with Dolt the issue state is *decoupled* from code state,
which is exactly why gate issues had to be invented. OpenSpec's bet is that the artifacts should be
schema-driven so the *workflow itself* is editable — which is a third position again.
[02-fowler-sdd-3-tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html),
[02-marmelab-sdd-waterfall](https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html),
[02-beads-deps](https://raw.githubusercontent.com/steveyegge/beads/main/docs/core-concepts/dependencies.md),
[02-openspec-opsx](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/opsx.md)

**(2) A fixed pipeline with gates, or a claimable frontier with a policy.**
Kiro, Spec Kit, BMAD and Archon run an ordered pipeline (requirements → design → tasks → implement) with
approval points. beads and Kiro's task-wave scheduler instead compute what is *currently* startable from a
dependency structure. The two models disagree about what a "phase" is: for the pipeline camp a phase is a
checkpoint a human signs; for the frontier camp a phase is an emergent layer of the graph, and the human's
only structural lever is the edges plus a label policy. beads' docs are explicit that adding a gate is how
you express "wait for the outside world", and that gates close on external facts (PR merged, CI green, timer
elapsed) rather than on a person clicking next — except for `human` gates, which only a person can close.
Both Kiro's wave scheduler and beads' ready front agree on the operative idea (the DAG *is* the execution
plan); they disagree on whether the plan is a document that gets read or a graph that gets queried.
[02-kiro-specs](https://kiro.dev/docs/specs.md),
[02-beads-skill-workflows](https://raw.githubusercontent.com/steveyegge/beads/main/plugins/beads/skills/beads/resources/WORKFLOWS.md),
[02-beads-workflows-gates](https://raw.githubusercontent.com/steveyegge/beads/main/docs/workflows/gates.md)

**(3) Whether review is a gate the agent waits on, or a workstation the human goes to.**
The tracker/orchestrator systems treat review as *state the agent observes*: a `gh:pr` gate that keeps the
next issue out of the ready set; a Conductor Checks tab where "unresolved comments, failing checks, and open
todos" are blockers; a PR assignment in GitHub; an Escalation event when CI fails. The spec toolkits treat
review as *a document the human reads before the agent proceeds*. The evidence I could actually read supports
neither as free: METR's maintainer study shows the human review gate rejects about half of what the automated
grader called correct, and the HN reports describe review as the bottleneck that the tooling itself makes
worse ("a wall"; "your entire work day turn into doing nothing but code reviews"; a stranger's agent
"running around doing this with dozens of rejected PRs"). The disagreement is whether the answer is to
*automate the gate* (independent reviewer sessions reading the diff, as Kiro Crew does; Tessl review/eval
gates on instructions) or to *shrink what crosses it* (stacked PRs, one shippable unit per workspace,
small steps).
[02-metr-swebench-prs](https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/),
[02-conductor-review-merge](https://conductor.build/docs/guides/review-and-merge.md),
[02-kiro-crew-task-runner](https://kiro.dev/docs/crew/features/task-runner.md)

---

## 6. Could not verify / open questions

1. **No independent evaluation of any of these *flows*.** METR measures agents on tasks; Stack Overflow
  measures developer sentiment; Chroma measures model behaviour with long inputs. No source I could read
  evaluates, say, Spec Kit vs beads vs no flow on the same work. Every "X% faster / fewer bugs" number in the
  spec-toolkit READMEs (CCPM's 100% eval score and 89%/75% claims; claude-flow's speedups) is self-reported
  and unaudited. **UNVERIFIED** for all of them.
2. **GitClear and Faros are 403 from this machine.** Their code-quality and PR-throughput findings are widely
  cited but I did not read them, so I make no claim about them here.
3. **DORA 2025 body text not read**; only the landing page's one-sentence thesis ("AI as an amplifier"). The
  report PDF and capability pages were not reachable in text form.
4. **OpenSpec, Agent OS, SuperClaude have no independent critique** that I could find: zero relevant HN
  stories for "openspec", and no third-party evaluation. Their failure modes are therefore unread, not absent.
5. **Spec drift specifically.** I found strong statements that drift happens (agents regenerate existing code,
  mark "verify implementation" done without writing tests, work from stale tickets) but no source that
  *measures* drift between a spec artifact and the code over time. The closest thing is Kiro's `Sync Files` /
  "check which tasks are already complete" affordance, which is a mitigation a vendor built and is therefore
  evidence that the problem is real, but not evidence of its magnitude.
6. **Cost numbers are anecdotal.** The only concrete figures read were from one practitioner (a $200 Claude
  subscription burned in 30 minutes with 3 agents; $1–$5 per one-shot attempt on a <1000 LOC app) and Archon's
  telemetry design (it records token/cost totals per run). No systematic cost data.
7. **Not read, possibly relevant:** BMAD's `bmad-loop` module internals; Archon's per-node failure taxonomy;
  the GNOME/Jira "work item" rename's effect on tooling; Copilot coding agent's actual automations contract;
  `gsd`/`vibekanban`-style community tools seen only as HN titles.
8. **No research-flow equivalent found in the coding-agent toolkits** except Spec Kit's `assess` extension
  (intake → research → define → shape → decide). Even that gates *whether to build software*, not whether a
  claim is true. Nothing in this axis models a claim, an experiment, a result, or a replication as a tracked
  object — the closest analogues are one level down, in the science-agent papers (other children's axis).
