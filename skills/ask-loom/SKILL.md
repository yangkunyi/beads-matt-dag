---
name: ask-loom
description: Introduce loom and pick the next skill in this set. The set is closed — no skill outside it.
disable-model-invocation: true
---

# Ask Loom

You don't remember the flow, so ask.

**loom** is one pack and one skill set, machine-global. A **Target** is a git repo that owns a beads
store. Issues are the nodes; store edges are the DAG; **closed** means whatever the issue's **domain**
says. The pack is not in the repo.

This set is **closed**. Setup is the CLI: `loom install` / `loom init`. There is no second skill
family. The contract, flow glossary, triage labels, and how to read `docs/CONTEXT.md` live in this
folder (`issue-tracker.md`, `flow-context.md`, `triage-labels.md`, `domain.md`).

A **flow** is a path through these skills. Most work travels the **main flow**. Two **on-ramps**
merge onto it. Everything else is standalone, or a vocabulary layer underneath.

## First time

- New machine: clone this checkout, run `./install.sh`, put `~/.loom/bin` on PATH. That fetches
  bun / bd / Archon at the pinned versions, then `loom install`. `archon setup` for credentials.
- New repo: `git init` then `loom init`. Store, yaml knobs, AGENTS.md pointers. No contract copy.
- Already a Target: skip init. Read `issue-tracker.md` and `flow-context.md` in this folder. Product
  words: this repo's `docs/CONTEXT.md`.

## Which domain

Pick this before any skill that writes an issue. A blocking edge must not cross domains.

- **Inquiry** — a question. Type `decision`. A reading run drafts; a session writes the last word.
  Never `ready-for-agent`.
- **Development** — work that lands on Main. Type `task` / `bug` / …. Gate `ready-for-agent`. `/drain`
  implements, merges, then stamps `closed`.
- **Experiments** — a result to record. Type `experiment`. Never `ready-for-agent`. Closed means the
  record is written.

## The main flow: idea → ship

1. **`/grill`** — interview until product language and decisions settle. Writes `docs/CONTEXT.md` and
   ADRs in the same turn a term or choice crystallises. Start here whenever you are in a working
   directory. Do not act on the idea until the user confirms a shared understanding.

2. **Branch — does a question need a runnable answer?** State, business logic, a UI you have to see.
   Detour through a prototype, bridged by **`/handoff`** in both directions (a prototype often lives
   in its own file or directory — that is what `/handoff` is for; see Phase boundaries):
   - **`/handoff`** out, then open a fresh session against that file,
   - **`/prototype`** to answer the question with throwaway code,
   - **`/handoff`** back what you learned, and reference it from the original idea thread.

3. **Branch — is this a multi-session build?**
   - **Yes** → **`/to-spec`** (turn the thread into a spec), then **`/to-tickets`** to split it into
     **tracer-bullet** issues in **one domain**, each declaring its **blocking edges**. Keep grilling,
     spec, and tickets in **one unbroken context window**. Each `/implement` then starts **fresh**.
   - **No** → **`/implement`** right here, in the same context window.

   Either way, **`/implement`** builds each development issue by driving **`/tdd`** internally — one
   red-green slice at a time, at **pre-agreed seams** — then closes out with **`/code-review`**, a
   two-axis review (Standards + Spec) of the diff, before committing. A drain-launched worker does
   the same loop in its window and makes **no store writes**.

### Context hygiene

Keep steps 1–3 in **one unbroken context window** — don't compact or clear until after `/to-tickets`
— so the grilling, spec, and issues all build on the same thinking. Each `/implement` then starts
fresh, working from the published issue body.

The limit on this is the **[smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone)**:
the window (~150k tokens on state-of-the-art models) within which the model still reasons sharply.
If a session approaches it before `/to-tickets`, don't push on degraded — `/compact` at the nearest
phase boundary and carry on (see Phase boundaries).

## On-ramps

- **Bugs and requests piling up** → **`/triage`**. Incoming only — bug reports, feature requests,
  anything that arrives raw. Issues `/to-tickets` already published are agent-ready: **do not triage
  them**. `ready-for-agent` is development-only.

- **Something's broken** → **`/diagnosing-bugs`**. Refuses to theorise until it has a **tight**
  feedback loop — one command that already goes **red** on *this* bug — then fixes with a regression
  test at a correct **seam**. If there is no good seam, that finding goes to
  **`/improve-codebase-architecture`**.

- **A huge, foggy effort** — too big for one session, the way to the destination not yet visible.
  **`/grill`** until the destination is named, then **`/to-tickets`** as **inquiry** (`decision`
  issues). One decision per session. Produce **decisions, not deliverables**, until the fog is
  pushed back. When the way is clear, merge onto the main flow at **`/to-spec`** — collapse the
  linked decisions into a buildable plan — then `/to-tickets` as **development**. Do not loop
  inquiry tickets straight into `/implement`.

## Codebase health

Not feature work — upkeep.

- **`/improve-codebase-architecture`** — spare-moment survey for **deepening** opportunities
  (shallow modules → deep ones). Picking a candidate generates an idea you take into `/grill`.
  **`/codebase-design`** is the bench you design the chosen one on.

## Vocabulary underneath

Two references that run *beneath* the other skills — each the single source of its vocabulary.
Reach for them when the **words**, not the process, are the problem; or let the skills above pull
them in.

- **`/grill`** — the *domain* language: challenge a fuzzy term, resolve an overloaded word, record
  a hard-to-reverse choice as an ADR. Active discipline, not a glossary read.
- **`/codebase-design`** — the *shape* language: **module**, **interface**, **depth**, **seam**,
  **adapter**, **leverage**, **locality**. A lot of behaviour behind a small interface at a clean
  seam. `/tdd` and `/improve-codebase-architecture` both speak it.

## Phase boundaries

A **phase** is a chunk of work inside a session — the grilling, the implementation, the QA. At the
**boundary** between two of them you have five options:

- **Continue** — stay put. Costs nothing, loses nothing. Rule it out first.
- **`/clear`** — empty the window, when nothing here matters to what's next.
- **`/handoff`** — write a portable markdown file. Narrow: only for a **new harness**, a **new
  directory**, a **colleague**, or forking a side task **mid-phase**.
- **Subagent** — send a tightly-scoped task to its own window and get a report back.
- **`/compact`** — compress this context and seed a fresh session with it. The **default**, at the
  bottom of the tree rather than the first reach.

Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordered tree. Make the decision **at** a
boundary; mid-phase, continue or split the rest into subagents.

## Standalone

Off the main flow, still this set.

- **`/prototype`** — throwaway code that answers one design question. The answer folds into the
  real code; the prototype itself is kept as a **primary source** on a throwaway branch.
- **`/tdd`** — build a concrete behaviour test-first without a full spec.
- **`/code-review`** — review a branch or PR against a fixed point, two axes, side by side.
- **`/writing-for-agents`** — writing a skill, an AGENTS.md, or a pointed-at doc.

## Operator vs session

- **Operator** — human on the graph without a coding session. Writes the store through the tagged
  door. Starts the domain's existing run. Does not merge, does not close development work.
- **Session / drain worker** — claims, implements, merges, then stamps. `closed` in development
  means the merge is already on Main.

## Paths (short)

- Sharpen product language → `/grill`
- A question reading can settle → `/grill` then `/to-tickets` as `decision`
- A question only a run can settle → `/to-tickets` as `experiment`
- Build something → `/grill` if the language is loose, `/to-spec` then `/to-tickets` (development),
  then `/drain` or `/implement` per issue in a fresh window
- Incoming pile → `/triage`
- Operate the graph → `/drain` for the run; the operator surface for the view
