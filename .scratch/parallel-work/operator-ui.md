# operator UI

## Tickets

- Local HTML overview of the Target’s beads graph: DAG of issues, filter by type / status / label (inquiry, experiment, drain), click a node for that ticket’s status, comments, and documents — files: `tools/operator-ui/` — socket: none
- Overlay live drain / inquiry / experiment runs on that graph (what is in progress, last report) — files: `tools/operator-ui/` — socket: needs
- On a selected node, leave an operator reply; a session applies it as `bd comment` (and the existing close / `reading:` / label acts for that domain) — files: `tools/operator-ui/`, `docs/agents/issue-tracker.md` — socket: needs

## Seam

A read model of the Target: the issue DAG from the beads store via `bd` (not `.beads/issues.jsonl`), plus a place the three executors can publish “this run is doing X” so one page covers inquiry, experiment, and drain. The UI is a view and an editor, not a second graph or comment store. Do not use `bd human respond` (it closes with reason Responded). Inquiry close and experiment `reading:` stay the session’s act on the operator’s word (ADR-0006).
