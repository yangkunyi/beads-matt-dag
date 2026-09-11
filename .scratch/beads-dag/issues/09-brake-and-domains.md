# 09 — The brake holds, and closure never crosses domains

**What to build:** The gate label is the only way into the frontier, and pulling it back is the operator's
brake: an issue moved back to a triage state is not offered by the next drain. Abandoning work never
releases what was waiting on it. A decision issue can never be started by a drain, and an implementation
issue that depends on one fails loudly instead of being silently released.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [x] an issue without the gate label is never claimed, including one that was eligible before the label
      was removed
- [x] moving an issue back to a triage state removes it from the next drain
- [x] marking an issue as abandoned does not release its dependents, and they stay blocked across drains
- [x] closing is the pack's action alone, and happens only after a merge
- [x] a decision issue is never claimed
- [x] an implementation issue blocked by a decision issue fails loudly, naming the edge

## Comments

Built. The brake is the gate label and nothing else, and the two domain boundaries are enforced where the
flow would otherwise cross them. New module `domains.ts` holds the one spelling of `decision` and the
graph preflight; `store.ts` gained `allIssues` (one `list --all` query) and parses each issue's declared
edges; `reconcile.ts` leaves decision issues alone and reports them; `pick.ts` imports the type from the
new module; `open.ts` runs the preflight second, before the recompute and the repair; `target.ts` gained
the triage-move helper; `domain-repro.ts` is new; the README documents the boundary. The two YAMLs, the
executor, the settlement and the readers are untouched.

**The stale sentences.** Criterion 1's "from either side of the frontier" and the What-to-build
sentence's "on either side of the frontier" were leftovers from the retired two-query frontier (a ready
query unioned with a `failed` status query). There is one query now and no failed side: a failure is an
event, the issue returns to `open`, and `bd ready` is the retry channel (ADR-0003). The criterion now says
what is true and what the repro pins — never claimed, *including one that was eligible before the label
was removed* — and the What-to-build sentence no longer promises a side that does not exist.

**Ticket 07's handoff, decided: the repair leaves a decision issue alone and says so.** Nothing in this
flow ever claims a decision issue, so an `in_progress` one belongs to whoever did (the wayfinder
operator), and the repair's two resolutions would both be wrong: reopening it discards a claim the
wayfinder made, and closing it would mean "the question is answered" while releasing its dependents as if
work had landed — the exact cross-domain release ADR-0004 forbids. So `reconcileLeftovers` skips every
`decision` issue before it looks at git (even a decision whose branch is already merged on Main), pushes
`{outcome: "left-alone", reason}` onto its `Repair[]`, and writes `<handle>: left alone: a decision
issue's status is not this drain's to repair: nothing in this flow claims one` to stderr. Ticket 10 can
read the outcome; the operator reads the line. The invariant holds by construction: `pick` never claims
one (excluded by type), `settle.ts` only settles claimed issues, the repair skips them, and the preflight
below refuses the one edge through which a decision's closure could reach implementation work.

**The brake's rule, decided: the gate label only, no triage-label enumeration.** §10.4 says the frontier
filters on `ready-for-agent`; the four triage roles are one-at-a-time states, so a move back is the role
label *replacing* the gate. The drain reads the gate and nothing else. Enumerating triage labels would be
the same omission trap §10.2 forbids for the decision domain: a new role, or a role spelled differently,
would silently stay eligible. `moveToTriage` in the fixture therefore stages the move the way the triage
skill means it — `--add-label <role> --remove-label ready-for-agent` — and every triage state, the
no-label pull, and a failed-then-braked issue (the retry channel) go through it.

**The graph preflight.** `assertNoCrossDomainEdges` reads every issue with one `bd list --all --json
--limit 0`, closed ones included, and refuses any `blocks` edge whose dependent is not a `decision` issue
and whose blocker is one. It runs second in `open`, before the recompute and the repair, and throws with
the edge named — so the drain exits non-zero with nothing claimed, nothing repaired and nothing written.
The edge is named as `<handle> [<id>] is blocked by the decision issue <handle> [<id>]`, both ends, and
the message says the operator's fix (`dep remove <dependent> <blocker>`, or restructure). Only `blocks`
edges are refused: `relates-to` carries no blocking, and impl→impl blocking is the graph working. The
dangerous state the preflight exists for is a *closed* decision: the store has already released its
dependent (`bd ready` offers it), and only the drain's own check stops it from being worked.

