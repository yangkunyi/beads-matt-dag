# Beads Issue Tracker — Design Consensus

**Status:** agreed 2026-09-11; revised the same day by a four-round design grilling (§10–§12). No open design decisions remain. §9 records the five claims later verification or later decisions falsified, three still-unverified claims, and one pre-existing bug in the skills repo. **Nothing has been written into the skills repo** — see §1 and §13.
**Scope:** how the matt-pocock engineering skills use **beads** (`bd`) as their issue tracker, and how
the `ticket-dag` orchestration flow moves onto it (§10). The original scope line — *not a port of any
existing orchestrator, written fresh against beads' own characteristics* — is **withdrawn**: the flow
is the archon pack's, migrated, and beads takes its store, graph and frontier (§10.1).

Every capability claim in §5–§7 was verified against a real `bd` binary (§2), not read from
docs alone. Where a claim is docs-only it is marked as such. Two claims were nonetheless *inferred*
rather than measured and turned out to be false — they are recorded in §9 and corrected in place.

Terminology: the unit of work is an **issue** (§10.2). Earlier sections say "ticket", from the
predecessor system's vocabulary; read the two as synonyms.

---

## 1. Deliverable

> **Nothing in this section is written yet.** A first draft of both files was written on 2026-09-11
> and then **reverted**, because writing the template was never an approved step — the approved
> deliverable for this session was *this document*. The draft is recoverable (session history, plus
> a copy at `/tmp/reverted-issue-tracker-beads.md`) and every command in it was verified against the
> real binary, so the verification in §5 stands and is not thrown away. Writing these files is a
> decision for step 2 of §13.
>
> **Superseded 2026-09-11 (§10.7).** The two files below were this document's opening scope: one
> template, plus one line in `setup-matt-pocock-skills`. Designing the migration grew the deliverable
> — the tracker template turns out to be the centre of a **skill set** sourced in *this* repo (§10.7)
> — and the scope question §13 used to carry ("may these files be written at all, and where?") is
> now answered. What survives from this section is the template's section shape and the fact that
> every command in the reverted draft was verified against the real binary.

Two files, both under the skills source repo `/data3/yky/pi-agent-config/`:

1. **`skills/setup-matt-pocock-skills/issue-tracker-beads.md`** — a fourth tracker template
   alongside the existing `issue-tracker-github.md`, `issue-tracker-gitlab.md`,
   `issue-tracker-local.md`. Section shape to match those files:
   `# Issue tracker: Beads` + one-line intro → `## Conventions` →
   `## When a skill says "publish to the issue tracker"` →
   `## When a skill says "fetch the relevant ticket"` → `## Wayfinding operations`
   (Map / Child ticket / Blocking / Frontier query / Claim / Resolve).
2. **`skills/setup-matt-pocock-skills/SKILL.md` Section A** — list beads as a first-class
   tracker option (currently only GitHub / GitLab / Local markdown / Other).

**Superseded (§10.7):** the rest of the family *does* reach the tracker indirectly through
`docs/agents/issue-tracker.md`, and that is why the set is a delta rather than a copy — but the delta
is larger than one file: six skills carry the old shape in their own text.

**Setup target repo:** the build's acceptance runs in a throwaway lab under `/tmp` (§10.6), never
against a live Target. This repo runs the local-markdown tracker itself, so it is not the setup
target either.

---

## 2. Verification environment

- Install route that works on this machine: `npm install @beads/bd@1.2.2` (npm `latest` is
  `1.2.2`). Direct npm access works; no proxy needed. The package is a wrapper (`bin/bd.js`)
  around a native binary and carries a `postinstall` script.
- Binary confirmed: `bd version 1.2.2 (6c124203e: HEAD@6c124203e771)`.
- Lab used for all probes: `/tmp/bdprobe/lab`, initialised with
  `bd init --prefix lab --non-interactive --skip-agents --skip-hooks`.
- Primary docs were read from `raw.githubusercontent.com/gastownhall/beads/main/docs/…`.
  Note `docs/cli-docs.pin` pins the **generated CLI reference** (`docs/cli-reference/*`,
  `docs/CLI_REFERENCE.md`) to the `v1.2.2` tag, so those pages are v1.2.2 surface; the
  hand-written pages under `docs/architecture`, `docs/multi-agent` and `docs/reference`
  mix main / 1.1 / 1.2 content.

---

## 3. Version posture: v1.2.2

Chosen over `main`. Rationale: v1.2.0/v1.2.1 were published by accident on 2026-08-11 without
release testing; **v1.2.2 is the tested v1.1 line re-released under a higher version number.**

**Present in v1.2.2** (verified by `--help` against the real binary):
`batch`, `merge-slot`, `recompute-blocked`, `statuses`, `history`, `audit`, `ready`, `repo`,
`gate`, `memories`, `note`, `comment`, `label`, `link`, `priority`, `assign`.

**Absent from v1.2.2** (verified — all missing):
`sync`, `heartbeat`, `reclaim`, `serve`, `events`. (That is the top-level **`bd sync`**; `bd repo
sync`, which exists, is a different command — JSONL hydration, §5.10.)

Consequence: **work leases, the events journal, federation sync, the HTTP API and provenance
events are additive-later, never load-bearing.** Do not design around them.

Do not run the accidental v1.2.1 binary: it migrates the DB schema to v65, after which v1.2.2
fails with `schema version mismatch`.

---

## 4. Settled decisions

