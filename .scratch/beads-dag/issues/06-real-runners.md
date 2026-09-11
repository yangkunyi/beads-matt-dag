# 06 — The runners come back

**What to build:** The same execution, with a real runner configured instead of a stub, produces a real
implementation in the worktree: a live session runs under the node's role, its answer is read from the
one channel the pack trusts, and its session file lands where the runner keeps it and is reported back on
the result. A runner that cannot start fails the run rather than silently skipping an issue.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `04`
**Status:** BLOCKED

- [ ] with a real runner configured, the executor produces commits in the worktree from a live session
- [ ] the answer is read from one channel only; the runner's own log is never treated as the answer
- [ ] the session file path is reported on the result and lands under the run's artifacts
- [ ] a runner that cannot start fails the run loudly, and never lets an issue be recorded as merged
- [ ] the role's wall clock is enforced, and a node that can run two turns has a timeout covering both
