# Attention and the contract

*Assembled 2026-09-19 from the operator's request for an AI-oriented tracker (agents work from objects, not novels; AFK empties only the domain it is allowed to empty) on top of ADR-0001 through ADR-0009, the tracker contract, and the drain / inquiry / experiment executors. Status: **designed, not built.** Two independent reviews of the same working proposal were synthesised here; where they disagreed, this document records the choice.*

A session boots from one JSON. An issue's **body** is that issue's **contract**, frozen, with a small schema at the head and optional prose below. Executors, merge-before-stamp, three statuses, and per-domain `closed` do not change.

## Problem Statement

A session cannot start work without reading the tracker contract, and a worker cannot start work without reading an essay.

The contract is hundreds of lines. The pack README is hundreds more. `/implement` still points a drain-launched worker at that novel. Issue bodies are prose that restates edges and sometimes status, even though the store already holds both. Beads already has `--json`, `bd ready`, and structured create fields; this flow does not use them as the agent interface, so every role reconstructs "what now?" from three ad-hoc queries plus a long document.

The second half of the same problem: AFK already empties a **development** frontier on this lab (merge, then stamp `closed` as `merged <branch>`). It does not empty a product Target whose graph is still questions, drafts, and ungated ideas — and a session that wants to know *why* the graph is not empty has no single object that names leftovers, stuck chains, drafts, and the three ready sets. Unread experiment results look like debt. `wontfix` never closes, so `pick=[]` can hide work that is waiting on a blocker nobody will ever merge. Product Targets must not copy the contract, so their sessions fall back on `bd prime`, which teaches `bd close` and `--claim` — the opposite of this flow's development close.

The operator does not want a better human dashboard. He wants plumbing: small objects in, domain-bounded AFK out.

## Solution

Give each role one object, and make emptying a per-domain fact:

- **Attention** is a `loom` verb. From a Target it prints one JSON: leftovers, stuck chains, drafts, the three ready frontiers, unread experiment results, and braked issues. It is a view (ADR-0005, ADR-0007). It writes nothing. It does not claim, repair, merge, or start a run. A session boots from that JSON and takes **one** nonempty bucket, in a fixed order. The tracker contract is disclosed reference, reached when a command fails or a domain rule is in doubt — not at boot.
- **The body is the contract.** Publication writes a YAML head with that domain's required keys, then optional disclosed prose. The head carries no status, no edges, no labels. The store still owns identity, status, edges, labels, and comments. Changing a deciding field (acceptance, metric, the question) is a new issue, not an edit of a frozen body. Drain still hands the worker the body's path; the worker reads the head. Target `verify` remains the only merge gate and is never copied onto an issue.
- **Empty** means that domain's frontier is `[]`. Development empty is drain `pick=[]` and every development `closed` reason `merged <branch>`. Inquiry empty is the reading frontier `[]` **and** drafts cleared by a session on the operator's word. Experiments empty is the experiment frontier `[]`; unread is reported, never a gate. Stuck chains (a `wontfix` or braked blocker holding dependents) are visible in attention so `pick=[]` cannot look like done.

Product Targets still get `loom init` with no contract copy. Their session's navigator is the same `loom attention` as this lab's.

## User Stories

