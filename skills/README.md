# The skill set

This folder is the **source** of loom's closed set. Each machine carries one installed **copy** of
every member under `~/.agents/skills/`. The install reads the set off `skills/*/`, so this list is
never its input.

`/ask-loom` is the router. It names every member below. There is no second family. Setup is
`loom init`.

## Flow

- `ask-loom` — landing + contract (`issue-tracker.md`), flow glossary, triage labels, domain-doc rules, phase boundaries
- `grill` — interview until product language and decisions settle (`docs/CONTEXT.md`, ADRs)
- `grill-round` — the same round written onto an issue for the operator surface to answer as choices
- `to-spec` — conversation → spec
- `to-tickets` — spec → tracer-bullet issues in one domain
- `implement` — development work on the handle's branch; drives `/tdd` then `/code-review`
- `triage` — incoming issues; not what `to-tickets` published
- `drain` — run a drain / reading / experiment, brake, clear incidents

## Detours and upkeep

- `prototype` — throwaway code that answers one design question
- `handoff` — portable session summary (narrow: new harness, new directory, colleague, mid-phase fork)
- `diagnosing-bugs` — tight red loop before any hypothesis
- `improve-codebase-architecture` — deepening opportunities; then `/grill`

## Vocabulary underneath

- `tdd` — red → green at pre-agreed seams
- `code-review` — Standards + Spec, two axes, never reranked
- `codebase-design` — module, interface, depth, seam, adapter, leverage, locality
- `writing-for-agents` — how to write a skill, an AGENTS.md, a pointed-at doc

This repository is a Target, so it also keeps the contract at `docs/agents/issue-tracker.md`. Those
two files are one document — `tracker-contract-repro.ts` compares them byte for byte. Product Targets
do not copy it.

## Install

```
./install.sh                 # new machine: bun, bd, Archon, then this
export PATH="$HOME/.loom/bin:$PATH"
loom install                 # refresh skills after you edit this folder
```

One copy per **machine**. A new git repo becomes a Target with `loom init`. `beads-dag` is an alias
for `loom`.
