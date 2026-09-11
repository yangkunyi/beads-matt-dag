# 09 — The brake holds, and closure never crosses domains

**What to build:** The gate label is the only way into the frontier, and pulling it back is the operator's
brake: an issue moved back to a triage state is not offered, on either side of the frontier. Abandoning
work never releases what was waiting on it. A decision issue can never be started by a drain, and an
implementation issue that depends on one fails loudly instead of being silently released.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [ ] an issue without the gate label is never claimed, from either side of the frontier
- [ ] moving an issue back to a triage state removes it from the next drain
- [ ] marking an issue as abandoned does not release its dependents, and they stay blocked across drains
- [ ] closing is the pack's action alone, and happens only after a merge
- [ ] a decision issue is never claimed
- [ ] an implementation issue blocked by a decision issue fails loudly, naming the edge
