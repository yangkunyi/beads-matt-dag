# operator-ui/33 — the round form belongs to the round, and an answer body names its issue properly

## Why

Two small defects in the round form, both found by the review of the range that landed `operator-ui/30`:

**The form is keyed to the issue, not the round.** `ui/App.tsx` renders `<RoundForm key={issue.id} …>`, and
`RoundForm` initialises `selected` from the round with `useState(() => answersFrom(round))`. A new round on
the same issue therefore does not remount the form, so `selected` keeps the *previous* round's answers; every
round numbers its questions from `Q1`, so those stale choices pre-check the new round's radios and make
`complete` true — one click re-submits round N's answers as round N+1's. The fix is a key that identifies the
round. `round.ts` can carry that identity: the round comment's first line is `round N`, which the surface
already receives and does not parse.

**The answer body skips the door's id check.** `round.ts` → `parseAnswerRoundBody()` validates `id` for
non-emptiness only, while the door's other intents use the `ISSUE_ID` shape in `actions.ts`. A malformed id
therefore reaches `bd comment` and comes back as a 500 instead of the door's 400 refusal, which is the
difference between "the body was wrong" and "the store broke".

## What to do

- `round.ts` exposes the round's number, read from the comment's `round N` first line, as part of `GrillRound`.
- `ui/App.tsx` keys the form by the issue *and* that number, so a new round remounts it with the new round's
  answers.
- `parseAnswerRoundBody()` refuses an id that is not the door's `ISSUE_ID` shape, with the same refusal style
  the other intents use.
- `overview-test.ts`: a second round on the same issue renders a form whose radios are not pre-checked from the
  first round's answers, and an `answer-round` body with a malformed id is refused 400 rather than reaching
  `bd`.

## Out of scope

The round's producer, the comment format and the answer/chat distinction — `beads-dag/47`. The overlay's
ignorance of a grill run — `operator-ui/32`.
