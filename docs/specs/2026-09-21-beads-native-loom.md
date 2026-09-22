# Beads-native loom

Designed 2026-09-21. Landed in the attention clone the same night (Capture/pin/defer, `leg:research`,
Close map, ADR-0005 rewrite). Operator asked to hug Beads primitives and authorised rewriting
ADR-0005. Research: gastownhall/beads CLI + docs (2026), lab ADRs 0001–0009, pack pick/create/attention.

This is the operator/executor contract. It does **not** add a fourth domain. It does **not** adopt
Beads features ADR-0009 already refused (`bd merge-slot`, `bd gate` as our gate, `bd worktree`,
`bd query` as the canvas store).

## Problem

The human face is three stacked vocabularies: eight attention buckets, five triage labels, and
`wayfinder:*` legs. A map is a `decision` plus a label that never enters the reading frontier, so it
sits on the open-only canvas until someone `bd close`s it from CLI. Issue briefs live as git files
under `.scratch/<feature>/issues/`; the store holds `handle`/`slug` metadata. That split is an
implementation, not what ADR-0005 actually decided.

Beads already has the missing primitives: `description`/`design`/`acceptance` on the issue, frozen
statuses `deferred` and `pinned`, type `epic`/`decision`/`spike`, `bd ready --exclude-type` /
`--label` / `--claim`, `bd update --defer`, `bd pin`, `bd set-state`, `bd create --deps` /
`--description`.

## Disagreement (do not smooth)

| Source | Claim |
|---|---|
| Beads 2026 | Work-memory prose lives in Dolt. JSONL is a git-backed **export**, not a second database. Containers are `epic` + `parent-child`. Parking is `deferred` / `pinned`. AFK is `bd ready --claim` with type/label filters. |
| ADR-0001 / 0009 / pack | Specs and maps stay git documents (they have no state). `parent-child` on a container can freeze a subtree and Beads will not refuse a cross-domain parent. `--claim` writes assignee; inquiry currently claims with status only. Five triage words stay labels. |
| This design | Hug **issue truth** (0005 rewrite) and **native parking/pin**. Keep **git for product literature**. Do **not** make maps `epic`. Keep pack compose + batch claim. |

## Kernel that stays

Three domains, three closures (ADR-0006). A blocking relation never crosses a domain. Drain still
refuses a chain that reaches `decision` or `experiment`. Merge-before-stamp (ADR-0002). Operator
surface is a view (ADR-0007). Delete is not close (ADR-0008). Worktrees named from handle+slug; pid
file locks. Pack still owns: gate label `ready-for-agent`, non-work types, this-run `attempted`,
allow-list, Archon loop.

`bd statuses` on this machine (1.3.x): `open`, `in_progress`, `blocked`, `deferred`, `closed`,
`pinned`, `hooked`. `bd types`: `task`, `bug`, `feature`, `chore`, `epic`, `decision`, `spike`,
`story`, `milestone`. Loom does not invent types. Loom does not register custom statuses.

## ADR-0005 rewrite (the authorised change)

**One fact, one home — restated.**

| Fact | Home |
|---|---|
| Identity, status, graph, labels, comments, **issue prose** (`description`, `design`, `acceptance`) | Beads / Dolt |
| Merge landed (the work itself) | Git commit on Main |
| Product literature (specs, ADRs, glossary) | Git markdown. Linked with Beads `spec` / `spec_id` when an issue is *about* a document |
| JSONL | Passive export of the store (`refs/dolt/data` is the backup). Not a writer. |
| Run artifacts | The run directory. Views, never truth. |

The body file under `.scratch/<feature>/issues/NN-slug.md` stops being a writer. `metadata.handle`
and `metadata.slug` stay: they name branches, worktrees, and the optional git document an issue is
*about*. They are identity, not a second copy of status or prose.

Rejected again: `Status:` lines in files; status commits on Main; a hand-maintained markdown mirror;
committing a generated description export (a view in git stops looking like a view).

**What 0001 still covers:** a spec is not an issue. Specs stay files. Issue briefs are not specs.

## Native mapping (loom word → Beads)

| Loom today | Beads-native |
|---|---|
| `.scratch/…/issues/*.md` brief | `description` (plus `design` / `acceptance` when `/to-tickets` publishes) |
| `needs-triage` / `needs-info` as parking | `deferred` (`bd update --defer`; `bd ready` already excludes it) |
| `wayfinder:map` + always-`open` | `decision` + **`pinned`**. Pin = "stays open indefinitely". Close map = `bd unpin` then `bd close` (pinned close needs `--force`) |
| `wayfinder:research` | `bd set-state <id> leg=research` (same pattern as existing `reading:`) |
| `wayfinder:grilling` leftover split | `leg=grilling` if we still need the split; otherwise a comment round on the seed |
| `wayfinder:prototype` / `wayfinder:task` | Unused in TypeScript. Drop from Capture. Prototype/task are later tickets, not Capture types |
| `ready-for-agent` | **Keep.** Pack policy the store cannot hold (ADR-0001/0009). Drain: `bd ready -l ready-for-agent` plus pack exclusions |
| `ready-for-human` / `wontfix` | `wontfix` stays a label, never a closure. `ready-for-human` leaves the face |
| `answer:draft` | Keep as landing flag (or `set-state reading=draft` if we fold it with `reading:`) |
| Map git doc `.scratch/<feature>/map.md` | Optional `spec` link to a **product** map. The bead's `description` is Destination / Notes / Fog. Do not keep two writers |
| `bd dep add` after create | `bd create --description … --deps 'blocks:<id>'` / `discovered-from:<id>` |
| Inquiry claim `bd batch` status-only | **Keep batch.** Do not switch to `bd ready --claim` until assignee policy is explicit (experiment leftover collision) |
| Drain pick TS compose | Keep named exclusion report. First filter may be native `bd ready --exclude-type decision,experiment,epic,molecule,gate` |

