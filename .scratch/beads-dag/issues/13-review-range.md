# 13 — the review range is what nobody has looked at yet

**What to build:** "Which Main tip was last reviewed" becomes a recorded position in the Target, and the
drain-end readers report on `position..HEAD` instead of on `Main's tip at open..HEAD`. Today a run that
dies after merging and before its review drops every merge it made out of every future report: in step 1's
acceptance, run `a03cb8d2` merged `d88c3266` and was SIGKILLed at the close call, and the run that repaired
it (`2be20b45`) recorded a base *past* that merge and reported `skip: empty diff` — so that diff appeared in
no report at all. A run that had already closed three issues and died on the fourth loses all four, and the
repair only ever names the fourth.

The repair half is this ticket's too, and ticket `12` measured why it needs a decision rather than a
reader: a repair that **closed** an issue writes no failure comment, its `close_reason` is byte-identical
to a settlement's (`merged <branch>`), and the store has no clock that could attribute a write to a run.
So the fact that a *repair* closed an issue exists only in the run's own shape — `reconcileLeftovers`
returns its repairs to the opening node today, and they reach stderr only. Where that list lives is part of
this ticket (the precedent is the run's own bookkeeping: `attempted-ids.json`, `pick-exclusions.json`), and
so is distinguishing this run's merges from an earlier run's inside one range.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.6, §13 step 1)
**Blocked by:** `10`
**Status:** BLOCKED

- [ ] the base of the range is the recorded position, not Main's tip at open
- [ ] after a review writes findings, the position advances to the end of the range it covered
- [ ] a review that failed (`review error:`) does not advance it, so the next run reports that range again
- [ ] a run killed between its merge and its review leaves that merge inside the next run's range — staged
      with a kill the way 11 staged its own, and observed in a real run
- [ ] a Target with no recorded position behaves as today for one run and then starts recording
- [ ] the report states the range it covered, and when the range holds merges this run did not make, it says
      so and names them
- [ ] a repair this run performed at open is named in the report (today it reaches stderr only), including
      the ones it **closed** — which ticket `12` could not name, because their close reason is identical to
      a settlement's and nothing in the store says which run wrote it
- [ ] a merge inside the range that this run did not make is named, and the mechanism telling the two apart
      is a record, not prose: if no existing record can, this ticket decides the smallest honest run-scoped
      one and says why it is not store state and not a maintained mirror
- [ ] both readers cover the **same** range in one run, and a review that failed leaves the position where
      it was, so the next run reports that range again
- [ ] the position is a local git ref in the Target: never a store field, never a file the pack maintains
      elsewhere, and its absence is not an error
