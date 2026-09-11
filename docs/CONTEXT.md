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

## Lifecycle

- **status** — an issue's single lifecycle slot: `open`, `in_progress`, `closed`.
- **blocked** — derived, never stored: a blocker is not closed. The store maintains it.
- **ready** — derived: `open` and not blocked.
- **closed** — the work is in Main. The only closure meaning this repo recognises (ADR-0004).
- **failed attempt** — an event, not a status: the git contract failed, the reason is a comment on the
  issue, and the issue is back to `open` — so `bd ready` is the whole retry channel. A later drain may
  start it again; the drain that failed it may not, because the issue is in that run's
  `attempted-ids.json`.
- **merge before stamp** — a result is recorded only after it has happened, so a recorded "closed"
  never runs ahead of the merge it claims (ADR-0002).

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
| board, card | — | Not this repo's model |
