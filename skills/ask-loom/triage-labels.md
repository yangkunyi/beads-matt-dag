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

`needs-triage`, `needs-info`, and `ready-for-human` are not read and not offered. A question that
is not running is `deferred`. A direction is `pinned`.
