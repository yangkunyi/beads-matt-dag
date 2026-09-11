# 08 — Conflict resolved in the same execution

**What to build:** When bringing Main into the worktree conflicts, the same execution turns to the
conflict agent and merges after it — no second workflow, no node gate keyed on a stdout token, and no
status of its own. When the merge is clean, the conflict agent never runs at all.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [ ] a conflicted merge starts the conflict agent, and the issue ends merged after it
- [ ] a clean merge starts no conflict agent at all
- [ ] no workflow other than the drain is needed for a conflicted issue
- [ ] a conflict the agent cannot resolve fails the issue with a reason, and leaves its work for the
      report
