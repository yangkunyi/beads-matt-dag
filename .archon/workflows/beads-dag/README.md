# beads-dag

The Archon pack that drains implementation issues from a Target whose issues live in a store. The design
it is built against is `docs/specs/2026-09-11-beads-dag.md`, with the decision record behind it in
`docs/specs/2026-09-11-beads-issue-tracker-consensus.md`, the ADRs in `docs/adr/`, and the vocabulary in
`docs/CONTEXT.md`.

## Install

Copy the folder — copy, not a symlink, because the runner reads it as its own:

```
cp -r .archon/workflows/beads-dag ~/.archon/workflows/beads-dag
```

Then, from the Target:

```
archon workflow run beads-dag-drain --detach
```

The Target does not commit `.archon/`. Its config is optional and lives at `.scratch/beads-dag.yaml`; the
keys are `model`, `thinkingLevel`, `concurrency` and `runner`, and the defaults are in
`beads-dag-drain/scripts/config.ts`.

## Gates

All three run from this repository, cheapest first.

```
bun install                                                        # once: the gate's dev dependencies
bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts   # the repro suite
./node_modules/.bin/tsc -p tsconfig.pack.json                      # typecheck, dev-only, not in the pack
```

The third gate is the acceptance: a real `archon workflow run` against a throwaway Target. It runs once
per release rather than per change, and never against a Target someone is draining.

## Layout

```
beads-dag-drain/     the drain: open, the loop (pick, execute), then the two readers
beads-dag-execute/   one issue, start to finish. Not a public entry: its issue input is required.
```

A workflow folder holds its YAML, its `scripts/` (each entry script is a node that folder's YAML declares)
and, for the drain, its `tests/`. A module may be imported across the two folders; a node body may not,
because the folder whose YAML declares a node is where that node's script resolves.
