# ADRs

| # | Decision | Status |
|---|---|---|
| [0001](0001-beads-owns-the-store-graph-and-frontier.md) | Beads owns the store, the graph and the frontier | accepted |
| [0002](0002-merge-before-stamp.md) | Merge before stamp | accepted |
| [0003](0003-four-statuses-the-rest-is-derived.md) | Four statuses; the rest is derived | accepted |
| [0004](0004-close-means-merged.md) | Close means merged | accepted |

Design record: `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10 settles the flow).

The 63 ADRs in `/data3/yky/workflow/docs/adr/` describe the predecessor system — a file-backed store
with an `orchestrator` CLI and an archon pack. They are **evidence and current-state description, not
authority** for this repo; §10.1 of the design record lists the eight whose rules a beads store
supersedes. Read them for the reasoning, not for the rules.
