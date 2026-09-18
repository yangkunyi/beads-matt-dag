# operator-ui/18 — a `blocks` cycle keeps its columns

**The finding:** one `blocks` cycle collapsed the whole graph to a single column. d3-dag refuses a cyclic
graph, and the fallback for a refusal is `columnPositions`, which is deliberately one column — so a
single pair of issues pointing at each other cost every other issue its shape. Medium severity, raised
against 5768a96's layout rewrite; the hand-rolled layering it replaced had pinned only the cycle's own
nodes to layer 0.

**On Main as c9edede.**

- [x] a depth-first walk (`acyclicBlocks`) sets aside exactly the edges that close a loop — the ones
  pointing back at a node still on the walk's stack, an explicit-stack DFS so a long chain cannot blow
  the call stack.
- [x] the acyclic remainder is laid out through d3-dag, so only the set-aside edge fails to decide a
  column. It is still projected (it renders), and every node keeps finite coordinates.
- [x] the `try`/`catch` single-column fallback stays for what it was for — a node with no size to give
  d3-dag.
- [x] `overview-test.ts` gained the cycle fixture: every node laid out with finite positions, no
  collapse (`p.x !== q.x`, `q.x !== r.x`), the unclosed part of the loop keeps its order
  (`p.x < q.x < r.x`), and the edge that closed the loop is still projected.
- [x] the same fixture is the coverage the review found missing for the fallback — layout behaviour was
  pinned only on an acyclic `a -blocks-> c` graph.
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok.