| # | Decision |
|---|---|
| 1 | **v1.2.2**, CLI surface pinned per §3 |
| 2 | **Hash ids** (beads default). Legacy positional markdown ids go into `--metadata`; do not switch to `issue_id_mode counter` (counter ids are per-prefix and seeded from the highest existing numeric id, so they collide under concurrent creation) |
| 3 | **No external transition record.** `bd history` is the record (see §7.5 for what it does and does not show). **Reinforced 2026-09-11 (§10.5):** git carries no status copy at all, so `bd history` is not merely the primary record but the only one |
| 4 | **Vocabulary split.** Implementation lifecycle → `status` (built-ins + `status.custom` with categories). Triage roles and wayfinder dispositions → **labels**. Reason: a beads status is a single slot per issue; labels are a set. **Restated 2026-09-11:** a custom status never appears in `bd ready` in *any* category (§5.6), so readiness visibility is exactly `status = 'open'`. **Restated again 2026-09-11 (§10.3):** no custom status is used at all — the vocabulary is three built-ins, and a failure is an event (a comment plus the issue back to `open`), not a fourth value |
| 5 | **embedded mode** (not `--server`). Verified: 8 concurrent writers against one embedded DB, all exit 0, no stderr, no lost writes |
| 6 | **Worker agents are fully read-only**, enforced by `BD_READONLY=1` (see §5.9). `to-tickets` / `triage` / `wayfinder` keep write access. Rationale: everything that affects the frontier (status, edges, nodes) belongs to whoever has the global view; workers only produce narrative — and their working memory belongs in their own worktree, not in the shared store |
| 7 | **`bd init --skip-agents --skip-hooks`.** Avoids a competing managed `AGENTS.md` section, a `prepare-commit-msg` hook that would add trailers to load-bearing commit subjects, an unused JSONL export path, and per-commit hook latency |
| 8 | **No container tier at all.** No feature layer, no business epic, no spec/map container. Business → label. Reason: "Feature" in the local tracker is an artifact of the filesystem (per-directory id scoping, `NN` numbering, directories), not of the domain |
| 9 | **Cross-feature edges work unconditionally** and need no convention (ids are globally unique, so the local tracker's `<feature-slug>/<NN>` prefix requirement disappears entirely) |
| 10 | **Documents live in git.** Specs and maps are markdown files in the repo; issues point back with `--spec-id <path>`. See §6. **Extended 2026-09-11:** the issue *body* also lives in a file, frozen once published — beads holds state, edges and identity (§10.5) |
| 11 | **Publish channel = `bd create --graph`**, not `bd create -f` (see §5.2 and §7.6) |
| 12 | **Wayfinder mapping**: `claimed` → `assignee` + `in_progress`; `resolved` → `closed`; `Type: research/prototype/grilling/task` → bead type `decision` plus label `wayfinder:<type>` (mirrors the GitHub template's convention). **Amended 2026-09-11 (§10.4):** `resolved → closed` is legitimate only while nothing on the implementation side depends on a decision issue — a `closed` blocker releases its dependents unconditionally, whatever the closure meant, so the two domains are kept apart |
| 13 | ~~**`FAILED` is category `wip`** — hidden from `bd ready`. Category `active` would mean the pick step automatically re-picks failed work: an unbounded retry loop, and a default behaviour nobody chose. A failure leaves the frontier; retrying is an explicit orchestrator action. If automatic retry is ever wanted it should be an explicit attempt-capped policy, not a side effect of a category~~ → **Reversed 2026-09-11 (§10.3), twice over.** First the mechanism fell: no custom status enters `bd ready` in *any* category (§5.6), so the category never protected anything. Then the status itself: a failure is an **event** — the reason is a comment and the issue returns to `open` — so the retry channel is `bd ready` itself, there is no union in `pick`, and nothing has to be registered in the store. What survives from the original decision is the retry cap: per-run, in `attempted-ids.json`, never in the store |

**One-line operating model:**

> beads holds issues and edges; git holds specs, maps, ADRs and CONTEXT — plus the merge commits, and
> nothing else about state (§12).
> The orchestrator writes the graph and the state; workers are read-only.

---

## 5. Capability surface, as verified

### 5.1 Create and transition

```
bd create "<title>" --silent                    # prints only the id
bd create -t epic|task|bug|feature|chore|decision
bd update <id> --status <value>
bd close <id> -r "<reason>"
bd reopen <id> -r "<reason>"
bd batch                                        # stdin grammar, one transaction
```

`bd batch` stdin grammar: `close <id> [reason…]`, `update <id> <key>=<value>` (keys limited to
`status`, `priority`, `title`, `assignee`), `create <type> <priority> <title…>`,
`dep add <from> <to> [type]`, `dep remove <from> <to>`. `#` lines are comments. It rejects
`show`/`list`/`ready`/`sync` and any unlisted flag.

`bd batch`'s `dep add` takes **no flags** — the dependency type is positional
(`dep add <from> <to> <type>`). Atomicity verified: a two-operation batch committed as
`batch: 2 operations committed` with a per-line report; when line 2 was invalid the whole batch
rolled back and line 1's change was **not** applied.

### 5.2 Graph creation — one atomic operation

`bd create --graph <json>` creates nodes **and** edges in one call:

```json
{"nodes": [{"key": "a", "title": "wire the API", "type": "task"},
           {"key": "b", "title": "add the UI",     "type": "task"}],
 "edges": [{"from_key": "b", "to_key": "a", "type": "blocks"}]}
```

Node field is `key`. Edge fields are `from_key` / `to_key` (or `from_id` / `to_id`) — discovered
from the error `edge 0: must specify from_key or from_id`. Orientation matches `bd dep add`:
`from_key` is the **blocked** issue, `to_key` is the **blocker**. Verified end to end.

`bd create -f <markdown>` exists (`## Issue Title` format) but **does not create any edges** —
verified: an issue declaring `### Dependencies` came out with zero dependencies and stayed in
`bd ready`. It is a bulk-create convenience only.

### 5.3 Edges

```
bd dep add <blocked-id> <blocker-id>              # default type: blocks
bd dep add <blocked-id> <blocker-id> -t <type>
bd dep <blocker-id> --blocks <blocked-id>         # equivalent shorthand
bd link <blocked> <blocker>                       # shorthand for dep add
bd dep remove <blocked> <blocker>
```

19 dependency types exist; only `blocks`, `parent-child`, `conditional-blocks` and `waits-for`
affect ready work. At most **one edge per ordered `(source, target)` pair**, whatever the type.

### 5.4 Frontier

```
bd ready                  # status='open' AND is_blocked=0 AND not pinned AND not ephemeral AND defer_until<=now
                          # v1.2.2 embedded: 'open' only. No custom status qualifies, in any category,
                          # despite `bd statuses --help` — corrected 2026-09-11, see §5.6
bd ready --claim --json   # atomic pick+claim
bd blocked --json         # broader than "has an open blocking edge": includes descendants
                          # of blocked parents and conditional-blocks/waits-for dependents
```

`bd ready` accepts the same filters as `bd list` — verified `-l/--label` (AND), `--label-any`
(OR), `--label-pattern`, and `--spec`. It caps its output (documented default limit 100);
`--limit 0` returns everything.

`is_blocked` is a **stored, denormalized** column; `bd ready` **trusts** it. See §7.5.

### 5.5 Claim

`bd update <id> --claim` sets `assignee` to the actor and `status` to `in_progress` (verified:
`status: in_progress | assignee: t`, resolved from `git config user.name`), and stamps
`started_at`. `bd ready --claim --json` does pick-and-claim in one step and returns the claimed
issue.

Releasing a claim on v1.2.2 is `bd assign <id> ""` (prints `✓ Unassigned`) followed by
`bd update <id> --status open`; there is no `bd unclaim`. Verified end state: `status: open`,
`assignee: undefined`.

### 5.6 Statuses and categories

```
bd config set status.custom "merging:wip,conflict:wip,resolving:wip,failed:wip"
bd statuses            # enumerate statuses with icons and categories
bd update <id> --status merging
```

Categories (introduced in 0.62.0, so present in v1.2.2) control visibility:

| category | `bd ready` | default `bd list` |
|---|---|---|
| `active` | ~~shown~~ **hidden** (corrected 2026-09-11 — see below) | shown |
| `wip` | hidden | shown |
| `done` | hidden | hidden |
| `frozen` | hidden | hidden |
| (uncategorized) | hidden | shown |

Verified `bd statuses` output after registering
`status.custom = "merging:wip,conflict:wip,resolving:wip,failed:wip"`:

```
Built-in statuses:
  ○ open           [active]  Available to work (default)
  ◐ in_progress    [wip   ]  Actively being worked on
  ● blocked        [wip   ]  Blocked by a dependency
  ❄ deferred       [frozen]  Deliberately put on ice for later
  ✓ closed         [done  ]  Completed
  📌 pinned         [frozen]  Persistent, stays open indefinitely
  ◇ hooked         [wip   ]  Attached to an agent's hook

Custom statuses:
  ◐ conflict       [wip   ]
  ◐ failed         [wip   ]
  ◐ merging        [wip   ]
  ◐ resolving      [wip   ]
```

Two things this settles: **`hooked` is a real built-in status** (the docs were ambiguous), and
**`in_progress` is category `wip`, not `active`** — so a claimed issue automatically leaves the
frontier, which is exactly what the lifecycle needs. And a third, corrected below: **only the built-in
status `open` ever appears in `bd ready`.**

**Correction (2026-09-11).** The `active` row above was inferred from `bd statuses --help` (*"active —
appears in 'bd ready'"*) and is **false** in v1.2.2 embedded mode. Measured: `bd config set status.custom
"failed:active"` → `bd statuses` lists `failed [active]` → `bd update <id> --status failed` → `bd ready`
returns `[]` (likewise for `failed:wip`, and for `queued:active` with no edges attached). Cycling an
issue through all seven built-ins (`open`, `in_progress`, `blocked`, `deferred`, `closed`, `pinned`,
`hooked`) showed **only `open`**. Mechanism: the binary carries two ready-work SQL predicates — a plain
`WHERE i.status = 'open'` and a category-aware one that also unions `custom_statuses` where
`category = 'active'` — and embedded v1.2.2 executes the plain one. (Which predicate `--server`/proxied
mode uses was not testable here.) Consequences: the help text is stale, the `active` category is
cosmetic in embedded mode, decision #4's readiness clause is restated, and *"why is this issue not
running"* has **no native `bd` answer** for a non-`open` status — `bd ready --explain` separates only
dependency-blocked work and never mentions status at all.

### 5.7 Labels, notes, comments

```
bd label add <id> "ready-for-agent"
bd list -l "a,b"                 # AND
bd list --label-any "a,b"        # OR
bd list --label-pattern "tech-*"
bd note <id> "<text>"
bd update <id> --append-notes "<text>"     # newline-separated
bd comment <id> "<text>"
bd comments <id> --json                    # id, issue_id, author, text, created_at
```

Read-back caveat: `bd show --json` returns a **top-level array**. `notes` is a single
newline-joined string; comments need `--include-comments`. `comment_count` is always present.

### 5.8 Documents: `--spec-id`

```
bd create "<title>" --spec-id docs/specs/alpha-rollout.md
bd list --spec docs/specs/alpha-rollout.md          # "Filter by spec_id prefix"
```

`spec_id` is a first-class column (help text: *"Link to specification document"*), returned by
`bd show --json`. Also available: `--external-ref`, `--design`, `--acceptance`, `--metadata`
(queryable with `bd list --metadata-field key=value`).

### 5.9 Read-only workers

```
--readonly     Read-only mode: block write operations (for worker sandboxes)
BD_READONLY=1  # environment variable, applies to a whole subprocess tree
```

Blocks writes with `Error: operation '<x>' is not allowed in read-only mode`. It is
**all-or-nothing**: `bd note`, `bd update` and even `ready --claim` are refused; reads work
normally. There is **no partial mode**, and **no config default** —
`bd config set readonly true` silently accepts the unknown key and does not enforce anything.
The flag is also available on every subcommand (`BD_READONLY` likewise).

The spawner sets it for the worker's process tree; a skill cannot set it for itself reliably.

### 5.10 Multi-repo

```
bd repo add ~/other-business     # → .beads/config.yaml, repos.primary + repos.additional
bd repo list
bd repo sync                     # "Reads issues.jsonl from each additional repository and
                                 #  imports them into the primary database with their original
                                 #  prefixes and source_repo set. Uses mtime caching…"
```

Prerequisite: the additional repos must have `export.auto` enabled — verified default is
**`false`**. Hydration is a pull with mtime caching, not a live connection.

### 5.11 Init side effects

`bd init` writes a managed BEGIN/END section into `AGENTS.md` (idempotent, removable with
`--remove`, rest of the file untouched) and installs five git hooks. `--skip-agents` and
`--skip-hooks` suppress both — verified: `AGENTS.md` byte-identical, no hooks written.
`--prefix <p>` sets the issue prefix at init time (it cannot be set with `bd config set`).

---

## 6. Why documents live in git, not in beads

`--spec-id`'s own help text calls a spec a **document**. So beads' native model already treats
the spec as a file reference, not as a node — no container concept has to be invented.

Four independent reasons to follow it:

1. It is beads' own modelling (`Link to specification **document**`).
2. The repo already keeps long-form thinking in git (`CONTEXT.md`, `docs/adr/`). Putting specs
   in the DB splits "long-form thinking" across two homes.
3. Rationale must live somewhere greppable. **Correction (2026-09-11):** this reason originally read
   *"This workflow pack already demonstrates the failure mode: it cites `ADR-0029`…`ADR-0053` and
   ships **no ADR files at all**"*. That is **false** — the pack's home repo `/data3/yky/workflow`
   carries 63 ADRs (`docs/adr/0001…0063`) and all seven the pack cites exist. What is true is a
   packaging fact: the installation at `~/.archon/workflows/ticket-dag` is a copy of the workflow
   folder alone, so the ADRs are not on the archon path. The reason survives in its weaker form:
   rationale that is not in git cannot be diffed, grepped or reverted — and a DB blob is no different.
4. `to-tickets` already accepts "a spec path, an issue number or URL" as input, so file specs are
   a first-class input today. The local template's "publish" instruction is *also* "write a file".

Demonstrated contrast (same lab, same session):

```
# spec changed → git shows what changed
$ git diff HEAD~1 HEAD -- docs/specs/alpha-rollout.md
+- NOT in scope: business beta (deferred to Q4).

# ticket description replaced wholesale → git knows nothing
$ git status
(clean)
$ bd history <id>          # 5 entries, every one of them reading
                           # "lab-jjn: backfill data [P2 - open]"
```

**`bd history` tells you that a change happened; it does not tell you what changed.** It shows the
issue's title / priority / status at each Dolt commit; the description body is not in it.

The distinction: **tickets are state** (only the current value matters — who is running it, is it
blocked, can it start), **documents are argument** (they need a diff, or the next person works to
the old direction). And this recovers part of what the migration loses: the DB is gitignored, so
commits and code can never share the same commit — but a spec *can*, and the spec is exactly the
artifact you want to review and revert alongside the code.

Proposed paths (not yet confirmed): `docs/specs/<date>-<slug>.md`, `docs/maps/<effort>.md`.
Hard requirement: they must be git-tracked.

This does **not** contradict the earlier "no need to preserve markdown artifacts": that was about
**tickets**. Tickets are state and belong in the DB. Documents are not tickets — they have no state
machine, never enter the frontier, are never claimed, and must never be closed.

---

## 7. Structural rules and traps (all verified)

### 7.1 A child cannot be blocked by its own ancestor — two distinct errors

```
$ bd dep add <child> <its-parent>
Error: cannot add dependency: lab-4yu.1 is already a child of lab-4yu. Children inherit
dependency on parent completion via hierarchy. Adding an explicit dependency would create a deadlock

$ bd dep add <parent> <child>
Error: epics can only block other epics, not tasks
```

### 7.2 `parent-child` propagates blocking downward

Blocking an epic removes its entire subtree from `bd ready`; the epic **and** its children appear
in `bd blocked`. Verified. This is therefore a *tool*, not a hazard: it is the only way to gate a
whole subtree with one edge. (It is the wrong tool for a wayfinder map.)

### 7.3 One edge per ordered pair

```
$ bd dep add <a> <b> -t related      # <a>→<b> blocks already exists
Error: dependency lab-4yu.1 -> lab-7l9.1 already exists with type "blocks" (requested "related");
remove it first with 'bd dep remove' then re-add
```

Note the pair is *ordered*: `a→b` and `b→a` are different pairs.

### 7.4 Cross-feature edges are free

Verified: a ticket that is a child of epic *alpha* and blocked by a ticket that is a child of epic
*beta* carries both edges side by side:

```
lab-4yu [parent-child]    lab-7l9.1 [blocks]
```

### 7.5 `is_blocked` is stored, denormalized, and trusted

From the upstream docs for `bd recompute-blocked`: `is_blocked` is derived from the graph and
maintained automatically by local writes and by a post-pull recompute scoped to what the merge
changed. If that recompute is skipped — a recompute that failed after its merge committed, or a
conflicted pull resolved by hand — the flag can go stale, and a later pull that merges nothing
will not refresh it (`bd-6dnrw.37`). **`bd ready` trusts the flag, so stale values silently hide
ready work or surface blocked work.**

Consequence for this design: because the setup is single-machine embedded with worktrees sharing
one database, **there is no pull**, so that window does not arise and `bd recompute-blocked`
degrades to a rare repair tool rather than standing operational work. This holds *only* while
there is no remote; adding one re-establishes it.

Also: dependency-blocked issues keep `status='open'` — closing the last blocker flips `is_blocked`
without any status transition on the dependent. So there is no BLOCKED→READY transition to
observe, and nothing to record for it. The stored status `blocked` exists only for manual use.

`is_blocked` is not returned by `bd show --json` (it comes back `undefined`); use `bd blocked`.

### 7.6 `bd ready` includes container epics

Verified: an epic created as a container appeared in `bd ready`. With decision #8 (no container
tier) this papercut disappears on its own, so the template's frontier query needs no filter.

### 7.7 Smaller gotchas

- `bd show --json` returns a **top-level array** — unpack before reading fields.
- `updated_at` is **not** touched by the `is_blocked` recompute (verified: `created_at` and
  `updated_at` identical after a dependent's flag flipped). It is therefore a clean "a real actor
  wrote this row" signal.
- `bd config set dolt.auto-commit` — the **CLI help text says "Default: off"**, the config docs
  say `on`, and the real binary reports `on` via `bd config get dolt.auto-commit`. Treat `on` as
  correct and the CLI help as stale.
- Concurrency: notes appended from N concurrent writers all land, but **their order is arbitrary**
  (observed 5,4,6,2,3,1,8,7). Do not rely on notes as an ordered log.
- `bd history` is **commit-scoped, not issue-scoped**: two issues modified by one Dolt commit
  share the same commit hash in their respective histories.
- `bd history` reports the commit author, which resolved to `root` even with
  `git config user.name` set; `bd comment` attributed correctly. If write attribution matters,
  set `--actor` / `BEADS_ACTOR` per writer and verify it.
- Telemetry is on by default (POSTs to `gastownhall-eventsapi.com`); opt out with
  `bd metrics off`, `BD_DISABLE_METRICS=1`, or `DO_NOT_TRACK`.

---

## 8. Mapping: local-markdown template → beads

Rewritten 2026-09-11 against §10 (three statuses and a failure that is an event, one store query for the
frontier). The right-hand column is the decided design, not a translation suggestion.

| Local markdown | Beads |
|---|---|
| `.scratch/<feature>/issues/<NN>-<slug>.md` | the issue **body**, frozen after publish; the issue itself is a bead (§10.5) |
| issue id `<feature>/<NN>` | a `--metadata` **handle**; the bead's hash id is the identity (§10.2) |
| `Blocked by: NN, NN` text line | `bd dep add <blocked> <blocker>` — native edge |
| `Status: BLOCKED` | **derived** — `is_blocked`, maintained by beads |
| `Status: READY` | **derived** — `status = 'open'` and not blocked |
| `Status: RUNNING` | `in_progress` (built-in) — the claim |
| `Status: MERGING` / `CONFLICT` / `RESOLVING` | **retired** — steps inside a run, not states (§10.3) |
| `Status: MERGED` | `closed`, and only ever with MERGED semantics (§10.4) |
| `Status: FAILED` | an **event, not a state**: the reason is a comment and the issue returns to `open`, so the next drain retries it (§10.3) |
| `Type: research/prototype/grilling/task` | bead type `decision` + label `wayfinder:<type>` (§10.2) |
| `Status: claimed` (wayfinder) | `assignee` + `in_progress` |
| `Status: resolved` (wayfinder) | `closed` — legitimate only because the two domains never share an edge (§10.4) |
| map = `map.md` | a markdown file in git |
| child issue = a file | a bead, pointing at its document with `--spec-id` |
| frontier = scan the directory | the store's own answer: `bd ready` with the type and label filters, minus what this run already attempted (§10.4) |
| `/implement` and conflict resolution leave the state alone | `BD_READONLY=1` |
| triage's five roles | five labels; `ready-for-agent` is the gate, `needs-triage`/`needs-info` are the brake (§10.4) |

**The most important departure:** the local template instructs `to-tickets` to write an initial
`READY` or `BLOCKED`. In the beads template **it writes no status at all** — it only creates edges.
`bd ready` answers "can this start" by itself. This is a semantic change, not a translation.

---

## 9. Open items

**Corrected 2026-09-11 — asserted, then falsified.** Recorded rather than silently edited, because
the first three were *reasoned* from assumptions instead of measured, which is the failure mode this
document exists to avoid:

- **§5.6's category table** said `active → shown in bd ready`, following `bd statuses --help`. It is
  false: only `open` is ever ready in v1.2.2 embedded mode. Decision #4 is restated, §5.4's frontier
  comment fixed, and the mechanism recorded in §5.6.
- **§6 reason 3** claimed the workflow pack "cites `ADR-0029`…`ADR-0053` and ships no ADR files at
  all". False — 63 ADRs exist and all seven cited ones are there. Rewritten in place.
- **Decision #13** classified `FAILED` as category `wip` "so it is hidden from `bd ready`". The
  conclusion was right and the mechanism wrong — no custom status is ever ready, in any category. It
  is reversed and restated (§10.3, §10.4); the status it was about was then dropped altogether — a
  failure is an event (§10.3).
- **The scope line** "not a port of any existing orchestrator — written fresh against beads' own
  characteristics" is withdrawn: the deliverable is the archon pack's flow migrated onto beads
  (§10.1).
- **§8's mapping table** was a translation sketch from an earlier round of this design; the surface
  it mapped (eight statuses, an unconditional `bd ready` frontier) no longer exists. Rewritten
  against §10.

**Unverified — do not treat as known:**

- Whether a `blocks` edge can target an issue hydrated from another repo by `bd repo sync`.
  Mechanically unlikely (hydration is a pull with mtime caching, not a live link).
- The full `bd create --graph` schema beyond `nodes[].key/title/type` and
  `edges[].from_key/to_key/type`. Unknown field names are silently dropped with a warning, so an
  unrecognised dependency field produces nodes with **no edges and no error**.
- Confirmation of the document paths `docs/specs/` and `docs/maps/`. **Partially resolved
  2026-09-11:** `docs/specs/<date>-<slug>.md` is now in use in the lab repo
  (`docs/specs/2026-09-11-beads-issue-tracker-consensus.md`). `docs/maps/` is still unexercised, and
  the lab repo runs the local-markdown tracker, so this is not yet confirmation inside a
  beads-tracked repo.

**Pre-existing bug found in the skills repo:**

- `to-tickets/SKILL.md` step 3 hardcodes the local tracker in an otherwise shared step: *"Scan
existing `.scratch/*/issues/*.md` before proposing edges … Id is `<feature-slug>/<NN>` (e.g.
`auth/02`). Same-Feature edges may use `NN` alone."* No such identifier exists on beads — and none
exists on GitHub or GitLab either, so this is a **pre-existing** bug that a beads tracker only
makes visible. Any fix is an edit beyond §1's two files, so it needs its own approval.

---

## 10. The flow migration, decided

Settled 2026-09-11 in a four-round design grilling. The subject is no longer only the tracker template:
it is the `ticket-dag` orchestration flow moving onto beads. The pack's source is
`/data3/yky/workflow/.archon/workflows/ticket-dag`, installed by copy at `~/.archon/workflows/ticket-dag`
(byte-identical), and the 63 ADRs in `/data3/yky/workflow/docs/adr/` describe the predecessor system.

### 10.1 Authority and scope

- **beads takes over** the status store, the dependency graph, and the frontier decision.
- **beads does not take over documents** (decision #10). Specs and maps stay in git.
- **Transition records come from `bd history` and nowhere else** (decision #3; §10.5, §12).
- **This document and `docs/adr/` here are authoritative.** The 63 ADRs in `/data3/yky/workflow` are
  demoted to evidence and current-state description. Eight of their rules cannot stand on a beads
  store and are superseded: 0005 (one implementation file *is* the DAG node), 0009 (issues discovered
  by file path and filtered by a `Type:` line), 0010 (the `Status:` line is the store), 0011
  (branch/worktree names embed the file id — which invalidates its own justification the moment the
  identity is a hash), 0016 (`Status` is a follow-up commit on Main), 0018 (the DAG is rebuilt from
  `.scratch` every cycle — beads *is* the stored graph that 0018 rejected), 0022 (`Status` lines stay
  regex-parsed), 0054 (the owners of the markdown store).
- **The flow is the pack's, migrated — not invented.** The pack is the runner in use (its ADRs run to
  0063, all in the pack era; the CLI's last run predates it and its ADRs stop at 0031).
- The **`orchestrator` CLI is retired**: the `~/.local/bin/orchestrator` symlink comes out and it is no
  longer a design object. Its source stays in `/data3/yky/workflow` as a retired artifact — 31 ADRs
  reference it, and deleting it would strand them.
- The **new pack's source lives in this repo**, installed by copy into `~/.archon/workflows/` — the same
  relation `/data3/yky/workflow` has to the installed `ticket-dag` today. The old pack is frozen
  read-only.
- **`ticket-dag` is not edited in place**: it was draining a live Target (`/data3/yky/endo_label`,
  started 16:41, `multi-user/14` in flight) when this was decided.

### 10.2 Vocabulary and identity

- The unit is an **issue** — beads' word, the skills' word, and this repo's word. "Ticket" is retired;
  earlier sections use it as a synonym.
- **The bead's hash id is the identity** (decision #2). The `<feature>/<NN>` handle moves into
  `--metadata` and keeps driving branch names, worktree names and commit subjects, so git and the
  record still match without a side table.
- **Agent roles are not triage labels.** `roles.ts`'s `role` (implement, resolve, review) is an *agent
  role*; the five triage roles are *triage labels*. Different axes, different words.
- **Wayfinder issues are bead type `decision`** (alias `adr`) with the sub-type kept as a label,
  `wayfinder:<research|prototype|grilling|task>`. A drain excludes them **by type**
  (`--exclude-type decision`), never by enumerating labels — a new wayfinder flavour must not be able
  to leak a decision issue into a drain by omission.
- Noted collision: `decision`'s alias `adr` means any future "ADRs in beads" scheme would share a type
  with wayfinder issues. Nothing depends on it today; documents stay in git (§6).

### 10.3 State

Three statuses, all beads' own:

| State | Beads | Note |
|---|---|---|
| waiting | `open` | blocked-ness is a separate, derived fact |
| running | `in_progress` | the claim — and what keeps a second drain off it |
| done | `closed` | closed **only** with MERGED semantics (§10.4) |

**Failure is an event, not a status** (reversed 2026-09-11; this section previously added `failed` as a
fourth, custom status). beads ships no `failed` built-in because a failure is something that *happened*,
not a disposition of the work — and the custom status charged for the difference: it had to be
registered per store (`bd config set status.custom`; without it `bd update -s failed` exits 1 with
`invalid status "failed"`), that registration is store state living in the database rather than in
`.beads/config.yaml` (§12), the drain had to refuse to start without it, and — because no custom status
is ever returned by `bd ready` (§5.6) — the frontier stopped being the store's answer and became a union
the drain composed by hand. A failed attempt now says so and returns the issue to the only set that can
start:

```
bd comment <id> "attempt N failed: <reason>"   # the reason persists; bd history records status, not body
bd update  <id> -s open                        # the retry channel is bd ready itself
```

So a failed issue is startable to every reader of the store, this drain included, and a crash and a
failure converge on the same repair. What the store gives up is answering "what failed" in one query:
that becomes the drain-end report's job, and, per issue, `bd history`.

`BLOCKED` and `READY` become **derived** (`is_blocked`, `status='open'`). `MERGING`, `CONFLICT` and
`RESOLVING` are **retired**: merging and resolving are steps *inside* a running issue, and the
worktree's own git state (`MERGE_HEAD`, unmerged paths) is what records them. The old machine had 8
statuses and 12 transitions; this one has two that mean progress (`open→in_progress`, `in_progress→closed`),
one that means the attempt did not land (`in_progress→open`, with its reason attached), and a repair
path that resolves to one of the two.

**Order: merge before stamp.** The orchestrator never announces a result before performing it — the
merge into Main happens first, the `closed` stamp second. So `closed` implies the merge commit exists,
and the one dangerous interleaving (a state claiming "merged" while Main lacks the commit, releasing
dependents against a Main that is missing its blocker) cannot arise. The other interleaving — merged
but still `in_progress` — is safe and repairable: `recoverLeftover` reads the merge commit and stamps
`closed`. Consequence: the lock no longer has to make the state write and the git merge atomic, and
guards Main's git writes only.

**Retry.** A failure is not retried inside the drain that failed it, and is retried by the next one —
the cap is per-run and lives in the run's own `attempted-ids.json`, because drain bookkeeping does not
enter the store (ADR-0032). The retry needs no channel of its own: the issue is `open` again. Across
runs there is **no cap at all**: a deterministic failure is retried by every drain that follows and
costs a worker slot each time, and the brake (§10.4) is the only thing that ends it. A brake nobody is
prompted to pull is not a cap, so **the drain-end report must say which attempts failed and how many
times each issue has burned** — `bd history` already records every transition (measured), so that is a
reading, not new state. This build does not change what the report says (the build spec puts that out
of scope); this paragraph is the requirement for whoever does.

### 10.4 Frontier, claim, closure

beads owns *blocked-ness* **and startable-ness**, so the frontier is one store query with one
subtraction the store cannot make:

```
bd ready --exclude-type decision -l ready-for-agent     # what the store says can start
  − issues already attempted by this drain (attempted-ids.json)
  → truncated to the concurrency cap
  → claimed in a single `bd batch` (one transaction, all-or-nothing)
```

A failed attempt leaves its issue `open` (§10.3), so the retry needs no second query and no union: what
`bd ready` reports is what a drain will work, minus what this run has already tried.

**Implemented with one departure** (ticket 03): the pack asks the store for the same query *unfiltered*
and applies the type and label rules itself, because a query that filters cannot report *what* it
filtered — and the exclusion report has to name the rule, per issue. Readiness is still the store's
answer; only the reporting of the filters moved. The exclusion is still by **type**, so a new flavour of
question cannot leak into a drain by omission.

`bd ready` alone cannot be the frontier, but the gap is a single subtraction — the store cannot know
what this drain already tried, and it cannot explain that exclusion either — so `pick` must emit its own
exclusion reasoning each cycle. That is what promotes ADR-0021's inspect snapshot from convenience to
requirement.

**Closure.** Only the orchestrator closes an issue, and only to mean "the work is in Main". A failed
attempt leaves its issue `open`, never closed, so its dependents stay blocked until the work really
lands. `wontfix` is a label, not a closure — closing a blocker releases its dependents
regardless of the reason (verified: closing with `-r wontfix` released the dependent). Therefore **an
implementation issue may only be blocked by another implementation issue**. Decision issues are a
separate domain whose `closed` means "the question is answered"; they reach the implementation side by
changing issues, not by an edge. That separation is what makes decision #12's `resolved → closed`
legitimate.

**The gate.** The frontier filters on `ready-for-agent`, and publication applies it automatically, so a
drain runs unattended. The label is still not decoration: moving an issue back to `needs-triage` or
`needs-info` pulls it out of the frontier — the operator's brake, with `needs-info` meaning exactly
"waiting on a human answer".

### 10.5 What lives where

| Fact | Home |
|---|---|
| identity, status, edges, assignee | beads |
| the issue body — what to build | `.scratch/<feature>/issues/<NN>-<slug>.md`, **frozen once published** |
| the `<feature>/<NN>` handle | bead `--metadata`, and every git name derived from it |
| specs and maps | git (`docs/specs/`, `docs/maps/`) |
| "the work is in Main" | the merge commit on Main |
| transitions | `bd history` — no copy in git (§12) |

The body file and the bead are joined only by the handle, and they share no field, so there is nothing
to drift: this is a partition, not a double-write. It keeps `/to-tickets`'s output shape, keeps the
worker contract — a worker is handed a **path** (ADR-0003) — and keeps the body reviewable in a diff.

### 10.6 Acceptance

The new pack is validated in a throwaway lab under `/tmp`, never against a live Target:

1. the frontier excludes type `decision`, and refuses anything without the gate label;
2. an issue whose attempt failed is not retried inside its drain, and *is* retried by the next one;
3. closure never crosses domains, so a decision issue can never release implementation work (§10.4);
4. the merge precedes the stamp, and a kill between the two leaves a state the repair path fixes.

**Accepted 2026-09-12** (pack `ef11f13`): all four held in real runs, each named with its run id
and its artifacts in `.scratch/beads-dag/issues/11-acceptance-in-a-lab.md` — which also records the
one thing the acceptance could not produce (a property it had to reach through staged state) and
what it noticed without covering (§13.1). The pack was frozen for the acceptance: the ticket's
commit changes no file under `.archon/`.

`/data3/yky/endo_label` is not touched while its drain is live.

### 10.7 The skill set for a store-backed flow

Settled 2026-09-11. The tracker template of §1 is the centre of a *set*, not a file to drop in.

- **A delta, not a copy.** Of the 26 non-`lark` skills, 7 mention the tracker at all (`triage` 23
  mentions, `setup-matt-pocock-skills` 20, `to-tickets` 11, `ask-matt` 5, `code-review` 3, `to-spec`
  2, `implement` 1); the other 19 have no tracker surface whatever and are referenced, not
  duplicated. Copying the family whole would put one instruction in two places — the failure ADR-0005
  exists to forbid — and prose has no test that catches two copies drifting apart: what a reader gets
  would depend on which copy happens to be installed.
- **One copy per machine, under the same names.** pi warns on a name collision and *keeps the first
  skill found*, and the installed `~/.pi/agent/skills/` is searched before a project's `.pi/skills/`
  or `.agents/skills/`. A project-level revision of `to-tickets` would therefore be shadowed by the
  installed one and silently do nothing. Same names ⇒ exactly one copy ⇒ no `beads-` prefix.
- **Sourced here, installed as an action.** The set is authored under `skills/` in this repo — not a
  discovery path, so authoring changes nothing about the running agent — and installing it is a copy
  into `pi-agent-config/skills/`, the same rule the pack follows into `~/.archon/workflows/`. Writing
  the installed skills is a change to live tooling, so it stays a separate, reviewable step.
- **Entry points keep their filenames; the prose speaks §10.2's words** (`issue`, `handle`, `drain`).
  The names are the interface — muscle memory and cross-references — and a prefix buys nothing a
  sentence cannot.
- **What the set contains:** the beads tracker config (the fourth `docs/agents/issue-tracker.md`,
  and the only file that spells out store commands and the boundaries they may be used across, as the
  local template does today); edits to `to-tickets`, `implement`, `to-spec`, `triage`,
  `setup-matt-pocock-skills` and `ask-matt` so each reads the tracker config instead of assuming a
  file shape; and one new skill for the operator's surface. `code-review` needs no edit — its three
  mentions are pointers to the config and a spec-path heuristic that still holds. `wayfinder` needs
  none either: nothing in it names a tracker shape today, which is why the decision-issue rules
  belong in the tracker config.
- **Two owners, one subject each.** The tracker config owns *how to talk to the store*; the operator
  skill owns *how to drive the pack and what to do when it breaks*, in two sections — a day section
  (run a drain, read its reports, brake an issue, let it back in) and an accident section (restore
  from the Dolt remote, recompute blocked-ness, reconcile leftovers). A third file that also builds
  store commands would be the duplication this section exists to prevent.
- **There is no retry command, and no lever that narrows a drain to one issue.** Retry is a
  consequence of the query rather than a verb — after a failed attempt the issue is `open` again, so the
  store's own `bd ready` already contains it (§10.3) — and the operator's "retry" is therefore running
  another drain, which also starts every other eligible issue. Wanting *only* the one issue back
  means braking its neighbours, which mutates triage state to express a transient wish; running the
  per-issue workflow by hand is not the cheap way out either, because it bypasses the opening node's
  reconciliation of the previous attempt's leftovers. Recorded as a known cost rather than solved: the
  lever to add later is a narrowing input to the drain, not a retry verb. Pulling the gate label stays
  the one action that needs a human hand (§10.4), and per §10.3 it only works as a cap if the report
  says how often the issue has burned.
- **The pack's agent personas are not part of the set.** They are the pack's own text; the set is
  what a human or an interactive agent uses.
- **`bd` is part of the flow, not an installation detail.** It is not on `PATH` even on the machine
  where it is installed (`/data3/yky/.local/node-v24.19.0-linux-x64/bin/bd`), so a Target either puts
  it on `PATH` or sets the pack's `store:` key — and preflight failing is the flow saying which one
  was forgotten.
- **Derived, not decided** — recorded so the set's author does not have to guess: a triage brief
  posted after publish cannot enter a frozen body (§10.5), so it is a store comment.

**Sequencing:** the set is written *after* the build's acceptance (§10.6). The pack's command surface
is still growing — the pick report and the drain-end reports arrive with later tickets — and a skill
documenting a shape the pack has not settled would be a second, wrong record.

**Acceptance of the set, on its own terms:** prose is not accepted by reading it. Another agent, in a
`/tmp` lab, runs the whole loop using only the set — publish an issue, drain it, read the close, brake
one, drain again — and its observations join §10.6's list. The pack's four properties and the set's
executability are separate claims and must be able to fail separately.

---

## 11. Historical baggage

Every piece below was load-bearing because the store was a directory of files and the log was git.
None of them is wrong for that design; all of them are weight once beads holds the graph.

| Carried | Why it existed | Why it goes |
|---|---|---|
| a `Status:` line inside each issue file | the file *was* the store | the store is beads; the body is frozen (§10.5) |
| `BLOCKED` / `READY` as stored states | the frontier was a directory scan | beads derives blocked-ness and readiness (§10.3) |
| `MERGING` / `CONFLICT` / `RESOLVING` as states | orchestration steps needed somewhere to leave a trace, and a markdown store has nowhere else | they are steps inside a run; the worktree's git state records them (§10.3) |
| a `Status <X>` commit on Main per transition | git was the only durable log | a second record of one fact, and the two can disagree; the commit that *does* matter — the merge — is kept (§12) |
| one lock holding the state write as well as the merge | the state *was* the file the merge rewrote | merge-before-stamp buys the same safety with no lock scope (§10.3) |
| a separate workflow for conflict resolution (ADR-0053's returned node) | archon's workflow engine cannot express that loop | a branch inside the merge step |
| `<feature>/<NN>` as the identity | the filesystem provided it | it becomes a handle; the bead id is the identity (§10.2) |
| the CLI orchestrator as a design object | there were two runners | one runner; the CLI is retired (§10.1) |

**Kept, with re-worded mechanisms** — the rule survives, the sentence that justified it does not:
0003 (a worker is handed a path — still true, now pointed at the body file), 0013 (the clean-Main
check stays for merge hygiene; its dirty-tree rationale no longer applies), 0014 (its no-auto-retry
rule becomes explicit and run-scoped, §10.3), 0021 (the inspect snapshot becomes load-bearing, §10.4),
0023 and 0029 (the merge commit stays the idempotence key), 0042 (the lock keeps its shape and loses
its scope), 0049 (one FAILED writer stays, but its reason must become a persisted note — `bd history`
shows the status and not the body, §6).

---

## 12. Durability

- **The store is not committed.** `bd init` writes `.beads/.gitignore`, which ignores the Dolt database
  (`dolt/`, `embeddeddolt/`, `proxieddb/`) plus runtime files, so only `config.yaml`, `README.md` and
  the ignore file are committable. Adopting that default is a Target-level rule, alongside
  `worktrees/` and `.venv/`.
- **The issue body *is* tracked.** It is the one part of an issue that belongs to git (§10.5), so
  `.scratch/<feature>/issues/*.md` is committed and gets its own reviewable diff; only the store and
  the worktrees are ignored.
- **The interactions log is store state, so git does not carry it.** `bd init`'s own commit tracks
  `.beads/interactions.jsonl`, and bd appends to it on every write, so a Target using the store is never
  clean while it stays tracked. What it holds is a record of *state changes* (`kind: field_change`, old
  and new value, and the reason) — the same fact the store's own history already owns, and the kind of
  fact this design keeps out of git (ADR-0005). So the drain ignores the path, and untracks it when the
  store's init committed it, in the same setup commit that ignores `worktrees/`. The cost is accepted
  knowingly: bd means the file to be versioned, so this is one place where the pack overrules a tool
  default, and it belongs in the design record rather than in a comment. (Found by the drain-end
  review of a lab run, 2026-09-11; a clone that holds it tracked and modified cannot merge that commit
  cleanly, which is a one-time friction on existing clones, not on a fresh Target.)
- **git carries the merge commits and nothing else about state.** `orchestrator: merge <branch>` is
  both the idempotence key (ADR-0029) and the recovery signal, which is why `hasTicketMergeCommit`
  still answers "did this land". Main's history is a delivery timeline, not a status log.
- **Status history therefore lives only in Dolt.** Losing `.beads/` loses the state record: git can
  still show that `<feature>/<NN>` was merged, not that it failed twice first. So the Dolt remote is
  **load-bearing, not optional**: `bd dolt remote add …` plus `bd dolt push` — a Dolt-native path,
  distinct from the JSONL hydration `bd repo sync` performs (§5.10). Size is not a concern: measured
  at ~75 KB per issue including Dolt history, so a 99-issue repo is roughly 7–8 MB. Nothing else has to
  travel: the reversal in §10.3 removed the last non-database fact — no custom status is registered, so
  the store's configuration carries no part of this design.
- **A restore re-opens the `is_blocked` staleness window** (§7.5): after a pull, run
  `bd recompute-blocked`. With no remote configured there is no pull, and the window does not exist.
- When the two disagree, **git wins**: beads' `closed` is a cache that `hasTicketMergeCommit` repairs.

---

## 13. Next steps

1. **Build the flow** (§10): source in this repo, installed by copy, validated per §10.6 in a `/tmp`
   lab. Nothing in this step touches a skills directory. **Done 2026-09-12** (pack `ef11f13` at
   `.archon/workflows/beads-dag/`: 18 node-level repros, typecheck clean, installed copy byte-identical):
   a lab acceptance produced the four properties in real runs — only eligible issues start; decision
   issues and issues without the gate label never do; a failure is retried by the next drain and never
   by the one that failed it; closure never crosses domains; and a kill between the merge and the record
   is repaired by the next open. `.scratch/beads-dag/issues/11-acceptance-in-a-lab.md` holds the run ids
   and the artifact behind each. Three operator-visible consequences came out of it and are recorded
   rather than fixed: the drain-end report still does not say which attempts failed and how many times
   (§10.3 — this build was told not to change what the report says); a merge repaired after a kill sits
   inside **no** run's review range, so the next drain closes it with nobody having reviewed it; and a
   first drain's range can consist only of the pack's own housekeeping commit, which a reviewer then
   reviews.
2. **Write the skill set** (§10.7) — after step 1's acceptance, sourced in this repo, installed by
   copy. This absorbs what used to be three separate items here (whether §1's template may be written
   and where; the `to-tickets` hardcoding of §9; the stale wording in `to-tickets` and `implement`):
   they are all edits to the same set, and §10.7 settles them together.
3. **Accept the set on its own terms** (§10.7): another agent walks the loop in a `/tmp` lab using
   only the set, and its observations are added to §10.6's list.
4. Retire §9's unverified items as they are resolved.
