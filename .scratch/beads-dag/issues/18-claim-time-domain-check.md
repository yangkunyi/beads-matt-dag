# 18 — the domain check also runs where the claim happens

**What to build:** ticket `09`'s preflight refuses a cross-domain `blocks` edge at open, before any write. Its
own first residual: **the preflight runs at open and `pick` runs later**, so a wayfinder closing a decision
issue in that window releases a dependent the preflight already passed, and the drain claims implementation
work a decision's closure released — the thing §10.4 forbids. Found by the acceptance and recorded only.

Fix: re-check at the point of claiming, so the window closes without weakening open. Open still refuses before
any write (that is what makes a refused run a no-op); the claim-time check catches what moved in between.

**Spec:** §10.4; `.scratch/beads-dag/issues/09-brake-and-domains.md` (Residual risks, first bullet)
**Blocked by:** `09`
**Status:** BLOCKED

- [x] a candidate the store offers whose blocking relation crosses domains is refused at claim time: the drain
      fails loudly, names the relation, and claims **nothing** from that cycle
- [x] the already-recorded case still holds at open: an implementation issue the store released as the
      dependent of a closed decision issue is refused even though no edge remains on the frontier
- [x] the Target-facing contract says so too: `skills/setup-matt-pocock-skills/issue-tracker-beads.md`
      ("Closure never crosses domains") claims the refusal happens at open, so it must say the check also runs
      where the claim happens — a run can now fail after its open — and the install must be refreshed
      (`cp -a skills/<member> ~/.pi/agent/skills/`, then `diff -rq` empty)
- [x] the cost is stated in the Comments — one extra store read per `pick` cycle, and why a cheaper place
      cannot close the window
- [x] a repro pins the **window** (store mutated between open and pick), not the code path, so the test fails
      if the re-check moves back behind `pick`
- [x] nothing outside the pack changes

## Comments

Built. The claim re-runs `open`'s own preflight: `assertNoCrossDomainEdges(store, target)` is the same
function, with its own fresh read of the whole store (`bd list --all --json --limit 0`, closed issues
included) and the same message — one `throw`, reached from `open.ts` and from `pick.ts`, so there is no
second predicate for "cross-domain" to drift in. In `pick` the call sits **behind the frontier read**
(`readyIssues` → `composeFrontier` → check → claim) and ahead of every write of the cycle, so a refused
cycle claims nothing, writes no `pick-exclusions.json` and records nothing in `attempted-ids.json`: the
throw is the whole outcome, exactly as in `open`. Its signature stayed `(store, target)` on purpose — the
read lives inside the check, so the two call sites cannot read different populations — and ticket `19`'s
widening (blocking ancestry) will land in that one function and be inherited by both.

**The window, pinned as a window** (`domain-repro.ts`, first new case). One target: `open` first, on a
store with no issues in it (exit 0, `opened`). Then the whole shape arrives, every act an operator's store
write — the decision `feat/51` is published, the implementation issue `feat/50` is published
gate-labelled, the `blocks` edge is written (`bd dep add feat/50 feat/51`), and the question is answered
(`bd close feat/51 -r answered`). `bd ready` then offers `feat/50` (the store has released it) and `pick`,
the very next node, exits non-zero with an empty stdout, naming *both* ends of the relation. `feat/50` is
still `open`; no exclusion report, no attempted ids. The case ends with the operator's own fix —
`bd dep remove feat/50 feat/51` — after which the same run directory claims `feat/50`, so what stopped the
cycle is the edge and nothing else. Nothing about that case touches the code path: it mutates the store
between two node invocations, so it fails exactly when the re-check moves back behind `pick`.

**The already-recorded case still holds** (the unchanged case in the same file): `feat/30`, released by the
already-closed decision `feat/31`, is refused at `open` with no token, and an `in_progress` leftover in the
same target is not repaired either. That case never reaches `pick`, which is why nothing there changed.

**The scope is the check's, not the cycle's** (second new case). The claim-time check reads what the
preflight reads — every issue, closed ones included — and not the ready set: `feat/60` waits on the
implementation issue `feat/61` and, after `open`, on the open decision `feat/62` as well. That edge
releases nothing (the question is open, so the store offers neither issue), and the cycle is refused all
the same; `feat/61`, which this cycle would otherwise have claimed, stays `open`. Narrowing pick's read to
its candidates would be the second opinion this ticket forbids, so the repro pins the scope as the
preflight's own.

**The cost, said exactly.** One extra store read per `pick` cycle: `allIssues` — one
`bd list --all --json --limit 0`, the same single query `open` makes, issued fresh. A cycle now spends two
read processes (`bd ready` and this one) where it spent one; both are reads, and the cycle's cost is
dominated by the agent turns it starts. No cheaper place closes the window: `open` is a single reading and
the run outlives it by hours; anything after the claim is too late, because a claimed issue is already in
a worktree; and the frontier read itself cannot answer it, because `bd ready` carries each candidate's
*edges* but never the *blocker's type*, and the blocker that matters — a closed decision — is not in the
ready answer at all. Per-blocker `bd show` calls would be one process per edge and could still only see
the candidates' edges, which is the narrower check the ticket rules out; one `list --all` answers every
blocker's type at once, for the whole graph, in one process. The alternative — a narrower read of just the
decision-type issues — was rejected for the same reason: it is a different predicate over a different
population, not the same check.

