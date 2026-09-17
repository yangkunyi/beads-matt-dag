# Research: assemble (or reuse) a bottom layer for beads-matt-dag, with multi-person collaboration

**Repo:** `/data3/yky/beads-matt-dag` (current Main).
**Question:** given the already-built product (beads store, three domain executors, operator surface as a view) **and** a new multi-person collaboration requirement, what does the complete assembly need, which existing products/components fill each layer, and which 2–4 concrete assemblies keep ADR-0001 and the three executors?
**Constraint:** do not implement. Do not edit `docs/`, `tools/`, pack, or the beads store. Primary sources only. Prior note `.scratch/research-flow/bottom-layer-assembly.md` is background, not recopied as authority.

Evidence labels: **direct evidence** (page or local-doc text), **interpretation** (what that implies here), **researcher inference** (not stated by the source).

Network: live `github.com` / `docs.github.com` resolve into `198.18.0.0/15` and were blocked. GitHub claims use Wayback. Beads owner site `beads.gascity.com` and jsDelivr copies of owner + community READMEs were fetched. `source_check` was not run (search providers other than fetch were unavailable: Exa 429; Brave/Tavily/SearXNG/Jina unconfigured). Validation is fetch + local docs only.

---

## Summary

Keep beads as the store (ADR-0001) and keep the three domain executors (ADR-0007). Collaboration does **not** require replacing the graph: beads already owns identity, typed edges, comments, delete, and `bd ready` / `bd blocked`; **server mode** is the owner-documented multi-writer path. What beads does **not** own is a User/auth/permission model — comment authors are an **actor string** (`BEADS_ACTOR` → `git config user.name`), and owner architecture explicitly says there is no real-time collaboration. Fill that at the operator **intent door** (authenticated humans, one actor per writer), not by swapping the database for Linear/GitHub. Community UIs (Scotty, BeadSpec, beads-ui, bd-board, BeadBoard) can replace the DIY React Flow **view**, not the store; Linear/GitHub/GitLab/Plane would replace beads and contradict ADR-0001.

**Recommended assembly:** beads in **server mode** + keep DIY operator-ui (write-then-re-read, forum chrome over `bd comments`, layout local) + keep drain / inquiry / experiment. Identity sits on the HTTP door. Do not put the graph in Yjs.

---

## What a complete assembly needs (this product, not a generic tracker)

Split from this repo’s contract (`docs/CONTEXT.md`, ADR-0001, ADR-0006, ADR-0007, ADR-0008, `docs/specs/2026-09-17-operator-surface.md`, `docs/agents/issue-tracker.md`). **Researcher inference** on the grouping; each primitive is **direct** in those files.

### Store primitives (beads must remain the only graph — ADR-0001)

