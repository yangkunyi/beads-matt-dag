# Research: where the full spectrum still hand-rolls something already solved

## 1. Verdict

The flow is right to hand-roll its *semantics* and wrong to hand-roll several *mechanics*. Store, frontier rules, merge-before-stamp, the two-lock split, per-domain closure and the AI conflict turn inside one execution are design, and no product on the market does those — the pack is not reinvented wheels there. But three layers are paying real money for nothing: (a) the worktree lifecycle plus local-merge plumbing is exactly what `worktrunk` (`wt`) is, a single Rust binary whose whole README is this problem; (b) the operator surface's shadcn-shaped kit is `shadcn`'s own registry — `npx shadcn@latest add command toast dialog data-table sidebar message bubble` is the boring answer to seven of your own tickets (`.scratch/operator-ui/issues/05,11,12,13,14,15,16`); and (c) the 1.17 MB client ships uncompressed, unsplit and uncached-immutably, which two afternoons of `Bun.build --splitting`, `Bun.gzipSync` and hashed asset paths fixes. Two tempting answers are traps: **Gas Town**, beads' own sibling orchestrator, already contains a Bors-style merge-queue Refinery and a capacity Scheduler — but adopting it means adopting another whole flow, which the frozen constraints forbid; and **tldraw**, the obvious collaborative canvas, is licensed "no production environments" without a commercial key. Everything else in the runner catalogue (Airflow, Argo, Prefect, Dagster, Kestra, Windmill, n8n, Dify, Flowise, Step Functions) is a generic scheduler with the wrong primitives and a service you would have to install on every Target.

## 2. The table

| Layer | What we hand-roll today | Mainstream alternative | Verdict | Why one line |
|---|---|---|---|---|
| Store / graph / frontier | The *rules* on top of `bd ready` (gate, non-work types, attempted, allow-list) | `bd swarm validate`, `bd worktree`, `bd gate`, `bd merge-slot` | **No** | These are design rules, not wheels; upstream's neighbours are strictly weaker for a store-backed Target (see §1). |
| Executor / DAG runner | Archon YAML nodes + the pack's own loop, bookkeeping and repair | Restate; Mastra; Temporal; LangGraph; Inngest | **No now, Restate later** | Restate is the only one that is a single self-contained binary *and* lists Bun as a runtime *and* ships an approval-pause pattern — but adopting it makes the pack a service. |
| Worktrees + merge + conflict | `worktree.ts`, `lock.ts`, `settle.ts`, `verify.ts`, the conflict role | `worktrunk` (`wt switch/list/merge/hook`) | **Adopt later (spike)** | `wt` is precisely "worktrees as easy as branches" plus `wt merge`; the merge-before-stamp *contract* stays yours. |
| Sandboxing / isolation | A run is a git worktree on the same filesystem as `~/.ssh` | `@anthropic-ai/sandbox-runtime` (`srt`); container-use; microsandbox | **Adopt later** | `srt` is npm-installable, usable as a TS library, filesystem+network allowlists per process tree; Linux needs bubblewrap. |
| Operator surface | A hand-rolled "shadcn-shaped" kit, cmdk, sonner, dialogs, list | `shadcn` CLI + registry (Command, Toast, Dialog, Data Table, Sidebar, Message, Bubble) | **Adopt now** | You are re-implementing a registry that now ships all seven primitives as code you copy in. |
| Layout persistence | Positions are client-local and lost on reload | `zustand/middleware persist` / `idb-keyval`; Yjs if multiplayer | **Adopt now (tiny)** | Per-browser persistence is the correct floor and is ~20 lines; the spec already forbids the store. |
| Comments with authors/threads | Flat `bd comment`; author is a bd-stamped string | shadcn `Message`/`Bubble` + "human vs agent" attribution; no comment SaaS | **Adopt now (view only)** | The store already carries `author` + `created_at`; a thread renderer is a view problem, not a store problem. |
| Multiplayer floor | Single writer behind a file lock; no users, ACL, presence | beads **server mode** (`dolt sql-server`) + `better-auth` | **Adopt later** | Beads' own docs name multi-writer as server mode; do it when a second human exists, not before. |
| Run status / observability | Scrape `beads-dag-run.lock` + `archon workflow status --json` + artifacts | OpenTelemetry (traces + GenAI semconv), local viewer | **Adopt later (small)** | `bd` already emits OTLP metrics; adding one JSONL event stream per run is the cheap floor, a collector is the expensive one. |
| Docs / specs / ADRs / skills | Prose ADRs + a hand-written index; spec-shaped skills | `skills-ref` validator; MADR/adr-tools if you ever want tooling | **Adopt now (validator), leave ADRs** | You already write spec-shaped skills — validate them; your ADR prose is richer than MADR and the index is 8 rows. |
| Client bundle | 1.17 MB inlined/unsplit, uncompressed, `no-cache` revalidation | Compression + content-hashed immutable assets + `Bun.build --splitting` | **Adopt now** | Same bytes, ~70% less first-load cost; see the premise correction in §11. |

