# Where the full spectrum still reinventing the wheel

The boring wheels are not the graph, the three executors, or the canvas. Beads already owns the frontier (ADR-0001). Archon already is a YAML AI-coding DAG with human gates and per-run worktrees. The operator page already sits on React Flow, d3-dag, cmdk, sonner, react-query, lucide, and a cacheable `/app.js`.

What is still homemade and *generic* is isolation for agent processes, a real run event log instead of scraping `beads-dag-run.lock` plus `archon workflow status --json`, and (only when a second human appears) beads server-mode plus comment authors. Not Linear. Not Liveblocks. Not Temporal.

Replacing Archon, worktree allocation, merge-before-stamp, or the shadcn-shaped SSR kit would swap policy we own for a product that does not encode it.

| Layer | Hand-rolled today | Mainstream alternative | Verdict |
| --- | --- | --- | --- |
| Store / frontier | none (bd + Dolt) | another tracker | **no** — ADR-0001 |
| AI DAG runner | Archon YAML + pack kernel | Temporal / LangGraph / Mastra / Inngest | **no** — wrong host or a server |
| Worktrees + merge | `worktree.ts`, two file locks, `settle.ts`, conflict role | gwq / worktrunk / claude-squad / git-spice | **no** — they isolate checkouts, not merge-then-stamp |
| Sandbox | same-FS git worktree | container-use (Dagger) or bubblewrap | **adopt later** — only real missing isolation |
| Operator canvas | React Flow + d3-dag + kit.tsx | tldraw / Liveblocks / elkjs / shadcn Radix | **no** — already on the right parts |
| Comments | flat `bd comment`, author string | Liveblocks Comments; beads `--thread` | **adopt later** — stay in beads |
| Multiplayer | single-writer file lock | `bd init --server`; not a SaaS ACL | **adopt later** if a second writer exists |
| Run overlay | scrape lock + Archon CLI + artifacts | structured run events; not a full OTel stack | **adopt now** (tiny log, not Jaeger) |
| Layout persistence | in-memory `dragged` ref | Yjs / Liveblocks storage | **no** — spec forbids store positions |
| Docs / ADRs / skills | markdown + AGENTS.md | log4brains, skill marketplaces | **no** |
| Client bundle | 1.2 MB script | cacheable `/app.js` (already) | **no** for served pages; split later |

## Store / graph / frontier

Beads stays. Primary: [bd README](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/README.md). License MIT. Language Go CLI wrapping Dolt. npm `@beads/bd` latest **1.3.0**; this pack pins **1.2.2**. Docs: https://beads.gascity.com/.

Embedded mode is single-writer. `bd init --server` talks to `dolt sql-server`. Not bun-in-process. Adoption signal: npm dist-tags only (GitHub stars unverified).

**Leave it.** Next step: none.

## AI executor / DAG runner

