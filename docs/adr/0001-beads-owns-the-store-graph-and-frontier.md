# Beads owns the store, the graph and the frontier

An issue's state, the edges between issues, and the question "what can start" are three views of one
database, so all three live in beads. The orchestrator reads that database and writes to it; it does
not maintain a second answer beside it.

This supersedes the rebuild-every-cycle design (ADR-0018 of `/data3/yky/workflow`, "the DAG is
rebuilt from `.scratch` every cycle"). That design rejected a DAG file the orchestrator appends to,
and it was right to: a file the orchestrator owns is a store with none of a store's guarantees. Beads
*is* that file, with the guarantees. What the rebuild bought was freshness — a cycle could not act on
a graph that no longer matched disk — and two things replace it: beads maintains blocked-ness on every
write, and `bd recompute-blocked` repairs it after a bulk operation (a pull, most of all).

Documents do not move. A spec is not an issue: it has no state, never enters a frontier, is never
claimed, and must never be closed. Beads' own model agrees — its spec field is a link to a *document*
— so **product** specs stay markdown files in git, where they can be diffed, grepped and reverted
alongside the code they describe. An issue brief is not a spec: it is work-memory, and it lives on
the issue (ADR-0005). A map is a pinned `decision`, not a document pretending to be a ticket; a long
product map may still be a git file the bead points at with `spec_id`.

Rejected: keeping the `.scratch` scan as the frontier with beads as a mirror beside it (two answers to
one question, and the mirror is the one that goes stale); a DAG file the orchestrator appends to; specs
in the database (nothing about a spec is state, and its value is precisely that it diffs).