**Gates, verbatim**

```
$ PATH=/data3/yky/.local/node-v24.19.0-linux-x64/bin:$PATH timeout 1500 \
    bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   reconcile-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   runner-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
17/17 repros passed
gate1 exit=0 in 371s

$ env -u BEADS_BIN timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
… the identical 17/17 list …
17/17 repros passed
gate2 exit=0 in 372s

$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

Both suite runs are with no `BEADS_BIN`: gate 1 has the store's directory first on PATH, gate 2 has it off
PATH (the fixture resolves the binary through `npm prefix -g`). 17 repros: 16 before, `domain-repro.ts`
added (5 targets, ~1 min).

**Evidence per criterion** (all in `domain-repro.ts`, each case driving `open`/`pick` through the node
protocol and reading only the store's answers, git, and the run's artifacts)

1. *No gate, never claimed.* One target: a control; four issues moved, one per triage role, each
   gate-labelled and offered by the store first; one with the gate pulled and no label applied; and one
   that failed and was then braked — all six are "eligible-looking" (`storeReady` lists every one of them
   before the brake). `pick` offers exactly the control; each braked issue stays `open`; the report names
   each one `missing-gate-label`; a second drain with its own artifacts offers nothing and names them
   again. The control is claimed, so the assertion is not "nothing happened".
2. *A triage move removes it from the next drain.* Same case: the move is the role label replacing the
   gate, and the next drain's report still names each one under the gate rule — the brake is a store
   state, not a per-run subtraction.
3. *Abandonment never releases.* One target: `feat/10` moved to `wontfix`, `feat/11` depending on it.
   Two drains, each with its own artifacts, claim nothing; after each, `feat/10` is still `open` with no
   `close_reason`, and `feat/11` is still `open` and blocked (`bd blocked` names it, `bd ready` never
   offers it). The counterfactual is staged directly to show what the pack must never do: `bd close
   feat/10 -r wontfix` releases `feat/11`.
4. *Closing is the pack's alone, after a merge.* Unchanged from 05: the one `closeIssue` call in the pack
   is in `settle.ts` after `mergeIntoMain`, asserted over the sources and by the probe that saw Main carry
   the merge before the close. New here: no braked or abandoned issue ever closes, and the repair does not
   close a decision issue even when its branch is already merged on Main.
5. *A decision is never claimed.* One target: a decision issue ready and gate-labelled, one ready and
   unlabelled, one `in_progress` with a merge on Main, one `in_progress` with nothing in git. `pick`
   claims nothing and reports the ready ones `decision-type`; the claimed ones were never in the store's
   ready answer.
6. *A cross-domain edge fails loudly.* One target: `feat/30` (task, gate) depends on `feat/31`
   (decision), which is already **closed** — `storeReadyAll` offers `feat/30`, so the store has released
   it. `open` exits non-zero, prints no token, and names the edge: `closure would cross domains: feat/30
   [<id>] is blocked by the decision issue feat/31 [<id>] …; nothing was claimed.` An `in_progress`
   leftover in the same target is not repaired either, which proves the refusal precedes the repair. The
   control target holds an impl→impl blocking edge and a `relates-to` link to a decision: `open` exits 0,
   `pick` claims only the impl blocker.
7. *The repair leaves a decision issue alone* (07's item). One target: a decision `in_progress` with a
   merge commit of its branch on Main, and one `in_progress` with nothing in git. `open` exits 0; both
   stay `in_progress`, with 0 comments and no `close_reason`; Main does not move, the merge stays the only
   one, the worktree stays; stderr carries `<handle>: left alone: …` for each.

**Mutation proofs** (a copy of the whole pack under `/tmp/dom-mut/<name>/beads-dag`, one edit each, then
`bun <copy>/beads-dag-drain/tests/domain-repro.ts` run against it; every new assertion above was shown to
fail)

| Mutation | The repro's failure |
| --- | --- |
| the preflight dropped from `open` | *open fails loudly: "opened\n"* |
| the decision skip dropped from `reconcile` | *the repair leaves feat/20 where the wayfinder put it (its answer is on Main): got "closed", want "in_progress"* |
| the `blocks`-only filter dropped (`relates-to` treated as blocking) | *open exits clean when the edge stays in the domain: got 1, want 0* |
| the triage move adds the role but leaves the gate | *the drain claims only the issue that kept its gate: got ["feat/04","feat/05","feat/03","feat/02"], want ["feat/01"]* |
| the left-alone stderr line dropped | *the report says feat/20 was left alone: ""* |

**Acceptance under the runner.** Installed by copy (`rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`, `diff -r` identical). All labs are throwaway
`/tmp` repositories; `~/.archon` is the runner's own workspace, never the Target.

*Lab 1 — the brake and the abandoned dependent, two drains* (`/tmp/beads-lab-09`, five published issues):
`lab/01` braked (gate pulled, `needs-info`), `lab/02` moved to `wontfix` with `lab/03` depending on it,
`lab/04` a ready decision, `lab/05` a decision the wayfinder claimed `in_progress` whose answer is merged
on Main. Store before run 1 (and identical after both — `diff` of the full dump is empty):

```
lab-2zq  task      open         labels=['ready-for-agent'] handle=lab/03 close=None comments=0
         depends on lab-ldz (blocks)
