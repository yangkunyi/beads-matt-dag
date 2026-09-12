# 07 — the operator skill reads the report the pack now writes

**What to build:** `skills/drain/SKILL.md`'s report section — and the incident prose that touches it —
brought up to what tickets `12`–`15` now make a drain write, so an operator reads a run's end as it is
rather than as it was when the skill was written. §13 step 2 deferred this section until those tickets
landed; they have.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§13 steps 1–2, §10.6)
**Blocked by:** `02`, `12`, `13`, `14`, `15`
**Status:** BLOCKED

- [ ] the section says what a drain's end now holds and what each part is for: the failures block (the issues
      this run attempted and left failing, with the count the store records and the latest reason), the range
      the run covered and what it says about merges this run did not make, the repairs made at open (the ones
      that closed included), and both existing skips — an empty diff, and a range holding nothing but the
      pack's own bookkeeping
- [ ] it says where each part comes from — `summary.md` for the human-facing blocks, `review.md` for the
      review, the run's stderr for the configuration line — and that the numbers are the store's own answers,
      computed by the node, never a model's
- [ ] it says what a report does **not** carry: what failed is a reading of one range (the failures block is
      one run long), a merge repaired at open is named by the run that repaired it, and it is the recorded
      reviewed position — not the report — that decides the next run's range
- [ ] the language of a report is stated: it follows the runner's model, so a Target that wants one fixed
      language pins it through its own configuration; the pack pins nothing
- [ ] the incident section gains the configuration line: a run's stderr names the effective runner, model,
      thinking level, concurrency and store with each value's source, so "what actually ran" is read rather
      than guessed
- [ ] it still points at the contract for store commands and at `to-tickets` for publishing, and names no
      store command of its own
- [ ] the installed copy is refreshed and byte-identical (`skills/README.md`'s rule), and the global copy's
      diff is quoted
- [ ] nothing under `.archon/` changes
