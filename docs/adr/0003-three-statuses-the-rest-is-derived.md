# Three statuses; the rest is derived

An issue has one of three statuses: `open`, `in_progress`, `closed`. `BLOCKED` and `READY` are not
statuses — blocked-ness is derived by the store from the graph, and readiness is `open` plus
not-blocked. `MERGING`, `CONFLICT` and `RESOLVING` are not statuses either: merging and resolving are
steps *inside* a running issue, `in_progress` already keeps a second drain off it, and the worktree's
own git state is what records whether a merge is under way or left conflicts behind.

A failure is an event, not a status: the attempt's reason is written as a comment on the issue and the
issue goes back to `open`, so `bd ready` — the store's own answer — is the whole retry channel. Nothing
has to be registered in the store before a drain can record a failure, and a failed issue is not
mistaken for one that was never started: its comments and its history say otherwise, and it is the
drain-end report that reads them.

The predecessor machine had eight statuses and twelve transitions, and it needed them because the store
was a directory of files: with no derived facts, every fact that anyone might need — including "which
step of the orchestration is this in" — had to be written down somewhere, and the only somewhere was
the issue. A store that derives blocked-ness, plus a git worktree that knows its own merge state,
removes most of that. What remains is two transitions (`open → in_progress`, `in_progress → closed`),
one retry loop (`in_progress → open`, with the reason recorded as a comment) and one repair path.

**Reversed 2026-09-11.** This ADR first ruled four statuses, with `failed` as a *custom* status.
Keeping it would have meant registering that status in every store before a drain could start
(`bd config set status.custom "failed:wip"`), and the registration is store *database* state rather
than a committable file: it rides the Dolt backup, a fresh store lacks it, and a Target whose store
lacks it has a failure path that stops the drain instead of recording the failure. A custom status is
also a lifecycle value the store cannot explain — `bd ready` hides it, so the frontier needed a
hand-built union of two queries. The event model needs no registration and no union, and it costs one
thing, accepted: the store can no longer list failures in a single query, so "what failed, and how
often" is answered by the drain-end report and per-issue `bd history`.

Rejected: a status per orchestration step (state that only the orchestrator can interpret, and that
lies when the process dies mid-step); keeping `blocked` as a stored status (the store derives it; the
built-in exists for manual use); putting a failure in a label instead of recording it as an event (a
lifecycle value in a label, which also leaves the issue looking untouched to anything reading the
store); and `failed` as a custom status, for the reasons above.
