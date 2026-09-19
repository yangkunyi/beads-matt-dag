# Ecosystem: full spectrum (outside this machine)

**Question:** does something off-the-shelf already do what this product is, at any layer?
**Axis:** ecosystem only. Installed-CLI inventory is the sibling axis. No `bd`/`archon` process was run here (supervisor). CLI-surface claims that need a live binary are marked `unverified here; sibling axis`. Published CLI text used instead: beads `CLI_REFERENCE` pin [v1.2.2 via jsDelivr](https://cdn.jsdelivr.net/gh/gastownhall/beads@v1.2.2/docs/CLI_REFERENCE.md); Archon [archon.diy](https://archon.diy/).
**Network:** `github.com` / some `*.github.io` resolve into `198.18.0.0/15` and were blocked. Proxy `http://127.0.0.1:23379` + `cdn.jsdelivr.net/gh/<owner>/<repo>@<ref>/<path>` + vendor docs. Exa search 429 after first batch; later provider keys missing. **Blocked fetch ≠ absence.**
**Do not copy** prior notes under `.scratch/research-flow/`.

Evidence labels: **direct** (page text) | **interpretation** | **inference** (researcher, not in source).

## Summary

Nothing off-the-shelf is this product. Closest whole-product neighbours (Gas Town, BeadBoard, Foolery, vibe-kanban, claude-squad / uzi / Sculptor / Conductor) own **parallel execution** and sometimes a **board**; none own this repo’s three-domain issue graph, derived frontier, merge-before-stamp, or one-executor-per-domain view. Beads already owns graph + `bd ready`. Archon’s intended isolation is **one worktree per RUN**, with an explicit **per-item** escape (`workflow:` + `fan_out:` + `isolation: worktree`) whose names are Archon’s, not handle+slug. The one still-open worktree question is not “does a tool exist” — **worktrunk / gwq / uzi / Archon fan-out all exist** — it is “can it name from handle+slug, be the teardown half of a merge, survive a crashed holder, and install without a Target binary.” No fetched candidate hits all four.

## Screens (where recorded)

| Screen | Where it is written | Effect on this axis |
|---|---|---|
| bun runtime; pack scripts | `AGENTS.md` (repro/`tsc` gates); pack is bun YAML+scripts | A Target-side Python/Rust/Go **required** binary is out |
| Target must not install a binary | ADR-0009 `worktrunk` row; AGENTS.md workers must not write outside the worktree | `wt`, `gwq`, `gt`, `container-use`, Tauri GUIs fail even when the UX is right |
| no service / database / queue | ADR-0009 last paragraph | Temporal/Restate/n8n/Langfuse/Clerk/Electric/… fail |
| beads owns graph + frontier | ADR-0001 | Replacing `bd ready` / edges is out; overlaying a second graph is out |
| operator surface is a view | ADR-0007 | Canvas libraries and community boards must not become the executor or the store |
| one executor per domain | ADR-0007 | A single “agent board” that claims+merges+closes is out |

If a candidate **violates** one of these, the verdict is **no**, plus what adopting it would **buy**.

---

## 1. Whole product / ticket DAG that agents execute

Crux: do they own the **ticket graph** and a readiness **frontier**, or only parallel execution?

| Name | What it is | Licence | Install | Would replace | Verdict |
|---|---|---|---|---|---|
| **beads (`bd`)** | Dolt issue graph; `bd ready` is the claimable frontier | MIT (owner README) | already the store | nothing — it **is** layer 0 | **keep**. Not a candidate to adopt; it is the product’s graph. |
| **Gas Town** (`steveyegge/gastown`) | Multi-agent town on beads: Mayor, polecats, hooks (git worktrees), convoys, **Refinery** (Bors-style bisecting merge queue), Scheduler, Witness/Deacon | unverified this pass (README fetched, no LICENSE file in extract) | Git 2.20+, Go, `bd` 0.57+, Dolt, sqlite3, tmux 3.0+, agent CLI; or Docker Compose | drain + worktrees + merge lock + overlay | **no** (second flow; tmux+sqlite+extra binaries). **Buys:** battle-tested merge queue + capacity governor. Steal ideas, not the binary. [jsDelivr README](https://cdn.jsdelivr.net/gh/steveyegge/gastown@main/README.md) |
| **BeadBoard** | Dashboard + `bb` CLI + **bb-pi** orchestrator on beads; agents claim beads, mail, close with evidence | unverified | Next.js/TS; `bd` + `bb`; bb-pi “under construction” | drain + surface | **no**. Closest beads-native whole product. Violates one-executor-per-domain and “surface is a view”. **Buys:** live agent mail + typed workers. [community-tools](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md) |
| **Foolery** | Local web UI on beads: wave planning, terminal, verification queue | unverified | curl install script | surface + some orchestration | **no** (executor+view). **Buys:** wave planning UX. Same source. |
| **BeadHub** | Coordination **server** wrapping `bd` (claim, file reservation, presence, mail) | unverified | Python/TS; hosted beadhub.ai | multi-writer + presence | **no** (service). **Buys:** presence/reservations without moving the graph. Same source. |
| **BeadSpec** | Tauri desktop GUI; reads Dolt SQL, writes through `bd`; OpenSpec bridge; React Flow + Cytoscape graph | unverified | native binary from GitHub Releases | operator surface | **no** (Target binary; not a view we serve; not an executor). **Buys:** OpenSpec import + human decision queue. |
| **Bead Me Up, Scotty** | Web board on `bd` CLI; kanban + React Flow deps; SSE on `.beads/` mtime; human/agent badges via `BEADS_ACTOR` | unverified | `scotty` / localhost:3000 | operator surface | **no as product**. Drag-to-Done runs `bd close` — would violate ADR-0006 (session/drain close). **Buys:** SSE refresh + attribution rule. [beadmeupscotty.com](https://beadmeupscotty.com/) |
| **Lista Beads** | VS Code extension; dep graph; **syncs Azure/GitHub/Jira/Linear/GitLab** | unverified | VS Code marketplace | surface | **no**. Multi-tracker sync is a second graph (ADR-0001). |
| **beads.nvim** / **nvim-beads** | Editor UIs over `bd` | unverified | Neovim plugin | surface | **no** (editor, not the served view). |
| **beads-web / bd-board / beads-ui / Beadazzle / Mardi Gras** | Community viewers | mixed | various binaries/npx | surface | **no**. Viewers. bd-board even disables writes by default. |
| **claude-squad** | TUI: tmux + git worktree per agent; wraps any CLI | **AGPL-3.0** (comparison pages + prior LICENSE reads) | Go binary + **tmux** + `gh` | worktree fan-out + session mux | **no**. Parallel execution only; no ticket graph/frontier. **Buys:** SSH-friendly mux. Needs extra binaries. |
| **uzi** (`devflowinc/uzi`) | Go CLI: N agents, auto worktrees, tmux, `uzi checkpoint` merge, `uzi auto` to mash Enter | unverified (go install) | Go + git + **tmux** | worktrees + parallel run | **no**. Execution only. **Buys:** checkpoint/merge helper. [jsDelivr README](https://cdn.jsdelivr.net/gh/devflowinc/uzi@main/README.md) |
| **vibe-kanban** | Browser kanban; one worktree per card; many CLIs | **Apache-2.0** | `npx vibe-kanban` | tracker + executor + surface | **no** (ADR-0007). Vendor Bloop wound down **Apr 2026**; community-maintained, local-only. **Buys:** card→agent wiring. |
| **Sculptor** (Imbue) | Desktop parallel workspace; worktree+branch+diff per agent; skills | **MIT** (product page) | Mac Apple Silicon + Linux desktop app | worktrees + review UI | **no**. Parallel only. **Buys:** review-before-merge workspace. [imbue.com/product/sculptor](https://imbue.com/product/sculptor) |
| **Conductor** (conductor.build) | Native macOS app; worktree per agent; diffs/PRs | proprietary, free client | **macOS (Apple Silicon)** app | worktrees + review | **no** (closed, Mac-only, not bun). **Buys:** polish. Site now also sells **cloud** agents — extra service. |
| **Crystal** | Electron parallel sessions | MIT | desktop | — | **no**. **Deprecated Feb 2026** in favour of **Nimbalyst** (paid/closed successor in some roundups; MIT claimed in others — **contradiction**, see below). |
| **Omnara** | Control plane: web/iOS/Android/Slack over your agents; YAML in-repo; machine pools | unverified; YC S25 | self-host **or** Omnara Cloud | overlay + remote steer | **no** (service/control plane). **Buys:** phone approvals. |
| **Terragon** | product site | — | — | — | **unverified** (HTML extract failed; blocked/empty). |
| **OpenHands** | Agent Canvas: local/Docker/cloud agents; GitHub-issue automations | licence not in fetched README extract | Node 22 + `uv`, or Docker | executor | **no**. GitHub issues ≠ beads graph. Docker/cloud backends are a service. [README](https://cdn.jsdelivr.net/gh/All-Hands-AI/OpenHands@main/README.md) |
| **SWE-agent** | Research coding agent; YAML | **MIT** | Python | executor | **no**. Bench harness, not a tracker. |
| **aider** | CLI pair programmer; auto-commits | MIT (site; LICENSE file not re-fetched) | Python | executor | **no**. No graph/frontier. |
| **opencode** | OSS coding agent | unverified this pass (jsDelivr README 404) | — | executor | **no** as product. Community **opencode-beads** plugin injects `bd` into that agent — a client, not a replacement. |
| **goose** (Block) | Desktop + CLI + API agent | **Apache-2.0** | app/CLI | executor | **no**. |
| **crush** (Charm) | TUI coding agent | **FSL-1.1-MIT** | Go binary | executor | **no**. Future-open licence; competing-use flavour. |
| **claude-flow** (`ruvnet/claude-flow`) | npm `claude-flow` 3.42.4: “Ruflo” swarm orchestrator, 60+ agents, vector memory, MCP | **MIT** (`package.json`) | npm CLI; vector DB implied | drain | **no**. Swarm/memory product; not beads frontier. **Buys:** nothing we can take without a service. |

**Layer verdict:** no off-the-shelf whole product. Beads community is rich in **views**; Gas Town / BeadBoard / Foolery are **second flows**. Parallel-agent runners are worktree multiplexers.

---

## 2. Durable execution / workflow engines

Screen: no service/database/queue. Would they replace Archon or the pack’s retry/lock/resume?

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **Archon** (already host) | YAML AI-coding DAG; default **one worktree per run**; `workflow:` children; `fan_out` | MIT (prior; not re-fetched) | already | — | **keep**. See §9. |
| **Temporal** | Durable workflows + activities + signals | **MIT** ([LICENSE](https://cdn.jsdelivr.net/gh/temporalio/temporal@main/LICENSE)) | server + workers + DB | Archon + pack loop | **no** (cluster). **Buys:** crash-resume, HITL signals. |
| **Restate** | Durable handlers, awakeables, single server binary; TS SDK | **unverified this pass** (README fetched, no LICENSE; prior notes said BSL 1.1) | `restate-server` daemon + registered endpoint | pack resume | **no now** (daemon = service). **Buys:** killed-turn resume. Only credible *later* runner if that pain wins. |
| **DBOS** | Durable orchestration | unverified | their runtime | Archon | **no** (platform). |
| **Inngest** | Durable steps as HTTP | SSPL (prior; not re-fetched) | their server/cloud | Archon | **no**. |
| **Windmill** | Internal-tools workflows | AGPL + proprietary UI (prior) | Docker/Postgres | Archon + surface | **no**. |
| **Kestra / Prefect / Dagster / Airflow / Argo** | Job/data schedulers | Apache-2.0-class (typical; not re-verified each) | DB and/or k8s | drain | **no**. Wrong primitive (tasks, not agent+git+merge). |
| **n8n** | Visual workflow automation — author’s metaphor | source-available / fair-code (exact SPDX **unverified** this pass; n8n docs URL 404’d) | Docker/service | “n8n but tickets are nodes” | **no**. Execution DAG ≠ issue DAG (ADR-0007). **Buys:** visual wiring intuition only. |
| **Node-RED** | Flow editor | Apache-2.0 (not re-fetched) | Node service | surface+executor | **no**. |
| **Dify / Flowise** | Visual LLM builders | mixed | Docker | surface+executor | **no**. |
| **LangGraph** | Agent graph + interrupt/checkpointer | MIT (prior) | Python + checkpointer **DB** | Archon | **no** (Python + second store). |
| **Mastra** | TS workflows, suspend/resume, snapshots in configured storage | unverified | TS app + storage adapter | Archon | **no now**. **Buys:** library-shaped HITL. Bun support **unverified**. |
| **OpenAI Agents SDK / CrewAI / AutoGen / Pydantic AI / VoltAgent** | Multi-agent runtimes | mixed | Python/TS libs | executor | **no**. Chat/role runtimes, not git-merge drains. |

**Layer verdict:** leave Archon. Durable-execution catalogue is the wrong host or a service. This drain is **re-runnable from git**, not resumable from a journal (ADR-0002 / ADR-0009 `workflow resume` row).

---

## 3. Visual DAG builders

Screen: canvas is a **view**; graph stays in beads (ADR-0007). Positions may live in the view.

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **xyflow / React Flow** | React node/edge canvas; graph in React state | MIT (product; already in tree) | bun dep (already) | — | **keep**. |
| **d3-dag** | DAG layering | MIT-class (already in tree) | already | — | **keep**. |
| **elkjs / dagre** | Layout engines | EPL-2.0 / MIT (typical; elkjs page fetched thin) | bun dep | d3-dag | **optional later**. Layout only. Spec already considered elkjs. |
| **Cytoscape.js** | Graph viz | MIT (site) | bun dep | React Flow | **no**. BeadSpec uses it; we already have RF. |
| **Rete.js** | Visual *programming* (executable nodes) | MIT (site thin) | bun | canvas | **no**. Would make the canvas an executor. |
| **Litegraph** | Same family | unverified (GitHub blocked) | — | canvas | **no** (same reason). Fetch **blocked**. |
| **JointJS** | Diagramming | dual open + commercial (marketing page) | bun + possible paid | canvas | **no**. Licence risk. |
| **GoJS** | Diagramming | **commercial** (docs) | paid | canvas | **no**. |
| **AntV X6** | Diagramming | MIT (site thin) | bun | canvas | **no** vs RF already in tree. |
| **tldraw** | Infinite canvas + sync | **custom: no Production Environment without a commercial key** | bun + key | canvas | **never**. Licence re-read this pass: [LICENSE.md via jsDelivr](https://cdn.jsdelivr.net/gh/tldraw/tldraw@main/LICENSE.md). ADR-0009 row stands on **direct** licence text, not assertion. |
| **n8n editor** | Product editor | tied to n8n | n8n service | canvas | **no**. |

**Layer verdict:** keep React Flow + d3-dag. tldraw refusal is licence-direct.

---

## 4. Multi-writer / local-first stores

Screen: **graph must not leave the store** (ADR-0001). Judge: *store becomes multi-writer* vs *presence/layout only*.

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **beads server mode** (`bd init --server` → `dolt sql-server`) | Multi-writer on the **same** Dolt graph | MIT (bd) | Dolt sql-server process | file lock as the only mutex | **adopt later**, trigger = second human/agent writer. This is the only candidate that keeps the graph in beads. [bd init docs](https://beads.gascity.com/cli-reference/init) |
| **Dolt sql-server** | The engine under server mode | Apache-2.0 (Dolt; not re-fetched) | extra process | same | **same as above** — not a second store. |
| **Electric SQL** | Postgres **read-path** sync (shapes); writes via your API | unverified | Postgres + Electric service | store | **no**. Graph would leave beads. Presence/layout only if used for overlay. |
| **Automerge / Yjs** | CRDT documents | MIT | lib; Yjs usually wants a WS provider | layout/presence | **layout/presence only**. Putting issues in a `Y.Doc` = second graph (ADR-0007). |
| **Liveblocks / PartyKit** | Hosted presence/CRDT | proprietary / OSS+host | SaaS or workers | layout | **no** for store. Presence only, and that’s a service. |
| **Replicache / Zero** | Client sync; server (Postgres) is truth | mixed | their service + PG | store | **no**. |
| **Triplit / Jazz / InstantDB / Convex** | Local-first or reactive backends | mixed | their cloud/server | store | **no**. |
| **TinyBase** | In-memory reactive store; optional CRDT; Bun sqlite persister exists | MIT (site) | bun lib | layout cache | **presence/layout only**. Could persist x/y in-browser. Not the issue graph. |
| **cr-sqlite** | SQLite CRDT extension | unverified | native extension | store | **no** (second DB). |
| **Turso / PocketBase / Supabase** | Hosted or extra SQLite/PG servers | mixed | service | store | **no**. |

**Layer verdict:** only beads server mode makes the **store** multi-writer. Everything else is a second database or a layout CRDT.

---

## 5. Identity

Minimum for real per-human authorship with **no service**.

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **`bd --actor` / `BEADS_ACTOR`** | Global CLI flag: “Actor name for audit trail (default: `$BEADS_ACTOR`, git `user.name`, `$USER`)” | MIT (bd) | already | identity product | **the floor**. **Direct** in [v1.2.2 CLI_REFERENCE global flags](https://cdn.jsdelivr.net/gh/gastownhall/beads@v1.2.2/docs/CLI_REFERENCE.md). The **comment subcommand page** lists only `--file`/`--stdin` ([bd comment](https://beads.gascity.com/cli-reference/comment)) — it does not mention `--actor`; authorship is the global flag. That comments *stamp* that actor is **unverified here; sibling axis** (prior assembly ran it). |
| **better-auth** | TS auth framework, plugins for orgs/roles | **MIT** ([README](https://cdn.jsdelivr.net/gh/better-auth/better-auth@main/README.md)) | bun dep **plus an application DB** | door/session | **no now**. Violates no-database. **Buys:** real sessions/ACL when server mode exists. |
| **Lucia** | was a TS auth lib | — | — | — | **dead**. Deprecated **March 2025**; site now points at a single-file snippet. [lucia-auth.com](https://lucia-auth.com/) |
| **Auth.js** | Next/auth adapters | MIT | adapter + DB | door | **no** (DB). |
| **Clerk** | Hosted auth | proprietary | SaaS | door | **no** (service). |
| **Keycloak / Ory** | IdP platforms | Apache-2.0 / various | Java/Go **services** | door | **no**. |

**Layer verdict:** per-human authorship without a service is `--actor` at the operator door. Anything with a user table waits on server mode.

---

## 6. Observability

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **bd OpenTelemetry** | Opt-in OTLP metrics; `BD_OTEL_ENABLED=true`; spans `bd.command.*`, `dolt.*`, `hook.exec`; traces **console-only** in recommended stack | MIT (bd) | env + VictoriaMetrics+Grafana **docker compose** | store-side metrics | **exists**. Not a run overlay. Recommended stack **is a service**. [observability docs via jsDelivr](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/reference/observability.md) |
| **Archon per-run JSONL** | `~/.archon/workspaces/<project>/logs/<run>.jsonl` | MIT (Archon) | already | scraped overlay | **already there**. Pack overlay still joins lock files. **Inference:** join this log rather than invent a parallel one. [Archon directories](https://archon.diy/reference/archon-directories/) |
| **Langfuse** | Traces/prompts/eval | OSS + cloud | Postgres+ClickHouse+Redis+S3 (prior architecture page; **ClickHouse not re-fetched this pass**) | overlay | **no** (service). |
| **LangSmith** | Hosted traces | proprietary | SaaS | overlay | **no**. |
| **Phoenix (Arize)** | OSS traces | Apache-ish (unverified) | extra process | overlay | **no** for a Target. |
| **Grafana / Sentry** | Generic | mixed | services | overlay | **no**. |
| **local JSONL event stream** | append-only pack events (claim/merge/fail/lock-steal) | ours | bun file write | overlay scrape | **yes, small**, and it should **include Archon’s existing JSONL**, not ignore it. |

**Layer verdict:** do not stand up OTel collectors or Langfuse. bd OTel is real and off by default. Overlay gap is semantic pack events, not a missing vendor.

---

## 7. Sandboxing

Screen: wrap **one agent’s bash** with **no service** and **no Target-side install**.

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **`@anthropic-ai/sandbox-runtime` (`srt`)** | OS sandbox as CLI **and TS library** (`SandboxManager.wrapWithSandbox`); macOS `sandbox-exec`/Seatbelt; Linux **bubblewrap** + socat + ripgrep; Windows alpha | **unverified** this pass (`MIT` hits in the README were **MITM**, not a licence line) | `npm i -g @anthropic-ai/sandbox-runtime` **plus Linux distro packages** | worker bash tool | **adopt later, trigger = agents may touch `~`**. **Violates “no Target-side install” on Linux** unless bubblewrap is already present. **Buys:** FS/net allowlists without Docker. [jsDelivr README](https://cdn.jsdelivr.net/npm/@anthropic-ai/sandbox-runtime/README.md) |
| **bubblewrap** | Unprivileged namespaces; policy is *your argv* | LGPL-class (**unverified** this pass) | distro package | srt backend | **not a product**. Needed by srt on Linux. No daemon. |
| **firejail** | Desktop sandbox; historically setuid | GPL (unverified) | distro, often setuid | bash wrap | **no**. Heavier, path-whitelist model bubblewrap authors reject. |
| **nsjail** | Google process jail | Apache-2.0 (unverified) | extra binary | bash wrap | **no** (Target binary). |
| **gVisor / Firecracker** | Userspace kernel / microVM | Apache-2.0 | KVM/root, extra runtime | isolation | **no** (service-shaped). |
| **microsandbox** | Tiny VMs; TS SDK | Apache-2.0 (prior) | **KVM** | isolation | **no** for Targets without KVM. |
| **container-use** | MCP+CLI: **container + git branch** per agent; Dagger-powered | **Apache-2.0** | brew/curl **+ Dagger engine** | worktree **and** sandbox | **no now**. Experimental. **Daemon**. **Buys:** real isolation + branch. [README](https://cdn.jsdelivr.net/gh/dagger/container-use@main/README.md) |
| **Dagger** | Container engine as API | Apache-2.0 | engine daemon | isolation | **no** (service). |
| **E2B / Modal** | Hosted sandboxes | proprietary | network | isolation | **no** (service). |

**Layer verdict:** the gap is real (worktree ≠ sandbox). srt is the only bun-shaped wrap. It still needs bubblewrap on Linux — call that out, don’t pretend it’s install-free.

---

## 8. Docs / skills

| Name | What | Licence | Install | Replace | Verdict |
|---|---|---|---|---|---|
| **this repo’s ADRs + `docs/adr/README.md`** | 9 prose ADRs with rejected alternatives | — | git | — | **keep**. |
| **adr-tools** | `adr new` numbering | MIT (typical; README fetched, no SPDX line) | extra CLI | ADR index | **no**. Would flatten argument-carrying ADRs. |
| **MADR** | ADR markdown template | CC (unverified; adr.github.io **blocked**) | copy template | ADR shape | **no**. Fetch blocked. |
| **log4brains** | ADR site generator | unverified | extra | index | **no** until ≫9 ADRs. |
| **promptfoo** | Prompt/agent evals | unverified (npm/npx) | extra + often a web UI | skills tests | **no** for `tools/flow.ts check`. Different job (model eval). |
| **skills-ref / agentskills validators** | Agent-skills spec | unverified this pass | — | `tools/flow.ts check` frontmatter | **unverified**. Fetched [agentskills README](https://cdn.jsdelivr.net/gh/agentskills/agentskills@main/README.md) did **not** mention `skills-ref` or a validator CLI. Prior ranked-10 #6 rests on a tool this pass could not re-find. |
| **`tools/flow.ts check`** | byte-compare installed skills + pack link | ours | bun, already | — | **keep**; extend only if a real validator is fetched. |

---

## 9. Worktree-per-task (still open)

Questions: name from **handle+slug**? teardown half of a **merge**? survive a **crashed holder**? Archon: one-worktree-per-**RUN** vs per-**ITEM** fan-out?

### Archon (public docs — this is the new evidence)

**Direct** ([Isolation](https://archon.diy/book/isolation/), [Authoring](https://archon.diy/guides/authoring-workflows/), [CLI](https://archon.diy/reference/cli/)):

- Default: **one git worktree per workflow run**, under `~/.archon/workspaces/<owner>/<repo>/worktrees/`, branch `archon/task-…` or `--branch`.
- Opt out: `--no-worktree` or workflow `worktree.enabled: false` (this pack’s choice).
- Child runs **share the parent checkout** unless the node writes `isolation: worktree` — **never inferred**.
- **Per-item fan-out exists:** `workflow:` + `fan_out:` → N child **runs**; add `isolation: worktree` on that node → **N worktrees**, names `archon/task-<parentRunId8>-<nodeId>-<hash>-child-<n>`.
- `include:` + `fan_out:` stays **inside this run**, **no `isolation:`**, shared checkout.
- Concurrent children on one checkout hit a **path-exclusive lock**; fan-out refuses to spawn if they’d cancel each other.
- `archon complete <branch>` / `isolation cleanup` only know **Archon-created** worktrees. Resume **reuses** the child’s recorded worktree.
- `--base` is rejected when `worktree.enabled: false`.

**Interpretation:** Archon’s intended model **is** one-worktree-per-RUN. Per-ITEM fan-out is a documented, explicit pattern — but names are Archon’s, not handle+slug, and teardown is Archon’s registry, not `main-writes.ts`. Turning it on would **buy** engine-owned isolation and resume, and **violate** the pack’s naming contract + pid-steal lock + merge-before-stamp ownership.

### Other tools

| Name | What | Licence | Install | Name from handle+slug? | Merge teardown? | Crashed holder? | Verdict |
|---|---|---|---|---|---|---|---|
| **worktrunk (`wt`)** | Worktrees-as-branches for parallel agents; hooks; `wt merge` | **MIT OR Apache-2.0** | **Rust binary** (brew/cargo/winget `git-wt`) | **Yes if we pass the branch.** Paths from a **template**; address is branch name. | **`wt merge`** squash/rebase/ff + **background remove**. Not merge-before-stamp. | **not documented**. No pid-steal. | **no** (Target binary — ADR-0009). **Buys:** template paths + hook points. [worktrunk.dev](https://worktrunk.dev/) |
| **gwq** | Fuzzy worktree manager; `naming.template`; tmux | **Apache-2.0** | Go binary (brew tap) | **Yes** via `{{.Branch}}` in template | `gwq remove -b` is cleanup, not settle | no | **no** (binary). **Buys:** status dashboard. |
| **git-spice / Graphite `gt` / spr / git-branchless / git-town** | Stacked PRs / git workflow CLIs | GPL-3.0 / proprietary / etc. | extra binaries; Graphite is SaaS+CLI | n/a | ship/sync, not per-issue worktree | n/a | **no**. Wrong problem (human stacks). git-town: [git-town.com](https://www.git-town.com/) |
| **jj / Sapling** | Alternate VCS | Apache-2.0 / GPL (Sapling README fetched) | replace git | would rewrite handle/slug + second-parent merge detection | better conflicts (jj) | n/a | **no**. Git contract stays. |
| **GitButler** | GUI VCS; **parallel agents without separate worktrees** (virtual branches) | FSL-1.1-MIT (prior; page 404 this pass) | desktop app | no worktrees | their integrator | n/a | **no**. Different isolation model. **Buys:** in-workspace parallel without `worktree add`. [docs.gitbutler.com/ai-agents/parallel-agents](https://docs.gitbutler.com/ai-agents/parallel-agents) |
| **claude-squad / uzi / vibe-kanban / conductor / Sculptor** | see §1 | — | extra apps | they name worktrees their way | uzi `checkpoint`; others review/PR | no pid lock | **no** as drain worktree layer |
| **container-use / Dagger** | container+branch | Apache-2.0 | engine | their branch names | git checkout review | container lifecycle ≠ pid lock | **no** (daemon) |
| **bun/JS library** | — | — | — | — | — | — | **none found** that wraps `git worktree add/remove` as a library with handle/slug naming. **Missing evidence.** |
| **pack `worktree.ts` + `main-writes.ts`** | handle/slug names; prune + `remove --force` | ours | bun | yes (tests assert) | teardown is the other half of merge | pid file lock, steal dead pid | **keep**. |

**Layer verdict:** the open question is answered **as existence** (many tools) and **unanswered as fit**. Closest fit is worktrunk’s template + `wt remove`, refused by the Target-binary screen. Archon fan-out is the intended engine pattern and still the wrong names.

---

## ADR-0009 re-verify

ADR-0009 says three rows were believed adoptable **until they were run**. Assembly named those: worker flags, Archon worktree teardown, overlay’s `workflow get`. This pass cannot run binaries. Public text:

| Row | Public evidence this pass | Still stands? |
|---|---|---|
| **`bd --readonly` / `--sandbox`** | v1.2.2 CLI_REFERENCE **global flags**: `--readonly` “block write operations (for worker sandboxes)”; `--sandbox` “disables Dolt auto-push”. | **Semantics yes.** “Already spelled by `BD_READONLY` / auto-push off” is **unverified here; sibling axis**. Not an assertion vacuum anymore — the flag text is published. |
| **`archon isolation cleanup` / `complete`** | Isolation book: `complete <branch>` removes worktree+local+remote **after a PR merge**; cleanup is age/`--merged`. Worktrees are those Archon created. `worktree.enabled: false` → none created. | **Semantics yes.** Exact stderr `Not found: … (no active isolation environment)` is **unverified here; sibling axis**. |
| **`archon workflow get`** | CLI ref: “Show detail for a single **run** by ID, regardless of status”; `--json --verbose` adds nodes from the **event stream**. Detached runs are found with `workflow runs`/`workflow get`. | **Semantics yes.** It is Archon’s run record, not `run-lock.json` / `attempted-ids.json` / pack reports. Overlay-as-`workflow get` would **buy** process/node state and still miss pack facts. |

Other ADR-0009 rows checked against public text (not the “three”):

- **`bd merge-slot`**: CLI_REFERENCE: holder is `metadata.holder`, status open/in_progress, waiters queue. **No pid.** Refusal stands on published semantics.
- **`bd gate`**: types `human`, `timer`, `gh:run`, `gh:pr` (and `bead` in check `-t`). Parks until the world catches up. Refusal stands.
- **`bd worktree`**: “Creates a git worktree at `./<name>`”. No handle/slug. Refusal stands.
- **`tldraw`**: licence re-read; Production Environment forbidden. Stands.
- **`worktrunk`**: still a required binary. Stands.
- **`archon workflow resume`**: public: re-executes, skips completed nodes, reuses worktree. Choice to be re-runnable not resumable still a choice.

---

## Ranked 10 from `full-spectrum-assembly.md` — drop / promote / missed

Assembly’s 1–9 “still undone”; 10 parked.

| # | Item | This axis | Action |
|---|---|---|---|
| 1 | `bd comment --actor` at the door | **Stronger than assembly.** `--actor` is a **documented global flag** on the 1.2.2 pin, not only a lab observation. Comment page still omits it. | **keep #1** |
| 2–3 | gzip + hash; split client | In-repo delivery, not ecosystem. Still correct hygiene. | **keep**, but they are not “a product out there” |
| 4 | shadcn `message`/`bubble`/`data-table` | UI kit, not this axis | **keep** as view code; irrelevant to “does a product exist” |
| 5 | persist layout (`idb-keyval`) | Gemini v2 said **drop**. **Disagree.** Single-writer today; ADR-0007 allows positions in the view. Multi-client dissonance only after server mode. TinyBase is an alternative bun persister, not a reason to drop. | **keep**, low |
| 6 | `skills-ref` in `flow.ts check` | **Could not re-find** the validator this pass. | **park until fetched**; do not ticket from this axis |
| 7 | ADR: when multi-writer | Server mode is still the only graph-preserving answer; better-auth still needs a DB | **keep** |
| 8 | JSONL run-event stream | **Partial miss in assembly:** Archon already writes per-run JSONL. Pack should **join** it and add pack-semantic events (lock steal, merge-before-stamp, attempted). | **keep, re-scope** (join, don’t invent a second log) |
| 9 | `srt` around worker bash | Gemini v2 said **promote to #2**. **Disagree.** Linux needs bubblewrap — Target-side package — so it fails a screen until that package is assumed. Gap is real; trigger is “agents may touch `~`”. | **do not promote**; stay in parked-with-trigger |
| 10 | parked | Restate / Mastra / container-use / microsandbox / Yjs / OTel collector / Gas Town Refinery / schedulers / worktrunk | **keep parked**. Add: Archon `fan_out`+`isolation:worktree`, BeadBoard/Foolery, GitButler no-worktree model |

**Drop:** none of 1–5, 7–8. **Drop-from-this-axis:** #6 until the validator URL is real.

**Promote:** none into “adopt now” except #1 (already).

**Missed (not in the 10, worth recording):**

1. Archon **per-item worktree fan-out** is documented. Open worktree question is fit, not existence.
2. Archon **JSONL logs already exist**.
3. **BeadBoard / Foolery / BeadHub / LoopTroop** — beads-adjacent whole products; all second flows or services.
4. **uzi** — worktree+tmux+checkpoint merge; extra binaries.
5. **Nimbalyst** — Crystal’s successor; status/licence **contradicted** across roundups.
6. **Thread** (`uv tool install`) — read-only beads analytics (DuckDB). Extra Python tool.
7. **GitButler** parallel-without-worktrees — different isolation thesis.
8. **Lucia is dead**; do not list it as a live identity option.
9. No **bun/JS worktree library** found.

---

## Contradictions

- **Crystal vs Nimbalyst:** one 2026 roundup says Crystal deprecated Feb 2026 pointing at **paid closed** Nimbalyst; another says Nimbalyst is **MIT** native+mobile. Not resolved (GitHub blocked). Do not adopt either.
- **vibe-kanban health:** “community-maintained Apache-2.0” vs “orphaned, no push since 2026-04-24”. Treat as **unmaintained-enough-to-avoid**.
- **Conductor:** comparison pages still say free local Mac app; conductor.build title extracted as “Run a team of coding agents **in the cloud**”. Product is drifting toward a service.
- **`--actor` docs split:** global flags document it; `bd comment` page does not. Not a contradiction in behaviour if the flag is global — but a reader of only the comment page would miss it.
- **Restate licence:** prior notes BSL 1.1; this pass did not re-read LICENSE. Do not treat BSL as re-verified.
- **OpenHands licence:** README extract had no SPDX; do not claim MIT.

## Missing evidence

- Live `bd --help` / `archon --help` / throwaway `bd init` (**sibling axis** by design).
- Terragon product (fetch empty).
- uzi licence; Gas Town licence; srt licence; n8n SPDX; Mastra Bun support; GoJS/JointJS exact terms beyond marketing.
- Whether `wt merge` can be taught `--no-ff` + “stamp only after merge commit” — **inference: no**, from published `wt merge` story (squash/rebase/ff + cleanup).
- Whether worktrunk/gwq record a pid and steal a dead holder — **not in fetched docs**.
- A bun/JS `git worktree` library with handle+slug naming — **not found**.
- `skills-ref` as a real CLI — **not found** this pass.
- `bd comment` stamping `--actor` on this pin — sibling axis (docs only show the global flag).
- Exact `archon complete` stderr when registry empty — sibling axis.
- Langfuse self-host compose (ClickHouse) — not re-fetched; prior only.

## Sources

**Kept (decision-relevant):**

- Archon isolation / authoring / CLI / directories — https://archon.diy/book/isolation/ https://archon.diy/guides/authoring-workflows/ https://archon.diy/reference/cli/ https://archon.diy/reference/archon-directories/
- beads v1.2.2 CLI_REFERENCE — https://cdn.jsdelivr.net/gh/gastownhall/beads@v1.2.2/docs/CLI_REFERENCE.md
- beads community-tools — https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md
- beads observability — https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/reference/observability.md
- bd comment — https://beads.gascity.com/cli-reference/comment
- bd init — https://beads.gascity.com/cli-reference/init
- Gas Town README — https://cdn.jsdelivr.net/gh/steveyegge/gastown@main/README.md
- Bead Me Up, Scotty — https://beadmeupscotty.com/
- Sculptor — https://imbue.com/product/sculptor
- worktrunk — https://worktrunk.dev/ + jsDelivr README
- gwq README — https://cdn.jsdelivr.net/gh/d-kuro/gwq@main/README.md
- uzi README — https://cdn.jsdelivr.net/gh/devflowinc/uzi@main/README.md
- tldraw LICENSE — https://cdn.jsdelivr.net/gh/tldraw/tldraw@main/LICENSE.md
- srt README — https://cdn.jsdelivr.net/npm/@anthropic-ai/sandbox-runtime/README.md
- container-use README — https://cdn.jsdelivr.net/gh/dagger/container-use@main/README.md
- bubblewrap README — https://cdn.jsdelivr.net/gh/containers/bubblewrap@main/README.md
- Temporal LICENSE — https://cdn.jsdelivr.net/gh/temporalio/temporal@main/LICENSE
- better-auth README — https://cdn.jsdelivr.net/gh/better-auth/better-auth@main/README.md
- Lucia sunset — https://lucia-auth.com/
- claude-flow package.json — https://cdn.jsdelivr.net/gh/ruvnet/claude-flow@main/package.json
- goose README — https://cdn.jsdelivr.net/gh/block/goose@main/README.md
- crush README — https://cdn.jsdelivr.net/gh/charmbracelet/crush@main/README.md
- SWE-agent README — https://cdn.jsdelivr.net/gh/SWE-agent/SWE-agent@main/README.md
- OpenHands README — https://cdn.jsdelivr.net/gh/All-Hands-AI/OpenHands@main/README.md
- TinyBase — https://tinybase.org/
- Electric — https://github.com/electric-sql/electric (and electric-sql.com)
- GitButler parallel agents — https://docs.gitbutler.com/ai-agents/parallel-agents
- git-town — https://www.git-town.com/
- this repo: `docs/CONTEXT.md`, `docs/adr/0001`–`0009`, `AGENTS.md`

**Rejected/deprioritized:**

- Munder Difflin / AgentsRoom / Parallel Code / Abralo blogs — comparison SEO; used only for Crystal/vibe-kanban/Conductor colour, then discounted.
- tomrochette.com matrix — useful pointer, not primary.
- youngju.dev CRDT survey — background for layer 4, not a product page.
- npm `uzi` (icholy/uzi) — unrelated layout library.
- GitHub HTML — blocked (`198.18.0.0/15`).
- adr.github.io / MADR — blocked.
- terragonlabs.com — empty extract.
- n8n workflow docs URL — 404.

## Next steps

1. Sibling axis: confirm `--actor` stamps comments on this pin; confirm `archon complete` stderr with `worktree.enabled: false`; do not let that block this axis.
2. If worktrees are reopened: spike **Archon `fan_out` + `isolation: worktree`** against the handle+slug contract (expect fail on names) **or** keep pack `worktree.ts`. Do not spike worktrunk without dropping the Target-binary screen.
3. Overlay: read Archon’s existing JSONL before adding a pack log.
4. Identity: wire `--actor` at the door; do not start better-auth.
5. Sandbox: write the trigger (“agents may touch `~`”) in an ADR; include bubblewrap as a Target assumption.

## Supervisor coordination

None. Ecosystem axis complete; CLI execution left to the sibling as instructed.