## 3. Store / graph / frontier — leave it

`bd` already owns the frontier (`bd ready`), the derived blocked-ness, atomic `--claim`, hash ids and the Dolt history. What this repo adds — the gate label, "non-work types never enter a drain", this run's `attempted-ids.json`, the allow-list, the cross-domain blocking preflight — is policy the store cannot hold. Upstream has near-neighbours and none of them fit:

- **`bd worktree`** — `create/list/remove/info`, and it "automatically share[s] the same beads database as the main repository via git common directory discovery" (beads docs). The pack instead computes names from the issue's `handle`/`slug` and proves the naming contract in tests; `bd worktree create <name>` has no notion of a handle and cannot fail a node when a name is underivable. **Leave it.**
- **`bd merge-slot`** — "an exclusive access primitive: only one agent can hold it at a time… prevents 'monkey knife fights' where multiple polecats race to resolve conflicts", with `metadata.holder` and a priority-ordered `metadata.waiters`. That is your `lock.ts`, in the store. Your README already argues why it is a file instead: a store field "would be backed up and restorable into a state that says 'held' with nothing holding it, and it has no pid to check" (ADR-0005). **Your reasoning beats the upstream primitive here — leave it.**
- **`bd swarm validate`** — reports ready fronts (waves), max parallelism, orphaned roots, cycles. Useful for a human reading an epic; the drain instead asks `bd ready` once per cycle and rebuilds the frontier live, which is fresher than a validation report. **Leave it.**
- **`bd gate`** — "async wait conditions that park a workflow step until the world catches up — a human decision, a timer, or a GitHub run or PR". The flow deliberately uses a label gate plus `bd human respond`-avoidance instead, because *its* gate means "an operator put this in the frontier", not "wait for an external fact". **Leave it.**

**Next step: none.** The only real store-layer gap is multi-writer, which is §7.

## 4. Executor / DAG runner — no swap; Restate is the only credible later answer

Blunt split of the catalogue you named:

- **Generic schedulers with the wrong primitives.** Airflow, Argo Workflows, Prefect, Dagster, Kestra, Windmill, n8n, Dify, Flowise, Sim, Step Functions. They orchestrate *tasks*; a run here is an agent turn inside a git worktree with a merge, a gate and a conflict turn. Worse, they cost a service: Windmill's state is entirely PostgreSQL and its docker-compose ships server + worker + worker-native + LSP + Caddy (multiplayer collaboration is Cloud/Enterprise-only); Argo's quick start is a Kubernetes install; Prefect needs its own server; n8n's license page 404'd for me, so I will not characterise its license beyond "not OSI-open by reputation" (unverified). **No, all of them.**
- **Temporal.** The right concepts, stated by Temporal itself: "Agent loops are long-running and stateful… The loop is a Workflow, each model call and tool call is an Activity, and a crash resumes the conversation instead of restarting it", plus an Approval design pattern using Signals/Updates and durable Timers. But it is a cluster-shaped dependency (Server + Workers + namespaces) for a flow whose unit of work is one repo on one machine. **No.**
- **Inngest.** Durable steps, each step "executed as a separate HTTP request", with the state store owned by Inngest's execution engine. That is a hosted-ish dependency and a programming-model tax ("any non-deterministic logic… must be placed within a `step.run()`"). **No.**
- **LangGraph.** Interrupt + checkpointer is genuinely the same shape (`Command(resume=…)` becomes the return value of `interrupt()`; "the checkpoint is your persistent cursor"), and prior research here already established that its human text lands in a *checkpoint*, not in beads — a second store unless a node writes `bd comment` after. Python-first. **No.**
- **Mastra.** The closest *library*-shaped fit: TypeScript workflows with `suspend()`/`resume()`, "snapshots are stored in your configured storage provider and persist across deployments and application restarts", plus a human-in-the-loop guide and durable-agent recovery. It would turn the pack from scripts-in-YAML into an app with a storage adapter and (likely) its own server. Bun support unverified. **Adopt later, only if the loop needs library semantics.**
- **Restate.** The strongest candidate on the facts: "Restate is a single self-contained binary. No external dependencies needed"; the TS quickstart explicitly offers a **Bun** runtime; durability is per-handler with a journal that persists progress ("If you kill/restart the service halfway through, the sleep will only last for what remained"); human approval is a shipped pattern — `awakeable` id + promise, resolved later by `curl …/awakeables/<id>/resolve`, "Agents that pause for human approval and resume when it arrives, even across restarts and infrastructure changes"; OTel tracing via hooks; a UI on 9070. Cost: a daemon (`restate-server`, installable globally via npm) plus registration of the service endpoint. **Adopt later — and only for the resume/HITL need, not as an Archon replacement.**

