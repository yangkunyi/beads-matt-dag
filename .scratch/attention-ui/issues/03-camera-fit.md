---
goal: A click in the inbox or on a canvas issue fits the camera to that issue.
acceptance:
  - Selecting an issue from the list recentres the canvas on it (and its framed closed neighbours).
  - Selecting an issue on the canvas does the same.
  - Clearing the selection (pane click) fits the empty-selection frame, not the whole store.
  - An overview refetch after a comment does not steal the pan.
  - Show all does not change which issue is selected.
# spec: docs/specs/2026-09-21-attention-canvas-frame.md
---

The jump is a camera fit in the view. It is not a second selection store and does not restore onSelectionChange (that loop was React #185).
