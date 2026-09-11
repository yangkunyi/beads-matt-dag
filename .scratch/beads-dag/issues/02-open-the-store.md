# 02 — Open the store before any work

**What to build:** The drain resolves the Target's store and checks it before touching anything: a config
override first, then the environment — and a Target with no store fails the run loudly at the opening
step rather than at the first issue. The same step recomputes blocked-ness, so edits made outside the
drain cannot leave a stale answer behind. One module is the only place in the pack that talks to the
store; it also carries the operator's one-command backup of the store to its remote.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `01`
**Status:** BLOCKED

- [x] a Target with a store opens cleanly; a Target without one fails before any worktree exists, naming
      the reason
- [x] a store that cannot be found at all fails the run with a message saying where it looked
- [x] blocked-ness recomputed at open: an issue whose blocker was closed outside the drain is eligible in
      the same run
- [x] the store module is the only module that builds a store command — asserted by the suite, not
      assumed
- [x] the fixture initialises a real store in the temp Target, and the suite fails loudly when the store
      binary is absent rather than skipping
- [x] backing the store up to its remote is one documented operator command
- [x] an issue published by the fixture carries the two metadata keys the pack consumes (`handle` and
      `slug`); nothing in this build publishes them — the tracker integration that would is out of scope,
      so the fixture stands in for it

## Comments

Built. The opening node now opens the Target's real store before anything else: `open` calls
`preflightStore` (resolve the binary, check the Target's own `.beads/`) and `recomputeBlocked`, and only
then prints `opened`. The store module is `beads-dag-drain/scripts/store.ts`; the operator's backup is
`beads-dag-drain/backup.ts`.

- repros `6/6` (`bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts` — 3 before, 3 added),
  typecheck at zero errors (`./node_modules/.bin/tsc -p tsconfig.pack.json`).
- Acceptance under the runner, after `cp -r .archon/workflows/beads-dag ~/.archon/workflows/beads-dag`, in a
  throwaway `/tmp` lab (`bd init --prefix lab --non-interactive --skip-agents --skip-hooks`): `open`
  completed in 470 ms, `pick`/`review`/`summary` after it, "Workflow completed successfully", and the
  Target ended with no worktree and no new commit. Run both routes: with the binary's directory on PATH,
  and with no config path used and `bd` absent from PATH while `.scratch/beads-dag.yaml` carried
  `store: <path>` — the override resolved. The documented backup command was run from the installed copy
  too (`store pushed to its Dolt remote`).
- Failure under the runner, same lab with no store and no config: `open` failed exit 1 with "cannot find
  the store binary: .scratch/beads-dag.yaml sets no store, and bd is not on PATH (looked in: …)"; `drain`,
  `review` and `summary` were skipped and the run reported failure.
- The suite fails loudly without the binary: with PATH stripped of `bd` (and npm's global prefix holding
  no `bd`), `run-all.ts` reported `2/6` and exit 1, the four store repros each carrying "no store binary:
  the suite drives a real store and will not skip. Looked at …".

Exported surface of the store module, for the tickets after this one:

- `Store` — `{ binary, source: "config" | "environment" }`.
- `resolveStore(target, config)` — the Target's `store` override first (a relative path resolves against
  the Target), then `bd` on PATH; throws naming every place it looked.
- `preflightStore(target, config)` — resolve, then require the Target's own `.beads/`; throws when it is
  missing.
- `recomputeBlocked(store, target)` — `recompute-blocked --json`.
- `pushStore(store, target)` — `dolt push`, the operator's backup, documented as
  `bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts` from the Target.
- `STORE_DIR_REL` — `.beads`.

Deviations, each deliberate:

- `backup.ts` sits beside the drain's YAML rather than in `scripts/`, because the contract test requires
  every entry in `scripts/` to be a declared node and this is an operator command, not a node. The
  store-module scan still covers it (it scans the pack, tests excluded).
- The blocked-ness criterion is pinned on the observable it names: after a blocker is closed outside the
  drain, the opening node leaves the dependent eligible in `bd ready` — tested with the dependent hidden
  first. On v1.2.2 embedded every local write path recomputes `is_blocked` itself and `bd sql` is
  unavailable to hand-edit it, so a stale flag cannot be manufactured through the CLI (the design record
  says the same); the test therefore would not fail if `open` skipped the recompute, and it is recorded
  here rather than papered over. The recompute stays load-bearing for the pull and hand-edit repairs.
- The suite resolves the binary from `BEADS_BIN`, then PATH, then `npm prefix -g` plus `/bin/bd`, so it
  needs no fixed PATH; the pack's own resolution is the config override first and PATH second, and the
  tests exercise both routes (and both failures).

