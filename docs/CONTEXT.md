# Context

The vocabulary this repo uses, and the only one its documents should use. Definitions live here;
*why* lives in `docs/adr/`, and the long-form argument in `docs/specs/`. No implementation detail
below — if a term can only be explained by a command, it belongs in a spec.

## The work

- **issue** — the unit of work. Beads' word, the engineering skills' word, and this repo's word.
- **id** — a bead's hash id. An issue's identity. Not a path.
- **handle** — `<feature>/<NN>`, an issue's human-readable legacy identifier, carried in metadata.
  Every git name derived from an issue (branch, worktree, commit subject) is derived from its handle.
- **decision issue** — an issue whose content is a question rather than work. Excluded from execution
  structurally, by type.
- **spec** — a long-form design document in git (`docs/specs/<date>-<slug>.md`). Not an issue: never in
  a frontier, never claimed, never closed.
- **map** — the document a wayfinding effort keeps its questions, findings and decisions-so-far in.
- **body** — an issue's prose: the file at `.scratch/<feature>/issues/<NN>-<slug>.md`, frozen once
  published. It carries the handle and no status — identity belongs in a document, state does not
  (ADR-0005).
- **inquiry** — the flow's half before work: literature, notes and ideas turned into decided
  questions. Its issues are the `decision` type, and it produces decisions, not deliverables. The
  design record's "research half" (§8) means this half. Called the front end until 2026-09-14, when the
  name turned out to read as a UI.
- **idea** — a proposition under development, tracked as a `decision` issue so that its *development* is
  kept and not just its current state: judging whether an idea is ripe means reading how it got there. Its
  process is its comment thread; its state is read off the record — `bare`, `argued`, `evidenced`,
  `proposed`, `settled` — never typed in; and it never graduates by itself: the session or the operator graduates it into
  an issue, linked back with `relates-to`, or drops it with `wontfix`.
- **verification leg** — the flow's half that checks a result against something the flow cannot supply
  itself: an instrument, a benchmark, an outside referee. The design record's "science half" (§7)
  means this one. Not designed yet.

## Running

- **drain** — one orchestration run. Starts eligible issues, merges what succeeds, stops when nothing
  is eligible.
- **frontier** — what a drain may start right now: unblocked, unclaimed, gated, not already attempted
  by this drain, and not already merged.
- **attempted** — an issue this drain has started at least once. Recorded per run, outside the store.
- **Target** — the repository a drain operates on. It owns its own store.
- **Main** — the Target's main branch: what merges land on.
- **worktree** — the per-issue checkout a worker runs in.
- **agent role** — which agent executes a step (implement, resolve, review). Not a triage label.
- **pack** — a folder of workflow definitions and their scripts, installed where the runner looks for
  them.
- **operator** — the human acting on the Target's issue graph without a session. Not an agent role and
  not a triage label.
- **operator surface** — a view of that graph: issues and edges, plus the live overlay of a run. Not
  an executor and not a local editor. A write goes to the store; the view reloads from the store and
  keeps layout positions. Starting work still means starting the domain's existing run (drain,
  inquiry, or experiment).
- **allow-list** — the ids one run may claim. It is this run's pool, not a label; it does not brake
  issues left out of the selection.

## Lifecycle

- **status** — an issue's single lifecycle slot: `open`, `in_progress`, `closed`.
- **blocked** — derived, never stored: a blocker is not closed. The store maintains it.
- **ready** — derived: `open` and not blocked.
- **closed** — every issue's `closed` means what its domain says it means: in development the work is in
  Main, in inquiry the question is answered, in experiments the result is recorded, and never a general
  "finished" (see Domains; ADR-0006).
- **failed attempt** — an event, not a status: the git contract failed, the reason is a comment on the
  issue, and the issue is back to `open` — so `bd ready` is the whole retry channel. A later drain may
  start it again; the drain that failed it may not, because the issue is in that run's
  `attempted-ids.json`.
- **merge before stamp** — a result is recorded only after it has happened, so a recorded "closed"
  never runs ahead of the merge it claims (ADR-0002).
- **delete** — permanently remove an issue from the store. Not a status and not `closed`. The operator
  may delete from the surface only when the issue is not `in_progress` and it has no dependents; there
  is a confirm step. A dependent still pointing at it is refused, not cascade and not orphaned. Identity
  is gone; it cannot be undone (ADR-0008).

## Domains

- **domain** — a family of issues whose closure means the same thing. Three: inquiry
  (`closed` = the question is answered), development (`closed` = the work is in Main), experiments
  (`closed` = the result is recorded).
- **type** — the domain an issue belongs to, and the only thing a reader needs to know which closure it
  carries: `decision` is inquiry's, `experiment` is experiments', every work type (`task`, `bug`, …) is
  development's. A drain refuses a blocking chain that reaches a non-work type, so a closure in one domain
  cannot release work in another (ADR-0006).
- **crossing** — two non-blocking links join two domains, and no other kind does: `relates-to` for a
  loose see-also, and `discovered-from` for the handoff a result makes (a work issue created because an
  experiment's result justified it). The operator may write both. A blocking relation never crosses — neither `blocks` nor the
  `parent-child` hierarchy, at any depth (ADR-0004) — in either direction. A closure in one domain must
  never release work in another.

## Labels

- **triage label** — one of five: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
  `wontfix`.
- **gate** — `ready-for-agent`. An issue without it is outside the frontier.
- **brake** — moving an issue back to `needs-triage` or `needs-info` to pull it out of the frontier.
- **wontfix** — nobody will do this. A label, never a closure.

## Truth

- **ground truth** — git holds the fact (the merge commit); the store holds the state. When they
  disagree, git wins and the store is repaired.

## Terms this repo avoids

| Avoid | Use | Why |
|---|---|---|
| ticket | issue | Three independent vocabularies already agree on "issue" (§10.2 of the design record) |
| role, alone | agent role, or triage label | Two different axes; "role" alone is ambiguous |
| DAG node | issue | The graph is a property of the issues, not a separate object |
| related-to | relates-to | The store's crossing edge name |
| field | domain | A domain is a type and a closure meaning, not a canvas field |
| board, card | — | Not this repo's model |
| executor per issue | the domain's executor | Execution hangs on the domain, not on a node (ADR-0007) |
| break (on delete) | refuse the delete | A dependent still pointing at the issue blocks delete; do not cascade or orphan |
| local editor | operator surface | The canvas is a view; React state is not the graph (ADR-0007) |