1. As a session, I want to boot with one `loom attention --json` in the Target, so that I do not open the tracker contract to find out what is in front of me.
2. As a session, I want that JSON to be the whole navigator, so that three ad-hoc `bd` queries are no longer the boot sequence.
3. As a session, I want empty arrays to mean "this bucket is clear", so that I do not treat an empty ready set as an error.
4. As a session, I want to act on one nonempty bucket and then stop, so that one window does not try to empty every domain.
5. As a session, I want a fixed bucket order — leftovers, stuck, drafts, ready development, ready inquiry, ready experiments, unread experiments, braked — so that a crash and a stuck chain beat starting more work.
6. As a session, I want each item to name the next act, so that I do not have to know the pack to know whether to drain, inquire, grill, triage, or close a draft.
7. As a session, I want the tracker contract disclosed, so that I open it only when a command fails or a domain rule is in doubt.
8. As a session, I want `bd prime` and the generic beads skill to stay disclosed beads help, so that I do not boot into `bd close` / `--claim` as if they were this flow.
9. As a session, I want the Target's product `docs/CONTEXT.md` disclosed unless this window is writing product words, so that flow plumbing and product language stay separate.
10. As a session, I want leftovers tagged with type and domain, so that I start that domain's existing run and never `bd close` a leftover.
11. As a session, I want leftovers during a held Target run to mean "that run's claims", so that I do not start a second run against the same lock.
12. As a session, I want stuck issues named with the blocker and why (`wontfix` or braked), so that `pick=[]` cannot hide work that will never release.
13. As a session, I want drafts to be the inquiry bucket I clear on the operator's word, so that I close a question with the draft label removed and do not leave `answer:draft` on a closed issue.
14. As a session, I want ready development to be what a **next** drain would pick, so that attention and pick cannot describe two frontiers.
15. As a session, I want ready inquiry to be the reading frontier a next inquiry run would pick, so that maps, ungated questions, and already-drafted questions are not offered as AFK reading.
16. As a session, I want ready experiments to be the experiment frontier a next experiment run would pick, so that I do not start drain on an experiment.
17. As a session, I want unread experiment results listed and optional, so that I can decline a reading without blocking anything.
18. As a session, I want braked issues listed for the operator, so that I do not unbrake or drain them on my own.
19. As a session, I want attention to report whether the Target run lock is held and which kind of run holds it, so that I do not fight a live drain, inquiry, experiment, or grill.
20. As a session, I want attention to write nothing, so that a boot cannot mutate the graph it is showing.
21. As a session, I want to graduate an idea or an answered question by publishing a **new** development issue and a `relates-to` link, so that a label move is never a domain crossing.
22. As a session, I want not to stamp development `closed`, so that merge-before-stamp stays the only development close.
23. As a session, I want not to write `reading:` from attention, so that an experiment's judgement stays a later session act on the operator's word.
24. As the operator, I want the same JSON the session sees, so that the human face and the agent face are one view.
25. As the operator, I want to take one item from one bucket, so that the surface does not become a second executor.
26. As the operator, I want creating an issue from the surface to stay `needs-triage` and ungated, so that a graph edit is not a publish and needs no contract head.
27. As the operator, I want publication (`/to-tickets`) to remain the only writer of a contract, so that a quiz still sits in front of the gate.
28. As the operator, I want development publication to apply `ready-for-agent` in the same act as the contract head, so that an unattended drain does not wait on a second human click.
29. As the operator, I want inquiry and experiment publication never to apply that gate, so that drain cannot pick a question or a result.
30. As the operator, I want a development contract to name one-sentence goal and checkable acceptance, so that a worker can tell done from not-done without an essay.
31. As the operator, I want development acceptance to be behaviour, not a shell command, so that an issue cannot override the Target's `verify`.
32. As the operator, I want an optional spec path on a development contract, so that long-form design stays a git document and is not pasted into the body.
33. As the operator, I want an inquiry contract to name the question, whether it must cite, and what done looks like, so that a reading turn does not invent the question.
34. As the operator, I want an experiment contract to name metric, reference, and pin, so that a ticket missing any of them is not an experiment yet — the rule the contract already states.
35. As the operator, I want the contract head to carry no status, no blocker list, and no labels, so that one fact still has one home.
36. As the operator, I want optional prose below the head, so that a disclosed essay may exist and no agent is required to read it.
37. As the operator, I want a frozen body, so that after publication the conversation is comments and the brief does not move.
38. As the operator, I want changing a deciding field to open a new issue, so that old numbers stay comparable to the question they were written for.
39. As the operator, I want `/to-tickets` to refuse an essay-only development body (no head, or a `Status:` line), so that publication cannot put a novel on the gate.
40. As the operator, I want existing prose-only gated issues to remain drainable, so that this spec does not strand Targets whose bodies predate the head.
41. As the operator, I want attention to mark those issues `contract: missing` on ready development, so that I can see a slot about to burn before I start a drain.
42. As the operator, I want `wontfix` to remain a label and never a close, so that attention's stuck bucket is how I see a chain that will not release.
43. As the operator, I want the brake to remain taking the gate off, so that a deterministic failure still ends only when I hold it back.
44. As the operator, I want failed-attempt counts visible on ready development, so that I can brake a burner without a new status.
45. As a drain-launched worker, I want my in-window material to be the implement persona plus the body's path, so that the brief mechanism does not change.
46. As a drain-launched worker, I want to read the head first — goal and acceptance — so that I do not have to search an essay for done-when.
47. As a drain-launched worker, I want the prose below the head disclosed, so that I open it only when the head is not enough.
48. As a drain-launched worker, I want no tracker contract, no pack README, and no attention JSON in my window, so that I cannot start writing the flow.
49. As a drain-launched worker, I want the store read-only for my whole process tree, so that a claim, a close, a label, an edge, and a comment are refused by the store itself.
50. As a drain-launched worker, I want to commit on the branch the handle names and then stop, so that merge and close stay the drain's.
51. As a drain-launched worker, I want Target `verify` to remain the pre-merge gate, so that my acceptance checklist and the merge gate cannot disagree about which command lands the tree.
52. As a drain-launched worker, I want a conflict turn to see the same contract plus the standing merge, so that conflict resolution is not a second brief.
53. As an inquiry worker, I want the question contract plus the corpus and note paths, so that I fetch, note, and draft without closing.
54. As an inquiry worker, I want the node to write the draft comment and `answer:draft`, so that I never comment or label myself.
55. As an experiment worker, I want metric, reference, pin, and the record path, so that I write a record and do not merge.
56. As an experiment worker, I want the node's completeness check to close the issue, so that unread can be stamped `reading=none` without my judgement.
57. As the drain, I want pick, claim, merge-before-stamp, leftover repair from git, and `postMerge` unchanged, so that attention cannot become an executor.
58. As the drain, I want `pick=[]` to mean no eligible development work, so that drafts and unread may still be nonempty.
59. As the drain, I want every development close reason to stay `merged <branch>`, so that a hand stamp is still a lie.
60. As the drain, I want a failed attempt to remain a comment and `open`, so that the next drain's ready set is still the retry channel.
61. As the inquiry run, I want to empty the reading frontier and leave drafts, so that AFK never closes a question.
62. As the inquiry run, I want leftover repair to stay a store fact (draft present or not), so that attention listing a leftover is not me repairing it.
63. As the experiment run, I want to empty the experiment frontier by recording results, so that unread is a session sweep and not my stop condition.
64. As a later drain, I want a leftover worktree resumed from git, so that attention telling a session "start drain" is how repair is invoked, not a session `bd close`.
65. As a product Target's session, I want `loom attention` on PATH after `loom install`, so that I do not need a copy of the pack in the repo.
66. As a product Target's session, I want `loom init` to point AGENTS.md at attention and at the installed contract, so that a new repo does not copy the novel and does not teach `bd close` as development close.
67. As a product Target, I want a gated development issue with a contract to drain until `pick=[]` without a human stamping `closed`, so that AFK emptying is true off this lab.
68. As this lab, I want the tracker contract in the repo and the shipped skill copy to stay one document, so that a Start-here change cannot land in only one home.
69. As this lab, I want that Start-here to name `loom attention` instead of three queries, so that the contract's own boot matches the session's.
70. As this lab, I want the flow block a session actually loads to say that development `closed` is the drain's act as `merged <branch>`, so that a generated beads block teaching `bd close` is overridden in the same file.
71. As this lab, I want publication to stop writing a store `description` that copies the body, so that the brief is not two records of one fact.
72. As the flow's maintainer, I want attention composed from each domain's existing dry frontier, so that a new query language cannot drift from pick.
73. As the flow's maintainer, I want attention to use the empty attempted set, so that it describes what a next run would find, not what this run already tried.
74. As the flow's maintainer, I want attention not to apply an allow-list, so that a navigator is not a scoped run.
75. As the flow's maintainer, I want the worker brief to remain the body's path, so that the existing brief repro stays the mechanism.
76. As the flow's maintainer, I want no new Archon workflow, queue, or daemon, so that "more work" is still another run of an existing executor.
77. As the flow's maintainer, I want no `bd query`, `bd gate`, `bd merge-slot`, or `bd worktree` in this path, so that ADR-0009 is not walked back by convenience.
78. As the flow's maintainer, I want no `--acceptance` / `--design` on the bead as a second brief, so that ADR-0005 / the design record's partition still hold.
79. As the flow's maintainer, I want optional `--spec-id` only as a pointer at a disclosed spec document, so that a spec stays not-an-issue.
80. As the flow's maintainer, I want a throwaway Target's drain to produce a `beads-dag: merge beads/…` commit and a matching close reason, so that the second problem is tested off this checkout.

