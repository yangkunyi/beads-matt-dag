# 02 — Open the store before any work

**What to build:** The drain resolves the Target's store and checks it before touching anything: a config
override first, then the environment — and a Target with no store fails the run loudly at the opening
step rather than at the first issue. The same step recomputes blocked-ness, so edits made outside the
drain cannot leave a stale answer behind. One module is the only place in the pack that talks to the
store; it also carries the operator's one-command backup of the store to its remote.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `01`
**Status:** BLOCKED

- [ ] a Target with a store opens cleanly; a Target without one fails before any worktree exists, naming
      the reason
- [ ] a store that cannot be found at all fails the run with a message saying where it looked
- [ ] blocked-ness recomputed at open: an issue whose blocker was closed outside the drain is eligible in
      the same run
- [ ] the store module is the only module that builds a store command — asserted by the suite, not
      assumed
- [ ] the fixture initialises a real store in the temp Target, and the suite fails loudly when the store
      binary is absent rather than skipping
- [ ] backing the store up to its remote is one documented operator command
- [ ] an issue published by the fixture carries the two metadata keys the pack consumes (`handle` and
      `slug`); nothing in this build publishes them — the tracker integration that would is out of scope,
      so the fixture stands in for it
