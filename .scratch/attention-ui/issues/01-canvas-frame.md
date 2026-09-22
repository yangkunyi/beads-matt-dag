---
goal: The beads graph draws open issues by default, and a closed issue only as a one-hop neighbour of the selection.
acceptance:
  - Empty selection and Show all off draw every issue whose status is not closed, and no closed issue.
  - A selection keeps every open issue and adds closed issues that share an edge with it (one hop, either direction, any kind).
  - A closed issue two hops away stays off the canvas unless Show all is on.
  - Show all draws the whole store, including closed, whether or not something is selected.
  - in_progress counts as open on the canvas.
  - Projection tests pin the new frame; the old pin "empty selection shows all" is gone.
# spec: docs/specs/2026-09-21-attention-canvas-frame.md
---

The canvas frame is the view's filter, not a store change. Attention JSON is untouched. A Target whose open issues share no edges shows islands and no lines; that is the store. Historical `blocks` appear under Show all, or as a one-hop neighbour if an open issue shares an edge with them.
