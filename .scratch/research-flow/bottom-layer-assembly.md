# Research: better bottom layer than DIY React Flow + `bd comment` + beads edges

**Repo:** `/data3/yky/beads-matt-dag` (current Main).  
**Question:** is there a better *bottom layer* for assembling issues, blocking/non-blocking deps, comment threads, and a graph view — given that drain/inquiry/experiment **may** be decoupled from the dependency graph, and drawing a DAG + attaching comments is hard?  
**Constraint:** must not contradict ADR-0001 unless a write beads cannot do is cited. No implementation.

Evidence labels used below: **direct evidence** (page text), **interpretation** (what that implies for this repo), **researcher inference** (not stated by the source).

Network: `github.com` and `docs.github.com` resolve into `198.18.0.0/15` and were blocked by the fetcher. GitHub *live* pages are **unfetched**. GitHub claims below use Wayback snapshots. Beads GitHub HTML was also blocked; Beads claims use `https://beads.gascity.com/` and `cdn.jsdelivr.net/gh/gastownhall/beads@main/…`. `source_check` failed (Exa 429); claims rest on fetched pages only.

---

## Summary

No fetched owner product owns a better *store* for this repo than beads. Beads already holds identity, blocking and non-blocking edges, comments, delete, and `bd ready` / `bd blocked` / `bd graph`. GitHub and Linear own issues + comments + blocking relations and ship **issue-sidebar / list-board** UIs, not an issue-DAG editor. React Flow and Yjs are view/sync substrates, not issue stores. Decoupling execution from the graph makes a thin beads view *more* sufficient, not less: the pain described (hard to draw a DAG, hard to attach comments, full reload) is **view**, not a missing graph database.

**Recommendation for this repo:** keep beads as the store (ADR-0001). Do not replace it with Linear, GitHub Issues, GitLab, Plane, or a Yjs document. Invest in the operator **view**: persist layout locally, write-then-re-read without a full page reload, treat `onConnect` as a store proposal, and render comments as a conversation on top of `bd comment` / `bd comments` (flat append today). No fetched write required by ADR-0007/0008 is missing from beads.

---

## What a complete bottom layer needs

**Researcher inference** from this repo’s own contract (`docs/CONTEXT.md`, ADR-0001, ADR-0007, spec `docs/specs/2026-09-17-operator-surface.md`):

| Primitive | Meaning here |
|---|---|
| Identity | Stable issue id (hash id); handle is metadata |
| Edges | Intra-domain `blocks`; crossing `relates-to` / `discovered-from`; never cross-domain `blocks` |
| Comments | Store-backed thread on the issue (`bd comment`), not body-file prose |
| Frontier / blocked | Derived: blocked = a blocker is not closed; ready = open and not blocked; drain adds gates/allow-list outside the store |

ADR-0001 (**direct**): “An issue's state, the edges between issues, and the question ‘what can start’ are three views of one database, so all three live in beads.” Path: `docs/adr/0001-beads-owns-the-store-graph-and-frontier.md`.

ADR-0007 (**direct**): the operator surface is a view; “Positions and gestures live in the view; beads remains the graph”; rejected “a second graph in the canvas library” and “replacing beads with a relational store so the surface can edit.” Path: `docs/adr/0007-operator-surface-is-a-view.md`.

---

## Findings

### 1. Beads owns all four primitives (plus a CLI graph, not a first-party editor)