lab-ce2  decision  open         labels=['ready-for-agent'] handle=lab/04 close=None comments=0
lab-jtf  decision  in_progress  labels=['ready-for-agent'] handle=lab/05 close=None comments=0
lab-ldz  task      open         labels=['wontfix']           handle=lab/02 close=None comments=0
lab-x88  task      open         labels=['needs-info']        handle=lab/01 close=None comments=0
ready (unfiltered): [('lab-ce2','decision'), ('lab-ldz','task'), ('lab-x88','task')]
blocked: ['lab-2zq']
```

- Run `96cc2942db3aa43942c053a6a9ecd69e`, **completed**: `open` exit 0 out `opened`, stderr
  `lab/05: left alone: a decision issue's status is not this drain's to repair: nothing in this flow
  claims one`; `pick` exit 0 out `[]`; `drain` iteration ended. Its `pick-exclusions.json`:
  `{"picked": [], "excluded": [{"id":"lab-ce2","handle":"lab/04","rule":"decision-type"},
  {"id":"lab-ldz","handle":"lab/02","rule":"missing-gate-label"},
  {"id":"lab-x88","handle":"lab/01","rule":"missing-gate-label"}]}`.
- Run `c1edacc769f6dda6b7856eefad736eb3`, **completed**: identical node log and identical report. No
  issue’s status, labels, comments, `close_reason`, blocker or git fact moved between the dumps taken
  before run 1, after run 1 and after run 2 — the braked issue was never claimed, the abandoned one
  stayed `open`, and its dependent stayed blocked, across **two** drains.

*Lab 2 — the graph preflight* (`/tmp/beads-lab-09-domains`): `lab/11` (task, gate) depends on `lab/12`
(decision); `lab/12` was closed `answered`, so the store released `lab/11` — `bd ready` answers
`[('lab-vn5','task')]` while `lab/12` is `closed` and `lab/11` is `open`. One drain,
`ecae9cf615909cdb4a797bc51d7899ce`, **failed**: `open` exit 1, no stdout, stderr

```
closure would cross domains: lab/11 [lab-vn5] is blocked by the decision issue lab/12 [lab-8dx]; an
implementation issue may only be blocked by another implementation issue (ADR-0004), because a decision's
closure means its question is answered, not that work is in Main. Remove the edge with the store's
dependency command (`dep remove <dependent> <blocker>`) or restructure the dependency; nothing was claimed.
```

`DAG workflow 'beads-dag-drain' failed: node open failed. 3 downstream nodes were skipped.` The run's
artifacts hold only `workflow-source` (no `pick-exclusions.json`, no `attempted-ids.json`: pick never
ran), and the before/after dumps are identical — `lab/11` still `open` with 0 comments, `lab/12` still
`closed`, git unmoved.

**Surfaces tickets 10-11 build on**

- **What `open` does now, in order:** `preflightStore(target, config)` (throws when the binary or store is
  missing) → `assertNoCrossDomainEdges(store, target)` (throws before any write, with the edge named) →
  `recomputeBlocked(store, target)` → `reconcileLeftovers(target, store)` → `opened`. 10's review base is
  the next step, after the repair, as its comment says.
- **What the preflight can refuse:** any `blocks` edge whose dependent is a non-`decision` issue and whose
  blocker is a `decision` issue, in any status (closed included), naming every offending edge joined by
  `; `. It cannot refuse anything else: `relates-to` and impl→impl edges pass, and it never edits the
  graph — removing the edge is the operator's act.
- **`reconcileLeftovers`' report:** `Repair` gained `{id, handle, outcome: "left-alone", reason}`;
  decision issues appear there instead of resolving to `merged`/`failed`, so 10 can say what the repair
  did without diffing history.
- **How a braked or abandoned issue shows up in the run's artifacts:** in `pick-exclusions.json` under
  `excluded[]` with rule `missing-gate-label` (a ready decision issue: `decision-type`); never in
  `picked`, never in `attempted-ids.json`, and never in the store as `in_progress`. A blocked dependent
  the abandoned issue holds back never appears in the report at all — the store never offered it, which is
  the report's own rule ("anything the store itself excluded is answered by asking the store"). A
  cross-domain refusal leaves no pick artifacts: the run fails at `open` and the runner skips the rest.

**Residual risks and boundaries, flagged rather than hidden**

- **The preflight runs at open, and pick runs later.** A wayfinder closing a decision in that window would
  release a dependent the preflight already passed; the drain would claim it. The flow is single-machine
  and sequential (the operator is the one running both), ticket 09 puts the check where the task asked,
  and a pick-time re-check is a second query nobody has asked for.
- **Indirect blocking through a decision epic is not refused.** An implementation issue *parented under*
  a decision issue inherits that decision's blocked-ness (`parent-child`), so closing the decision's own
  blocker can release it without a `blocks` edge the preflight sees. §7.2 calls parent-child the wrong
  tool for a wayfinder map and the tracker does not parent implementation issues under decision issues; a
  walk over blocking ancestors would be the fix if that structure ever appears.
- **A decision issue left `in_progress` stays that way.** The drain reports it on every open and never
  finishes it for the wayfinder; that is the decision, not an omission.
- Ticket 07's residual stands: two drains against one Target at once can each see the other's
  `in_progress` claims, and nothing here changes that.

**Review, both axes** (no sub-agents available in this session, so both axes were run inline over the diff
since `7a25300`). *Standards:* no hard violations — every module keeps its doc comment; `store.ts` is
still the only place a store command is built (`store-module-repro` scans the pack for `bd` in code and
passes with the new module, whose one mention lives in the README-quoted error text, not in code);
`domains.ts` is the single home of the `decision` vocabulary that `pick` and `reconcile` share; no new
dependency. Judgement calls kept: `assertNoCrossDomainEdges` builds its message directly rather than
introducing a `CrossDomainEdge` type with one consumer; `moveToTriage` is typed to the `TRIAGE_LABELS`
union so a mistyped role fails the typecheck; the repro duplicates `pick-repro`'s tiny report readers on
purpose (each repro is self-contained). *Spec:* all six criteria are implemented and pinned; the two
stale phrases are rewritten, not built; the deliberate boundaries are the gate-only brake rule, the
`blocks`-only preflight, and the decision skip with a report (all argued above); no scope creep — the
YAMLs, the executor, `settle.ts`, the readers and the store's write paths are untouched.
