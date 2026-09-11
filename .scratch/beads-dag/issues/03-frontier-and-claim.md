# 03 — The frontier, composed and claimed atomically

**What to build:** Pick asks the store what can start, then applies what the store cannot answer:
decision issues are excluded by type, issues without the gate label are excluded, anything this run
already tried is excluded, and a failed issue is offered as a retry. The result is truncated to the
configured concurrency and claimed in one transaction, so no two workers can start the same issue — and
the node reports why each eligible-looking issue was left out.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `02`
**Status:** BLOCKED

- [ ] with a store holding an eligible issue, a blocked one, a decision issue, one without the gate
      label, and a failed one, pick claims exactly the eligible issue and the failed one
- [ ] the claim is one transaction: a failure part-way leaves nothing claimed
- [ ] the batch honours the concurrency cap, and a later iteration of the same run offers nothing that
      was already claimed
- [ ] the exclusion report names, per issue, the rule that excluded it
- [ ] a decision issue is never offered — including when a new flavour of question is introduced, which
      by construction cannot be forgotten
- [ ] an issue whose branch already carries a merge commit is offered only when it came from the failed
      side of the frontier
