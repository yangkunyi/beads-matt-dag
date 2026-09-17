# The operator surface is a view; executors stay per domain

The operator surface shows the Target's issue graph and lets a human write into the same store
(comments, new issues, intra-domain `blocks`, crossing `relates-to` and `discovered-from`, the five
triage labels). It does not execute. Starting work is starting the domain's existing run — drain,
inquiry, or experiment — optionally with an allow-list for that run. Merge, worktree, and
development's `closed` stay in drain.

Rejected: a single executor with optional merge; assigning an executor per issue; a second graph in
the canvas library; replacing beads with a relational store so the surface can edit. New work whose
`closed` still means "in Main" stays development (same drain). A new domain is only when closure
means something else, and then it brings its own run.

The canvas may use React. Positions and gestures live in the view; beads remains the graph
(ADR-0001). The operator does not stamp `closed` or `reading:` (ADR-0006).