## Implementation Decisions

- **One public seam: attention.** `loom` grows an `attention [--json]` verb. Default cwd is the Target. Human text is allowed; `--json` is the session's object. There is no Archon workflow for attention, no committed `attention.md`, and no store row for the snapshot. Recompute on demand.
- **Read-only by mechanism.** Attention resolves the store the way every other flow command does (`store:` in the Target yaml, then `bd` on PATH) and runs it read-only. A boot that cannot write cannot become an executor.
- **Compose, do not re-specify.** Development ready is the drain's frontier composition with an empty attempted set and no claim. Inquiry ready is the reading frontier with an empty attempted set. Experiments ready is the experiment frontier with an empty attempted set. Drafts, unread, leftovers, and braked are the store lists the tracker already names. Stuck is `bd blocked` intersected with open blockers that will not release under AFK: a blocker carrying `wontfix`, or a development blocker off the gate. Attention does not invent a fourth frontier and does not call `bd query`.
- **Empty attempted, no allow-list.** Attention is "what a next run would find". A live run's claims appear as leftovers. A held run lock is reported on the object so a session does not start a second run.
- **Bucket order is the boot order.** leftovers → stuck → drafts → ready.development → ready.inquiry → ready.experiments → unread_experiments → braked. The first nonempty bucket is the session's subject. Unread is never a stop for an AFK run.
- **Each item names `next`.** Leftover and ready items name that domain's existing run. Drafts name accept / edit / reject (session close on the operator's word). Stuck and braked name triage. Unread names an optional reading (including decline). When the run lock is held, leftover `next` is wait, not start.
- **The JSON shape** (from the dual review, parent synthesis). Trimmed to the decision:

