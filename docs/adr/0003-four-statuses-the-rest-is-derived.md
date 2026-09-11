# Four statuses; the rest is derived

An issue has one of four statuses: `open`, `in_progress`, `closed` (the store's own) and `failed` (one
custom status). `BLOCKED` and `READY` are not statuses — blocked-ness is derived by the store from the
graph, and readiness is `open` plus not-blocked. `MERGING`, `CONFLICT` and `RESOLVING` are not statuses
either: merging and resolving are steps *inside* a running issue, `in_progress` already keeps a second
drain off it, and the worktree's own git state is what records whether a merge is under way or left
conflicts behind.

The predecessor machine had eight statuses and twelve transitions, and it needed them because the store
was a directory of files: with no derived facts, every fact that anyone might need — including "which
step of the orchestration is this in" — had to be written down somewhere, and the only somewhere was
the issue. A store that derives blocked-ness, plus a git worktree that knows its own merge state,
removes most of that. What remains is three transitions (`open → in_progress`, `in_progress → closed`,
`in_progress → failed`) and one repair path.

Rejected: a status per orchestration step (state that only the orchestrator can interpret, and that
lies when the process dies mid-step); keeping `blocked` as a stored status (the store derives it; the
built-in exists for manual use); putting `failed` in a label instead of a status (a lifecycle value in
a label — and it would look `open` to anything else reading the store, hiding a failure behind the
appearance of untouched work).
