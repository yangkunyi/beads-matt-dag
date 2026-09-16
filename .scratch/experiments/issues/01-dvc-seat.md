# 01 — DVC's seat: pins, the lock, and where a metric comes from

## Question

DVC is decided (§8, D2) but not placed. Which facts belong to it and which to the flow: which pins ride on
the ticket or in the store, which live in `dvc.yaml` / `dvc.lock`, who commits the lock, and does the
deciding metric come from DVC's own metrics, from the run store, or from the result record?

Ground it in DVC's own documentation rather than in write-ups: what the lock file holds, what `dvc exp`
records and where, whether DVC's own run concept would double up with an experiment ticket, and what a
reference to a DVC-tracked artifact looks like from outside DVC.

The answer decides which facts are duplicated between the flow and DVC, and the design rests on one fact,
one home.
