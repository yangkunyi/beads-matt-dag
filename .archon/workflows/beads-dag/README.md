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
keys are `model`, `thinkingLevel`, `concurrency`, `runner` and `store`, and the defaults are in
`beads-dag-drain/scripts/config.ts`.

## The store

A Target owns a real beads store in its own `.beads/`. The drain opens it before anything else, so a
broken or missing store fails at the opening node — before pick, before a worktree — naming what was
missing and everywhere it looked. The store binary is resolved with the Target's config override first,
then from the environment:

```yaml
store: /home/me/.local/node-v24.19.0-linux-x64/bin/bd   # optional; unset, bd is looked for on PATH
```

One module builds every store command for the pack: `beads-dag-drain/scripts/store.ts`. Nothing else in
either workflow folder names the binary, and the suite asserts that. The store's derived blocked-ness is
recomputed at open, so a change made outside the drain cannot leave a stale answer behind.

**Back the store up to its Dolt remote** — one command, from the Target, once the remote is configured
(`bd dolt remote add <name> <url>`):

```
bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts
```

## The frontier

The drain starts what the store says can start, minus what the store cannot know. `pick` asks one
question — `bd ready`, the whole answer, not the store's default cap — and then applies three rules:

- **the other domain.** Type `decision` never enters a drain, excluded by type, so a new flavour of
  question cannot leak in by omission.
- **the gate label.** An issue without `ready-for-agent` is not the drain's work; pulling that label back
  is the operator's brake.
- **what this run already tried.** The store cannot know it: a failed attempt records its reason as a
  comment and puts the issue back to `open`, so the retry channel is the store's own ready answer, and
  the only thing that stops a run retrying its own failure is the run's `attempted-ids.json`. A drain
  with no attempts of its own works such an issue exactly like fresh work.

What is left is truncated to the configured `concurrency` and claimed in **one transaction** (`bd batch`,
all-or-nothing), so a claim that fails part-way leaves nothing claimed. Every issue the store offered and
this step left out is written to `pick-exclusions.json` in the run's artifacts, with the rule that
excluded it — so a drain that did nothing can say why. The file is rewritten each cycle: it describes the
cycle that just ran, and the cycles before it are in the store's own history.

## Gates

All three run from this repository, cheapest first.

```
bun install                                                        # once: the gate's dev dependencies
bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts   # the repro suite
./node_modules/.bin/tsc -p tsconfig.pack.json                      # typecheck, dev-only, not in the pack
```

The repro suite drives a real store, never a fake one: it resolves the store binary from `BEADS_BIN`,
then PATH, then `npm prefix -g` plus `/bin/bd`, and fails loudly when it cannot find one — no test skips.
Install it with `npm i -g @beads/bd@1.2.2`, or point `BEADS_BIN` at one.

The third gate is the acceptance: a real `archon workflow run` against a throwaway Target. It runs once
per release rather than per change, and never against a Target someone is draining.

## Layout

```
beads-dag-drain/     the drain: open, the loop (pick, execute), then the two readers, and backup.ts,
                     the operator's one-command store backup
beads-dag-execute/   one issue, start to finish. Not a public entry: its issue input is required.
```

A workflow folder holds its YAML, its `scripts/` (each entry script is a node that folder's YAML declares),
and, for the drain, its `tests/`. `backup.ts` sits beside the YAML rather than in `scripts/` because it is
an operator command, not a node. A module may be imported across the two folders; a node body may not,
because the folder whose YAML declares a node is where that node's script resolves.
