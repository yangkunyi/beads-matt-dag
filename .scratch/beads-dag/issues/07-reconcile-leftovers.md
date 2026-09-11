# 07 — Leftovers are reconciled from git

**What to build:** A drain that was killed mid-issue is repaired at the start of the next one, by reading
git rather than trusting the store: an issue left in progress whose branch has a merge commit on Main
becomes closed; one whose work never landed becomes failed, with a reason. Nothing is hand-repaired, and
the repair happens before pick, so the same run can offer a repaired failure as a retry.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [ ] a kill between the merge and the record is repaired on the next open: the issue ends closed
- [ ] a kill with work that never landed ends failed with a reason, and its worktree and branch stay for
      the report
- [ ] an issue whose branch has only ancestor history is not mistaken for merged
- [ ] the repair runs before pick in the same run
