---
name: to-tickets
description: Break a plan or spec into tracer-bullet issues on a loom Target — one domain, blocking edges, ready-for-agent only on development work.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into a set of **issues** — tracer-bullet vertical slices, each declaring the issues that **block** it.

The tracker contract is the installed sibling `ask-loom/issue-tracker.md` — one copy per machine, not a file in the repo. The contract owns the tracker; this skill owns the breakdown. Unsure which skill? `/ask-loom`.

## Which domain

Name the domain before slicing. Do not mix domains in one blocking chain.

- **Development** — type `task` / `bug` / …. Vertical slices. Publication applies `ready-for-agent`. A drain may pick them up.
- **Inquiry** — type `decision`. Questions, not work. Never `ready-for-agent`. The reading run is a different executor.
- **Experiments** — type `experiment`. A result to record. Never `ready-for-agent`.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference — a spec path, an issue's handle, number or URL — as an argument, fetch it and read its full body and comments, the way the contract's fetch step says.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Issue titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change." A prefactor that is really a deepening (shallow module → deep) speaks `/codebase-design`; if the shape itself is still in question, stop slicing and `/grill` or `/prototype` first.

### 3. Draft vertical slices

Break the work into **tracer bullet** issues.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each issue its **blocking edges** — the issues that must complete before it can start. An issue with no blockers can start immediately.

Number the slices from `01` in dependency order and give each one a handle, `<feature>/<NN>` (e.g. `auth/02`), and a slug: one path segment, safe in a branch name and a file name. The handle and the slug are what every git name for the work derives from. Look up the issues that already exist before proposing edges — the contract says how — so a new issue can block on one from another Feature. Do not infer edges from code; declare them and quiz the user.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own issue blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in an issue blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify issue — green is promised only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each issue, show:

- **Title**: short descriptive name
- **Blocked by**: the handles of the issues that must land first (`<feature>/<NN>`, any Feature)
- **What it delivers**: the end-to-end behaviour this issue makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct — does each issue only depend on issues that genuinely gate it?
- Should any issues be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the issues

Publish in dependency order — blockers first, so every edge already has an issue to point at — following the contract's publish step. A tracker that numbers its own issues keeps those numbers; the contract says how an issue is identified there. What publication does:

- **One issue per slice.** The body is that issue's contract — YAML head, then optional disclosed prose — written once, at publication.
- **The two keys go on with the issue.** `handle` (`<feature>/<NN>`) and `slug` are published together, by the contract's creation step, and the branch, the worktree and the body's path derive from those two keys and nothing else — so a hand-run and a drain compute the same names.
- **A handle names one issue.** Look the handle up first, with the contract's by-handle lookup; when one already carries it, stop and name that existing issue instead of publishing a second. Two issues under one handle answer to the same git names, and the drain's lookup refuses a handle that names two.
- **Every `Blocked by` entry becomes one blocking edge**: the blocker blocks the dependent. The edge is the whole of waiting — a blocked issue is held back by its blocker's closure, and by nothing else.
- **The gate label is development-only.** Development publication applies `ready-for-agent` in the same act, blockers included. Inquiry and experiments never get that gate.
- **No store `description`.** Do not pass `--description`. The body file is the brief. Do not copy the head into `--acceptance` or `--design`.
- **Refuse** a `Status:` line, and refuse a development body with no YAML head naming `goal` and `acceptance`. Inquiry needs `question`; experiments need `metric`, `reference`, and `pin`.

Publication creates: it closes no issue — development `closed` means the work is in Main — and it leaves any parent issue untouched.

<issue-body-template domain="development">

---
goal: <one sentence, user-visible behaviour>
acceptance:
  - <checkable criterion>
# spec: docs/specs/<date>-<slug>.md
---

Optional disclosed prose.

</issue-body-template>

<issue-body-template domain="inquiry">

---
question: <one sentence>
must_cite: true
done_when: <what the draft/note must contain>
---

</issue-body-template>

<issue-body-template domain="experiments">

---
metric: <name> from <source>
reference: <threshold | baseline | exploratory>
pin: data=<…> commit=<…>
---

</issue-body-template>

Keep optional prose short. Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

Work the **frontier**: any issue whose blockers are all done. For a purely linear chain that means top to bottom.
