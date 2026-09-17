# operator-ui/11 — the issue list: a windowed read surface

**What to build:** a list pane beside the canvas. The canvas shows shape; the list shows *what is
there* — the read surface the operator does not have today (only a canvas plus click-for-detail).
Windowed with `@tanstack/react-virtual`, so 500 issues do not put 500 rows in the DOM.

The list is a view. It selects, it does not write: no claim, no close, no label, no edge.

- [x] a list of the issues renders beside the canvas
- [x] rows are windowed with `@tanstack/react-virtual`
- [x] a row carries the handle, the title, the status, the domain, and whether it is blocked
- [x] clicking a row selects the same issue the canvas selects, and the detail pane follows
- [x] the filters scope the list and the canvas by the same rules
- [x] the list writes nothing
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
