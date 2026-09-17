# Cut

## Seam

- **Lift the pack kernel out of drain** — Callers import a pack kernel for store, Target run lock, Main lock, attempted, roles, naming, doc-commit, node-entry, git, domains, failures, agent, worker-env, prompt, config, and node-outcomes. They do not reach through the drain executor. Drain-alone merge modules (settle, verify, worktree, review, …) stay in drain. `tools/` stays out of the pack. Closed stays in the domain adapter (ADR-0006). Leftover repair stays in each executor (ADR-0002). Execute, read, and experiment-run folders stay.
  - files: `.archon/workflows/beads-dag/beads-dag-drain/scripts/{store,naming,git,doc-commit,lock,run-lock,domains,failures,roles,agent,worker-env,prompt,config,attempted,node-entry,node-outcomes}.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/`, `.archon/workflows/beads-dag/beads-dag-read/scripts/read.ts`, `.archon/workflows/beads-dag/beads-dag-execute/scripts/execute.ts`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/`, `.archon/workflows/beads-dag/beads-dag-experiment-run/scripts/run.ts`, `.archon/workflows/beads-dag/beads-dag-drain/tests/`, `tsconfig.pack.json`, `.archon/workflows/beads-dag/README.md`
  - acceptance: existing callers still green (pack typecheck and drain repro suite); no new behaviour

## Issues

- **Plug drain, inquiry, and experiment `open` into one lock-and-release shell** — blocked by: Lift the pack kernel out of drain — files: `.archon/workflows/beads-dag/beads-dag-drain/scripts/open.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/open.ts`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/open.ts`, new kernel shell module (take lock, print the config line, run leftover+premises passed in, release on failure; leftover stays in each executor)
- **Reading include owns its labels and paths** — blocked by: Lift the pack kernel out of drain — files: `.archon/workflows/beads-dag/beads-dag-read/scripts/read.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/inquiry.ts`
- **Experiment-run include owns record, ticket, and tool spawn** — blocked by: Lift the pack kernel out of drain — files: `.archon/workflows/beads-dag/beads-dag-experiment-run/scripts/run.ts`, `.archon/workflows/beads-dag/beads-dag-experiment/scripts/{record,ticket,run-tool}.ts`
- **Experiment close-out last node: release the run lock and write attempted, closed-on-record, and failed** — blocked by: Lift the pack kernel out of drain — files: `.archon/workflows/beads-dag/beads-dag-experiment/beads-dag-experiment.yaml`, new last-node script under `.archon/workflows/beads-dag/beads-dag-experiment/scripts/`
- **Operator UI: Target beads graph overview** — blocked by: none — files: `tools/operator-ui/`
- **Operator UI: overlay live drain / inquiry / experiment runs** — blocked by: Operator UI: Target beads graph overview — files: `tools/operator-ui/`
- **Operator UI: `bd comment` from the UI** — blocked by: Operator UI: Target beads graph overview, Operator UI: overlay live drain / inquiry / experiment runs — files: `tools/operator-ui/`, `docs/agents/issue-tracker.md`
