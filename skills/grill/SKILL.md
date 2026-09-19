---
name: grill
description: Interview until product language and decisions settle. Writes docs/CONTEXT.md and ADRs in the same turn a term or choice crystallises. This set's grilling and domain-modeling skill.
disable-model-invocation: true
---

# Grill

Interview the user until you share an understanding, and **write the documents in this repo as
you go**. Unsure whether to grill? `/ask-loom`.

This is the **conversation** half of grilling: the human answers by typing here. When the answers will be
picked on the operator surface instead, that is sibling `/grill-round` — same design tree, same documents,
different channel.

This skill is both the interview and the domain model. There is no separate domain-modeling skill.
Do not reach for any skill outside this set.
Do **not act** on the idea until the user confirms a shared understanding.

Product language: `docs/CONTEXT.md` and `docs/adr/`. How to *read* them: sibling `ask-loom/domain.md`.
Flow words: sibling `ask-loom/flow-context.md` — do not put those in the product glossary.
Formats: [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md), [ADR-FORMAT.md](./ADR-FORMAT.md).

## Rounds

Map the work as a **design tree**: every decision branches into the decisions that hang off it. Work
the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled —
the questions you can ask *now*. Ask the whole frontier in one round: number each question and give
your recommended answer. Then wait.

```
❓ **Q1** - **<title>**: <body, including choices>

➡️ <your recommended answer>
```

That is the round as it reads in conversation. On the surface it is the same round as a comment the
surface renders as radios — sibling `/grill-round` owns that shape, and owns the `submit_round` tool the
grill run delivers it with. One round, two channels; do not mix them in a single session.

Each round of answers reshapes the tree. Recompute the frontier. A question that depends on another
still open in this round belongs to a later round.

Finding **facts** is your job. Do not ask the user for anything you can look up. When a frontier
question needs a fact from the environment, look it up (or dispatch a sub-agent) and **don't block
the rest of the round** — a running exploration is an unsettled prerequisite, so only the questions
downstream of it wait. The **decisions** are the user's — put each to them and wait.

## Domain modeling, in the same rounds

This is the active discipline: challenge terms, invent edge cases, write the glossary and the
decisions down **the moment they crystallise**. Do not batch writes for the end of the session.
Merely reading `docs/CONTEXT.md` is not this — any skill can consume the glossary. This skill
*changes* the model.

- **Challenge the glossary.** If the user uses a word that conflicts with `docs/CONTEXT.md`, stop
  and ask which meaning wins.
- **Sharpen fuzzy language.** Overloaded words get a canonical term; the others go under `_Avoid_`.
- **Concrete scenarios.** When a relationship is on the table, invent an edge case that forces a
  boundary.
- **Cross-reference the code.** If they state how something works, check. Surface a contradiction
  rather than writing it into the glossary.
- **Update `docs/CONTEXT.md` inline** when a **term** is resolved. Create the file if needed, in the
  format above. Glossary only — no implementation, no spec prose.
- **Offer an ADR sparingly.** When a **hard-to-reverse choice** meets all three tests in
  [ADR-FORMAT.md](./ADR-FORMAT.md), write `docs/adr/NNNN-<slug>.md` in that turn. One decision per
  file. Match existing house shape if `docs/adr/` already has files.

If a question should live in the store, stop grilling it into prose: it is a `decision` issue.
`/to-tickets` publishes those. A blocking chain must not cross domains.

## Done

Documents that settled during the rounds are already on disk. The frontier is empty **and the user
confirms a shared understanding**. Then:

- product language only → stop
- a question reading or an experiment must answer → `/to-tickets` in that domain
- development work → `/to-spec` or `/to-tickets`
