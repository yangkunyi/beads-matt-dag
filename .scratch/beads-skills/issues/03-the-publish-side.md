# 03 — the publish side reads the contract

**What to build:** `to-tickets` publishes into the store the way the contract says, and `implement` takes its
input from the handle plus the body path instead of from a status line. Publishing writes the body file
(frozen, no status in it) and the store row with the `handle` and `slug` metadata, adds the gate label only
when the issue has no blockers, and records one edge per `Blocked by` entry. `implement`'s stale
"leave the `Status:` line unchanged" sentence becomes the hand-run contract: claim the issue first, never
close anything, derive the branch and worktree names from the handle and slug exactly as the drain does.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.5, §10.7)
**Blocked by:** `01`
**Status:** BLOCKED

- [ ] `to-tickets` no longer writes, mentions or implies the `Status:` line, the eight-status lifecycle, or
      the `READY`/`BLOCKED` values; the published body is the prose and the handle, nothing else
- [ ] publishing writes both metadata keys and the gate label, and nothing else about state
- [ ] each `Blocked by` entry becomes one store edge in the direction the pack expects — the blocker blocks
      the dependent — and that direction is **read back**, not assumed: the Comments show the store's own
      answer (`ready` before, `blocked` after) from a throwaway Target
- [ ] a second publish of the same handle refuses and names the existing issue; it never silently duplicates
- [ ] `implement` states the hand-run contract (claim first; never close; derive names from handle and slug)
      and says what a drain-launched worker is instead: read-only in the store, enforced by the pack
- [ ] both files read the contract for command shapes and invent no commands of their own
- [ ] vocabulary unified across both files (Q10), with the spec-path heuristic (`docs/specs/…`) left intact
- [ ] nothing under `.archon/` changes
