# pack kernel

## Tickets

- Lift the shared pack kernel out of the drain executor so inquiry, experiment, execute, and read import the kernel, not `../../beads-dag-drain/scripts`; drain-alone merge modules stay in drain — files: `.archon/workflows/beads-dag/beads-dag-drain/scripts/{store,naming,git,doc-commit,lock,run-lock,domains,failures,roles,agent,worker-env,prompt,config,attempted,node-entry,node-outcomes}.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/`, `.archon/workflows/beads-dag/beads-dag-read/scripts/read.ts`, `.archon/workflows/beads-dag/beads-dag-execute/scripts/execute.ts`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/`, `.archon/workflows/beads-dag/beads-dag-experiment-run/scripts/run.ts`, `.archon/workflows/beads-dag/beads-dag-drain/tests/`, `tsconfig.pack.json`, `.archon/workflows/beads-dag/README.md` — socket: none

## Seam

Callers import a pack kernel for store, Target run lock, attempted, roles, naming, doc-commit, node entry. They do not reach through the drain executor to get those. Drain-alone merge modules stay in drain. Closed stays in the domain adapter (ADR-0006). Leftover repair stays in each executor (ADR-0002). Execute, read, and experiment-run folders stay. `tools/` stays out of the pack.
