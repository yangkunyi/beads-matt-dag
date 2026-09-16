# open lock-and-release

## Tickets

- Drain, inquiry, and experiment `open` keep leftover repair and premises, and plug into one lock-and-release shell — files: `.archon/workflows/beads-dag/beads-dag-drain/scripts/open.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/open.ts`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/open.ts`, `.archon/workflows/beads-dag/beads-dag-drain/scripts/run-lock.ts` — socket: needs

## Seam

Take the Target run lock, print the config line, run the executor’s own leftover repair and premises, release the lock if that work fails. Leftover repair stays out of the socket: drain from git, inquiry and experiment from the store (ADR-0002). No domain switch inside the shell. Closed stays out of the shell (ADR-0006).
