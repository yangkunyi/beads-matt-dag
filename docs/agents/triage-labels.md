# Triage Labels

The operator face is three acts: park, run, drop. Beads primitives do the parking.

| Act | Store |
| --- | --- |
| Park a question | status `deferred` |
| Park a direction | status `pinned` (a map) |
| Run reading | `bd update -s open` then `bd set-state leg=research` |
| Run implementation | `/to-tickets` stamps `ready-for-agent` |
| Drop | label `wontfix` (never a close) |

`ready-for-agent` remains the drain gate. `wontfix` remains a label.

These strings still exist in the family for old issues, but Capture does not stamp them and the
inbox does not offer them: `needs-triage`, `needs-info`, `ready-for-human`.
