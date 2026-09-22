---
goal: The operator can write a comment on whatever is selected, as a record that does not change status.
acceptance:
  - The detail panel offers a comment form on the selected issue even when next is triage, start, wait, or grill.
  - A selection that is not in the focused bucket still has the form, including a closed neighbour.
  - Submitting posts the tagged comment intent; empty submit is a no-op; a refusal keeps the text.
  - The row's next remains the primary act and sits above the form.
  - A comment does not change status, labels, or closure.
# spec: docs/specs/2026-09-21-attention-canvas-frame.md
---

Beads remains the only comment store. The form is not the primary act: triage, launch, and wait keep their controls. The operator surface already allows this write (ADR-0007).
