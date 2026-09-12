# 14 — a range the pack wrote itself is not a review

**What to build:** The readers skip a range holding nothing but the pack's own bookkeeping, naming the
reason, instead of spending a session on it. In step 1's acceptance a first drain on a fresh Target left a
range holding only the pack's own `.gitignore` commit, and a reviewer spent about ten minutes of wall clock
on it.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§13 step 1)
**Blocked by:** `10`
**Status:** BLOCKED

- [ ] a range whose every commit is one the pack wrote writes a skip line naming why, and starts no session
- [ ] a range holding an issue merge is reviewed normally, the pack's own commits included
- [ ] a range holding any commit the pack did not write — an operator's own commit on Main — is reviewed, so
      the guard is "nothing but our own bookkeeping", never "no merge"
- [ ] the skip is visible in both readers exactly the way the existing skips are

**Rejected alternative:** moving the pack's bookkeeping write to before the range's base. It removes today's
only observed case and nothing else — a pack update that touches the ignore line lands inside a later range
anyway — so the guard is needed regardless. Say so in the Comments if it is revisited.