### Why maps are not `epic`

Beads epics auto-show in `bd ready` unless `--exclude-type epic` (discussion #2393, unanswered).
Closing the last child does **not** close a regular epic (PR #3276). `parent-child` propagates
blocked-ness down the subtree (pack `domains.ts`); Beads will not refuse a parent that crosses
domains. Consensus already rejected "container epics" (decision 8). `pinned` is the primitive that
means "this is not a ticket and it stays".

Turn a map off: unpin + close. `wontfix` does not hide it (still pinned/open). Default canvas is
open-only plus pinned, so a closed map leaves.

## Operator face (what a human does)

Three acts. Not eight buckets, not five chips, not five wayfinder legs.

| Act | UI | Store |
|---|---|---|
| Capture a **question** | Capture | `bd create -t decision --defer` (or `--defer +1d` as "until I say"). No gate. |
| Capture a **direction** | Capture checkbox "map" | `bd create -t decision` then `bd pin`. Handle `<feature>/map`. No defer, no `needs-triage`. |
| **Run** | one button | Question → `bd undefer` + `set-state leg=research`. Implementation → `/to-tickets` writes work types with `ready-for-agent`. |
| **Turn a map off** | Close on the selected map | `bd unpin` + `bd close --reason "way is clear"`. Description stays in Dolt history. |

Inbox is one ordered `work` list: leftovers, stuck, drafts, ready work, unread results, then deferred
questions. Empty means empty. There are no bucket keys.

Canvas: every `open` or `pinned` issue; closed only as one-hop neighbours of the selection (existing
frame spec). Maps never show the five triage chips.

Create from a selected node still hangs with `blocks` (same-domain inquiry) or `discovered-from`
(from development/experiment). Prefer `--deps` on create.

## Executor seams

Workers today take a **body path**. After the rewrite they take the issue id and read
`bd show --json` (`description`, `design`, `acceptance`). `BD_READONLY=1` stays. They still must not
stamp development/experiment `closed`.

`/to-tickets` publishes into Beads fields, not into a new markdown file. YAML heads that were in the
file become `design` / `acceptance` / labels.

Inquiry `composeReadingFrontier`: type `decision`, `leg=research`, not pinned, not deferred, not
`answer:draft`, not this-run attempted. Map exclusion becomes "pinned" (and type filter), not a
special label.

Drain pick: `bd ready` minus non-work types minus missing `ready-for-agent` minus attempted. Optional
`--exclude-type` as the first cut.

## Live Target (`endo_label`)

`endo-58h` / `endo-dtn` currently wear `needs-triage` **and** `wayfinder:map`. Contract for a new map
is pin without triage.

Migration of those two:

1. `bd update <id> --remove-label needs-triage --remove-label wayfinder:map`
2. Copy `.scratch/<feature>/map.md` into `description` (once)
3. `bd pin <id>`
4. If the direction is finished: `bd unpin` + `bd close`

Do not relabel them `research`. Do not convert them to `epic`.

## What we still refuse (0009, restated)

- `bd merge-slot` — holder is a name, not a pid
- `bd gate` — different word from our gate label
- `bd worktree` — cannot name from handle+slug
- `bd query` as the canvas database — one in-memory snapshot
- `bd set-state` **for the five triage words** — we retire the face instead of dimensionising it
- `bd ready --claim` for inquiry — assignee vs status-only claim

Adopted now: `pin` / `unpin`, `--defer` / undefer, `set-state` for `leg:` (alongside `reading:`),
`--description` / `--deps` on create, `--exclude-type` as a ready filter.

## Tests / gates

Must change when this lands:

- `tools/operator-ui/create.ts` + `overview-test.ts` (map = pin, not `wayfinder:map`; question = defer, not `needs-triage`; `--deps`)
- `tools/attention-ui` (no five chips on pinned; Close map; Capture map checkbox)
- pack `brief` / `publishIssue` / `naming.ts` / personas (no required body file)
- inquiry frontier + leftovers (pin vs `MAP_LABEL`; `leg=research` vs `wayfinder:research`)
- `attention.ts` (pinned maps must not enter `braked`)
- `beads-dag-drain/tests/run-all.ts` plus tools `tsc`

## Rollout (not this document's job)

1. Rewrite ADR-0005; amend 0001 (issue briefs ≠ specs), 0003 (frozen statuses are parking, not orchestration steps), 0009 (pin/defer adopted).
2. Create/attention/pin path (operator-visible).
3. Stop writing new `.scratch` issue files; backfill `description` from existing files.
4. Inquiry `leg=` + pin exclusion.
5. Drain `--exclude-type` as a first filter; keep compose.

Do not land `epic` maps, `--claim`, `merge-slot`, or `bd gate` in the same change.
