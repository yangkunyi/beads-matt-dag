# 12 — the drain-end report says what failed, and how often

**What to build:** After a drain, the run's own report answers "what failed here, and how many attempts has
each issue burned", read from the store's own history rather than from a counter the pack would keep.
§10.3's Retry paragraph is the requirement; step 1's acceptance deferred it because the build was told not
to change what the report says, and this is the ticket that changes it.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.3, Retry)
**Blocked by:** `10`
**Status:** BLOCKED

- [ ] the report names every issue this run attempted and left `open` with a failure, with its attempt count
- [ ] the count comes from the store's own history — read it with the store's own command, never from a file
      the pack writes — and the Comments record the predicate that was read
- [ ] the count is cumulative across drains: the same issue failing in two runs reports 1, then 2
- [ ] an issue repaired at open is named with its reason, and the report says whether the repair closed it
      or reopened it
- [ ] an issue that never failed reports nothing: no zero-filled rows
- [ ] the numbers are read by the node, not by a model: the agent's job is to place them, and what a reader
      sees is exactly what the store answered
- [ ] a run with nothing to say about failures says so in one line rather than an empty section, and a run
      with no report at all keeps its existing skip line
- [ ] nothing new is recorded anywhere: no attempt counter, no failure log, no store field
- [ ] the pack README's Gates section records how the gates are run now (Q11): `run-all` once with the store
      binary on PATH, plus the typecheck; "the store binary is absent" stays a repro inside the suite, not a
      second mode of it, because a machine that drains has the binary on PATH
