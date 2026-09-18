# operator-ui/29 — box-select a set; Delete on nodes is not a no-op

**What to build:** the operator can grab more than one issue the way a canvas
works — drag a box — and do something with that set. Shift-click already adds
to the selection; it is undiscoverable and not enough.

Delete/Backspace on a **node** currently swallows the remove, so the key feels
stuck. On an **edge** it already writes `remove-edge`. Node Delete should open
the existing confirm delete for the selected issues (one or many), still
refusing `in_progress` and dependents, never cascade. Adding an edge must not
freeze or reset the view: the write re-reads the store and keeps positions;
`fitView` must not run after every write.

- [ ] dragging a box on the pane selects the issues inside it (additive with Shift)
- [ ] Delete/Backspace on selected nodes opens the confirm delete for that set
- [ ] Delete/Backspace on an edge still removes that edge through the door
- [ ] connecting two issues does not freeze the canvas or refit the whole graph
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
