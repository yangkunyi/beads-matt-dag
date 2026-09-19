# beads-dag/47 — the round is structured output, and two skills own the two ways to grill

## Why

The review of the range that landed 24/26–28/30/45 found the round's producer and consumer disagreeing on
one format, and it is a real defect: `scripts/prompt.ts` → `grillPersona()` tells the griller to write

```
❓ **Q1** - **<title>**: <body, including choices>

➡️ <your recommended answer>
```

— choices as prose inside the body — while `tools/operator-ui/round.ts` collects choices from `- ` bullet
lines only. So a round written by the brief's own format parses to `choices: []`, `RoundForm` renders no
radios, `complete` is never true, and Submit is dead on a round the run just wrote. Nothing pins the format:
no repro drives a round produced from the griller's own brief, so the suite agrees with itself.

The same gap makes the "recommended" badge unreachable: `recommended` is the whole free-text `➡️ …` line, and
the badge is a string comparison against a choice label.

And the pack cannot tell an answer from a chat comment: `rounds.ts` → `isAnswer()` is "anything after the last
round that is not a round, Done, or a failed attempt", so a free-text reply on the same pane flips
`grillState` to `answered`, and the next turn spends itself writing round N+1 having read no answers.

## What to do

**The turn delivers the round by calling a tool, not by writing text.** Pi's `createAgentSession` has no
schema option (that is a pi-subagents feature), but the pack already mounts one custom tool, so the grill role
mounts two more: a `submit_round` whose parameters are the round's own shape (each question: title, body,
choices, recommended), and a `submit_done` for the empty frontier. Parameters are validated by Pi, so a
malformed round comes back to the model as a tool error it can fix in the same turn, and a round that is not
delivered is a failed attempt rather than a comment nobody can render.

The schema cannot express "the recommended answer is one of the choices", so the tool's own `execute` refuses
that case by name. The tool writes the validated round to the artifacts directory — that file is the only
channel between the turn and the node — and the node renders the comment from it. **The producer is then the
only writer of the comment's shape**, which is what makes the consumer's parse exact rather than hopeful.

**The comment the node writes is the canonical form the surface reads:**

```
round N (commit <sha>)?

❓ **Q1** - **<title>**: <body>
- <choice>
- <choice>
➡️ <the recommended choice, byte-identical to one of them>
```

The round's first line stays the marker it is today (`round N`, optionally naming the commit), so
`grillState`'s reading of the thread does not change. `answerKind()` and the "your last words are the round"
prose leave the persona with this change: the turn's channel is the tool.

**An answer is a comment whose lines parse as answers.** `isAnswer()` requires every non-empty line to match
`Q<n>: <choice>` — the exact shape the surface writes — so a chat reply on the same issue no longer consumes
a round. Keep the failure line and the round/Done markers as they are.

**Two skills, one per way of grilling.** `skills/grill` stays the conversation: an interview in a session,
writing `docs/CONTEXT.md` and `docs/adr/` as terms and hard-to-reverse choices settle. A new
`skills/grill-round` is the round contract: what a round is, the `submit_round`/`submit_done` tools and their
shape, what makes a good round (the whole frontier in one round, one decision per question, real choices, one
recommended), that the run writes the comment and never the agent, and that follow-ups wait for `/to-tickets`
after Done. The grill persona points at it rather than restating it.

## Tests

- A round written the way the persona's own tool shape allows parses into questions with choices and a
  recommended answer that is one of them — the seam the review found untested.
- `submit_round` refuses a recommended answer that is not one of the choices.
- A turn that calls neither tool is a failed attempt, and writes no comment.
- `isAnswer()` is false for a chat comment and true for the surface's answer comment.
- The consumer's parse of the node's own rendered comment round-trips: render → parse → the same questions.

## Out of scope

The overlay's ignorance of a grill run, the round form's key, and the answer body's id check are
`operator-ui/32` and `operator-ui/33`. The seed check is `beads-dag/48`.