**Gates, verbatim** (store binary on `PATH`, as the README's gates require):

```
$ time timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   bookkeeping-repro.ts  {"ok":true}
ok   brief-repro.ts  {"ok":true}
ok   config-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   failures-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   range-repro.ts  {"ok":true}
ok   report-repro.ts  {"ok":true}
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
22/22 repros passed
suite exit=0 in 650s

$ timeout 300 ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors, exit 0)
```

Before the fix the new case was red exactly as the ticket describes — `the claim refuses the cycle:
"[\"feat/50\"]\n"` — and `pick-repro.ts` and `drain-noop-repro.ts` were run on their own after the change
(both green) before the whole suite above. `domain-repro.ts` drives 7 targets now (~87s on its own).

**Mutation proofs** (a copy of the whole pack under `/tmp/dom-mut/<name>/beads-dag`, one edit each, then
`bun <copy>/beads-dag-drain/tests/domain-repro.ts`)

| Mutation | The repro's failure |
| --- | --- |
| the check dropped from `pick` (back behind the claim, as `open`-only) | *the claim refuses the cycle: "[\"feat/50\"]\n"* |
| the check narrowed to the cycle's own candidates (`if (candidates.some(… blocks …))`) | *the claim refuses the cycle over an edge it was not going to claim through: "[\"feat/61\"]\n"* |

**One message, one clause reworded.** The refusal ends `the drain claims nothing while the edge stands.`
where it used to end `nothing was claimed.` — with the same string printed from either node, the old
clause would be false at the claim: a run that fails at its third cycle has merged what its first two
claimed. The new clause is true in both places (at `open` the run is a no-op; at `pick` the run stops and
that cycle claimed nothing), and the README's quoted example carries it. The rest of the message — the
edge, both ends, the domain named, the operator's fix — is byte-for-byte what ticket `09` built.

**The contract, and the installs.** `skills/setup-matt-pocock-skills/issue-tracker-beads.md` ("Closure
never crosses domains") now says the check runs at `open` *and again at each claim*, and that a run can
therefore fail after its open — the cycle that reads the edge claims nothing and exits non-zero with no
token, and what earlier cycles merged stays merged. The pack README says the same in "The frontier" and
"Closure never crosses domains". Both installs were refreshed and proved equal:

```
$ cp -a skills/setup-matt-pocock-skills ~/.pi/agent/skills/
$ diff -rq skills/setup-matt-pocock-skills ~/.pi/agent/skills/setup-matt-pocock-skills   # exit 0, no output
$ rm -rf ~/.archon/workflows/beads-dag && cp -a .archon/workflows/beads-dag ~/.archon/workflows/beads-dag
$ diff -rq .archon/workflows/beads-dag ~/.archon/workflows/beads-dag                     # exit 0, no output
```

**Files.** `.archon/workflows/beads-dag/beads-dag-drain/scripts/pick.ts` (the call, behind the frontier
read; the module comment), `scripts/domains.ts` (the module doc and the function doc name both call sites;
the reworded clause), `tests/domain-repro.ts` (two new cases), the pack `README.md`, and the contract file
above — one commit, pack paths and the skills path together. Nothing else: no YAML, no executor, no
settlement, no reader, and nothing under `docs/`.

**Residuals, flagged.**

- The check and the claim are two store operations, not one: a decision closed between `pick`'s graph read
  and its `bd batch` still releases a dependent into that cycle's claim. The gap is the two adjacent
  commands (microseconds), and it is the same gap `open` always had, only smaller — the store derives
  release on read, so there is no store-side transaction that could span it.
- A refusal mid-run costs the run's remaining cycles: the operator removes the edge and starts another
  drain. That is the price of "removing edges is the operator's act", and the run says what to remove.
- `skills/drain/SKILL.md` still lists the `open` refusals as "no store in the Target, no store binary, a
  `blocks` edge across the domains" in its incidents section. Every word of that stays true — an `open`
  that refuses still claims nothing — but it is no longer the whole inventory of domain refusals, and
  ticket `18` names the tracker contract only, so the sentence was left for a later ticket rather than
  edited here.
- Ticket `19`'s ancestry walk is still the other residual, unchanged: a `parent-child` edge gets past this
  check exactly as it got past `open`'s.

**Review, both axes inline** (no sub-agents in this session), over the diff since `18d8741`. *Standards:*
`domains.ts` keeps its doc comments and stays the one home of the `decision` vocabulary; `store.ts` is
still the only module that builds a store command (`store-module-repro` passes, and the new call reaches
the store through `allIssues`); no new dependency, no new node, no YAML change; the two call sites say the
same thing with the same arguments, which is the point. Judgement calls kept: the check's signature is
unchanged rather than taking the issues as an argument (one function, one read, no way for the callers to
differ), and the repro's two cases duplicate the small report reader the file already has, as every repro
here does. *Spec:* all six criteria are implemented and pinned; §10.4's release is refused where the claim
happens without weakening `open`; the cost is stated and argued; the contract and its install are fixed;
the README is the only other file touched, and only where the behaviour it described changed.


### Closed after landing

- *(Left open 3.)* The reviewer fixed `skills/drain/SKILL.md`'s refusal line in
  `skills: a refusal can arrive at pick, and it is a blocking relation` — it said `open` only, which stopped
  being the whole inventory here. The same edit made the wording edge-agnostic ("a blocking relation across
  the domains") so ticket `19`'s ancestry walk needs no second pass over that file; the install was refreshed.
- *(Left open 1.)* A decision closed between `pick`'s graph read and its `bd batch` still releases into that
  cycle. Kept as a recorded two-command window: no store-side transaction spans a read and a claim, the flow
  is single-machine and single-operator, and the refusal above is what turns the ordinary case (a closure
  during a run) from silent into loud.
