# operator-ui/05 — React shadcn surface

**What to build:** the operator surface is a React app with a shadcn-style kit. The existing overview still works: the graph, filters, issue detail, live overlay, and comment. The graph is drawn with React Flow as a view of the store, not as a second graph. Positions stay in the view. No new store writes beyond the comment the write door already allows. Beads remains the graph (ADR-0001, ADR-0007).

- [ ] the operator page is a React app with a shadcn-style kit
- [ ] filters, detail, live overlay, and comment still work through the store
- [ ] the graph is React Flow projecting beads issues and edges; coordinates are not stored
- [ ] connecting two issues does not write an edge yet
- [ ] the tools typecheck stays clean