```json
{
  "target": "<abs path>",
  "run": { "held": false }
    | { "held": true, "kind": "drain|inquiry|experiment|grill", "runId": "…" },
  "buckets": {
    "leftovers": [
      { "id", "handle", "type", "domain", "next" }
    ],
    "stuck": [
      { "id", "handle", "waiting_on": [{ "handle", "why": "wontfix|braked" }], "next" }
    ],
    "drafts": [
      { "id", "handle", "title", "next" }
    ],
    "ready": {
      "development": [
        { "id", "handle", "title", "contract": "present|missing", "attempts_failed": 0, "next" }
      ],
      "inquiry": [{ "id", "handle", "title", "next" }],
      "experiments": [{ "id", "handle", "title", "next" }]
    },
    "unread_experiments": [{ "id", "handle", "title", "next" }],
    "braked": [{ "id", "handle", "labels": ["needs-info"], "next" }]
  }
}
```

- **Body head is the contract; body remains the brief.** Publication writes a YAML document at the top of the same frozen file the naming rules already derive. Drain, inquiry, and experiment workers still receive that path. No pack node parses the head in the first land; the implement / read / experiment personas name the keys and say the prose below is disclosed. A later cut may parse; this spec does not require it for merge or pick.
- **Required keys, no state.** The head may not name status, edges, labels, attempts, or comments. Domain keys:

```yaml
# development
---
goal: <one sentence, user-visible behaviour>
acceptance:
  - <checkable criterion>
# spec: docs/specs/<date>-<slug>.md   # optional disclosed spec
---

# inquiry
---
question: <one sentence>
must_cite: true
done_when: <what the draft/note must contain>
---

# experiments
---
metric: <name> from <source>
reference: <threshold | baseline | exploratory>
pin: data=<…> commit=<…>
---
```

- **Acceptance is not verify.** Checkable criteria live on the issue. The Target yaml `verify` is the only command the drain runs as a merge gate. An issue must not carry a shell that replaces that gate.
- **Partition holds.** Do not also write those keys to `--acceptance`, `--design`, or a store `description`. Optional `--spec-id` may point at a disclosed spec (a different git document, not an issue). Publication that currently copies the body into `description` stops doing that; existing copies are an operator cleanup, not a runtime migration.
- **Presence, not refusal.** Attention sets `contract: present` when a development body begins with a YAML document that names `goal` and `acceptance`, otherwise `missing`. Missing does not exclude from pick. Surface-created `needs-triage` issues have no head and are not in ready development because they lack the gate.
- **Skills shrink around the objects.** Session / ask-loom boot is attention, then one bucket. `/to-tickets` templates are the three heads; essay-only development publish is refused; `Status:` is refused. `/implement` reads the head, commits on the named branch, makes no store writes when drain-launched; the tracker contract is a disclosed sibling. Drain / inquiry / experiment skills do not retell merge-before-stamp.
- **FLOW_BLOCK and this lab's tracker section override beads' generated close/claim cheatsheet.** One sentence: development `closed` is the drain's act, as `merged <branch>`; a session does not `--claim` or `bd close` a work issue. Product `loom init` writes that sentence. This lab keeps its in-repo contract (it is the source) and the shipped copy must stay byte-identical; Start-here becomes attention.
- **Executors unchanged.** Pick still claims. Settle still merges then stamps. Reconcile still repairs development leftovers from git. Inquiry leftovers stay a store fact. Workers stay `BD_READONLY`. `postMerge` stays Target-side and is never a worker act.
- **No new ADR unless the brief moves into the store.** This spec sits on ADR-0001 (beads owns the graph), 0002 (merge before stamp), 0003 (three statuses), 0005 (one record per fact — body is the contract, attention is a view), 0006 (closure per domain), 0007 (a view is not an executor), 0009 (no merge-slot / gate / worktree / query-as-frontier).

