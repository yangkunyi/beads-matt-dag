# operator-ui/27 — the canvas is lanes and a neighbourhood, not one soup DAG

**What to build:** the default canvas is readable. Issues sit in **domain lanes**
(inquiry, development, experiments). Intra-domain `blocks` lay out inside a lane.
Crossing `relates-to` / `discovered-from` are handoff edges between lanes, not
another blocking column.

The default framing is the **neighbourhood of the selection** (the issue and one
hop), not every issue in the store. The full graph is opt-in. Positions stay in
the view; beads remains the graph.

- [ ] three domain lanes; blocking edges do not decide a layer across lanes
- [ ] crossing edges still render, as handoff, and still cannot be drawn as `blocks`
- [ ] with a selection, the default view is that neighbourhood; a control shows all
- [ ] an empty selection may show all, or nothing — pick one and pin it in the test
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
