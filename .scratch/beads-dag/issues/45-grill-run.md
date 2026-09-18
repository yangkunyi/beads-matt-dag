# beads-dag/45 — a grill run writes rounds onto the seed issue

**What to build:** grilling is a run, not drain and not the inquiry reading
run. It takes one seed issue id (the node the human created), writes the next
**round** onto that issue, and stops for answers. After answers land, a later
turn of the same kind of run writes the next round or records that the frontier
is empty. Glossary and ADRs still settle in git as terms crystallise.

Not an Archon approval gate (approve/reject is the wrong grain). Not LangGraph.
Not n8n. The operator surface remains a view: this run is the griller.

Follow-up issues still wait for `/to-tickets` after Done. This run must not
publish development tickets.

- [ ] a grill run against one seed id writes round 1 onto that issue
- [ ] a later turn that sees answers writes the next round or Done
- [ ] drain / inquiry-read / experiment are unchanged
- [ ] pack typecheck and the drain repro suite still pass
