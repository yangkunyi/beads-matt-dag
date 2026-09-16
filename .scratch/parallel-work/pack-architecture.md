# pack architecture

## Tickets

- Lift the shared pack library out of `beads-dag-drain/scripts` so inquiry, read, and execute stop importing via `../../beads-dag-drain/scripts`; drain-alone merge modules stay in drain — files: `.archon/workflows/beads-dag/beads-dag-drain/scripts/{store,naming,git,doc-commit,lock,run-lock,domains,failures,roles,agent,worker-env,prompt,config,attempted,node-entry,node-outcomes}.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/{open,pick,frontier,leftovers,inquiry,report}.ts`, `.archon/workflows/beads-dag/beads-dag-read/scripts/read.ts`, `.archon/workflows/beads-dag/beads-dag-execute/scripts/execute.ts`, `.archon/workflows/beads-dag/beads-dag-drain/tests/`, `tsconfig.pack.json`, `.archon/workflows/beads-dag/README.md` — socket: needs
- Delete leftover open/pick copies and any temporary abstraction once existing callers are adapters at the socket — files: `.archon/workflows/beads-dag/beads-dag-drain/scripts/{open,pick}.ts`, `.archon/workflows/beads-dag/beads-dag-inquiry/scripts/{open,pick}.ts` — socket: needs

## Seam

`openRun` / `pickRun`: lock, preflight, recompute, claim + attempted + exclusion. Drain and inquiry plug in as adapters and keep today's behaviour (drain leftover repair from git, inquiry leftover repair from the store, drain's review base, inquiry's reading labels). Optional claim assignee so a later adapter can set it without editing the socket. Closed stays in the domain adapter (ADR-0006). Do not unify leftover repair (ADR-0002). Do not merge the execute and read folders. Do not move `tools/` into the pack.
