# Research: multi-user / multiplayer for the operator surface

## Executive verdict

Treat “a second human writes” as a *door* problem first and a *store* problem only when two **processes** (or two machines) actually contend. Beads 1.2.2 — this Target’s pin — is a relabel of the tested 1.1 line: it already has `--actor` / `BEADS_ACTOR`, `bd comment` authorship, atomic `--claim`, `bd dolt push`/`pull`, and `bd init --server`, and it does **not** ship `bd serve`, work leases, the events journal, or federation. The store has no User table and no ACL; identity in beads is a string. Keep the graph in beads (ADR-0001). Put login, sessions, and authorization on the operator HTTP process, mapping a principal to `--actor` on each tagged write. Do not pull Yjs, Liveblocks, Linear, GitHub Issues, Gas Town, or Lucia. Adopt a per-request actor string as soon as two humans share the door; adopt Dolt server mode when embedded file-lock contention appears; adopt better-auth only when a typed name can be impersonated (the door is no longer a trusted loopback). Until then, poll the existing `GET /overview`. Presence/cursors stay parked.

## Summary

Beads’ documented multi-writer path is Dolt **server mode** (`bd init --server` → `dolt sql-server`), not a second tracker and not a CRDT. On the 1.2.2 pin, that path exists; the HTTP/SSE API (`bd serve`) does not. Two humans through **one** operator process are not a Dolt multi-writer problem — they are identity, authorization, and freshness at the door. Two processes or two machines are.

## Findings

