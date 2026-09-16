# experiment close-out

## Tickets

- Give the experiment executor a last node that releases the Target run lock and writes attempted, closed-on-record, and failed — files: `.archon/workflows/beads-dag/beads-dag-experiment/beads-dag-experiment.yaml`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/` — socket: none

## Seam

The close-out must release the same Target run lock that experiment `open` took, and must read attempted-ids plus store facts (closed on record completeness, failed attempts). It is not drain’s review/summary and not inquiry’s draft report. Do not merge `beads-dag-experiment-run` into this node. Closed stays completeness-of-record (ADR-0006).
