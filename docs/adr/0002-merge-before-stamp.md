# Merge before stamp

A state write and a git merge cannot be made atomic — they are two systems — and they do not need to
be. The orchestrator never announces a result before performing it: the merge into Main happens first,
the `closed` stamp second. So `closed` implies the merge commit exists, and the one dangerous
interleaving cannot arise — a state claiming "merged" while Main lacks the commit would release
dependents against a Main that is missing their blocker, which is the most expensive error available
here. The other interleaving, merged but still `in_progress`, is safe: recovery reads the merge commit
and stamps `closed`, and a drain that stops early loses a cycle, not a dependency.

The consequence is that the merge lock stops having to cover the state write. It keeps guarding Main's
git writes, where it still earns its place (one writer at a time on a shared branch, and a torn merge
visible as a torn merge), while the state write relies on the store's own transaction. The lock shrinks
to the thing only the lock can do.

Rejected: one lock around both the state write and the merge, preserving the predecessor's "a status
stamp and its git operation are one transaction" (ADR-0042) — it buys atomicity that ordering buys for
free, and pays for it by putting a database write inside a git lock and serialising every transition;
stamping an in-flight marker before merging so a crash is visible (that marker is a lie exactly when it
matters — it says "merging" while nothing is merging — and the worktree's own git state already says
whether a merge is in progress); verifying every blocker's merge commit when a drain starts (defence in
depth, not a requirement: `closed` already implies merged. Keep it as a cheap self-check against a
hand-edited store, never as the thing correctness rests on).
