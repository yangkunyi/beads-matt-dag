# operator-ui/30 — a grill round on the selected issue, as choices

**What to build:** the operator surface shows the **current grill round** on the
selected issue and lets the human answer it by clicking. A round is the grill
frontier: numbered questions, each with choices and a recommended answer; one
submit for the whole round. Markdown in a session is the fallback; on this
surface the round is data.

The body stays the agent's brief. The round is the human face of grilling
(alongside comments). Answers go through the write door and survive a re-read;
they are not React-only. An issue with no round looks as it does today.

This ticket does not launch a griller and does not publish follow-up issues.

- [ ] a selected issue with a round renders each question's choices, marking the recommended one
- [ ] submitting the round writes through the door; a re-read shows the answers
- [ ] an issue with no round does not show a round form
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