Host is already [Archon](https://github.com/coleam00/Archon) (MIT, Cole Medin 2025–2026). Go CLI plus Bun workflow YAML. Site `archon.diy`. Last GitHub release **unverified**.

README: YAML nodes, deterministic bash mixed with AI, `interactive: true` approval loops, **one git worktree per workflow run**. Install: `curl -fsSL https://archon.diy/install`. Not bun-in-process.

This pack **disables** Archon worktrees (`worktree.enabled: false`) because the unit is one issue, not one run. Then it adds pick, claim, `fan_out`, merge-before-stamp, and domain closure. `~/.archon/config.yaml` comments point at this same repo.

Temporal ([docs](https://docs.temporal.io/), [TS message passing](https://docs.temporal.io/develop/typescript/message-passing)): MIT Go server. Needs `temporal server start-dev` plus workers. Signals and Updates are real HITL. No git, no worktree, no merge-before-stamp. Cannot run in-process under bun.

Restate ([durable execution](https://docs.restate.dev/concepts/durable_execution)): BSL 1.1. Rust server (`npx @restatedev/restate-server`), TS SDK. Durable handlers. BSL forbids a public platform. No merge policy.

Inngest ([waitForEvent](https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event)): SSPL. Their server or cloud. HITL yes, git no.

Windmill ([README](https://cdn.jsdelivr.net/gh/windmill-labs/windmill@main/README.md)): AGPL plus proprietary UI. Docker/Postgres. Internal-tools UI, not a pack host.

Kestra, Prefect, Dagster, Airflow, Argo Workflows, n8n, Step Functions: job schedulers. JVM, Python, Kubernetes, or AWS. Wrong primitive for an AI-coding-agent DAG.

LangGraph ([interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)): MIT, Python, PyPI **1.2.11**. Needs a checkpointer database. Best *agent-graph* HITL on this list. Not bun YAML. README claims Klarna/Replit (interpretation: marketing, not measured).

Mastra ([suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume)): TypeScript, YC W25. LICENSE file 404 on jsdelivr. HITL yes. Would replace Archon, not wrap it.

OpenAI Agents SDK: MIT, Python 3.10+. Agent runtime, not drain.

CrewAI, AutoGen, VoltAgent: multi-agent chat. CrewAI docs fetched; AutoGen github.io blocked.

Dify, Flowise, Sim: visual app builders. Docker or cloud. Operator spec rejects n8n-as-canvas.

**Leave Archon.** Next step: treat `archon workflow status --json` as the process list you already spawn, rather than shopping Temporal.

## Parallel agents, worktrees, merge

Pack today: computed path per handle (`worktree.ts`), Target run lock (`beads-dag-run.lock`), Main lock (`beads-dag.lock`), `--no-ff` merge then `bd close`, one conflict role, leftover repair from git (ADR-0002). Archon already offered a worktree. This pack turned it off.

gwq ([README](https://cdn.jsdelivr.net/gh/d-kuro/gwq@main/README.md)): Go CLI, brew `d-kuro/tap/gwq`. Fuzzy worktree manager aimed at parallel agents. License unverified. We already name paths from metadata. **No.**

Worktrunk ([README](https://cdn.jsdelivr.net/gh/max-sixty/worktrunk@main/README.md)): MIT OR Apache-2.0, Rust CLI. Makes worktrees as easy as branches for AI-parallel work. Checkout UX, not settle. **No.**

claude-squad ([README](https://cdn.jsdelivr.net/gh/smtg-ai/claude-squad@main/README.md)): tmux plus one workspace per agent; review before apply. Needs tmux and `gh`. LICENSE 404. Interactive multiplexer, not drain. **No.**

container-use ([README](https://cdn.jsdelivr.net/gh/dagger/container-use@main/README.md)): Apache-2.0, experimental, Go CLI plus Dagger. Branch **and** container. Later, as sandbox.

git-spice: stacked PRs, GPL-3.0. Human review stacks. **No.**

Graphite `gt`, spr, git-branchless: stacked PR or undo. spr fetch 404. **No.**

jj / Sapling: alternate VCS. jj Apache-2.0 (README). Would replace git. **No.**

GitButler ([README](https://cdn.jsdelivr.net/gh/gitbutlerapp/gitbutler@master/README.md)): GUI plus stacked/parallel branches. FSL-1.1-MIT. Competing-use clause. **No.**

vibe-kanban ([README](https://cdn.jsdelivr.net/gh/BloopAI/vibe-kanban@main/README.md)): whole agent board plus workspaces. npm `vibe-kanban`. **Sunsetting.** Would be an executor and a tracker. ADR-0007. **No.**

conductor, uzi, paseo: primary fetch 404. Unverified. Skip.

None of these serialize **N agents, one writer per worktree, merge into Main, stamp closed only after the merge commit**.

**Leave the pack git machine.** Next step: none, unless sandboxing lands and worktree creation becomes “create container+branch”.

## Sandboxing

Today a run is a git worktree on the same filesystem as Main, the store, and `~/.agents`. `BD_READONLY=1` is store policy, not a sandbox. That is the one layer where a mainstream tool does something this pack never started.

container-use (Apache-2.0, Go CLI + Dagger, MCP `container-use stdio`): isolated container *and* git branch. Experimental. Not bun-in-process. Replaces the isolation half of `ensureWorktree`, not `settle.ts`. Docs: https://container-use.com.

Dagger underneath: container engine. Service-shaped. A real Target cost if required.

E2B (https://e2b.dev/docs): hosted sandboxes. Network service. Against “nothing the runtime cannot install” if required.

OS options (bubblewrap, landlock): **unverified here** (no primary fetch this pass).

**Adopt later**, first time an agent is allowed to touch the network or `~`. Next step: one spike that runs `beads-dag-execute` inside `container-use` without changing pick, merge, or close.

## Operator surface

Already on `@xyflow/react` **12.11.6** (MIT, bun, https://reactflow.dev), `d3-dag`, cmdk, sonner, lucide, react-markdown, react-query write-then-reread.

`kit.tsx` is shadcn-shaped **on purpose**: Radix portals render empty until open; SSR tests read markup (`operator-ui/16`). Spec considered elkjs. Code uses d3-dag and falls back if the graph is cyclic. [shadcn](https://ui.shadcn.com/docs) is copy-paste primitives, not a runtime.

tldraw ([README](https://cdn.jsdelivr.net/gh/tldraw/tldraw@main/README.md)): infinite canvas plus `@tldraw/sync`. License: **no Production Environment** without a commercial key. Wrong model (whiteboard, not store projection). Legally radioactive for a served Target page.

Liveblocks / Yjs: collaborative presence plus persisted positions. Hosted or a websocket server. Positions must not enter beads (ADR-0007; spec out-of-scope).

shadcn blocks: pulling Radix would fight the served page. Leave `kit.tsx`.

BeadSpec, Bead Me Up Scotty, bd-board: prior notes under `.scratch/research-flow/` **were not in this tree** (ENOENT). Not re-fetched.

**Leave the canvas stack.** Next step: none unless elkjs is re-measured against d3-dag on a large Target.

## Comments

`bd comment` is append-only. Author and time are stamped by bd. Identity is a string (`BEADS_ACTOR` / `--author`).

Beads README (v1.2.2 tag *and* main) advertises **Messaging**, a *message issue type* with `--thread`. That is not threaded `bd comment`. Liveblocks Comments is a SaaS second store (docs fetch incomplete this pass). A React comment library would render threads the store cannot round-trip.

**Adopt later:** keep comments in beads. If threads matter, verify whether 1.2.2 `bd comment` can nest (unverified) or wait for upstream. Do not import a comment widget.

Next step: `bd comments --json` on this pin. If `--thread` is only the message type, leave flat.

## Multiplayer floor

Embedded Dolt is single-writer behind a file lock. Upstream: `bd init --server` plus `dolt sql-server` for concurrent writers (host, port, socket env). No users, ACL, or presence in beads docs fetched.

Linear, GitHub, and Liveblocks would become a second graph (forbidden by ADR-0001).

**Adopt later** only when a second human writes: server mode plus real `BEADS_ACTOR` values. Not an ACL product. Next step: none while single-writer is true.

## Run status / overlay

`overlay.ts` joins `beads-dag-run.lock`, `archon workflow status --json`, `run-lock.json`, `attempted-ids.json`, `summary.md` / `report.md`. Correct sources, wrong *shape*: the UI reverse-engineers files the pack already wrote.

Archon is the process supervisor. The pack is the semantic log. Neither is a published event stream.

[OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) is a **telemetry toolkit**, not a backend. A collector plus Jaeger is a service cost the Target should not require. Instrumenting bun nodes with OTLP would not tell the operator which issue is live.

**Adopt now:** one JSONL event file in `ARTIFACTS_DIR` (run started, claimed, merged, failed, lock stolen) that the overlay reads. Keep Archon status as the process list. Do not add OTel until someone is paging on drain latency.

Next step: write that log from `run-lock.ts` / `settle.ts`. Point `fetchLive` at it.

## Layout persistence

Positions live in `Graph.tsx` `dragged` ref. Reload keeps drags. Never writes beads. Collaborative persisted layout is a second graph.

**Leave it.** Next step: none.

## Docs, ADRs, skills

`docs/CONTEXT.md` plus `docs/adr/` plus `skills/` copied by `tools/flow.ts` is already the convention. log4brains and adr-tools would duplicate eight accepted ADRs.

**Leave it.** Next step: none.

## Client bundle

`page.ts` already **does not inline** the 1.2 MB script on a served page. `cacheClient: true` serves `/app.js` and `/app.css` with ETag and `no-cache` revalidate. Snapshots still inline so a file stands alone.

The “1.17 MB in every HTML response” claim is **stale for `serve.ts`**. Mainstream leftover: code-split React Flow.

**Adopt later** if TTFB hurts. Next step: measure `/app.js` bytes; only then dynamic-import `@xyflow/react`.

## Where hand-rolling is actually correct

Domain policy in the pack: three closures, no crossing `blocks`, merge before stamp, attempted-set outside the store, repair from git. No runner encodes this.

One worktree per issue named from handle and slug. Not Archon’s per-run worktree. Not a fuzzy worktree manager.

SSR kit without Radix portals, so the served HTML is the test fixture.

Canvas as a projection (ADR-0007). A collaborative-canvas library wants to own the graph.

File locks for Main and for the Target run. A store field cannot hold a pid.

## Doubt

GitHub.com was SSRF-blocked (`198.18.0.0/15` fake-IP). Primary evidence is jsdelivr READMEs/LICENSEs and vendor docs via `http://127.0.0.1:23379`. **Stars unverified.** GitHub release dates for Archon, claude-squad, container-use, gwq **unverified**.

`.scratch/research-flow/` was missing. BeadSpec and bd-board were not re-read.

conductor, uzi, paseo, spr, Mastra LICENSE, claude-squad LICENSE, bubblewrap/landlock, Sim internals, AutoGen docs: **unverified** (404 or github.io blocked).

Whether `@beads/bd@1.2.2` implements `--thread` on **comments** versus only the message type: README mentions Messaging; CLI behaviour **not executed**.

Archon `workflow status --json` schema beyond what `overlay.ts` parses: not independently fetched.

`source_check` was not used (search providers failed). Claims rest on fetched primary pages.

What would change the answer: Archon growing durable resume plus per-issue worktrees plus a status API (then delete overlay scraping). Beads growing comment threads and ACL on server mode (then skip Liveblocks). A requirement that agents must not share the host filesystem (then container-use moves to **adopt now**).