## Testing Decisions

- **The seam is attention's JSON, not the canvas and not pick's claim.** A good test builds a fixture Target, runs attention read-only, and asserts buckets and `next`. It does not parse jsonl. It does not start a drain. It compares store state before and after and requires no writes.
- Pin at least: a gated development issue → `ready.development` with `contract: present` or `missing` as the body dictates; a `decision` with `answer:draft` → `drafts`; a closed experiment with `reading=none` → `unread_experiments`; an `in_progress` issue → `leftovers` tagged with domain; a `needs-info` issue → `braked`; a `wontfix` blocker with a dependent → `stuck` naming that why; a held run lock → `run.held`; empty attempted so a previously failed-in-another-run issue still appears in ready; no allow-list filter; maps and ungated questions absent from `ready.inquiry`; experiments absent from `ready.development`.
- **Publishing schema is tested at the template and at attention, not at pick.** A `/to-tickets` agreement: the three heads' keys match the three personas. A fixture body with a head still reaches the worker as a path (existing brief behaviour). A fixture essay with `Status:` is a publish refusal in the skill; it is not a new pick exclusion.
- **Unchanged executor repros stay green without being rewritten for this spec.** Pick, inquiry pick, experiment pick, brief, worker read-only, settle, reconcile, run lock, tracker-contract identity, flow init/check. Attention may export dry compose; pick's claiming path must still claim.
- **Flow block.** Init still copies no contract. The inserted block names attention and the drain-only development close. A second init is still idempotent.
- **This lab's two contract copies.** The existing identity repro remains the gate for Start-here. A Start-here edit that lands in only one copy is a red suite, not a review comment.
- **External behaviour only.** Do not assert which helper function was called. Assert the JSON, the absence of store writes, and that a drain against a fixture still merges then stamps. The throwaway product Target (gated contract → merge commit on Main → close reason `merged <branch>` → attention `ready.development` empty) is the release acceptance the pack README already names, not a unit in the pack suite.
- Prior art: flow's init/check tests; drain's pick / brief / worker-readonly / tracker-contract / domain repros; inquiry and experiment pick repros; operator-surface tests that fake `bd` and refuse jsonl. Attention follows that style: a fake or fixture store, named buckets, no writes.

## Out of Scope

- Replacing drain, inquiry, or experiment with Gas Town, Gas City, a formula/molecule runner, `bd merge-slot`, `bd gate`, or `bd worktree`.
- A new orchestrator, queue, daemon, or `archon workflow resume`. Drain stays re-runnable; Main is truth.
- Status in git, `Status:` in bodies, committing attention, generating a body from store fields, or adopting `--acceptance` / `--design` as a second brief.
- Per-issue runnable `verify`, or any issue field that overrides Target yaml `verify`.
- Worker close, operator close of development, auto-close of `answer:draft`, auto-brake after N failures, a fourth status, or dimensionising the five triage labels.
- Refusing pick of a gated issue with no contract head (would strand existing bodies).
- An `ideas[]` bucket for bare `decision` issues that are not on a reading leg. They stay operator/session work until a later spec.
- Aligning the operator surface's lanes with these buckets (the operator-surface spec remains the surface's home).
- Pack-side parsing of the head into the worker prompt (a later cut, after attention and publication land).
- Teaching drain a new closure meaning, or closing inquiry from AFK.
- Copying the pack or the tracker contract into product Targets.
- Automatic cleanup of historical store `description` copies (operator one-shot).
- Changing merge-before-stamp, leftover repair from git, or `BD_READONLY` workers.

## Further Notes

- Glossary: `docs/CONTEXT.md`. The word is **issue**, not ticket. **Frontier** is per executor. **Attention** is a view of those frontiers plus the human-gated piles; it is not a fourth executor and not a second store.
- Dual-review disagreements resolved here: attention is a `loom` verb (product Targets do not carry the pack); three ready frontiers **and** a stuck bucket; acceptance is checkable criteria, never a per-issue shell; the contract lives in the body head (YAML), not as a store projection; first land does not parse the head inside pick or execute.
- The generated beads integration blocks in AGENTS.md will keep saying `bd close`. They are subordinate to the flow block and to this spec. Do not fight `bd setup` by deleting them every session; override them in the flow's own paragraph.
- Next skill: `/to-tickets`. Publication puts `ready-for-agent` on the **development** issues this spec produces; this document is not an issue.
