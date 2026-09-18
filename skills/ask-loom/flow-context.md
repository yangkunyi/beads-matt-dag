# Flow vocabulary

Shipped with the skill set, one copy per machine. A Target's `docs/CONTEXT.md` is the **product**
language and is a different document.

Definitions live here; *why* lives in the design checkout's `docs/adr/`. No implementation detail
below — if a term can only be explained by a command, it belongs in a spec.

## The work

- **issue** — the unit of work. Beads' word, the engineering skills' word, and this flow's word.
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
  questions. Its issues are the `decision` type, and it produces decisions, not deliverables.
- **idea** — a proposition under development, tracked as a `decision` issue so that its *development* is
  kept and not just its current state. It never graduates by itself.
- **verification leg** — the flow's half that checks a result against something the flow cannot supply
  itself. Not designed yet.

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
  them. One copy per machine; a Target does not contain it.
- **operator** — the human acting on the Target's issue graph without a session.
- **operator surface** — a view of that graph. Not an executor and not a local editor.
- **allow-list** — the ids one run may claim.

## Lifecycle

- **status** — `open`, `in_progress`, `closed`.
- **blocked** — derived, never stored: a blocker is not closed.
- **ready** — derived: `open` and not blocked.
- **closed** — every issue's `closed` means what its domain says it means: in development the work is in
  Main, in inquiry the question is answered, in experiments the result is recorded (ADR-0006).
- **failed attempt** — an event, not a status. The issue is back to `open`.
- **merge before stamp** — a recorded "closed" never runs ahead of the merge it claims (ADR-0002).
- **delete** — permanently remove an issue from the store. Not a status and not `closed` (ADR-0008).

## Domains

- **domain** — a family of issues whose closure means the same thing. Three: inquiry, development,
  experiments.
- **type** — the domain an issue belongs to: `decision` is inquiry's, `experiment` is experiments',
  every work type is development's. A blocking chain must not cross domains (ADR-0006).
- **crossing** — `relates-to` and `discovered-from`. A blocking relation never crosses (ADR-0004).

## Labels

- **triage label** — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
- **gate** — `ready-for-agent`.
- **brake** — moving an issue back to `needs-triage` or `needs-info`.
- **wontfix** — a label, never a closure.
