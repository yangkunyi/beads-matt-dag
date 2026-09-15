# beads-dag/25 — a batch of questions, one run, one report

**What to build:** one run reads the whole frontier unattended and says what it did. The loop keeps picking
until the store answers nothing new, so a batch of questions opened together is one run; each ticket's
landing is independent and one ticket's failure does not stop the others. The run ends with the one document
a human reads first: the tickets it read and where each landed (the note's path, the commit, the label it
stamped), the tickets it attempted and failed with the reason and the attempt ordinal the store holds, the
frontier it left behind — the handles still eligible, so a run that did nothing says so — and the line that
matters at 9am: the draft answers now awaiting the operator, as handles. The report is written by the node,
never by a model, and is never read as state. A run killed part-way leaves every ticket in a place the next
open can repair, and the repair is the store-based one this executor already has.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The two reports", "The inquiry
executor" (§ the loop, § leftovers).

- [ ] one run against a store with three eligible questions reads all three, and the report names each with
      what landed and where
- [ ] a failure on one ticket leaves the other landings intact, and the report carries that ticket's reason
      and attempt ordinal
- [ ] a run against an empty frontier claims nothing, commits nothing and says so in one report
- [ ] the report names the drafts awaiting the operator, and no other document or artifact keeps a second
      copy of that list
- [ ] the drain and this executor cannot run against one Target at the same time — the refusal is proved in
      both directions — and a killed run's lock is stolen by the next run by its dead holder
- [ ] the pack's suite stays one command and both typechecks stay clean
