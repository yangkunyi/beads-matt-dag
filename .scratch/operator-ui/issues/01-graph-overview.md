# operator-ui/01 — Target beads graph overview

**What to build:** a local HTML overview of the Target's beads graph: the DAG of issues, filter by type / status / label (inquiry, experiment, drain), click a node for that issue's status, comments, and documents. The graph is read from the beads store via `bd`, not from the jsonl export. The UI is a view, not a second graph store.

- [ ] a local page shows the Target's issue DAG
- [ ] the graph is read via `bd`, not the jsonl export
- [ ] the page filters by type, status, and label
- [ ] clicking a node shows that issue's status, comments, and documents
- [ ] the tools typecheck stays clean