The honest framing: your drains are *re-runnable*, not *resumable* — repair-from-git plus failed-attempt comments is a deliberate substitute for durable execution, and it works because the unit of work is small and Main is the truth. That is why this layer is "no" rather than "you are behind".

**Next step:** leave the runner alone. If a killed turn's lost work ever becomes the top pain, prototype Restate's awakeable pattern around **one role** (the conflict role), not the loop — a bounded spike that can be thrown away.

## 5. Worktrees + parallel agents + merge — adopt later, and only `wt`

Sort your candidate list by *which problem it solves*, because most of it solves a different one:

- **Stacked PRs for humans** (the adjacent problem, not yours): `git-spice` ("a tool for stacking Git branches… create GitHub, Bitbucket, Gitea, or Forgejo Pull Requests", GPL-3.0), Graphite `gt`, `spr`, `git-branchless`, Sapling, GitButler. None of them allocate a worktree per issue, serialise a merge into Main, or resolve a conflict with an agent. **No, all.**
- **Jujutsu.** A different VCS with a genuinely better conflict model — "Conflicts can be recorded in commits… the operation will succeed. You can then resolve the conflicts later", automatic rebase with propagation of resolutions, colocated git workspaces. Tempting, wrong: your contract derives every git name from `handle`/`slug`, records a review position in `refs/beads-dag/reviewed`, and finds merges by *second parent*. That is a git contract; `jj` would rewrite it. **No.**
- **Parallel-session UIs**: `claude-squad` (Go + tmux + worktrees, review-before-apply, AGPL-3.0), `vibe-kanban` (**sunsetting** — its README says so; workspaces give an agent "a branch, a terminal, and a dev server" and inline diff comments), Conductor/Crystal/Paseo class apps. They manage *sessions for a human watching*, which is your operator surface's neighbour, not the drain. **No.**
- **Isolation suites**: `container-use` (Apache-2.0, "an open-source MCP server that works as a CLI tool… Powered by Dagger", each agent gets "a fresh container in its own git branch", experimental). It replaces §4's sandbox and §5's worktree with a container — a bigger change than it looks, and it hands merge decisions to git-checkout discipline. **Adopt later, only with a sandboxing mandate.**
- **Gas Town** (beads' own sibling, `steveyegge/gastown`). Contains the thing you hand-rolled, at scale: **Refinery** — "Per-rig merge queue processor… batches merge requests, runs verification gates, and merges to main using a Bors-style bisecting queue"; **Scheduler** — a "config-driven capacity governor for polecat dispatch" against API rate limits; **Hooks** — "Git worktree-based persistent storage for agent work"; Witness/Deacon/Dogs watchdogs; convoys; molecules/formulas. It needs Git 2.20+, `bd` 0.57+, Dolt, tmux 3.0+, sqlite3 and an agent CLI. Adopting it means adopting another whole flow — and your frozen constraints (three executors, merge inside drain) forbid exactly that. **No as a dependency; yes as a design source.** Steal the bisecting merge queue idea if `concurrency > 1` merges ever start colliding, and the scheduler's "batch dispatch under a configurable concurrency limit" idea, which is precisely your `concurrency: 4` + the 429 story in `.scratch/beads-dag.yaml`.
- **`worktrunk`** — the one to actually try. "Worktrunk is a CLI for git worktree management, designed for running AI agents in parallel"; worktrees addressed by branch with a path template; core `wt switch --create / wt list / wt remove`; **`wt merge`** — "squash, rebase, fast-forward merge, clean up in one command"; **hooks** — "run commands on create, pre-merge, post-merge"; plus LLM commit messages, per-worktree ports (`hash_port`) and a Claude Code integration. Rust binary, installable via brew/pacman/conda/cargo. It replaces `worktree.ts`'s allocation/resume half and gives you hook points where `verify` and `postMerge` already live.

What stays yours regardless: merge-before-stamp, `refs/beads-dag/reviewed`, the conflict role running **inside the same execution** with the gate re-run after resolution, and repair-from-git.

**Next step:** one afternoon spike — drive `wt switch --create beads/<feature>/<NN>-<slug>` from `worktree.ts` behind a flag, with `postMerge` mapped to `wt`'s post-merge hook, and run `worktree-repro.ts` plus `checkpoint-repro.ts` against it. If three repros go green without touching `settle.ts`, take it.

## 6. Sandboxing — adopt later; the gap is real but the cost is a system package

Today a worker's turn runs as a process whose cwd is a worktree on the same filesystem as the operator's `~/.ssh`, the Clash proxy and the whole `$HOME`, with a Pi bash tool. That is a defensible *trusted-agent* position, and the pack already constrains the store (`BD_READONLY=1` for the whole process tree). The mainstream options:

- **`@anthropic-ai/sandbox-runtime` (`srt`)** — "enforcing filesystem and network restrictions on arbitrary processes at the OS level, without requiring a container", using `sandbox-exec` (macOS) / **bubblewrap** (Linux) / WFP (Windows), network via HTTP + SOCKS proxies with domain allowlists; usable as a CLI *and* a library (`SandboxManager.wrapWithSandbox`, `annotateStderrWithSandboxFailures`); npm-installable. It drops into `worker-env.ts` — the same seam that already sets `BD_READONLY`. Cost: bubblewrap on Linux (a distro package) and thinking about the proxy allowlist (npm/registry/model endpoints). License unverified.
- **`microsandbox`** — Apache-2.0, Rust CLI + **TypeScript SDK** (`npm i microsandbox`), "hardware-level isolation with tiny virtual machines", branching/snapshot of live sandboxes, OCI images. Requirements: **KVM on Linux**, Apple Silicon on macOS; self-described beta. Stronger isolation, heavier prerequisite.
- **`container-use`** — per-agent container on a git branch via Dagger, Apache-2.0, experimental. Best when you also want the worktree replaced.
- **e2b / Daytona / Modal** class — hosted sandboxes; a network dependency and a per-run cost. **No.**
- **devcontainer / docker compose** — a real install for every Target. **No.**

**Next step:** one repro that runs one role's bash tool under `srt` with `allowWrite: [worktree, /tmp]`, `denyRead: [~/.ssh, ~/.config]`, and the model/proxy hosts allowlisted — asserting the store read still works and a write attempt fails. If bubblewrap cannot be assumed on Targets, park it.

## 7. Operator surface — adopt the registry now; layout persistence next; the whole-app options are last

You already use React Flow + d3-dag, react-virtual, cmdk, sonner, react-markdown, lucide, react-query; the kit is a hand-rolled "shadcn-shaped" layer (`package.json`, `tools/operator-ui/ui/`). Meanwhile:

- **`shadcn`** now runs a **registry** whose stated purpose is exactly "distribute your custom components, hooks, pages, config, rules and other files to any project… not limited to React", and the component list now includes the ones you hand-rolled or queued as tickets: **Command** (cmdk), **Toast** (sonner), **Dialog**, **Data Table**, **Sidebar**, **Message**, **Message Scroller**, **Bubble**, **Questionnaire**, **Attachment**, **Marker**. Your `.scratch/operator-ui/issues/` 05, 11, 12, 13, 14, 15, 16 are a to-do list the registry already ships. **Adopt now.**
- **Layout persistence.** Client-local positions that vanish on reload is a solved, tiny problem: `zustand/middleware persist` or `idb-keyval`. Adopt now. **Shared** positions across people is only worth solving if §7's multiplayer floor arrives — then one JSON file, or Yjs (+ `y-indexeddb`/`y-websocket`) if you want it live. Yjs is the mainstream CRDT for exactly this, but do not pull a CRDT in to store 40 x/y pairs.
- **Whole apps — no, but read them.** The community list is rich: `bd-board` (TanStack Start, "writes disabled unless explicitly enabled"), `beads-ui` (`npx beads-ui start`, live updates), **Bead Me Up, Scotty** (kanban + epics + dependency-graph views, "live updates via SSE that react the moment `.beads/` changes; and human-vs-agent attribution throughout"), **BeadBoard** (agent-to-agent messaging, DAG graph, swarm coordination, "scope-based work reservations", embedded runtime), `beads-web` (TS/Rust single binary, drag-and-drop), **BeadSpec** (Tauri/React, "interactive dependency graph (React Flow + Cytoscape)", TipTap markdown editor, human decision queue), `Lista Beads` (VS Code, boards + dep graph). Your surface is a *view with a frozen write contract* (ADR-0007) — none of these implement your refusals (cross-domain `blocks`, `parent-child`, `closed`, `reading:`). **Steal parts, not apps:** SSE for live refresh (Scotty), human-vs-agent attribution in threads, a TipTap editor if comment prose ever needs structure.
- **tldraw — no.** Its license grants development use, modification and bundling but requires agreeing "Not to use the Software in Production Environments", preserves license-key enforcement and "watermark display", and forbids removing notices. For a surface an operator actually uses, that is a purchase, not a library.

**Next step:** run `npx shadcn@latest init` in a scratch copy of `ui/` and diff the generated Command/Toast/Dialog/Data Table against your kit; delete whichever of the seven tickets the registry closes.

## 8. Comments with real authors and threads — the store is not the problem

`bd comment` is flat and takes only `--file`/`--stdin` (no parent, no author flag), and the store already answers `author` + `created_at` per comment (your `store.ts` reads exactly `id`, `author`, `created_at`, `text` from `bd show --json --include-comments`). So "flat, author is a string" is beads' model, and the only real gaps are **rendering** and **identity**. Do not buy a comment product for this: Remark42/Isso/Cusdis/Artalk/giscus all bring their own database — a second store, which ADR-0001 forbids and which this repo resolved explicitly in prior research ("keep `bd comment`. No comment SaaS, no second thread").

**Adopt now:** thread rendering from the registry's `Message`/`Bubble`/`Message Scroller` components, grouping by author and distinguishing human from agent (Scotty already does the attribution and is worth reading for the visual rule). **Next step:** one ticket — "comments render as a thread; the write is still `bd comment`" — which is your existing `operator-ui/10` with a registry component instead of a hand-rolled post.

## 9. Multiplayer floor — adopt later, and write the trigger down now

Beads' own docs make the choice explicit: embedded mode is "Single-writer (one process at a time)… enforced via file lock", and server mode (`bd init --server`, `dolt sql-server` on 3307, or `gt dolt start`) is "Multi-Writer / Orchestrator… Switch to server mode when you need: multiple agents writing simultaneously, Orchestrator multi-rig setups". That is the whole multi-writer answer, and it is a service you start — which is why "adopt later" is the honest verdict for a one-operator Target.

When a second human appears, the mainstream identity/ACL floor is **`better-auth`** (TypeScript, in-process, installs into your own DB, plugins for organizations/roles/admin — license and plugin details unverified) rather than Keycloak/Authentik/Zitadel (a second service) or Clerk/WorkOS (a SaaS dependency for a local tool). Presence/live updates: **SSE first** — you already do write-then-re-read through react-query, and Scotty demonstrates SSE-over-`bd` as the simple version; Liveblocks/PartyKit/Supabase Realtime only if you want presence semantics you don't currently need.

**Next step:** one short ADR, not code: "single-writer until a second human; then server mode + `better-auth` + SSE, and the run lock stays the Target's mutex" — so the next session does not rediscover this.

## 10. Run status and observability — adopt later, cheaply, and do not stand up Langfuse

Your overlay reads four things: the run lock, `archon workflow status --json`, the artifacts directory, and `attempted-ids.json` (`tools/operator-ui/overlay.ts`). That is a scrape, but it is a scrape of *facts the run already writes*, and the pack's own rule — a run writes views, never state — is what keeps it honest. The upstream floor is bigger than you need:

- **`bd` already exports OpenTelemetry**: `BD_OTEL_ENABLED=true` plus `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, with a recommended local stack of VictoriaMetrics + Grafana; resource attributes include `bd.actor`, and spans cover `bd.command.*`, `dolt.*`, `hook.exec`. Traces only export to console today. So half of "the tooling is instrumented" is already true for the store, for free.
- **OTel GenAI semantic conventions** have moved out of the main spec repo into `open-telemetry/semantic-conventions-genai` (the old page is now a redirect), i.e. they are still in motion — a reason not to build an overlay on their attribute names yet.
- **Self-hosted agent observability** (Langfuse et al.) is the wrong shape of cost here: Langfuse's own architecture page lists Postgres + **ClickHouse** + Redis/Valkey + S3 + web + worker containers. **No** for a one-operator flow.

**Adopt later, small:** one append-only `events.jsonl` per run (node, issue, outcome, duration, reason), written by `node-outcome`-adjacent code; map it to OTel spans only when a *second* consumer exists (a viewer, a benchmark, a cost query). **Next step:** none now. If you do one thing, put the run id into every line the pack already prints on stderr so `archon workflow status --json` and the logs can be joined.

## 11. The client bundle — adopt now, but the premise is off

Two corrections from reading the code, then the fix:

1. **The served page does not inline the client.** `renderPage` defaults to inlining (`clientBundle()`), but `serve.ts` passes `cacheClient: true`, which emits `<link rel="stylesheet" href="/app.css">` + `<script type="module" src="/app.js">`, and `handleOverviewRequest` serves those with `content-type`, an **ETag** and `cache-control: no-cache` (i.e. revalidate, 304 on match). So on `:8765` the 1.17 MB is fetched once and revalidated, not re-sent per response. The inline path is the *standalone snapshot* (`renderPage` called with no options) — if that is what you are opening, the number is right. Worth confirming which entry you actually ship before fixing the wrong one.
2. **The real costs are compression, immutability and splitting.** `/app.js` goes out with no `Content-Encoding` (node:http does not compress), the URL is not content-hashed, and everything — React, React Flow, d3-dag, react-markdown (+ its unified/micromark tree), cmdk, sonner, react-virtual — is in one bundle for first paint.

The mainstream fix, in order of value per hour:
- compress: `Bun.gzipSync`/Brotli on the built asset, or serve through `Bun.serve` (which also gives you routes/static assets instead of hand-written node:http request parsing), and set `Content-Encoding`;
- hash the filenames and switch to `Cache-Control: public, max-age=31536000, immutable` (the ETag already gives you correctness; this removes the round trip);
- split with `bun build --splitting` and lazy-import the detail panel (react-markdown) and the canvas (React Flow + d3-dag), so the issue list paints without them;
- measure before guessing: `bun build --metafile` and look at the top few modules — I expect react-markdown's tree and d3-dag to be the surprise.

**The bigger lever, stated and not recommended:** this is a server-rendered view over `bd`. An htmx/partial-render surface with a small island for the canvas would delete most of the bundle — but it fights the React canvas you deliberately chose, so: **leave the architecture; fix the delivery.**

**Next step:** one commit — metafile, gzip, hashed asset paths, `Bun.serve`. Measure before and after and write both numbers into the ticket.

## 12. Docs, specs, ADRs and skills — one validator, otherwise leave it

- **Skills:** you already write Agent-Skills-spec-shaped skills (`name`/`description` frontmatter, `scripts/`/`references/`/`assets/`, progressive disclosure). The spec's own reference implementation, **`skills-ref`** (`agentskills/agentskills`), exists to validate frontmatter and naming. Your `tools/flow.ts check` already byte-compares installed copies; adding validation there is a few lines and catches the failure the byte-comparison cannot see (a skill that installs fine and violates the spec). **Adopt now.**
- **ADRs:** MADR / `adr-tools` / `log4brains` are the mainstream; your eight ADRs carry argument and rejected alternatives that MADR's template would flatten, and the index is eight rows. **Leave it**; revisit `log4brains` only if the ADR set crosses ~30 and the index becomes a generation problem.
- **Specs/spec-driven:** Spec Kit, OpenSpec, Tessl were already surveyed in `.scratch/research-flow/raw/sources/02-*`; `BeadSpec` shows a working OpenSpec↔beads bridge if that ever becomes interesting. **Leave it.**

**Next step:** add the `skills-ref` check to the `check` verb of `tools/flow.ts`.

## 13. Where hand-rolling is actually correct

- **Merge-before-stamp, and repair from git rather than the store.** Your README states the invariant: `closed` means the work is in Main, and a run killed between merge and record is repaired by finding the merge commit whose subject names the branch *and* whose second parent is that branch's tip. No runner, tracker or worktree tool expresses this — it is the correctness argument of the whole flow.
- **The frontier rules the store cannot hold** (gate label, non-work types, this run's attempts, allow-list with named exclusions). `bd ready` gives the raw answer; the exclusions report is what makes a no-op explainable. Nothing to buy.
- **The two-file lock split** — a Main-write lock that is re-entrant within one async context, and a run lock held by the workflow runner's pid with dead-pid steal, in *git's* directory rather than the store. `bd merge-slot` is the store version of the same idea and your own argument against it (a restorable "held" with no pid) is stronger for your case.
- **Closure per domain, and a gate that never crosses.** Three domains, each with its own meaning of `closed`, and a preflight that walks blocking ancestry at any depth — both at `open` and again at every `claim`, because a question can be answered mid-run. That is a design nobody sells.
- **The conflict turn inside the same execution**, with the gate re-run after resolution and exactly one conflict turn per execution, all inside one Main-lock transaction. `wt` has pre-/post-merge hooks; Gas Town's Refinery has a merge queue; neither resolves a conflict with an agent mid-execution and re-tests the tree it merges.
- **The pack as bun scripts with no service, no database and no queue.** This single constraint disqualifies ~80% of the catalogue above, and it is a legitimate design choice: the only binaries a Target must have are ones the store/runner already require (`bd`, `archon`, and for experiments `dvc`).
- **Documents in git, state in the store, one record per fact.** ADR/MADR tooling, wikis and doc databases all want to own the document corpus; your split is sharper than theirs.

## 14. Doubt

- **GitHub was unreachable from this host** (`github.com`/`raw.githubusercontent.com` resolve into `198.18.0.0/15`, blocked by the fetch guard, with and without the proxy). I read repositories through the jsDelivr mirror (`cdn.jsdelivr.net/gh/…/README.md`) or their own docs sites. Consequence: **no release dates, no version numbers, no star counts, no LICENSE files** for most candidates. Every activity/adoption claim below rests on the project's own README/docs wording, not on release history.
- **Licenses unverified** except the four I read in-source: claude-squad (AGPL-3.0), git-spice (GPL-3.0), container-use (Apache-2.0), microsandbox (Apache-2.0), tldraw (custom, read in full). Unverified and worth checking before adoption: Restate (I suspect BSL for the server), Mastra, Windmill, n8n, LangGraph, Temporal, Inngest, `srt`, shadcn, better-auth.
- **The 1.17 MB figure.** I found the inline path but not the entry that ships it (the served page links `/app.js`). If the number came from a standalone snapshot, it is accurate but describes a file, not a response; if it came from `:8765`, something differs from the code I read.
- **Bun support unverified** for Mastra; **local dev requirement unverified** for Inngest (I did not read its self-hosting/dev-server page); **execution risk unverified** for `srt` under bun on this host (bubblewrap presence, and whether the model client tolerates the proxy).
- **I ran none of these tools.** Every "adopt" is a reading, not a measurement; the spikes in §5, §6 and §11 are what would turn them into findings.
- **`bd worktree`/`bd merge-slot`/`bd swarm` behaviour on *this* `bd` version** (the repo pins 1.2.2 per `docs/agents/issue-tracker.md`) — the docs I read are for the current site, not necessarily 1.2.2.

**What would change the answers:** a second human joins → §7 and §8 flip to *adopt now* (server mode + better-auth + SSE); a killed run's lost work becomes the top pain → §4 flips to a Restate spike; agent runs stop being trusted with `$HOME` → §5 flips to *adopt now*; the constraints loosen enough to allow one more required binary → §3 (`worktrunk`) can be taken this week.

## Sources

**Kept**
- Repo: `.archon/workflows/beads-dag/README.md`, `docs/CONTEXT.md`, `docs/adr/0001…0008`, `docs/agents/issue-tracker.md`, `docs/specs/2026-09-17-operator-surface.md`, `tools/operator-ui/{serve,page,store,overlay}.ts`, `tools/operator-ui/ui/build.ts`, `tools/flow.ts`, `package.json`, `tsconfig.{pack,tools}.json`, `.scratch/beads-dag.yaml`, `.scratch/operator-ui/issues/10`, `.scratch/research-flow/{dag-canvas-tech-base,operator-hitl-ui}.md` — current state and prior surveys.
- Beads docs: `beads.gascity.com/llms.txt`, `/cli-reference/{worktree,merge-slot,swarm,comment,gate}.md`, `/multi-agent/coordination.md`, `/architecture/dolt.md`, `/reference/observability.md`, `/community-tools.md` — upstream primitives, modes, OTel, community surfaces.
- Gas Town README (`cdn.jsdelivr.net/gh/steveyegge/gastown@main/README.md`) — Refinery, Scheduler, hooks, prerequisites.
- Restate: quickstart + `ai/patterns/human-in-the-loop` + `llms.txt` — single binary, Bun, awakeables, approvals.
- Mastra: `workflows/overview`, `workflows/suspend-and-resume`, `storage/overview` — suspend/resume + snapshots in storage.
- Temporal: `develop/typescript`, `evaluate/use-cases-design-patterns` — agents-as-workflows, approval pattern, signals/timers.
- Inngest: `learn/how-functions-are-executed` — steps-as-HTTP-requests, engine-owned state.
- Windmill `advanced/self_host` — Postgres, compose topology, EE-only multiplayer.
- Argo quick start, Prefect install — service/K8s cost.
- `worktrunk` README, `claude-squad` README, `container-use` README, `microsandbox` README, `srt` README (Anthropic sandbox runtime), `jj` README, `git-spice` README, tldraw license.
- shadcn registry docs; Agent Skills specification; OTel GenAI "moved" page; Langfuse self-hosting architecture; Bun `runtime/http/server` docs.

**Rejected / deprioritized**
- Blogs, listicles and Product-Hunt-class pages on sandboxing and agent orchestration — owners only.
- `bd-board`, `beads-ui`, `Bead Me Up, Scotty`, `BeadBoard`, `beads-web`, `BeadSpec`, `Lista Beads` as *adoptions* — read for parts; each would be a second surface or a second executor.
- `vibe-kanban` — sunsetting; mentioned only to close the question.
- n8n sustainable-use license page (404) — I refused to characterise its license from memory.
- GitHub repository pages and release pages — unreachable; READMEs via jsDelivr used instead.

## Next steps (ordered)

1. `shadcn` registry in `ui/` — closes up to seven of your own tickets. (hours)
2. Bundle: gzip + hashed immutable paths + `bun build --splitting`, measure with `--metafile`. (hours)
3. `worktrunk` spike behind a flag, gated by `worktree-repro.ts` + `checkpoint-repro.ts`. (an afternoon)
4. Layout persistence in the browser + the comment thread view over `bd comments`. (hours)
5. An ADR recording *when* the flow goes multi-writer (server mode + `better-auth` + SSE). (minutes)
6. `skills-ref` in `tools/flow.ts check`. (minutes)
7. `srt` as a library in `worker-env.ts`, allowlisting the worktree and the model/proxy hosts. (an afternoon, only if bubblewrap is assumable)
8. Park until pain: Restate (resume/HITL), Mastra, container-use, microsandbox, Yjs, OTel collector, any generic scheduler.
