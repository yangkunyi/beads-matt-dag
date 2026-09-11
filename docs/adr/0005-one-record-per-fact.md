# One record per fact

An issue's state has exactly one home: the store. Nothing else keeps a copy of it — not a `Status:` line
in the issue's body, not a status commit on Main, not a mirror anyone maintains. Git holds the other fact,
the work itself: a merge commit says whether a merge landed, and that is what recovery reads. Those are two
different facts about one issue, and neither is a copy of the other.

The predecessor carried the cost of the other arrangement openly: recovery ignored the recorded status and
asked git whether the merge commit was there, because the two could disagree — and one of this repo's rules
(ADR-0002, merge before stamp) exists only to remove the one disagreement that would be expensive. A record
nobody trusts without checking a second record is not documentation; it is a reconciliation problem with no
owner.

So: state has one writer and one home. The body carries the handle — an identity, which is the thing a
document is *about* — and the prose. A run's artifacts are views: they live under the run that produced
them, they are read rather than maintained, and no node consults one as the truth. Someone who wants to read
the state gets it generated, on demand, never kept.

The price is real and paid deliberately. With the status commits gone, Main is only a delivery timeline, so
the store's history is the sole transition record and the store's backup stops being optional: the Dolt
remote is load-bearing (design record, durability). What it buys is that no reader ever has to decide which
record to believe.

Rejected: keeping the `Status:` line in the body for whoever opens the file (it is the copy most likely to
be right by accident and wrong in silence); keeping the `orchestrator: <id> Status <STATUS>` commits on Main
as a git-side backup (a second record that must agree with the first is the reconciliation problem this ADR
exists to avoid — and it was dropped mid-design for exactly that reason, two records of one fact can
disagree); a hand-maintained markdown mirror of the store (it becomes a record the moment a person edits it);
committing a generated mirror to git (a view that lives in git stops looking like a view).