1. **Claim:** npm `@beads/bd@1.2.2` (this repo’s pin) is a relabel of v1.1.2, not the accidental 1.2.0/1.2.1 line. Work leases, the events journal, sync federation, the HTTP API server, and provenance events are **not** in 1.2.2. **Sources:** [Accidental v1.2.1 Release](https://beads.gascity.com/recovery/accidental-1-2-1-release), [Beads 1.2.1 Incident Report](https://blog.gascity.com/posts/beads-1-2-1-incident-report/), local [design consensus](docs/specs/2026-09-11-beads-issue-tracker-consensus.md). **Support:** direct evidence. **Confidence:** high.

   Quote (docs): “v1.2.2 superseded them by re-releasing the tested 1.1 line — it is the v1.1.2 code under a higher version number… The 1.2.x-only features (work leases, the events journal, sync federation, the HTTP API server, provenance events) are not in v1.2.2.”

   Quote (incident report): “released Beads v1.2.2, which is simply a relabeling of the last known good v1.1.2 release.”

   Local consensus §3, verified against the binary: **absent** from 1.2.2: `sync`, `heartbeat`, `reclaim`, `serve`, `events`. **Present:** `batch`, `merge-slot`, `comment`, `ready`, `assign`, `history`.

   Current npm `latest` is **1.3.0** ([jsDelivr `@beads/bd` package.json](https://cdn.jsdelivr.net/npm/@beads/bd/package.json)); 1.2.2 remains [1.2.2](https://cdn.jsdelivr.net/npm/@beads/bd@1.2.2/package.json). Live docs at [beads.gascity.com](https://beads.gascity.com/) mix post-1.2.2 material. **Inference:** do not design this door around `bd serve`, leases, or federation while the pin holds.

2. **Claim:** Embedded Dolt is the default and is documented as single-writer; server mode is the documented concurrent-writer path; both exist on the pin. **Sources:** [v1.2.2 README](https://cdn.jsdelivr.net/gh/gastownhall/beads@v1.2.2/README.md), [Dolt backend](https://beads.gascity.com/architecture/dolt), [Architecture](https://beads.gascity.com/architecture), [bd init](https://beads.gascity.com/cli-reference/init). **Support:** direct evidence (docs); local measurement is mixed (see Contradictions). **Confidence:** high for the documented contract; medium for how painful embedded contention is *here*.

   Quote (v1.2.2 README): “Embedded Mode (default)… Single-writer only (file locking enforced).” “Server Mode… `bd init --server`. Connects to an external `dolt sql-server`… Supports multiple concurrent writers.”

   Quote (architecture): “By default, Dolt runs in **embedded mode** (in-process, no separate server). For multi-writer setups (multiple agents, orchestrator), switch to **server mode** which connects to a running `dolt sql-server`.”

   Quote (`bd init`): “Pass —server to use an external dolt sql-server instead. In server mode, set connection details with —server-host, —server-port, and —server-user. Password should be set via BEADS_DOLT_PASSWORD.”

   Switch when: multiple agents writing simultaneously; orchestrator multi-rig; federation with remote peers. Auto-commit **defaults off in server mode** because `DOLT_COMMIT` after every write under concurrent load causes “database is read only” errors ([dolt backend](https://beads.gascity.com/architecture/dolt)).

   Current docs pin standalone `dolt` CLI to **2.2.0** for server/proxied mode (Dolt 2.3.x can break `DOLT_RESET('--hard')`). Embedded mode links Dolt inside `bd` and does not need that CLI. **Unverified on 1.2.2:** whether this Target’s binary matches that pin.

3. **Claim:** Cross-machine sync is `bd dolt push` / `bd dolt pull` against `refs/dolt/data`; `.beads/issues.jsonl` is not the sync channel. **Sources:** [Sync Concepts](https://beads.gascity.com/core-concepts/sync-concepts), [bd dolt](https://beads.gascity.com/cli-reference/dolt), local `docs/agents/issue-tracker.md`. **Support:** direct evidence. **Confidence:** high.

   Quote: “Beads issue data lives in Dolt. The local Dolt database is the source of truth… `.beads/issues.jsonl` is an export… Do not use routine `bd import .beads/issues.jsonl` as a replacement for `bd dolt pull`. JSONL import is upsert-only; it cannot infer that records absent from an export were deleted.”

   After a pull, this flow already requires `bd recompute-blocked` because `bd ready` trusts the stored blocked flag.

4. **Claim:** Actor identity is a string with no User/auth product in the store. Resolution order is `--actor` → `BEADS_ACTOR` → `BD_ACTOR` (deprecated) → `git config user.name` → `$USER` → `"unknown"`. Comment add also accepts `-a, --author`. There is no ACL. **Sources:** [Configuration — Actor identity](https://beads.gascity.com/reference/configuration), [bd comment / comments add](https://beads.gascity.com/cli-reference/comment), [v1.2.2 CLI global flags](https://cdn.jsdelivr.net/gh/gastownhall/beads@v1.2.2/docs/CLI_REFERENCE.md), [Agent coordination](https://beads.gascity.com/multi-agent/coordination), local `tools/operator-ui/comment.ts`. **Support:** direct evidence. **Confidence:** high.

   Quote (global flags): “`--actor string` Actor name for audit trail (default: `$BEADS_ACTOR`, git user.name, `$USER`).”

   Quote (config): “The actor name (used for `created_by` and audit trails) is resolved in this order…”

   Quote (coordination): “Beads has no agent registry — assignees are plain strings.”

   Local door already stamps `bd --actor <name> comment <id> --stdin` (`comment.ts`). Process flag: `bun tools/operator-ui/serve.ts --actor <name>`. **No session, no token, no per-request identity product** — one actor per process unless the door maps per request.

   Dolt server user/password (`BEADS_DOLT_SERVER_USER` / `BEADS_DOLT_PASSWORD`, default user `root`) is **SQL connection auth**, not per-actor ACL. Searches of the 1.2.2 CLI reference and live CLI index found **no** `bd serve` and **no** ACL commands.

5. **Claim:** Concurrency control is atomic claim plus Dolt cell-level merge on sync — not optimistic locking, not a version column the operator can stamp. **Sources:** [Architecture](https://beads.gascity.com/architecture), [bd update --claim](https://beads.gascity.com/cli-reference/update), [bd ready --claim](https://beads.gascity.com/cli-reference/ready), [Agent coordination](https://beads.gascity.com/multi-agent/coordination), [bd batch](https://beads.gascity.com/cli-reference/batch). **Support:** direct evidence for claim/merge; interpretation for “no optimistic lock at the door.” **Confidence:** high.

   Quote (`--claim`): “Atomically claim the issue (sets assignee to you, status to in_progress; idempotent if already claimed by you).”

   Quote (coordination): “`--claim` is atomic: when multiple agents pull from the same ready queue, the first claim wins.”

   Quote (architecture Why Dolt): “Cell-level merge: Concurrent changes merge automatically at the field level.” Trade-off table: “Works offline | No real-time collaboration” and “When NOT to use Beads: Real-time collaboration — No live updates; requires explicit sync.”

   Hash ids avoid create collisions ([hash-based IDs](https://beads.gascity.com/core-concepts/hash-ids)). `bd batch` is one Dolt transaction, all-or-nothing — this pack already uses it for claims.

   **Inference:** last-write-wins appears in third-party DeepWiki pages about JSONL field collisions; that is not the live Dolt path and was not verified in primary docs. Treat JSONL LWW as **unverified / wrong channel**.

6. **Claim:** `bd serve` HTTP/SSE does not exist on 1.2.2; current CLI index also lists no `bd serve`. A daemon SSE watch epic was closed because “the daemon has been removed.” Terminal `--watch` on `bd list`/`bd show` is TUI auto-refresh, not an HTTP event stream. **Sources:** consensus §3, [accidental 1.2.1](https://beads.gascity.com/recovery/accidental-1-2-1-release), [CLI reference index](https://beads.gascity.com/cli-reference), search hits on [issue #1602](https://github.com/gastownhall/beads/issues/1602) (GitHub body not fetched here). **Support:** direct evidence for absence on the pin and on the current generated CLI list; medium for the daemon-removal issue (search snippet only). **Confidence:** high for “no `bd serve` on 1.2.2”; medium for “gone on current main too.”

7. **Claim:** This operator surface already has a tagged write door and `GET /overview`; it does not execute and does not stamp `closed` / `reading:`. **Sources:** `tools/operator-ui/serve.ts`, `page.ts`, [ADR-0007](docs/adr/0007-operator-surface-is-a-view.md), [issue-tracker Operator surface](docs/agents/issue-tracker.md). **Support:** direct evidence. **Confidence:** high.

   Quote (`serve.ts`): “Writes go through one tagged door… Routes: GET / is the page, GET /overview is the same snapshot as JSON — what a write re-reads instead of reloading the page… POST /comment is the tagged write door.”

   Quote (`page.ts`): “A served page posts tagged intents through the write door.”

   Refused at the door: `closed`, `reading:`, non-triage labels, unknown intents, cross-domain `blocks`, `parent-child`. Allowed: comment, create (type = domain, `needs-triage`, no gate), start (existing run + allow-list, no claim/merge/close), same-domain `blocks`, crossing `relates-to`/`discovered-from`, the five triage labels as a replacing family, delete under ADR-0008.

8. **Claim:** Login, sessions, and authorization belong at this HTTP door, not in the beads graph. **Sources:** ADR-0001, configuration actor docs, better-auth [installation](https://www.better-auth.com/docs/installation) and [session management](https://www.better-auth.com/docs/concepts/session-management), [Lucia deprecation](https://lucia-auth.com/). **Support:** interpretation of constraints + vendor docs. **Confidence:** high as design; the mapping is not implemented.

   | Concern | Where it lives | Why |
   |---|---|---|
   | Comment author, `created_by`, assignee, audit | Store: actor **string** | Beads already stamps it; no User row |
   | “Who is at this browser?” | Door: cookie / session / name field | Store has no session |
   | “May this principal comment / triage / delete / start?” | Door: authorize the tagged intent | Beads has no ACL; the door already refuses intents |
   | Graph, frontier, comments body | Beads only | ADR-0001 |

   **Inference:** a better-auth `user`/`session` SQLite file beside the operator process is a **second database for auth**, not a second graph — allowed only if it never becomes the issue store. Stateless cookie mode ([session management](https://www.better-auth.com/docs/concepts/session-management)) avoids even that: “If you don't pass a database configuration, Better Auth will automatically enable stateless mode.” Most plugins still want a database.

   Lucia is dead: “Lucia was deprecated in March 2025” ([lucia-auth.com](https://lucia-auth.com/)). Do not recommend it.

9. **Claim:** Gas Town is a whole second flow (Mayor, rigs, polecats, Refinery merge queue, Scheduler, `gt up` Dolt+daemon). **Sources:** [Gas Town README](https://cdn.jsdelivr.net/gh/steveyegge/gastown@main/README.md), prior synthesis in `.scratch/research-flow/full-spectrum-assembly.md`. **Support:** direct evidence. **Confidence:** high. **No** as a dependency; steal ideas only (bisecting merge queue if `concurrency > 1` merges collide).

10. **Claim:** better-auth is a living TypeScript library (MIT), bun-compatible at the sqlite adapter, not a hosted IdP. **Sources:** [better-auth.com](https://www.better-auth.com/), [npm package.json license MIT, version 1.7.5](https://cdn.jsdelivr.net/npm/better-auth/package.json), [SQLite adapter — Bun built-in](https://better-auth.com/docs/adapters/sqlite), [installation — database required unless stateless](https://www.better-auth.com/docs/installation). **Support:** direct evidence. **Confidence:** high for licence and bun:sqlite docs; medium for production bun (`bun build --compile` has a known break: [issue 8428](https://github.com/better-auth/better-auth/issues/8428)). This pack does not compile a binary.

    `source_check` was run on the 1.2.2-feature-rollback and better-auth claims; it returned status `unclear` with no usable passage citations. Those claims rest on the fetched pages above, not on that checker.

## Options

Ranked for **when a second human writes**. Triggers are conditions, not dates. Frozen: do not move the graph into Yjs, Liveblocks, Linear, GitHub Issues, GitLab, Plane, or Feishu.

| # | Option | Replaces | Licence | Service / DB / queue? | bun | Verdict | Trigger |
|---|---|---|---|---|---|---|---|
| 1 | Per-request `BEADS_ACTOR` / `--actor` at the tagged door (name cookie or header → `bd --actor`) | Process-wide `--actor` only | n/a (already in `bd` + this door) | No | Yes (existing `serve.ts`) | **Adopt now** when two humans share one process | Do this when two humans comment on the same door and must not share one author string |
| 2 | Keep polling `GET /overview` after writes; optional short interval while the tab is visible | Nothing (already the refresh path) | n/a | No | Yes | **Adopt now** (keep) | Do this until a push channel exists in *this* pin; it is the freshness floor |
| 3 | Beads **server mode** (`bd init --server`, `dolt sql-server`, `bd dolt start`) | Embedded single-writer file lock | Beads MIT; standalone Dolt is a separate install | Yes: a local SQL server. Not a second graph. Pack still has no service | `bd` is a native binary; the door still shells out | **Adopt later** | Do this when two **processes** write at once (operator + drain, or two operator servers) and embedded “database is locked” / lost writes show up |
| 4 | `bd dolt push` / `pull` (+ `bd recompute-blocked`) | JSONL-as-sync | MIT | No extra service; uses git remote `refs/dolt/data` | n/a | **Adopt later** (already the backup path) | Do this when a second **machine** or clone must see the graph; not for two tabs on one host |
| 5 | better-auth at the door (prefer **stateless cookies**; else `bun:sqlite` file **outside** `.beads`) | Honour-system name field | MIT | Library. Stateless: no DB. Typical: User/Session tables — auth DB, not the graph | Documented `bun:sqlite`; not `bun build --compile` | **Adopt later** | Do this when the door is reachable beyond trusted loopback **and** forging `--actor` would be a real incident |
| 6 | Hand-rolled SSE from the door (watch store mtime / poll `bd` server-side, push to browsers) | Client poll of `/overview` | n/a | Still no beads HTTP API; the door becomes a tiny event source | Yes (`Bun.serve` can SSE) | **Adopt later** | Do this when two open tabs miss each other’s writes and poll interval is the complaint — not before |
| 7 | Presence / cursors, **layout only** (per-browser `idb-keyval` is not this) | Nothing in the store | depends | Liveblocks/Yjs **parked** (ADR-0009). PartyKit etc. are services | varies | **No** now; layout persist per browser is a separate small question | Do this only when two humans share the canvas and need to see each other’s pointer; never put positions in beads |
| 8 | Gas Town (`gt`) — Mayor, Refinery, Scheduler, `gt up` | The whole drain + operator | check upstream; needs `bd`, Dolt, tmux | Yes: daemon + Dolt + sqlite3 | No (Go + tmux) | **No** | Never as a dependency. Design source only if multi-merge collisions appear |
| 9 | `bd serve` / daemon SSE / work leases / federation | Polling; file lock | MIT (when it returns) | HTTP API was a 1.2.x-only feature **not in 1.2.2** | n/a | **No on this pin** | Revisit only if this Target **leaves** 1.2.2 and the binary actually ships `bd serve` |
| 10 | Lucia, Clerk/WorkOS, Keycloak/Authentik, Liveblocks Comments, Remark42/giscus | Door identity / `bd comment` | Lucia deprecated Mar 2025; others are SaaS or a second comment DB | Yes | — | **No** | — |
| 11 | Yjs / Liveblocks for the **graph** | Beads | — | Second graph | — | **No** | Forbidden by ADR-0001 / 0007 / 0009 |

## Recommended sequence

1. **Door identity without a product.** Keep `--actor` / `BEADS_ACTOR`. If a second human shares the process, map a name the browser sends to `bd --actor` **per request**. Still no session store. Keep `GET /overview` as the refresh. Do not stamp `closed` or `reading:`.

2. **Server mode when processes contend.** Leave the pack as bun scripts with no service. The Target’s beads store is allowed to run `dolt sql-server` — that is the one documented second-writer path that keeps the graph in beads. After any pull, `bd recompute-blocked`.

3. **better-auth only if the door leaves the trust boundary.** Stateless cookies if they suffice; otherwise a sqlite file that is not `.beads`. Session `name`/`email` → `--actor`. Authorization stays the tagged-intent allow-list this door already implements.

## What must stay hand-rolled

These are policy, not missing wheels:

- **Merge-before-stamp** (ADR-0002): `closed` in development means the merge is already on Main; repair a killed run from git, never from the store.
- **Three meanings of `closed`:** inquiry = the answer is written; development = the work is in Main; experiments = the result is recorded. A blocking edge must never cross domains.
- **The tagged intent door:** one POST grammar; unknown intents refused; the canvas is not a local editor (ADR-0007).
- **Five triage labels as bare words** (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Do not dimensionise them (`triage:…`); `bd set-state` is for `reading:`, not this family (ADR-0009).

Also stay ours: the pack with no service/database/queue; pid-first run lock (not `bd merge-slot`); gate **label** (not `bd gate`); worktree names from `handle`/`slug` (not `bd worktree`, not worktrunk).

## Identity: this door vs the store

The store will not grow a User table. `--actor` is the only authorship primitive. The door already decides *which writes exist*. Login answers *which human is speaking*. Authorization answers *which tagged intents that human may post*. Mapping is: authenticated principal → actor string → `bd --actor`. Putting users in beads would be a second schema beside the graph. Putting comments in Liveblocks would be a second comment store. Both are refused.

**Researcher inference:** two humans, one `serve.ts`, one embedded store, serialized HTTP writes, is **not** the situation server mode is for. Operator + drain **is** two writers; workers are `BD_READONLY=1`. Server mode is for that pair (or two doors), not for two browsers.

## Contradictions

- **Embedded concurrent writes.** Docs: embedded is single-writer, file-locked; “database is locked” → switch to server mode. Local consensus decision #5 chose embedded and reported “8 concurrent writers against one embedded DB, all exit 0, no stderr, no lost writes.” Direct evidence on both sides; they measure different things (documented lock vs one lab). Do not treat the lab as a licence to skip server mode once lock errors appear.
- **`bd dolt` help vs architecture.** `bd dolt` text says “Beads uses a dolt sql-server for all database operations. The server is auto-started transparently.” Architecture says embedded in-process is the default and server is opt-in. Both are upstream. For 1.2.2 this Target uses embedded (consensus). Treat auto-start language as server/orchestrator wording leaking into the CLI.
- **1.2.2 tag vs “docs Latest”.** jsDelivr `beads@v1.2.2/docs/CLI_REFERENCE.md` opens “Reference for bd Latest.” Prefer the accidental-1.2.1 page, the incident report, and the in-repo consensus for what the **pin** ships. Live [beads.gascity.com](https://beads.gascity.com/) describes a newer line (federation, leases, shared server).
- **Federation sovereignty tiers** differ between [configuration](https://beads.gascity.com/reference/configuration) (T1 = full sovereignty) and [federation guide](https://beads.gascity.com/multi-agent/federation) (T1 = no restrictions). Irrelevant on 1.2.2 (no `bd federation` as a load-bearing command). Recorded so it is not copied.
- **DeepWiki last-write-wins** vs primary “cell-level merge.” Primary wins; DeepWiki was not fetched as a source of truth.

## Missing evidence

- GitHub.com / raw.githubusercontent.com / gastownhall.github.io resolve into `198.18.0.0/15` and were blocked even with `proxy: http://127.0.0.1:23379`. Evidence is jsDelivr, beads.gascity.com, blog.gascity.com, better-auth.com, lucia-auth.com. Issue #1602 (daemon removed) is a search snippet, not a fetched page.
- `source_check` did not return citable passages (status `unclear`).
- Whether **this machine’s** `bd 1.2.2` binary still offers `bd init --server` was not re-run in this pass (no shell). Consensus implies the flag existed (they chose not to use it).
- Optimistic locking / row versions: no primary doc found. Unverified that none exists in SQL; verified that the CLI does not expose one to the operator.
- better-auth under bun **runtime** (not compile) on this host: not executed.
- Whether operator + drain already hits the embedded file lock on this Target: not measured.
- Dolt licence/version for a 1.2.2 server-mode install: current docs say 2.2.0; 1.2.2-era pin unverified.

## Open questions that need the operator

1. Is a second human on **this loopback** (`127.0.0.1:8765`), on a LAN bind, or on a public URL? That single answer chooses name-at-the-door vs better-auth.
2. Have operator writes and a drain already collided on the embedded lock, or is the second writer still hypothetical?
3. Is the pain missed **comments** (freshness), missed **who wrote this** (actor), or missed **cursors** (layout)? Only the first two are in scope before presence.
4. Stay on 1.2.2, or accept a beads upgrade (schema, leases, maybe HTTP API) as a separate decision? Multiplayer must not smuggle that upgrade.

## Sources

**Kept**

- Accidental v1.2.1 Release (https://beads.gascity.com/recovery/accidental-1-2-1-release) — what 1.2.2 actually is
- Beads 1.2.1 Incident Report (https://blog.gascity.com/posts/beads-1-2-1-incident-report/) — 1.2.2 = relabel of 1.1.2
- Architecture (https://beads.gascity.com/architecture) — embedded vs server, cell-level merge, no real-time collab
- Dolt backend (https://beads.gascity.com/architecture/dolt) — `--server`, remotes, auto-commit off in server mode
- Sync concepts (https://beads.gascity.com/core-concepts/sync-concepts) — `bd dolt push`/`pull` vs JSONL
- Configuration (https://beads.gascity.com/reference/configuration) — actor resolution, no User model
- CLI: init, dolt, comment, update, ready, batch, index (https://beads.gascity.com/cli-reference) — flags; no `bd serve`
- Agent coordination (https://beads.gascity.com/multi-agent/coordination) — atomic `--claim`, assignees are strings
- v1.2.2 README (https://cdn.jsdelivr.net/gh/gastownhall/beads@v1.2.2/README.md) — storage modes on the tagged tree
- @beads/bd 1.2.2 and latest package.json (jsDelivr) — pin vs 1.3.0
- better-auth introduction, installation, sqlite, sessions (https://www.better-auth.com/docs/…) — MIT, bun:sqlite, stateless mode
- lucia-auth.com — deprecated March 2025
- Gas Town README (https://cdn.jsdelivr.net/gh/steveyegge/gastown@main/README.md) — second flow
- Local ADRs 0001, 0002, 0007, 0008, 0009; `docs/agents/issue-tracker.md`; `docs/CONTEXT.md`; consensus spec; `tools/operator-ui/serve.ts` / `comment.ts` / `page.ts`

**Rejected / deprioritized**

- DeepWiki conflict-resolution pages — secondary; LWW not corroborated in primary docs
- GitHub issue HTML for #1602 — blocked; snippet only
- gastownhall.github.io — fake-IP blocked
- Clerk, Keycloak, Liveblocks Comments, Remark42 — second store or SaaS, forbidden
- tldraw, worktrunk — already refused (ADR-0009)
- Lucia successors-as-blog-roundups — lucia-auth.com and better-auth.com are enough

## Next steps

Only useful follow-up: on the **pinned binary**, run `bd init --help` and `bd --help` and record whether `--server` is present and whether `serve`/`watch`/`heartbeat` are absent — a thirty-second confirmation this pass could not shell. Measure whether operator + drain already serialize on the embedded lock. That measurement, plus the operator’s answer to “loopback or not,” decides between steps 1 and 2.

## Local pin verification (parent session)

Run on this host after the researcher returned: `bd version 1.2.2 (6c124203e)`.

- `bd init --help` **does** document `--server` (external `dolt sql-server`), plus `--server-host` / `--server-port` / `--server-user`, `--shared-server`, and experimental `--proxied-server*`.
- Top-level commands **do not** include `serve`, `watch`, `heartbeat`, `events`, `sync`, or `reclaim`. `federation` is listed; the pin still should not treat it as load-bearing for this door.
- `bd dolt --help` says “Beads uses a dolt sql-server for all database operations. The server is auto-started transparently” — the same wording the report flagged as leaking into the CLI while this Target stays embedded.

Operator + drain lock contention was **not** measured.
