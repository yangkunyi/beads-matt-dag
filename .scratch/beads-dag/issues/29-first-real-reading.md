# beads-dag/29 — the first real reading

**What to build:** the acceptance a design cannot give itself — a question the operator actually cares about,
read for real, in this repository, which is now a Target of its own flow. The operator opens one question
ticket labelled for a reading leg; the reading executor runs against this repository; the draft answer lands
as a comment with the note and receipts committed; the operator appends or corrects it; the session writes
the final answer and closes the ticket, taking the draft label off in the same act. What this ticket delivers
is that the whole way from "a question I care about" to "a draft answer on my ticket" has been walked **once
for real**, and that whatever the real walk exposed is fixed: a tool invocation that does not match what the
tool documents, a proxy that is not running, a note path the existence check reads wrongly, a report line
that reads badly, a frontier that offers the wrong ticket. Rules that only survive in a mock are not
finished.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "Testing Decisions" (§ the third
gate), "What the flow's own documents say afterwards".

- [ ] one real question ticket, opened by the operator and labelled for a reading leg, is read by a real run:
      a draft answer on the ticket, its note and receipts committed on Main, the draft label stamped
- [ ] the reading answers with what the sources hold, and the note's claims re-anchor against their receipts
- [ ] the operator's append or correction and the session's final answer + close work exactly as the
      contract says, with the label coming off in the same act as the close
- [ ] the run's report is readable and names the drafts awaiting the operator
- [ ] every defect the real walk exposed is fixed with a repro, or with a recorded reason why a repro cannot
      hold it
- [ ] the pack's README and the tracker contract describe what the real walk did — no rule left describing a
      step the run performs differently
