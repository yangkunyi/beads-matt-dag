# beads-dag/28 — the experiment executor: the record, and the close

**What to build:** the part that makes "closed means the result is recorded" true in code rather than in
prose. The turn is one agent turn under the experiment role — long enough for a real run — executing the
ticket's own plan through the Target's thin script and writing the **record** at the ticket's results path:
an attempts table with one row per run, then the closing lines, each identified by its literal label — what
was measured and from which source, the reference it was read against (or what was observed, when the ticket
said exploratory), what the run covered, and the marker saying nobody has read it yet. After the turn a
**completeness check** runs in the node and not in a model: the record must exist at the ticket's own path,
hold an attempts-table row, and hold all four labels — and anything missing leaves the ticket open with
`attempt N failed: record incomplete — <what is missing>` and nothing else happens. Only a complete record
closes the ticket, and the close, the unread marker and the comment are **one act**, with the record and the
paths the collection named committed as one path-scoped commit. The executor's own writes are documents: it
writes no stage and no experiment code, and its record names the commit the run was on. The experiment
domain's document shape gains the four literal labels, so the document and the check are one rule, and the
tracker contract's Experiments section says so too.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The experiment executor" (§ the run
turn, § the completeness check).

- [ ] a complete record closes the ticket, stamps the unread marker in the same act, and is committed — with
      the record's marker line and the label written together
- [ ] an incomplete record leaves the ticket open with the failed-attempt comment naming exactly what is
      missing — one repro each for a missing file, a missing row and a missing label
- [ ] the session's sweep for unread results finds exactly the tickets closed this way, and clearing the
      marker is one act that also changes the record's marker line
- [ ] the run turn works with the store read-only, and the executor can write no code (its record names the
      commit it ran on)
- [ ] the tracker contract's Experiments section and the experiment-domain document carry the four literal
      labels
- [ ] repros drive the per-ticket entry with a stub runner plus a record-writing mode and an
      incomplete-record mode; the suite stays one command and both typechecks stay clean