| Primitive | Meaning here |
|---|---|
| Identity | Hash issue id; `handle` / `slug` are metadata |
| Status | `open` / `in_progress` / `closed`. Humans on the surface must **not** stamp `closed` |
| Edges | Intra-domain `blocks`; crossing `relates-to` and `discovered-from`; **never** cross-domain `blocks`; `parent-child` forbidden on the operator surface |
| Comments | Flat append (`bd comment` / `bd comments`); forum chrome is view. Author must be a **real person or agent**, not one git user for everyone |
| Frontier | Derived: blocked = a blocker is not closed; ready = open and not blocked. Drain adds `ready-for-agent` and per-run allow-list **outside** the store |
| Delete | `bd delete`; refuse if dependents; refuse `in_progress`; confirm; no cascade/orphan (ADR-0008) |
| Triage | Five labels only from the surface: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` (one replaces one) |
| **NEW: multiplayer** | Concurrent human writers + agents on the **same** graph; comment `author` distinguishes people; some auth/permission at the write door |

ADR-0001 (**direct**, `docs/adr/0001-beads-owns-the-store-graph-and-frontier.md`): “An issue's state, the edges between issues, and the question ‘what can start’ are three views of one database, so all three live in beads.”

### View (operator surface — already on Main)

Local confirmation (**direct**, `tools/operator-ui/serve.ts` header): React page; “React Flow projects the store”; one tagged HTTP intent door (comment, create, add/remove edge, triage, start, delete). Graph is `bd list` / `bd show`, never jsonl.

ADR-0007 / spec (**direct**): positions and gestures live in the view; beads remains the graph. Rejected: second graph in the canvas, Yjs as store, replacing beads so the surface can edit. Canvas must not claim, run workers, or stamp `closed`.

Pain named in the brief (treated as product requirement, not re-verified empirically): full page reload after writes; comments do not feel like a forum thread; drawing edges is fiddly. Desired view work: write-then-re-read without full reload; keep dragged positions; forum-like comment UI over `bd comments`; status fill colors; delete with confirm.

**NEW view work for multiplayer:** show distinct authors; do not pretend one OS user is the forum. Presence/cursors, if any, stay view-sync and must not become the graph.

### Execution (keep three executors — ADR-0007)

| Domain | Type | Executor | `closed` means |
|---|---|---|---|
| development | work types (`task`, `bug`, …) | `beads-dag-drain` | work is in Main |
| inquiry | `decision` | `beads-dag-inquiry` | question answered |
| experiment | `experiment` | `beads-dag-experiment` | record complete |

Shared shell only. Do not merge executors. Do not assign an executor per issue. Operator “start” launches the existing domain run + optional allow-list of issue ids (claim pool, not a label, not a brake). Picture does not run.

ADR-0004 file: **not present** under `docs/adr/` (tried several slugs). The rule is restated **directly** in ADR-0006 and `docs/CONTEXT.md`: a blocking relation never crosses a domain.

---

## Findings

### 1. Store: beads already owns the graph writes this product needs

1. **Claim:** Beads is a Dolt-backed issue graph; JSONL is not the store; `bd ready` is the claimable frontier. **Sources:** [How Beads Works](https://beads.gascity.com/core-concepts), [Sync Concepts](https://beads.gascity.com/core-concepts/sync-concepts), README via [jsDelivr](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/README.md). **Support:** direct evidence. **Confidence:** high.

   A bead has hash ID, title, type, priority, status `open` → `in_progress` → `closed`. “Ready work is the claimable frontier of the graph: open beads with no open blockers, excluding anything in progress, blocked, deferred, or held by a gate.” “The local Dolt database is the source of truth for `bd list`, `bd show`, `bd ready`, and every write command.” JSONL is an export, not the sync channel.

2. **Claim:** Edge types this repo uses exist in beads: `blocks`, `discovered-from`, `relates-to` (`bd dep relate`). **Sources:** [Dependencies and Gates](https://beads.gascity.com/core-concepts/dependencies), [Graph Links](https://beads.gascity.com/core-concepts/graph-links), [bd dep](https://beads.gascity.com/cli-reference/dep). **Support:** direct evidence. **Confidence:** high.

   Blocking (affect `bd ready`): `blocks`, `parent-child`, `conditional-blocks`, `waits-for`. Non-blocking: `related`, `tracks`, `discovered-from`, `caused-by`, `validates`, `supersedes`. `relates-to` is bidirectional via `bd dep relate` / `bd dep unrelate`. Cross-domain `blocks` and `parent-child` on the surface are **policy** (ADR-0006 / spec), not missing store writes.

3. **Claim:** Comments are first-class store writes; listing is `bd comments <id> [--json]`; add is `bd comment` / `bd comments add`. Owner CLI does not document nested issue-comment threads. **Sources:** [bd comment](https://beads.gascity.com/cli-reference/comment), [bd comments](https://beads.gascity.com/cli-reference/comments), [Graph Links](https://beads.gascity.com/core-concepts/graph-links). **Support:** direct evidence. **Confidence:** high for flat append; medium that nested *issue* comments do not exist (threading is documented as `replies-to` on **messages**, not ordinary comments).

   Local tracker (`docs/agents/issue-tracker.md`, Ideas): “`bd comment` stamps author and time itself and the CLI appends only (no edit, no delete).” That is this Target’s contract. Owner `bd comment` help text fetched here does **not** mention author flags.

4. **Claim:** Delete exists; default refuses dependents; `--cascade` and `--force` (orphan) exist and this repo must not expose them. **Sources:** [bd delete](https://beads.gascity.com/cli-reference/delete), ADR-0008. **Support:** direct evidence. **Confidence:** high.

5. **Claim:** `bd show --json` carries a `revision` optimistic-concurrency token. **Sources:** [JSON Output Schema Contract](https://beads.gascity.com/reference/json-schema). **Support:** direct evidence. **Confidence:** high.

   “`revision` (string): guarded-write optimistic-concurrency token… always present.” **Interpretation:** useful for concurrent humans on the same issue; the operator door can echo it. Not a User model.

6. **Claim:** `bd human respond` comments **and closes**. The surface already forbids it. **Sources:** [bd human](https://beads.gascity.com/cli-reference/human), spec user story 42, `docs/agents/issue-tracker.md`. **Support:** direct evidence. **Confidence:** high.

### 2. Multiplayer: what beads actually owns (User, auth, concurrent writers, comment authors, permissions)

7. **Claim:** Embedded mode is single-writer (file lock). Server mode is the owner path for concurrent writers. **Sources:** README [Storage Modes](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/README.md) section, [How Beads Works — Storage modes](https://beads.gascity.com/core-concepts), [Dolt Backend](https://beads.gascity.com/architecture/dolt), [Architecture Overview](https://beads.gascity.com/architecture/index), [Git Integration — worktrees](https://beads.gascity.com/reference/git-integration). **Support:** direct evidence. **Confidence:** high.

   README: “**Embedded (default)** — `bd init`. Dolt runs in-process, data lives in `.beads/embeddeddolt/`, **single writer**.” “**Server** — `bd init --server`. Connects to an external `dolt sql-server` for **multiple concurrent writers**; data lives in `.beads/dolt/`.” How Beads Works table: Embedded writers = “one (file-locked)”; Server = “many concurrent.” Dolt backend: “Lock Contention (Embedded Mode)… ‘database is locked’… If you need concurrent access, switch to server mode.” Git worktrees: “Embedded mode (the default) serves one writer at a time; for concurrent writers across worktrees, use server mode.” Switch when you need “Multiple agents writing simultaneously.”

8. **Claim:** Beads has **no User object, no login, no ACL**. Actor is a string used for `created_by` and audit trails. **Sources:** [Configuration — Actor Identity Resolution](https://beads.gascity.com/reference/configuration), [Agent Coordination](https://beads.gascity.com/multi-agent/coordination), [Architecture Overview — When NOT to use Beads](https://beads.gascity.com/architecture/index). **Support:** direct evidence. **Confidence:** high for actor/created_by; medium that comments use the same actor (owner comment CLI unfetched for author field; local tracker + Scotty treat actor as the stamp).

   Resolution order: `--actor` → `BEADS_ACTOR` → deprecated `BD_ACTOR` → `git config user.name` → `$USER` → `"unknown"`. “For most developers no configuration is needed — issue authorship matches commit authorship automatically.” Agent coordination: “Beads has no agent registry — assignees are plain strings.” Architecture trade-offs: “Works offline / **No real-time collaboration**”; “Version-controlled database / Server mode needed for concurrent writers.” Unsuitable for: “**Large teams (10+)**”, “**Real-time collaboration** — No live updates; requires explicit sync”, “Non-developers”. “For these use cases, consider GitHub Issues, Linear, or Jira.” Server-mode auto-commit defaults **OFF** because `DOLT_COMMIT` after every write under concurrent load causes “database is read only” errors.

   **Interpretation:** two humans on one machine both running `bd` without `BEADS_ACTOR` will look like one git user. That is exactly the “single git user pretending to be the forum” failure. Server mode solves **lock contention**, not **identity**.

9. **Claim:** Cross-machine sync is explicit `bd dolt push` / `pull`, not live multiplayer. **Sources:** [Sync Concepts](https://beads.gascity.com/core-concepts/sync-concepts), Architecture Overview. **Support:** direct evidence. **Confidence:** high.

   Architecture: “Avoid parallel edits - If two machines create issues simultaneously without syncing, Dolt’s cell-level merge handles most conflicts automatically.” That is clone-sync, not two browsers on one store.

10. **Claim:** Community UIs that care about human-vs-agent **invent** attribution on top of beads, because beads has no such flag. **Sources:** Scotty README via [jsDelivr](https://cdn.jsdelivr.net/gh/brendan-appstart/bead-me-up-scotty@main/README.md). **Support:** direct evidence. **Confidence:** high for Scotty; medium as a general beads gap (one community tool stating it).

    “beads has no human-vs-agent flag, so the UI stamps its own writes with a configured **human actor** (`BEADS_ACTOR`); anyone in the human allowlist renders as 👤, everyone else as 🤖.” “This is a local viewing preference, not a permissions system.”

### 3. View candidates: community beads UIs vs DIY React Flow (replace the view, not the store)

Owner community list (**direct**): [community-tools.md](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md) — “Tools should use the `bd` CLI… Tools that read the old `.beads/issues.jsonl` format directly are not compatible.”

11. **Claim:** BeadSpec is a native desktop GUI: React Flow + Cytoscape dependency graph; reads Dolt SQL; writes through `bd`. **Sources:** [community-tools.md](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md), [BeadSpec README](https://cdn.jsdelivr.net/gh/boardthatpowder/BeadSpec@main/README.md). **Support:** direct evidence. **Confidence:** high.

    “BeadSpec is a frontend. The `bd` CLI remains the source of truth — BeadSpec reads Dolt SQL directly for speed and writes through `bd`.” Graph: “Interactive visual graph (React Flow + Cytoscape.js).” Also: human decision queue, TipTap editor, `dolt_log()` polling. **Interpretation:** could replace DIY graph drawing. Would **not** enforce this repo’s door (no `closed`, no cross-domain `blocks`, no `parent-child`, start = domain run). Desktop, not the HTTP operator surface. OpenSpec/Ruflo extras are out of scope here.

12. **Claim:** Scotty (“Bead Me Up, Scotty”) is a **local, single-user** web UI with a React Flow dependency graph, comments, and human-vs-agent badges; all writes go through `bd`. **Sources:** [community-tools.md](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md), [Scotty README](https://cdn.jsdelivr.net/gh/brendan-appstart/bead-me-up-scotty@main/README.md). **Support:** direct evidence. **Confidence:** high.

    README: “A local, **single-user** web UI.” “beads has no HTTP API, so the app shells out to the `bd` CLI… the app adds **zero** new persisted schema.” Graph: “interactive React Flow dependency graph (drag node→node to link).” Comments: “author-stamped comment threads.” Drag-and-drop: “Backlog = `deferred`, Done = `bd close`.” **Interpretation:** replacing operator-ui with stock Scotty would let the canvas stamp `closed` (ADR-0007/0006 forbid that) and is not multi-person (self-described single-user). Graph gesture is the closest fetched community analogue to this surface.

13. **Claim:** beads-ui is a local kanban/issues web UI via `bd` CLI; live updates; not a DAG editor in the fetched README. **Sources:** [community-tools.md](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md), [beads-ui README](https://cdn.jsdelivr.net/gh/mantoni/beads-ui@main/README.md). **Support:** direct evidence. **Confidence:** high for kanban; medium that it has no graph (README features list has Issues / Epics / Board, no graph).

14. **Claim:** bd-board is a local-first kanban dashboard through `bd`; writes enabled by default; **not** a hosted multi-tenant app. **Sources:** [bd-board README](https://cdn.jsdelivr.net/gh/jeanpfs/bd-board@main/README.md). **Support:** direct evidence. **Confidence:** high.

    “The app does not store its own database. It shells out to `bd`.” “`bd-board` is not designed as a hosted multi-tenant app… writes are always enabled, so anyone who can reach the app can mutate local bead data.” **Interpretation:** replacing the view without an auth door makes multi-person **worse**.

15. **Claim:** BeadBoard is a beads **view plus an execution/orchestration layer** (bb-pi, agent mail, reservations). Graph uses `@xyflow/react`. **Sources:** [BeadBoard README](https://cdn.jsdelivr.net/gh/zenchantlive/beadboard@main/README.md), community-tools. **Support:** direct evidence. **Confidence:** high.

    “Multi-agent orchestration and communication system.” “The Orchestrator (bb-pi)… spawns typed worker agents.” Fallback: “Without Dolt, BeadBoard falls back to reading `.beads/issues.jsonl` directly” — owner community-tools forbids jsonl for current versions. **Interpretation:** adopting BeadBoard as the operator surface would import a **second executor**, which ADR-0007 rejects. Graph view alone is reusable in principle; the product is not “just a view.”

16. **Claim:** React Flow is a view library whose quick start keeps nodes/edges in React `useState` and `onConnect` → `addEdge`. **Sources:** [Quick Start](https://reactflow.dev/learn), [State management](https://reactflow.dev/learn/advanced-use/state-management). **Support:** direct evidence. **Confidence:** high.

    Matches ADR-0007: treat `onConnect` as a proposal into operator-actions, never as the graph of record. This Target already does that (`tools/operator-ui/serve.ts`).

17. **Claim:** Yjs is a CRDT of shared types for collaborative editors; it is not an issue store. **Sources:** [docs.yjs.dev](https://docs.yjs.dev), [A Collaborative Editor](https://docs.yjs.dev/getting-started/a-collaborative-editor), [Y.Doc](https://docs.yjs.dev/api/y.doc). **Support:** direct evidence + interpretation. **Confidence:** high.

    Intro: “Modular building blocks for building collaborative applications like Google Docs and Figma.” Shared types merge without conflicts. Guide binds Quill to `ydoc.getText('quill')` and syncs via providers. **Interpretation:** putting issues/edges in a `Y.Doc` is the second graph ADR-0007 rejected. Using Yjs **only** for cursor presence / layout positions (not written to beads) would be view-sync. Owner beads architecture already says no real-time collaboration **in the store**.

### 4. Products that would replace beads (not just the view)

18. **Claim:** Linear is a hosted multi-writer issue store with User UUIDs, OAuth, comments owned by User, and relations `blocks` / `related` / `duplicate` (+ GraphQL `similar`). It is **not** a DAG editor and has no `discovered-from` / `bd ready`. **Sources:** [Issue relations](https://linear.app/docs/issue-relations), [Getting started GraphQL](https://linear.app/developers/graphql), [OAuth](https://linear.app/developers/oauth-2-0-authentication), [Teams](https://linear.app/docs/teams), [Webhooks](https://linear.app/developers/webhooks), `@linear/sdk` generated schema via [jsDelivr `_generated_documents.d.ts`](https://cdn.jsdelivr.net/npm/@linear/sdk@59.0.0/dist/_generated_documents.d.ts). **Support:** direct evidence. **Confidence:** high for fetched schema/docs; Linear product comments URL `linear.app/docs/comments` and `…/commenting` **404**.

    GraphQL: `viewer { id name email }`; “Copy model UUID.” `User` is “A user that has access to the the resources of an organization” with `id: ID`, `admin`, `app`, `active`. `commentCreate` / `CommentCreateInput`: `body`, `issueId`, `parentId` (nested comments), `createAsUser` only for OAuth `actor=app`. `Comment.user` is “The user who wrote the comment.” Webhook Comment payload includes `userId` UUID. `IssueRelationType` enum: `Blocks`, `Duplicate`, `Related`, `Similar`. `issueRelationCreate` takes UUID ids. Product: “Once the blocking issue has been resolved, the relationship moves under Related.” Issues “must belong to a single team” (from prior Linear create-issues docs; this pass fetched Teams: “Issues are tied to teams”). OAuth scopes: `read`, `write`, `issues:create`, `comments:create`, `admin`; `actor=user` (default) vs `actor=app`. **Interpretation:** Linear **does** own the multiplayer identity this requirement names. Replacing beads with it drops hash ids, local Dolt, `discovered-from`, `bd ready` as drain pick, and this repo’s domain/crossing rules. That is an ADR-0001 replacement, not a compose.

19. **Claim:** GitHub Issues own User-authored comments and blocked-by / blocking dependencies; UI is Relationships sidebar, not a DAG canvas. **Sources:** Wayback [Creating issue dependencies](https://web.archive.org/web/2026/https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies) (snapshot path `20260904060237`), Wayback [REST issue dependencies](https://web.archive.org/web/20260708110743/https://docs.github.com/en/rest/issues/issue-dependencies), Wayback [REST issue comments](https://web.archive.org/web/2026/https://docs.github.com/en/rest/issues/comments), Wayback GraphQL mutations (`addBlockedBy` / `removeBlockedBy` / `addComment`, snapshot `20251231215915`). **Support:** direct evidence (archive). **Confidence:** high for those snapshots; live `docs.github.com` **unfetched**.

    “People with at least triage permissions… can create issue dependencies.” CLI: `gh issue create --blocked-by` / `--blocking`; `gh issue view --json blockedBy,blocking`. REST: `…/issues/{issue_number}/dependencies/blocked_by`. Comment JSON includes `user.login` / `user.id`. GraphQL: `addBlockedBy` “Adds a 'blocked by' relationship to an issue.” Fetched GitHub dependency docs do **not** mention `relates-to` / `discovered-from` or a DAG editor.

20. **Claim:** GitLab linked issues are `relates_to` / `blocks` / `is_blocked_by` (blocking is Premium/Ultimate); notes have `author` User objects. **Sources:** [Linked issues](https://docs.gitlab.com/ee/user/project/issues/related_issues.html), [Issue links API](https://docs.gitlab.com/ee/api/issue_links.html), [Notes API](https://docs.gitlab.com/ee/api/notes.html). **Support:** direct evidence. **Confidence:** high.

    Guest+ can link; blocking icon on boards; close-a-blocked-issue confirmation. Notes: `author: { id, username, email, name }`. No DAG editor on fetched pages. **Interpretation:** hosted multi-user identity, different edge vocab, paid blocking, would replace beads.

21. **Claim:** Plane Timeline connectors are **schedule** dependencies (need start/due dates; dragging auto-shifts dependents), not this repo’s issue DAG. **Sources:** [Task dependencies / Timeline](https://docs.plane.so/core-concepts/issues/timeline-dependency), [Manage work items](https://docs.plane.so/core-concepts/issues/overview). **Support:** direct evidence. **Confidence:** high.

    “You need to set the Start date and Due date… for dependencies to appear in the Timeline layout.” “When you drag tasks along the timeline, dependent tasks will adjust automatically.” Relations: Relates To, Duplicate, Implements (non-scheduling). Comments: threaded replies in the work item. Contrast only, as requested.

22. **Claim:** Airflow/Prefect DAGs are execution graphs, not issue graphs. **Sources:** [Airflow Dags](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html), [Prefect flows](https://docs.prefect.io/v3/concepts/flows). **Support:** direct evidence. **Confidence:** high.

    Airflow: “A Dag is a model that encapsulates everything needed to execute a workflow” (schedule, tasks, retries). Prefect: a flow is a decorated Python function; runs are tracked. **Interpretation:** reminder that drain’s run ≠ the issue DAG (ADR-0007). Skip n8n-as-model (product forbids it).

### 5. Who owns what (store vs view vs execution)

| Owner | Identity | Concurrent writers | Comment authors | Auth / ACL | Blocking + non-blocking edges | Frontier | Graph **view** | Graph **editor as store** | Execution |
|---|---|---|---|---|---|---|---|---|---|
| **Beads embedded** | hash id; actor string | **no** (file lock) | actor string (git user default) | none | `blocks` + `relates-to` / `discovered-from` | `bd ready` / `bd blocked` | `bd graph` | no | no (this repo’s pack does) |
| **Beads server** | same | **yes** (dolt sql-server) | same actor strings | Dolt user/password for SQL, not human RBAC | same | same | same | no | no |
| **Linear** | team+seq + User UUID | hosted multi-writer | `Comment.user` | OAuth / API keys / team privacy | blocks/related/duplicate/similar; **no** `discovered-from` | **not fetched** as `bd ready` | list/board/timeline | **not in fetched docs** | Linear workflows, not drain |
| **GitHub Issues** | repo+number + User | hosted | `user` on comments | repo roles (triage+) | blocked-by/blocking; non-blocking **not in fetched dep docs** | **not fetched** | Relationships sidebar | **not in fetched docs** | Actions ≠ drain |
| **GitLab** | project+iid + User | hosted | note `author` | project roles; blocking paid | relates_to / blocks / is_blocked_by | close warning | Linked items | **not in fetched docs** | CI ≠ drain |
| **Plane** | work items + members | hosted (product) | comments + threads | product members | schedule + Relates To | timeline dates | Timeline connectors | schedule canvas | not this pack |
| **React Flow** | no | n/a | no | no | no | no | yes | if `useState` is the graph — forbidden | no |
| **Yjs** | CRDT clientID, not users | CRDT merge | editor text | provider-dependent | no | no | presence | would **be** a second store | no |
| **Scotty / BeadSpec / beads-ui / bd-board** | beads’ | whatever beads mode is | Scotty: BEADS_ACTOR allowlist | Scotty/bd-board: **none** (local) | via `bd` | via `bd` | yes (kanban and/or RF graph) | no — they call `bd` | **no** (except BeadBoard bb-pi) |
| **BeadBoard** | beads’ + agent ids | Dolt / jsonl fallback | mail + comments | agent register, not human IdP | via `bd` + own mail | via `bd` | RF + Dagre | no | **yes** (bb-pi) — conflicts ADR-0007 |

**Direct evidence** in rows above; “not fetched” is absence, not a negative proof.

### 6. Collaboration does not erase ADR-0001 — identity is a door concern

23. **Claim:** No fetched beads write required by ADR-0007/0008 is missing. The new collaboration requirement is **identity + concurrent access**, which server mode + `BEADS_ACTOR` cover only as strings, not as User UUIDs. **Support:** researcher inference from findings 1–10 vs spec solution list. **Confidence:** high for graph writes; medium for “good enough” forum authors (string vs UUID).

    Closest honest “write beads cannot do”: **authenticated User identity with permissions**. Owner architecture even points at Linear/GitHub/Jira for that class of product. That is still not a missing **graph** write. Composing auth on the HTTP intent door keeps ADR-0001. Replacing the store does not.

---

## Recommended assemblies (2–4), keep / replace / compose per layer

All four keep the **three executors** unless noted. None merge drain/inquiry/experiment. None assign an executor per issue.

### Assembly A — Keep beads (server mode) + keep DIY operator-ui + keep three executors *(recommended)*

| Layer | Action |
|---|---|
| **Store** | **Keep** beads. Move this Target from embedded to **server mode** (`bd init --server` / `BEADS_DOLT_SERVER_MODE`) so concurrent humans and the drain are not file-locked. Do not treat JSONL as sync. |
| **Identity (compose, not a second graph)** | At the **one tagged HTTP door**: authenticate humans; set `BEADS_ACTOR` (or `--actor`) per request from that login; never let two people share the process git user. Agents keep their own actor strings. Optional: persist a mapping of login → actor in door config, **not** in beads schema. |
| **View** | **Keep** `tools/operator-ui`. Do the already-desired view work: write-then-re-read without full reload; keep dragged positions in the view (not beads); forum chrome over `bd comments --json`; status fill colors; delete confirm. `onConnect` stays a proposal into operator-actions. |
| **Execution** | **Keep** drain / inquiry / experiment. Start = existing run + allow-list. |

Why this does not contradict ADR-0001: every graph write still goes through `bd`. Why it addresses collaboration: server mode is the owner-documented multi-writer path; distinct `BEADS_ACTOR` values are the owner-documented authorship path. Remaining gap (named): no User UUID, no RBAC inside beads, no live presence — **acceptable** if “forum” means distinguishable append-only comments, not Figma-cursors.

### Assembly B — Keep beads + **replace the DIY view** with a community canvas, still behind this repo’s policy door

| Layer | Action |
|---|---|
| **Store** | **Keep** beads (prefer server mode, same as A). |
| **View** | **Replace** DIY React Flow chrome with **Scotty’s graph** or **BeadSpec’s React Flow + Cytoscape** as a drawing substrate — **or** keep React Flow and copy only their gesture/comment patterns. Do **not** take Scotty’s “Done = `bd close`”, bd-board’s unauthenticated writes, or BeadBoard’s bb-pi. |
| **Execution** | **Keep** the three runs. |

**Compose, do not drop-in:** community UIs speak `bd` but do not implement ADR-0006/0007/0008. The operator-actions module must remain the only write door. **Researcher inference:** highest-leverage steal is Scotty’s node→node link + author-stamped comment pane, re-homed on this door.

Reject as view replacements without a door: stock Scotty (closes issues), stock bd-board (anyone who can reach it writes), stock BeadBoard (second executor + jsonl fallback).

### Assembly C — Keep beads + compose **view-only** multiplayer (Yjs/presence), never as store

| Layer | Action |
|---|---|
| **Store** | **Keep** beads server mode (A). Graph, comments, edges stay `bd`. |
| **View** | **Compose** Yjs (or similar) **only** for layout positions, cursors, and “who is looking at which node.” After a store write, still re-read beads. If Yjs holds nodes/edges, that **is** the rejected second graph. |
| **Execution** | **Keep** three executors. Live overlay of a run stays Archon/run-lock, not Yjs. |

Fits ADR-0007 (“Positions and gestures live in the view”). Does **not** by itself give real comment authors — still need Assembly A’s actor door.

### Assembly D — Replace beads with Linear *(contrast only; contradicts ADR-0001)*

| Layer | Action |
|---|---|
| **Store** | **Replace** beads with Linear (User UUID, OAuth, nested `commentCreate.parentId`, hosted multi-writer, `issueRelationCreate`). |
| **View** | **Replace** operator-ui with Linear’s list/board (no fetched DAG editor) **or** keep React Flow as a view over Linear GraphQL. |
| **Execution** | **Keep** three executors only if drain/inquiry/experiment are rewritten to pick from Linear instead of `bd ready`. That is a new integration, not “impossible,” but it **is** a new store. |

Cite the write beads cannot do: **first-class User + auth + nested comments + hosted concurrent humans**. Owner architecture even names Linear for “real-time collaboration.” **This still violates ADR-0001** unless that ADR is reopened. Missing vs this product: `discovered-from`, hash ids, local Dolt, `bd ready` as drain pick, domain-typed closure, operator-must-not-close. GitHub Issues is the same shape of replacement (User comments + blocked-by) with even less edge vocabulary.

**Do not recommend D** unless the lab explicitly decides identity is store, not door.

---

## Replace-view vs replace-store (call-out)

**Could replace DIY operator-ui (view only), if policy stays in this repo’s door:**

- BeadSpec (desktop; RF + Cytoscape graph; writes `bd`)
- Scotty (web; RF graph + comments; self-described single-user; stock UI will `bd close`)
- beads-ui / bd-board (kanban, not DAG-first)
- React Flow + elkjs (already chosen locally; keep as projection)
- Yjs (presence/layout only)

**Would replace beads (store) — contradicts ADR-0001 unless cited:**

- Linear
- GitHub Issues
- GitLab issues
- Plane work items

**Would replace or duplicate execution (contradicts ADR-0007):**

- BeadBoard bb-pi / swarm runtime
- Airflow / Prefect / n8n (execution DAG ≠ issue DAG; n8n forbidden as model)

---

## Answers to the five questions

1. **Complete assembly?** Store primitives (table above) + view (React Flow projection, local layout, forum chrome, intent door) + execution (three domain runs, allow-list at pick). Multiplayer adds: beads **server mode**, per-human **actor**, auth on the door — not a new graph database.

2. **Existing products per layer?** Store: beads (keep). View: DIY operator-ui, or Scotty/BeadSpec as canvas. Execution: keep pack runs; Airflow/Prefect/Plane timeline are the wrong kind of DAG. Linear/GitHub/GitLab are alternative **stores**.

3. **Multiplayer ownership?** Beads: no User; actor string; embedded single-writer; server multi-writer; no RBAC. Linear: User UUID, OAuth, `Comment.user`, team privacy, hosted concurrent writers. GitHub/GitLab: User on comments + repo/project roles.

4. **2–4 assemblies?** A (recommended), B (replace view, keep door), C (Yjs for presence only), D (Linear replace — contrast, ADR-0001 conflict). Three executors kept in A–C; D only if drain is rewritten onto Linear.

5. **Replace view vs replace store?** See call-out above.

---

## Contradictions

1. **Beads `parent-child` vs ready queue** (unchanged from prior research)
   - [Dependencies](https://beads.gascity.com/core-concepts/dependencies): `parent-child` listed under **Blocking types (affect `bd ready`)**.
   - [Issues & Dependencies](https://beads.gascity.com/core-concepts/issues): `parent-child` “Ready Queue Impact: **No**”.
   - [How Beads Works](https://beads.gascity.com/core-concepts): affects ready **indirectly** — “a blocked parent blocks its children”.
   This repo forbids `parent-child` from the operator surface. Do not resolve; do not write it.

2. **`related` vs `relates-to`**
   - Dep type table uses `related`.
   - Graph-links / `bd dep relate` use `relates-to`.
   This Target’s word is `relates-to` (`docs/CONTEXT.md`). Keep calling `bd dep relate`.

3. **Beads owner vs this collaboration requirement**
   - Architecture: Beads is **not** for real-time collaboration or large teams; consider Linear/GitHub/Jira.
   - This lab’s ADRs: beads **is** the store; surface is a view.
   Recorded, not silently resolved: treat Linear as the **hosted-identity** product, and still keep beads unless ADR-0001 is reopened (Assembly D).

4. **Delete cascade**
   - Owner `bd delete` offers `--cascade` / `--force`.
   - ADR-0008: refuse, no cascade, no orphan.
   Policy on extra writes; not a missing primitive.

5. **Community tools vs owner jsonl rule**
   - Owner: do not read `.beads/issues.jsonl`.
   - BeadBoard README: jsonl fallback without Dolt.
   Do not take that fallback.

6. **Scotty “Done = close” vs ADR-0006/0007**
   - Scotty drag to Done runs `bd close`.
   - Operator must not stamp `closed`.
   Stock Scotty cannot be the operator surface.

None of these are “beads cannot store the graph.”

---

## Missing evidence

- **Live** `github.com/gastownhall/beads` and live `docs.github.com` (SSRF `198.18.0.0/15`). GitHub claims are Wayback snapshots.
- Local file **ADR-0004** — not found under `docs/adr/`; rule taken from ADR-0006 + CONTEXT.
- Beads comment JSON fields (`author` key name) — comment CLI help does not list them; JSON schema lists `comments` as objects without field breakdown. Local tracker asserts author+time stamp.
- Nested issue-comment threads in beads (only `replies-to` for mail documented).
- Linear product comments pages (`/docs/comments`, `/docs/commenting`, `/docs/roles-and-permissions`) **404**. Comment model taken from GraphQL schema + webhooks.
- Linear/GitHub “ready work” API comparable to `bd ready`.
- Whether this Target is currently embedded or already server mode — **not inspected** (store not to be edited; `bd info` not run).
- `source_check`: not run (providers unavailable).
- BeadHub (community “coordination server”) README: listed in community-tools, **not fetched** this pass.
- GitHub GraphQL `User` object live page: blocked.

---

## Sources

**Kept**

- [How Beads Works](https://beads.gascity.com/core-concepts) — identity, ready, storage modes, edge types
- [Dependencies and Gates](https://beads.gascity.com/core-concepts/dependencies) — blocking vs non-blocking
- [Graph Links](https://beads.gascity.com/core-concepts/graph-links) — `relates-to`, `replies-to`
- [Sync Concepts](https://beads.gascity.com/core-concepts/sync-concepts) — Dolt vs JSONL
- [Dolt Backend](https://beads.gascity.com/architecture/dolt) — embedded vs server, lock contention, migration
- [Architecture Overview](https://beads.gascity.com/architecture/index) — multi-writer, “when NOT to use Beads”
- [Configuration](https://beads.gascity.com/reference/configuration) — actor identity
- [Agent Coordination](https://beads.gascity.com/multi-agent/coordination) — assignees are strings
- [JSON schema](https://beads.gascity.com/reference/json-schema) — `revision`, comments
- [Git Integration](https://beads.gascity.com/reference/git-integration) — worktrees + server mode
- [bd comment](https://beads.gascity.com/cli-reference/comment) / [bd comments](https://beads.gascity.com/cli-reference/comments) / [bd dep](https://beads.gascity.com/cli-reference/dep) / [bd delete](https://beads.gascity.com/cli-reference/delete) / [bd human](https://beads.gascity.com/cli-reference/human) / [bd init](https://beads.gascity.com/cli-reference/init)
- README via [jsDelivr](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/README.md) — storage modes wording
- [Community tools](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md)
- [BeadSpec README](https://cdn.jsdelivr.net/gh/boardthatpowder/BeadSpec@main/README.md)
- [Scotty README](https://cdn.jsdelivr.net/gh/brendan-appstart/bead-me-up-scotty@main/README.md)
- [beads-ui README](https://cdn.jsdelivr.net/gh/mantoni/beads-ui@main/README.md)
- [bd-board README](https://cdn.jsdelivr.net/gh/jeanpfs/bd-board@main/README.md)
- [BeadBoard README](https://cdn.jsdelivr.net/gh/zenchantlive/beadboard@main/README.md)
- [Linear issue relations](https://linear.app/docs/issue-relations), [GraphQL getting started](https://linear.app/developers/graphql), [OAuth](https://linear.app/developers/oauth-2-0-authentication), [Teams](https://linear.app/docs/teams), [Webhooks](https://linear.app/developers/webhooks), [Security](https://linear.app/docs/security)
- `@linear/sdk` [generated GraphQL types](https://cdn.jsdelivr.net/npm/@linear/sdk@59.0.0/dist/_generated_documents.d.ts) — User, Comment, IssueRelation
- Wayback GitHub issue dependencies, REST dependencies, REST comments, GraphQL mutations
- [GitLab linked issues](https://docs.gitlab.com/ee/user/project/issues/related_issues.html), [issue links API](https://docs.gitlab.com/ee/api/issue_links.html), [Notes API](https://docs.gitlab.com/ee/api/notes.html)
- [Plane timeline](https://docs.plane.so/core-concepts/issues/timeline-dependency), [Plane work items](https://docs.plane.so/core-concepts/issues/overview)
- [React Flow learn](https://reactflow.dev/learn), [state management](https://reactflow.dev/learn/advanced-use/state-management)
- [Yjs intro](https://docs.yjs.dev), [collaborative editor](https://docs.yjs.dev/getting-started/a-collaborative-editor), [Y.Doc](https://docs.yjs.dev/api/y.doc)
- [Airflow Dags](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html), [Prefect flows](https://docs.prefect.io/v3/concepts/flows)
- Local: `docs/adr/0001-…`, `0006-…`, `0007-…`, `0008-…`, `docs/CONTEXT.md`, `docs/specs/2026-09-17-operator-surface.md`, `docs/agents/issue-tracker.md`, `tools/operator-ui/serve.ts`
- Prior notes (pointer only): `.scratch/research-flow/bottom-layer-assembly.md`, `.scratch/research-flow/dag-canvas-tech-base.md`

**Rejected / deprioritized**

- Live github.com / docs.github.com — blocked on this host
- DeepWiki / blogs / SEO roundups — not owner
- n8n — product forbids executable canvas
- Linear `/docs/comments`, `/docs/commenting`, `/docs/roles-and-permissions`, `/docs/members`, `/docs/guest-users` — 404
- Linear Apollo Studio schema page — JS shell
- Fibery — not in this pass; prior research 404
- `source_check` — providers unavailable
- BeadHub README — listed, unfetched
- Copying the prior bottom-layer note as new evidence

---

## Next steps

1. Confirm this Target’s beads mode (`embedded` vs `server`) with a read-only `bd info` / `.beads/metadata.json` — not done here.
2. If forum authors must be User UUIDs (not actor strings), that is an ADR-0001 reopen (Assembly D), not a view ticket.
3. If nested comment threads are required, read beads `replies-to` / messaging (`engdocs/messaging.md` on GitHub — **unfetched**) before a second comment store.
4. View work (out of this research’s edit boundary): operator-ui write-then-re-read; connect gesture already mapped; comment pane over `bd comments --json` with actor labels; optional presence (Assembly C).

## Supervisor coordination

None. Runtime artifact path used. Did not wait on parent when search APIs failed; continued on fetch.
