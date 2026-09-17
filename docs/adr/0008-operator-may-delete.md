# The operator may delete an issue; that is not close

The operator surface may permanently remove an issue from the store (`bd delete`). Delete is not a
status and not `closed`: identity is gone and cannot be undone. The operator still does not stamp
`closed` or `reading:` (ADR-0006).

Delete is refused when the issue is `in_progress` (that claim belongs to the run) or when any
dependent still points at it (the store's default: no cascade, no orphan, no "break" mark on a
successor). A confirm step is required. Abandoned work that should remain in the record stays
`wontfix`.

The surface stays a view: after a write it reads the store again and keeps layout positions. It is
not a local editor (ADR-0001, ADR-0007).
