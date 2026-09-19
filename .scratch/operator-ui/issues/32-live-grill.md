# operator-ui/32 — a live grill run is visible, like every other run

## Why

`tools/operator-ui/model.ts` → `kindOfWorkflow()` knows `beads-dag-drain`, `beads-dag-inquiry` and
`beads-dag-experiment`. `beads-dag-grill` landed after it and was never added, so while a grill run holds the
Target `assembleLive()` returns null and the page is wrong in three ways at once:

- no live banner and no `attempted` marks, so the page reads as idle while a run is working;
- `Surface`'s `refetchInterval: (q) => (q.state.data?.live ? 5000 : false)` stops polling, so the round the
  run just wrote does not appear until a manual reload or some other write;
- `StartBar` reads `overview.live`, so it offers Start while the door would refuse the write with "Target
  already held" — a wasted click.

`reportRelFor` already returns `report.md` for every non-drain kind, so nothing there needs a change: the
`LiveRunKind` union and `kindOfWorkflow()` are the whole fix.

## What to do

Add `grill` to `LiveRunKind` and to `kindOfWorkflow()`, mapping the `beads-dag-grill` workflow id the same way
the other three are mapped, and cover it in `overview-test.ts` the way the existing kinds are covered: a lock
plus a matching executor row yields a live run whose kind is `grill`, with the report reachable and the
attempted list non-empty.

## Out of scope

The round's own shape and the round form — `operator-ui/33` and `beads-dag/47`. No new store field, no second
log, no polling change beyond the interval already keyed on `live`.