1. **Claim:** Beads is a Dolt-backed issue graph; `bd ready` is the claimable frontier; JSONL is not the store. **Sources:** [How Beads Works](https://beads.gascity.com/core-concepts), [Sync Concepts](https://beads.gascity.com/core-concepts/sync-concepts), README via [jsDelivr](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/README.md). **Support:** direct evidence. **Confidence:** high.

   Official docs: a bead has hash ID, title, type, priority, status `open` → `in_progress` → `closed`. “Ready work is the claimable frontier of the graph: open beads with no open blockers, excluding anything in progress, blocked, deferred, or held by a gate.” Sync: “The local Dolt database is the source of truth for `bd list`, `bd show`, `bd ready`, and every write command.” JSONL is “an export… not the canonical cross-machine sync channel.” Canonical path is now `docs/core-concepts/sync-concepts.md` (old `docs/SYNC_CONCEPTS.md` on jsDelivr **404**).

2. **Claim:** Beads has blocking and non-blocking edge types this repo already uses (`blocks`, `discovered-from`, `relates-to`). **Sources:** [Dependencies](https://beads.gascity.com/core-concepts/dependencies), [Graph Links](https://beads.gascity.com/core-concepts/graph-links), [bd dep](https://beads.gascity.com/cli-reference/dep), [bd link](https://beads.gascity.com/cli-reference/link). **Support:** direct evidence. **Confidence:** high.

   Blocking types on the dependencies page: `blocks` (default), `parent-child`, `conditional-blocks`, `waits-for`. Non-blocking: `related`, `tracks`, `discovered-from`, `caused-by`, `validates`, `supersedes`. Graph-links page: `relates-to` is a bidirectional see-also via `bd dep relate` / `bd dep unrelate`; `replies-to` is conversation threading for mail, also creatable with `bd dep add … --type replies-to`. `bd link` default type is `blocks`; `--type` includes `blocks|tracks|related|parent-child|discovered-from`.

3. **Claim:** Comments are first-class store writes: `bd comment` appends; `bd comments <id>` lists. They are not nested forum threads. **Sources:** [bd comment](https://beads.gascity.com/cli-reference/comment), [bd comments](https://beads.gascity.com/cli-reference/comments), [Graph Links](https://beads.gascity.com/core-concepts/graph-links). **Support:** direct evidence. **Confidence:** high.

   `bd comment` is “Shorthand for `bd comments add <id> "text"`” with `--file` / `--stdin`. Listing: `bd comments bd-123` / `--json`. Threading in owner docs is `replies-to` on **messages**, not a reply-tree on ordinary issue comments. **Researcher inference:** a “forum comments” UX is a view (or optional `replies-to` edges), not a reason to leave the store.

4. **Claim:** Delete exists; default refuses dependents; cascade/force are extra. **Sources:** [bd delete](https://beads.gascity.com/cli-reference/delete), ADR-0008 `docs/adr/0008-operator-may-delete.md`. **Support:** direct evidence. **Confidence:** high.

   Owner: remove dep links both directions, rewrite text refs, “Permanently delete… cannot be undone.” “Default: Fails if any issue has dependents not in deletion set.” Also `--cascade` and `--force` (orphan). This repo’s ADR-0008 **refuses** cascade/orphan and refuses delete while `in_progress`. That is policy on top of beads, not a missing write.

5. **Claim:** First-party graph is `bd graph` (terminal / Graphviz / self-contained HTML). Community UIs exist; tools must use `bd`, not JSONL. There is no first-party interactive DAG *editor* in fetched owner docs. **Sources:** [bd graph](https://beads.gascity.com/cli-reference/graph), [Community Tools](https://beads.gascity.com/docs/community-tools.md) via [jsDelivr community-tools](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md). **Support:** direct evidence + interpretation. **Confidence:** high for CLI/HTML viz; medium that no unpublished first-party editor exists (not found ≠ does not exist).

   `bd graph --html` → “Self-contained interactive HTML with D3.js visualization.” `--dot` for Graphviz. Community list includes BeadSpec “interactive dependency graph (React Flow + Cytoscape)”, Bead Me Up Scotty “dependency-graph views”, beads.nvim “dependency graph”, etc., all instructed to go through `bd`. **Interpretation:** owner treats graph UI as community; store remains CLI/Dolt.

6. **Claim:** `bd human respond` comments **and closes**. This repo already forbids it on the surface. **Sources:** [bd human](https://beads.gascity.com/cli-reference/human), spec user story 42, `docs/agents/issue-tracker.md`. **Support:** direct evidence. **Confidence:** high.

---

### 2. GitHub Issues: identity + comments + blocked-by/blocking; no DAG editor in fetched docs

7. **Claim:** GitHub documents issue dependencies as blocked-by / blocking on the issue **Relationships** sidebar, plus REST and GraphQL. **Sources:** Wayback [Creating issue dependencies](https://web.archive.org/web/2026/https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies) (snapshot title date in URL ~2026-09-04), Wayback [REST issue dependencies](https://web.archive.org/web/2026/https://docs.github.com/en/rest/issues/issue-dependencies) (snapshot `20260708110743`), Wayback GraphQL mutations (`addBlockedBy` / `removeBlockedBy`, snapshot `20251231215915`). **Support:** direct evidence (archive). **Confidence:** high for those snapshots; live `docs.github.com` **unfetched**.

   UI: “In the right sidebar, click Relationships” → Mark as blocked by / Mark as blocking. Boards/Issues page get a “Blocked” icon. CLI: `gh issue create --blocked-by` / `--blocking`; `gh issue view --json blockedBy,blocking`. REST: `GET/POST …/issues/{issue_number}/dependencies/blocked_by`, `GET …/dependencies/blocking`, remove blocked-by. GraphQL: `addBlockedBy` “Adds a 'blocked by' relationship to an issue.” REST page text search: **no** “DAG” or “graph” on that document.

8. **Claim:** GitHub has issue comments as a first-class REST resource. **Sources:** Wayback [REST issue comments](https://web.archive.org/web/2026/https://docs.github.com/en/rest/issues/comments). **Support:** direct evidence (archive). **Confidence:** high for existence; the fetched extract was a sample `IssueComment` JSON, not the full endpoint catalog.

9. **Claim:** Fetched GitHub issue-dependency docs do **not** describe a DAG canvas editor, non-blocking `relates-to` / `discovered-from`, or a `bd ready`-style frontier query. **Support:** interpretation of missing text on fetched pages. **Confidence:** medium (user docs may exist under other URLs; `about-issue-dependencies` archive **404**).

   **Researcher inference:** GitHub is a hosted issue store with blocking edges and comments. Replacing beads with it would drop local Dolt, hash ids, `discovered-from`, this repo’s domain/crossing rules, and `bd ready` as the drain’s pick API.

---

### 3. Linear: issues + blocked/blocking/related/duplicate + list/board/timeline; no DAG editor in fetched docs

10. **Claim:** Linear issue relations are blocked, blocking, related, duplicate; blocking becomes Related once the blocker is resolved. **Sources:** [Issue relations](https://linear.app/docs/issue-relations). **Support:** direct evidence. **Confidence:** high.

    “You can mark issues as blocked, blocking, related, and duplicate.” Shortcuts M+B / M+X. “Once the blocking issue has been resolved, the relationship moves under Related.” Mentions comments: “When you reference issues in a description or comment, they’ll automatically become a related issue.” Dedicated comments doc `https://linear.app/docs/comments` and `…/commenting` **404**.

11. **Claim:** Linear’s official display options are list, board, and (for projects) timeline — not a dependency DAG editor. **Sources:** [Display options](https://linear.app/docs/display-options), [Parent and sub-issues](https://linear.app/docs/parent-and-sub-issues), [Filters](https://linear.app/docs/filters), [Create issues](https://linear.app/docs/creating-issues). **Support:** direct evidence. **Confidence:** high for fetched pages; medium that Linear has no unpublished graph UI.

    Display options: “switch between board and list layouts”; initiatives/projects: “list view and timeline view. Project views also support board view.” Sub-issues are parent/child breakdown, optional auto-close, not a DAG editor. Issues “must belong to a single team” with consecutive IDs.

12. **Claim:** Linear GraphQL API exists but schema pages were not retrieved as readable text. **Sources:** [Linear Developers](https://developers.linear.app/docs/graphql/working-with-the-graphql-api) (thin/JS), Apollo schema URL JS-rendered. **Support:** missing evidence. **Confidence:** n/a.

    Product docs are enough to say Linear owns relations; **not** enough to cite `IssueRelation` GraphQL fields.

---

### 4. GitLab and Plane (optional): graph-ish views still are not this repo’s store

13. **Claim:** GitLab linked issues are bi-directional `relates to` / `blocks` / `is blocked by`, with REST. Blocking is Premium/Ultimate. No DAG editor on the fetched page. **Sources:** [Linked issues](https://docs.gitlab.com/ee/user/project/issues/related_issues.html), [Issue links API](https://docs.gitlab.com/ee/api/issue_links.html). **Support:** direct evidence. **Confidence:** high.

    UI: Linked items section. Closing a blocked issue shows a warning/confirmation. API `link_type`: `relates_to`, `blocks`, `is_blocked_by`.

14. **Claim:** Plane combines work items, blocking + schedule dependencies, non-blocking relations, and a **Timeline** with drag connectors — but connectors need start/due dates and auto-shift dependents (scheduling, not beads-style ready). **Sources:** [Manage work items](https://docs.plane.so/core-concepts/issues/overview), [Task dependencies / Timeline](https://docs.plane.so/core-concepts/issues/timeline-dependency). **Support:** direct evidence. **Confidence:** high.

    Dependencies: Blocked by, Blocking, Starts Before/After, Finishes Before/After. Relations: Relates To, Duplicate, Implements (custom types exist). Timeline: “drag connectors”; “When you drag tasks along the timeline, dependent tasks will adjust automatically.” That is an execution/schedule canvas, not this repo’s issue DAG. Product already forbids n8n-as-model; Plane timeline is the same *kind* of mismatch if used as the bottom layer.

15. **Claim:** Airflow/Prefect DAGs are execution graphs, not issue graphs. **Sources:** [Airflow Dags](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html), [Prefect flows](https://docs.prefect.io/v3/concepts/flows). **Support:** direct evidence. **Confidence:** high.

    Airflow: a Dag “encapsulates everything needed to execute a workflow” (schedule, tasks, retries). Prefect: a flow is a decorated Python function whose runs are tracked. **Interpretation:** useful as a reminder that drain’s execution DAG ≠ the issue DAG (ADR-0007).

---

### 5. React Flow is view state; Yjs would be a second graph

16. **Claim:** React Flow is a React library for nodes/edges; the official quick start keeps graph data in React `useState` and `onConnect` → `addEdge`. **Sources:** [reactflow.dev](https://reactflow.dev), [Quick Start](https://reactflow.dev/learn), [Core concepts](https://reactflow.dev/learn/concepts/core-concepts), [State management](https://reactflow.dev/learn/advanced-use/state-management). **Support:** direct evidence. **Confidence:** high.

    Quick start: `const [nodes, setNodes] = useState(initialNodes)` / `onConnect` → `addEdge`. Core concepts: nodes have x/y in the viewport; dragging the pane changes viewport, not a database. State guide: “React Flow can easily be used with a local component state to manage nodes and edges”; optional Zustand because RF uses Zustand internally. Nothing on those pages writes an issue tracker. Matches ADR-0007 and prior note `.scratch/research-flow/dag-canvas-tech-base.md` (not recopied).

17. **Claim:** Yjs is a CRDT of shared types (`Y.Doc`, `Y.Map`, `Y.Array`, `Y.Text`) for collaborative editors; using it for the operator canvas would be a second replicated document. **Sources:** [docs.yjs.dev](https://docs.yjs.dev), [Collaborative editor](https://docs.yjs.dev/getting-started/a-collaborative-editor), [Y.Doc](https://docs.yjs.dev/api/y.doc). **Support:** direct evidence + interpretation. **Confidence:** high.

    Intro: “Modular building blocks for building collaborative applications like Google Docs and Figma.” “Shared types are similar to common data types like Map and Array… automatically merge without merge conflicts.” Guide binds Quill to `ydoc.getText('quill')` and syncs via providers. **Interpretation:** Yjs does not provide issues, `bd ready`, or beads edges. Putting nodes/edges in a `Y.Doc` is exactly the “local editor” / second graph ADR-0007 and the user rejected.

---

### 6. Who owns all four vs a subset

| Owner | Identity | Blocking edges | Non-blocking edges | Comments | Frontier query | Graph *view* | Graph *editor* as store |
|---|---|---|---|---|---|---|---|
| **Beads** | yes (hash id) | `blocks` (+ other blocking types) | `related` / `relates-to`, `discovered-from`, … | `bd comment` (flat) | `bd ready`, `bd blocked` | `bd graph` CLI/HTML | no (community UIs) |
| **GitHub Issues** | yes | blocked-by / blocking | **not in fetched dep docs** | yes (REST comments) | **not fetched** | Relationships sidebar, Blocked icon | **not in fetched docs** |
| **Linear** | yes (team+seq) | blocked / blocking | related, duplicate | mentioned; comments page unfetched | **not fetched** | list/board/timeline | **not in fetched docs** |
| **GitLab** | yes | blocks / is_blocked_by (paid) | relates to | product has notes; not re-fetched here | warning on close | Linked items block | **not in fetched docs** |
| **Plane** | yes | blocked/blocking + date deps | Relates To, etc. | updates on work items | scheduling on timeline | Timeline connectors | timeline is schedule, not issue store |
| **React Flow** | no | no | no | no | no | yes (view) | if you let `useState` be the graph — forbidden here |
| **Yjs** | CRDT doc, not issues | no | no | editor text, not issue comments | no | n/a | would *be* a second store |

**Direct evidence** in rows above; “not fetched” is absence, not a negative proof.

---

### 7. If execution is decoupled, hosted trackers become *less* necessary, not more

18. **Claim:** This repo already decouples execution from the picture: the canvas must not execute; start means the domain run + allow-list. **Sources:** ADR-0007, spec problem/solution `docs/specs/2026-09-17-operator-surface.md`, `docs/CONTEXT.md` (operator surface). **Support:** direct evidence. **Confidence:** high.

    Spec: “He does not want an n8n canvas. The picture is not the workflow. The picture is the issues, and the existing run for their domain does the work.”

19. **Claim:** Therefore Linear/GitHub “nice UI” does not buy an executor, and beads+thin-view is enough for the four primitives. **Support:** researcher inference. **Confidence:** high given ADRs.

    If the graph had to *run* work, Airflow/Prefect/n8n/Plane-timeline would look tempting. The product forbids that. What remains is: edit issues/edges/comments and see ready/blocked. Beads already writes those. Hosted trackers add SaaS identity, different edge vocab, and no `bd ready` for drain.

---

### 8. The pain is the view (reload / gestures / comment UX), not a missing store

20. **Claim:** After a store write, this repo’s contract is: re-read the store, keep layout positions — not a local graph editor. **Sources:** ADR-0008, CONTEXT.md operator surface, spec stories 8–9, 32–33. **Support:** direct evidence. **Confidence:** high.

    ADR-0008: “The surface stays a view: after a write it reads the store again and keeps layout positions. It is not a local editor.” A **full browser reload** is not required by the store; it is a view implementation choice. Prior canvas note (`.scratch/research-flow/dag-canvas-tech-base.md`) already records today’s operator UI as vanilla HTML + inline SVG + `bd comment`, with React Flow as a possible *view* runtime.

21. **Claim:** No fetched owner page shows a write this operator surface needs that beads cannot do. **Support:** researcher inference from findings 1–6 vs spec solution list (create, intra-domain `blocks`, crossing `relates-to`/`discovered-from`, comment, triage labels, delete with refuse-if-dependents). **Confidence:** high for those writes; medium for nested comment threads (beads comments are a list; `replies-to` exists for mail).

    Closest gap: **nested forum threads**. Owner comments are append-only; threading is `replies-to` for messages. That is still implementable *in beads* (comments list, or `replies-to` edges). It is not a reason to replace the store.

---

## Answers (short, sourced)

**What does a complete bottom layer need?** Identity, typed edges (blocking + non-blocking), comments, and a derived frontier/blocked query — one database (ADR-0001; Beads “How Beads Works”).

**Who owns all four?** Fetched: **beads**. GitHub/Linear/GitLab/Plane own subsets plus stronger *issue page* UX; none fetched as owning `bd ready` + this repo’s crossing types + local Dolt in one place.

**If execution is decoupled?** More sufficient for beads+thin-view; less reason to import Linear/GitHub as the bottom layer (ADR-0007; Airflow/Prefect as counterexamples of execution DAGs).

**Store vs view?** View. Beads already has the writes. Hard DAG drawing and comments are operator-surface UX; full reload is not a store requirement (ADR-0008).

**Recommendation:** Keep beads (ADR-0001). Invest in view: no full reload, keep positions, `onConnect` → store then re-read, comments as a conversation UI over `bd comments`. Do not replace beads. Do not put the graph in React state or Yjs.

---

## Contradictions

1. **Beads `parent-child` vs ready queue**
   - [Dependencies](https://beads.gascity.com/core-concepts/dependencies): `parent-child` listed under **Blocking types (affect `bd ready`)**.
   - [Issues & Dependencies](https://beads.gascity.com/core-concepts/issues): `parent-child` “Ready Queue Impact: **No**”.
   - [How Beads Works](https://beads.gascity.com/core-concepts): `parent-child` affects ready **indirectly** — “a blocked parent blocks its children”.
   This repo already forbids `parent-child` from the operator surface (spec story 25). Do not resolve; surface must not write it.

2. **`related` vs `relates-to` in beads**
   - Dep type table uses `related` ([dependencies](https://beads.gascity.com/core-concepts/dependencies), [bd link --type](https://beads.gascity.com/cli-reference/link)).
   - Graph-links and `bd dep relate` use `relates-to` ([graph links](https://beads.gascity.com/core-concepts/graph-links), [bd dep](https://beads.gascity.com/cli-reference/dep)).
   This repo’s vocabulary is `relates-to` (`docs/CONTEXT.md`). **Interpretation:** two spellings in owner docs; this Target should keep calling `bd dep relate` / type `relates-to` as the tracker contract already does.

3. **Delete cascade**
   - Owner `bd delete` offers `--cascade` and `--force` orphan ([bd delete](https://beads.gascity.com/cli-reference/delete)).
   - ADR-0008: refuse, no cascade, no orphan.
   Not a missing write; extra writes this repo must not expose.

None of these are “beads cannot store the graph.”

---

## Missing evidence / unfetched

- **Live** `https://github.com/gastownhall/beads` and live `docs.github.com` (SSRF `198.18.0.0/15`).
- `https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md` and jsDelivr `docs/SYNC_CONCEPTS.md` (**404**; replaced by `docs/core-concepts/sync-concepts.md`).
- GitHub user doc `about-issue-dependencies` (archive 404). No fetched GitHub page titled as a DAG editor — absence only.
- Linear GraphQL `IssueRelation` schema (JS-rendered / unfetched). Linear comments dedicated doc (404).
- Linear/GitHub “ready work” / blocked-queue APIs comparable to `bd ready`.
- Fibery owner docs (URL 404).
- Nested issue-comment threads in beads (not documented on `bd comment`; `replies-to` is mail-oriented).
- `source_check` of GitHub claims: **failed** (Exa 429). Validation limited to Wayback fetches.

---

## Sources

**Kept**

- [How Beads Works](https://beads.gascity.com/core-concepts) — identity, ready, edge types
- [Dependencies and Gates](https://beads.gascity.com/core-concepts/dependencies) — blocking vs non-blocking; `bd ready`; cycle reject
- [Graph Links](https://beads.gascity.com/core-concepts/graph-links) — `relates-to`, `replies-to`
- [Sync Concepts](https://beads.gascity.com/core-concepts/sync-concepts) — Dolt vs JSONL
- [bd comment](https://beads.gascity.com/cli-reference/comment) / [bd comments](https://beads.gascity.com/cli-reference/comments)
- [bd dep](https://beads.gascity.com/cli-reference/dep) / [bd link](https://beads.gascity.com/cli-reference/link) / [bd delete](https://beads.gascity.com/cli-reference/delete) / [bd graph](https://beads.gascity.com/cli-reference/graph) / [bd ready](https://beads.gascity.com/cli-reference/ready) / [bd human](https://beads.gascity.com/cli-reference/human)
- [Community tools](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/docs/community-tools.md) — no first-party web editor; community graphs
- README via [jsDelivr](https://cdn.jsdelivr.net/gh/gastownhall/beads@main/README.md)
- Wayback [Creating issue dependencies](https://web.archive.org/web/2026/https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)
- Wayback [REST issue dependencies](https://web.archive.org/web/2026/https://docs.github.com/en/rest/issues/issue-dependencies)
- Wayback GraphQL mutations (`addBlockedBy`)
- Wayback [REST issue comments](https://web.archive.org/web/2026/https://docs.github.com/en/rest/issues/comments)
- [Linear issue relations](https://linear.app/docs/issue-relations), [display options](https://linear.app/docs/display-options), [parent/sub-issues](https://linear.app/docs/parent-and-sub-issues)
- [GitLab linked issues](https://docs.gitlab.com/ee/user/project/issues/related_issues.html), [issue links API](https://docs.gitlab.com/ee/api/issue_links.html)
- [Plane work items](https://docs.plane.so/core-concepts/issues/overview), [timeline dependencies](https://docs.plane.so/core-concepts/issues/timeline-dependency)
- [React Flow learn](https://reactflow.dev/learn), [core concepts](https://reactflow.dev/learn/concepts/core-concepts), [state management](https://reactflow.dev/learn/advanced-use/state-management)
- [Yjs intro](https://docs.yjs.dev), [collaborative editor](https://docs.yjs.dev/getting-started/a-collaborative-editor), [Y.Doc](https://docs.yjs.dev/api/y.doc)
- [Airflow Dags](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html), [Prefect flows](https://docs.prefect.io/v3/concepts/flows)
- Local: `docs/adr/0001-beads-owns-the-store-graph-and-frontier.md`, `0007-operator-surface-is-a-view.md`, `0008-operator-may-delete.md`, `docs/CONTEXT.md`, `docs/specs/2026-09-17-operator-surface.md` (problem/solution), `docs/agents/issue-tracker.md`

**Rejected / deprioritized**

- Live github.com / docs.github.com — blocked on this host
- DeepWiki / blogs / SEO roundups — not owner
- n8n — product forbids executable canvas
- Fibery — owner URL 404
- Linear Apollo Studio schema — JS shell, no passages
- npm `@xyflow/react` page — HTTP 403
- Prior canvas research copied as authority — used only as pointer, not cited for new claims

---

## Next steps

1. If GitHub live docs become fetchable, confirm the Relationships UI page still matches the Wayback snapshot and search Issues docs for any “dependency graph” view.
2. If nested comments are required, read beads `replies-to` / messaging docs (`engdocs/messaging.md` on GitHub — **unfetched**) before inventing a second comment store.
3. View work (out of this research’s edit boundary): operator-ui write-then-re-read without full reload; connect gesture → `bd dep` / `bd dep relate`; comments pane over `bd comments --json`.

## Supervisor coordination

None. Runtime artifact path used. Task also named `.scratch/research-flow/bottom-layer-assembly.md`; this run wrote only the authoritative session path.
