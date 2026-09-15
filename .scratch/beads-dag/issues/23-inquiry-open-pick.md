# beads-dag/23 — the reading executor: open, and the frontier

**What to build:** the pack's second workflow folder, runnable as `beads-dag-inquiry` against any Target that
has a store. Its **open** takes the same Target-level run lock the drain takes — one run at a time per
Target, whatever kind of run it is, because both of them write Main — resolves the store, prints the one
configuration line, refuses loudly when the Target has no reading tool directory or no effort directory, and
repairs what a killed earlier run left claimed. The repair reads the **store**, not git, because this
domain's landing is a store fact: a question left running that already carries the draft label goes back to
open with a comment saying the claim was released after the reading landed; one without it goes back to open
with `attempt N failed: leftover in progress and no draft answer on the issue`, which is the ordinary failed
attempt with its ordinal. Its **pick** answers the frontier — the store's ready answer minus the tickets not
labelled for a reading leg, minus the map container, minus the ones whose reading already landed, minus the
ones this run already tried — ordered by handle, truncated to the run's configured concurrency, printed as
one JSON array of handles, claimed in a single all-or-nothing store write, and reported: every excluded
issue and the rule that excluded it goes into the run's exclusions artifact.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The inquiry executor";
`docs/agents/issue-tracker.md` — "The frontier and the claim", "Wayfinding operations".

- [ ] against a store holding five question tickets — one eligible, one not labelled for reading, the map,
      one whose reading already landed, one already claimed — the frontier is exactly the eligible one, and
      the exclusions artifact names each of the others with the rule that excluded it
- [ ] the order is by handle and the batch is truncated to the configured concurrency
- [ ] the claim is all-or-nothing, and a claimed ticket leaves every session's frontier
- [ ] open refuses a Target with no tool directory or no store, and holds the shared run lock — a drain
      started against the same Target is refused while this run holds it
- [ ] leftovers are repaired in both directions, from the store
- [ ] repros drive the real nodes against a throwaway Target with a real store; the pack's suite stays one
      command and both typechecks stay clean
