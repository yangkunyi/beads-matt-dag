# beads-dag/48 — the grill run refuses a seed that is not an open decision

## Why

`beads-dag-grill/scripts/open.ts` refuses only a seed that is `closed`. The pack README says the run "refuses
a seed that is not an open `decision` issue", so an `in_progress` decision issue — or an open issue of another
type — is accepted and gets rounds written onto it. A round on an issue that is not a decision is grilling
something that was never a question, and the run's own precondition should be the thing that says so.

The review of the range that landed `beads-dag/45` found this.

## What to do

`open.ts` refuses any seed whose status is not `open` or whose type is not `decision`, naming which of the two
it is, in the same refusal shape the node already uses for a missing seed. The check belongs where the seed is
read, before the lock is taken or any turn is spent.

Add the two refusal cases to the grill-open repro beside the closed-seed case it already has.

## Out of scope

Nothing about rounds, answers, or the comment format — `beads-dag/47` owns those.
