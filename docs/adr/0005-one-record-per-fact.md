# One record per fact

**Rewritten 2026-09-21.** Spec: `docs/specs/2026-09-21-beads-native-loom.md`.

An issue's state **and its work-memory prose** have exactly one home: the store. Git holds a
different fact: whether the work landed (the merge commit). Product literature (specs, ADRs,
glossary) is also a different fact: it has no lifecycle, never enters a frontier, and its value is
that it diffs.

| Fact | Home |
|---|---|
| Identity, status, graph, labels, comments, issue prose (`description`, `design`, `acceptance`) | Beads / Dolt |
| Merge landed | Git commit on Main |
| Product literature | Git markdown, optionally linked with Beads `spec` / `spec_id` |
| JSONL | Passive export. Not a writer. |
| Run artifacts | The run directory. Views, never truth. |

`metadata.handle` and `metadata.slug` stay: they name branches, worktrees, and the optional git
document an issue is *about*. They are identity, not a second copy of status or prose.

The predecessor `.scratch/<feature>/issues/NN-slug.md` body was a second writer of the same brief.
That is the reconciliation problem this ADR exists to avoid. Capture and `/to-tickets` write
`--description` (and `design` / `acceptance` when publishing work). Workers read the store.

A spec is still not an issue (ADR-0001). Issue briefs are not specs.

Rejected: a `Status:` line in a file; status commits on Main; a hand-maintained markdown mirror of
the store; committing a generated description export (a view in git stops looking like a view);
keeping the sidecar brief as a writer "for whoever opens the file".
