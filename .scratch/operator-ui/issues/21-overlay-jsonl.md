# operator-ui/21 — the live overlay joins Archon's run JSONL

**What to build:** Archon already writes `workspaces/<project>/logs/<run-id>.jsonl` (one event per
line: `workflow_start`, `node_start`, `exec_output`, `node_complete`, `workflow_complete`). The overlay
already joins the Target lock, `archon workflow status --json`, `run-lock.json`, `attempted-ids.json`,
and the last report. It does not invent a fifth log. It reads that JSONL as another fact of the same
run.

The path is `<output_root>/logs/<run-id>.jsonl` — `output_root` is already on the Archon status row
that locates `artifacts/runs/<run-id>/`. A missing or unreadable file is no log, not a failed overlay.
The page shows the current step (last `node_start` not yet `node_complete`) next to the live kind.

Do not parse `archon isolation list --json`. Do not copy events into the store.

- [ ] `parseArchonLog` turns JSONL text into events; a bad line is skipped
- [ ] the overlay reads `<output_root>/logs/<run-id>.jsonl` when the Archon row names that root
- [ ] a missing log still overlays the lock, status, attempted, and last report
- [ ] the served page names the current step when the log has one
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
