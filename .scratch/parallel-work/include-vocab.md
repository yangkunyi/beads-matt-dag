# include vocabulary

## Tickets

- Reading include owns the labels and paths it needs; `read` stops importing the inquiry folder — files: `.archon/workflows/beads-dag/beads-dag-read/scripts/read.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/inquiry.ts` — socket: none
- Experiment-run include owns record, ticket, and tool spawn; `run` stops importing the experiment parent folder — files: `.archon/workflows/beads-dag/beads-dag-experiment-run/scripts/run.ts`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/{record,ticket,run-tool}.ts` — socket: none

## Seam

Vocabulary an include needs lives in a module that include’s folder owns. Parent YAML still includes the child. Folders stay split (Archon fan-out). Not a pack-kernel move and not a merge of execute/read/experiment-run.
