# beads-dag/24 — the reading lands as a draft answer

**What to build:** one question is read end to end and what the reading found is on the ticket. The turn is
one agent turn under the reading role: its persona carries the domain's rules — a reading answers with what
a source or tool *holds*, never with what the flow should keep; a quote is copied out of the receipt that
owns it and is refused out loud when it cannot be found again; the note is the product. It works through the
Target's own tool copy, runs with the store read-only, and its **last words are the draft answer**. Then the
node lands it in a fixed order: the note file is checked for existence, because a turn that wrote no note
failed whatever it said; the reading's documents are committed as one path-scoped commit; the draft answer
becomes a comment on the ticket, its first line marked `draft` and naming the note's path and the commit;
and the draft label is added **in the same act** as the status returns to open — nobody is reading it any
more. A failure before the comment is an ordinary failed attempt: `attempt N failed: <reason>` as a comment,
the ticket back to open, nothing left half-landed. The loop is the drain's — pick until the store answers
nothing, one reading per handle, fanned out over the pick, with a node timeout that outlasts the role's clock.
The flow's own documents follow: the tracker contract's reading rules gain the draft-answer rule (the
executor drafts it, the operator appends or corrects it, the session writes the final answer and closes) and
the one-line opening check that lists the questions whose reading landed.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The inquiry executor" (§ the reading
turn, § what lands and in what order).

- [ ] after a run the ticket is open, carries the draft label, and carries a comment whose first line is
      marked draft and names the note path and the commit — with the receipts and the note committed on Main
- [ ] a turn that wrote no note fails: `attempt 1 failed: …` on the ticket, back to open, no draft label,
      nothing committed
- [ ] the reading turn cannot write to the store (read-only), and no path in the executor can close a
      question ticket — a question's closure is a session's act on the operator's word
- [ ] the tracker contract carries the draft-answer rule and the opening check that lists the drafts awaiting
      the operator
- [ ] repros drive the per-ticket entry with a stub runner, and the fake session gains a reading mode that
      writes receipts and a note and answers a draft, plus a silent mode that answers nothing
- [ ] the pack's suite stays one command and both typechecks stay clean
