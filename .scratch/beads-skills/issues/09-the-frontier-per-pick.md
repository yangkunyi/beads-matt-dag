# 09 — the frontier is read once per pick, not once per run

**What to build:** the contract's frontier section says "A drain asks the store what can start, once, and
takes the whole answer", which reads as once **per run**. Two readers took it that way — `beads-skills/06`'s
brief and its third criterion — and the walk proved the opposite: the pack asks the store on every `pick`
cycle, so a blocker's closure **inside a run** releases its dependent into that same run (the walk's first
drain started `greet/01` and `greet/02`, then `greet/03` one second after `greet/02` closed, and the second
drain found nothing). `skills/drain/SKILL.md` was corrected during that ticket; the contract sentence is
this ticket.

**Spec:** `.scratch/beads-skills/issues/06-the-set-accepts-itself.md`, finding 3
**Blocked by:** `01`
**Status:** BLOCKED

- [ ] the contract says the frontier is read **per pick cycle** and that a drain runs cycles until a read
      comes back empty — so a dependent released by a closure inside the run starts in that run
- [ ] it says what holding a dependent back for a later drain actually takes (the brake), because "a blocked
      issue waits for its blocker" alone invites the same misreading
- [ ] the sentence matches the pack's own loop, quoted from `pick.ts`/the drain workflow in the Comments
- [ ] nothing under `.archon/` changes
