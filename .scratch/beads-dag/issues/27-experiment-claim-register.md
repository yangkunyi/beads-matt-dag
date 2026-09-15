# beads-dag/27 — the experiment executor: pick, claim, register

**What to build:** the pack's third workflow folder, runnable as `beads-dag-experiment`. Its **open** takes
the same Target-level run lock the others take, resolves the store, prints the configuration line, refuses
loudly on a machine without the run tool or a Target without the experiment tool directory, and repairs
leftovers — an experiment ticket a killed run left running goes back to open with an ordinary failed-attempt
comment. Its **pick** answers the experiment frontier, which is the one frontier that selects *by* the
non-work kind instead of excluding it: the ready experiment tickets, ordered by handle, truncated to the run's
configured concurrency, with every excluded issue and its rule in the exclusions artifact. Then a ticket is
claimed by **assignment in the same act as its registration**: the run's own identity goes into the assignee
field, so a session reading the ticket sees a run and not a person, and the thin script's first verb reserves
the run's name before anything executes — an experiment cannot exist without a name its record will know. If
the registration fails, nothing is left claimed and the run says why.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The experiment executor";
`docs/agents/issue-tracker.md` — "Experiments: the ticket, the run, and the record".

- [ ] against a store with two eligible experiment tickets and one question ticket, the frontier is exactly
      the two experiment tickets, in handle order, truncated to the configured concurrency, with the question
      ticket's exclusion rule named
- [ ] after the claim the ticket is running with the run's own identity in the assignee field, and the
      registration exists in the run's artifacts
- [ ] a failed registration leaves the ticket unclaimed and the run reports the reason
- [ ] open refuses when the machine has no run tool or the Target has no experiment tool directory, and it
      holds the shared run lock (a drain or a reading run is refused while it holds it)
- [ ] leftovers are repaired in the store
- [ ] repros drive the real nodes against a throwaway Target with a real store, with a stub run tool standing
      in for a machine that has none; the suite stays one command and both typechecks stay clean
