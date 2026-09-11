# 05 — The merge lands before the record

**What to build:** Settlement runs in one order and only that order: merge the issue's branch into Main
under the write lock, and only once that has landed, record the outcome in the store. A recorded close
therefore always has its merge commit behind it, and a crash in between leaves an issue still in progress
while its work is in Main — repairable, and never the other way round. A failure records its reason as a
comment and puts the issue back to `open` so the next drain retries it; nothing was merged, so nothing is
closed and its dependents stay exactly where they were — and it is not offered again by the run that
failed it.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `04`
**Status:** BLOCKED

- [ ] a clean merge lands, and only then does the issue close
- [ ] no code path closes an issue without a merge commit on Main behind it
- [ ] a failed implementation records its reason as a comment and puts the issue back to `open`, never
      closed
- [ ] the failed issue is not offered again by the same run, and is offered by the next one
- [ ] a worktree and its branch are removed only after the merge landed
- [ ] the store write sits outside the git lock, while every function that writes Main still refuses to
      run without the lock (asserted, not assumed)
