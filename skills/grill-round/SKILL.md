---
name: grill-round
description: Write a grill round the operator surface renders as choices — the whole frontier in one comment, each question with its choices and one recommended answer, answered by picking on the surface instead of typing here. The surface half of this set's grilling.
disable-model-invocation: true
---

# Grill a round onto the surface

The conversation half is `/grill`: the human answers by typing, and you write `docs/CONTEXT.md` and ADRs
as terms settle. Use this skill instead when **the answers will be picked on the operator surface** — a
form of radios, one row per question, the recommendation marked. Both halves work the same design tree;
only the channel differs. Unsure which? `/ask-loom`.

A **round** is one comment on the seed issue. The surface reads it and renders it as choices. The
**frontier** is every decision whose prerequisites are already settled — ask the whole frontier in one
round, then stop and wait. Finding facts is your job; the decisions are the human's.

## The comment

The first line is the marker; then one block per question:

```
round 1

❓ **Q1** - **Name**: what is this called?
- widget
- gadget
➡️ widget

❓ **Q2** - **Scope**: does it cover returns?
- yes
- no
➡️ no
```

- `round N` — the round's number. The node writes it when a run writes the round; a session writing a
  round by hand uses the next number in the thread.
- `❓ **Q<n>** - **<title>**: <body>` — one line per question. The title is the decision's name; the body
  says what is being decided.
- `- <choice>` — one line per choice, **at least two**, each a real answer someone could pick. The surface
  renders them as the radios, so a choice that is a sentence about the problem is not a choice.
- `➡️ <choice>` — your recommended answer, **copied exactly from one of the choices**. The surface marks the
  choice whose text matches; a near-miss marks nothing.

One decision per question. A question whose prerequisite is still open in this round belongs to a later
round. Every field is one line: the surface puts the title and body on the question's line.

## If you are the run

`beads-dag-grill` mounts two tools, and they are the turn's only channel — prose is not read:

- **`submit_round`** — the round, as questions with `title`, `body`, `choices` and `recommended`. The
  schema refuses a recommendation that is not one of the choices, and a second delivery in the same turn.
- **`submit_done`** — the frontier is empty, with a summary of what the grilling settled. Never on a first
  turn.

The node renders the comment from the tool call, commits any `docs/CONTEXT.md` or `docs/adr/` you wrote in
that turn, and stops. You never write the comment yourself, and the store is read-only to you anyway.

## Answers, and Done

The human answers **on the surface**, and the surface writes one comment of `Q<n>: <choice>` lines. That
shape is the only thing the run reads as an answer — anything else on the issue is conversation and does not
consume the round. So do not answer for them, and do not read a chat reply as an answer.

When the frontier is empty, the round is `Done` (first line, then the summary). Follow-up issues are not
yours to publish: `/to-tickets` does that after Done, and a blocking chain must not cross domains.
