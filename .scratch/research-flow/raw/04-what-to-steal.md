# 04 — What to steal into the beads-dag drain, ranked and evidenced

**Date:** 2026-09-14 · **Status:** research input (ranked steal / no-steal list), not a decision
**Question:** which mechanisms from the closest existing systems are worth porting into
`.archon/workflows/beads-dag/` now, and which are not.

**Method.** Four donor systems were read at source level, shallow-cloned into `/tmp/steal-research`
(never in this repo), plus the pinned beads binary on this machine. Every claim below carries a file
path + function/line, a clone SHA, a fetched URL, or a probe I ran. Receipts live beside this note as
`raw/sources/04-*.md` (each with `SOURCE-URL:` on line 1).

| Donor | What was read | Version pinned |
|---|---|---|
| Gas Town | `internal/refinery/engineer.go`, `internal/refinery/{batch,work_bead_close,safety_stop,terminal_mr}.go`, `internal/beads/beads_merge_slot.go`, `internal/daemon/checkpoint_dog.go`, `internal/witness/handlers.go`, `internal/scheduler/capacity/pipeline.go`, `internal/constants/constants.go`, 9 formulas (`mol-refinery-patrol`, `mol-polecat-{work,review-pr,conflict-resolve,lease,code-review}`, `mol-dog-checkpoint`, `mol-orphan-scan`, `mol-dep-propagate`, `mol-digest-generate`) | `gastown@649b832b7672` (`git rev-parse HEAD`, shallow clone 2026-09-14) |
| beads | `docs/workflows/gates.md`, `cmd/bd/{gate,merge_slot}.go`, `internal/storage/merge_slot.go` + embedded impl, `docs/multi-agent/coordination.md` | `beads@f56632adcfab` (main) **and** the installed binary `bd version 1.2.2 (6c124203e)` — the version the pack pins |
| Issue-Orchestrator | ADR 0002/0004/0013/0014/0030, `docs/architecture/validation.md`, `docs/architecture/validated-work-preservation.md`, `docs/user/configuration_reference.md`, `control/{validation,awaiting_merge_reconciler}.py` | `issue-orchestrator@49f596b8f92a` |
| Kiro Crew | `https://kiro.dev/docs/crew/features/task-runner.md`, `…/multi-instance.md` (docs, not source — labelled) | fetched 2026-09-14 |

**Honest limits.** No donor was installed or run. Kiro Crew is docs-only (the task says the app is not to
be cloned); its numbers are **vendor**. Issue-Orchestrator is a mature ~275-module engine; I read its ADRs
and two control modules, not the engine. Gas Town is an agent town with tmux sessions and a Mayor — its
code shows the mechanisms, but its operating model (many live workers, remote `main`, PR mode) is not the
drain's. The predecessor's 63 ADRs were checked by grep (not a full read) for prior rejection of the
recommended items; where one exists it is named.

---

## Summary

1. **Steal the pre-merge verification gate.** The pack's only evidence before a merge is the worker's
   turn text; Gas Town, Kiro Crew and Issue-Orchestrator all run a configured command on the exact tree
   before it lands. Ticket-sized: one `verify.ts` module, two config keys, calls in `execute.ts`.
2. **Steal one bounded repair turn on a red gate** (conditional on 1). Gas Town hands the failure back
   to the same worker in place (`FIX_NEEDED`); a fresh 2 h session next drain is the expensive way to fix
   a red test. Bound it to one turn, and only then record the attempt as failed.
3. **Steal a dirty-worktree checkpoint before integrating Main** (small). A turn killed mid-edit can
   leave a worktree that `git merge` refuses to enter, and because the refusal happens before the agent
   turn, every later attempt fails before anyone can commit — a liveness latch the pack does not fix.
   Gas Town's checkpoint dog is the donor; only the resume-time commit is worth porting.
4. Everything else examined is either **already present** (repair-at-open, review position, run lock,
   atomic batch claim, read-only workers), **deliberately rejected** (per-ticket review, ADR-0036), or
   **pays only at multi-writer/multi-rig/multi-machine scale** (merge queue, merge slots, gates-as-issues,
   stall states, rate-limit pools, daemons).

**Top takeaway:** the donor code does not argue for more state machinery in the pack. It argues for one
pre-merge gate and one short repair loop around it — the two things every real merge pipeline has and
this one does not.

---

## Ranked table

| # | Mechanism | Donor (primary evidence) | What it fixes in the pack | Cost | Verdict |
|---|---|---|---|---|---|
| 1 | **Pre-merge verification gate** (configured command on the would-be-merged tree) | Gas Town `runGates`/`runGatesForPhase`; Kiro tests before commit; IO `validation.publish` | No test/CI evidence exists before `Main` moves; the review is post-merge | 1 module, 2 config keys, 2 call sites, tests | **Steal** |
| 2 | **One bounded repair turn on a red gate** | Gas Town `FIX_NEEDED` → same polecat; Kiro retry-per-step; IO `review.max_rework_cycles: 5` | A red test costs a whole drain cycle + fresh 2 h session; the fix usually needs the original context | 1 role, execute wiring, timeout math | **Steal** (after 1) |
| 3 | **Dirty-worktree checkpoint before `bringMainIn`** | Gas Town checkpoint dog (`git add -A` minus runtime dirs) | A killed turn's dirty tree can make every later attempt fail before any agent runs | small module + call site | **Steal** (small) |
| 4 | Gates-as-issues (`bd gate`) for external waits | beads v1.2.2 `bd gate` (verified present); synthesis D8 | Nothing today: no external condition in the flow | store object + a scheduler + `gh` for real gates | **No-steal now** (flip conditions below) |
| 5 | Merge queue / bisect / `bd merge-slot` | Gas Town `gt mq` + Refinery; IO ADR-0030; beads merge-slot | `settle` already serializes on a pid-stealing lock | queue states, MR objects, sweep jobs | **No-steal** |
| 6 | Stall states vs failure (zombie/stuck/GUPP) | Gas Town constants + witness; Kiro watchdog | Wall clocks already bound a turn; failure policy is right either way | runner-level signals + a status vocabulary | **No-steal** |
| 7 | Per-issue agent review + rework loop | Kiro reviewer session; IO review exchange | Predecessor ADR-0036 already rejected it; tests are the stronger pre-merge gate | a second agent turn + rounds state | **No-steal** |
| 8 | Write-then-observe / labels as external truth | IO ADR-0002/0013 | Nothing: beads is a local embedded store; git is read as truth by repair | read-back plumbing | **No-steal** |
| 9 | Circuit breaker / attempt cap on a repeatedly failing issue | Gas Town `FilterCircuitBroken`; Kiro `MAX_RETRIES`; IO max rework | Would bound a deterministic red gate's retry loop, but the spec's retry policy and #13 settled against a store cap | pick policy + store reading | **No-steal now** (see §9) |
| 10 | Rate-limit/cost governance (quota rotation, budget gate) | Gas Town `internal/quota` + usage-limit daemon; Kiro `tokens_used` | A runner error already fails the turn and reopens the issue | account/session plumbing | **No-steal** (cost visibility is a maybe) |
| 11 | Daemons, patrols, mail, dashboards, tmux, handoff | Gas Town witness/deacon/dogs; Kiro dashboard | No long-lived agents to supervise; Archon invokes a run | enormous | **No-steal** |

---

## 1. Steal: a pre-merge verification gate

### Mechanism (what exactly would be built)

A Target-configured command (`verify:` in `.scratch/beads-dag.yaml`, empty = skip, exactly Gas Town's
"empty command means not configured for this project" convention) is run **in the issue's worktree**, on
the tree that would be merged, **after** the implementer's turn and **after** a conflict resolution if
one happened, and **before** `settle()`. Red means the attempt is recorded exactly as any other failed
attempt: reason as a comment, issue back to `open`, nothing merged, worktree/branch kept. Green means
settle proceeds unchanged. The gate output's tail goes into the failure reason; the full log goes to the
run's artifacts.

```text
execute.ts today:                       with the gate:
  turn (implement)                        turn (implement)
  settle()  ← bringMainIn + merge         verify(worktree)   ← red → didNotLand("verify failed: …")
  (conflict turn → settle again)          settle()  ← bringMainIn + merge
                                          (conflict turn → verify again → settle again)
```

### Evidence

- **Gas Town's Refinery runs configured gates on the would-be merge, then again on the merged result.**
  `gastown@649b832` `internal/refinery/engineer.go` `func (e *Engineer) doMerge` (ll. 504–775): after
  checkout and conflict check it calls `e.runGates(ctx)` (`GatePhasePreMerge`), then performs the local
  `--no-ff` merge, then `e.runGatesForPhase(ctx, GatePhasePostSquash)` (ll. 673–686), and **resets the
  merge (`ResetHard("origin/"+target)`, l. 679) if the post-squash gate fails**. `runGatesForPhase`
  (ll. 1213–1290) runs each configured gate as `sh -c <cmd>` in the rig worktree, sequentially or in
  parallel, with a per-gate timeout, and fails overall on any gate. This is the same shape proposed
  here, and the post-squash pass exists because the merged tree is the thing that matters.
- **The red path is explicit and never merges.** `mol-refinery-patrol.formula.toml`
  (`gastown@649b832`) `[[steps]] id = "handle-failures"` ("VERIFICATION GATE… You CANNOT proceed to
  merge-push without: all quality checks and tests passing, OR bead filed for the pre-existing
  failure"): branch-caused failure → abort, `FIX_NEEDED` to the polecat, **do not close the MR, do not
  delete the branch, do not reopen the source issue**, update the bead's notes; pre-existing failure →
  file a bug (with a duplicate check) and merge.
- **Issue-Orchestrator separates a quick in-loop command from the deeper publish gate, cache-keyed by
  worktree + commit + command.** `issue-orchestrator@49f596b` `docs/architecture/validation.md`:
  "*Validation is a local lifecycle gate, not a CI system* … Run one quick local command while the
  coding/review loop is active; run one deeper publish command before push/publish; cache passing
  results by worktree + commit SHA + command; observe GitHub CI rather than reproducing it locally."
  The pack has no CI to observe and no PR push, so a single publish-shaped gate is the right subset.
- **Kiro Crew tests before it commits and again via the reviewer.** `04-kiro-crew-task-runner.md`
  (fetched): step loop is "Execute → Test → Self-review → Commit or retry"; `TEST_TIMEOUT` 90 min.
  The test half is the cheap, deterministic half; the reviewer half is addressed in §7.
- **The pack's own design record already concedes the hole.** `docs/specs/2026-09-11-beads-dag.md`
  "the per-issue executor is one node. Implement, integrate Main into the worktree, merge; if that merge
  conflicts, run the conflict agent". Nothing in the node ever executes the Target's tests. The review
  node runs **after** the drain over the merged range and its findings never fail a run
  (`README.md` "only a review that wrote findings advances the position", "a failed one … leaves the
  position").
- **Nothing in the predecessor's 63 ADRs rejected a pre-merge test gate.** A grep of
  `/data3/yky/workflow/docs/adr/` for test/verify/pre-merge found only ADR-0026 (venv-on-PATH for
  worktree tests) and ADR-0035 (inline *review*, not tests). ADR-0012 is "Merge onto Main is serial" and
  ADR-0029 is the merge-commit lookup — both compatible with a gate before the merge.

### What it fixes, and which invariant it protects

Today, `closed` implies "a merge commit exists" (ADR-0002) but not "anything ran". A worker that
misreads the issue, or breaks another file, merges anyway; its dependents are released on `close`
(ADR-0004), and the only backstop is a post-merge review whose findings cannot unmerge. The gate makes
the expensive failure (red work on Main, released dependents) impossible for drains that perform the
merge, while leaving every existing invariant intact: it sits before the merge, so merge-before-stamp
still holds; it writes no store field; its result is not a second record (ADR-0005) — the merge path
itself is the record that the gate was green. Note the honest gap: on the **repair path**, reconcile
closes a merge that already landed without re-running the gate; that is correct, because no merge is
made there, and it cannot close work that a governed run merged without a green gate.

### Landing sketch (ticket-sized)

- New `beads-dag-drain/scripts/verify.ts`: `runVerify(worktree, command, timeoutMs)` spawning `sh -c`
  with cwd = the worktree, capturing combined output (bounded), returning `{ ok, tail }`. No agent, no
  store.
- `config.ts`: add `verify` (string, default `""`) and `verifyTimeoutMs` (number, default e.g. 15 min)
  to `PackConfig`, `DEFAULTS`, `CONFIG_KEYS` (the typecheck forces the opening node's config line to
  name them — `config.ts` `configLine` is written over `CONFIG_KEYS`).
- `beads-dag-execute/scripts/execute.ts`: run the gate immediately before each `settle()` attempt
  (once after the implementer's turn, again after `resolveConflict()` returns), because the conflict
  turn can change the tree. On red: `didNotLand(\`verify failed: <tail>\`)` and write the full log into
  `ARTIFACTS_DIR` beside the other run artifacts. The command is trusted config from the Target
  (same trust boundary as Gas Town's `TestCommand comes from rig's config.json` comment in
  `runTests`, ll. 1093–1147) — never from the issue body, which the agent can influence.
- Tests: a node-level repro in `beads-dag-drain/tests/` (the suite drives real git, a real store and a
  stub agent) that seeds a Target with a failing command, asserts the store holds the failure comment,
  `Main` has no merge commit, and the worktree survives; plus a green-path test that the merge happens
  and the store closes.
- Docs: pack README "Gates" section already documents run commands; add the `verify` key to the config
  paragraph and the spec's per-issue executor paragraph.

### Cost, risk, falsifiers

- **Cost:** one module (~60 lines), two config keys, two call sites, tests. No new node, no new store
  dependency, no permission. Wall-clock: the gate's own duration per attempt, paid once per attempt.
- **Risk 1 — Main moves between gate and merge.** `settle()`'s `integrateMain` runs under the Main
  lock and re-merges the (possibly moved) Main; a clean re-merge produces a tree the gate did not test.
  With `concurrency: 4` (default) two settles can interleave. Mitigation, in order: (a) accept it — the
  window is the gate's runtime immediately before settle and the pack already re-integrates under the
  lock; (b) on a conflict turn, always re-gate (needed anyway); (c) the heavy alternative is gating
  inside `withMainLock`, which serializes all merges for the gate's duration — reject it, the pack's
  concurrency exists for exactly that. State the residual race in the doc comment.
- **Risk 2 — a pre-existing red suite blocks every issue.** That is the point of a gate, but unattended
  it becomes a backlog-wide stall: every drain pays the gate once per issue and records the same
  failure. The operator's brake (gate label) and the failures block's `attempt N failed:` counts make
  it visible; a Target whose suite is not green should leave `verify` unset until it is. Gas Town's
  "pre-existing failure → file a bug and merge" escape hatch is *not* proposed: it needs bisection
  against the target branch, which the pack can compute (`git stash`-free: run the gate on a temp
  checkout) but does not need now.
- **Falsifiers:** (1) a lab where the gate is green but the merged tree is red because Main moved (would
  move the recommendation to gate-under-lock or a post-merge check); (2) two weeks of real drains where
  the gate never once blocks a merge while consuming a large share of wall-clock (then drop it or narrow
  the command); (3) a Target that cannot express its acceptance as one command (then the gate shape is
  wrong for that Target, not the mechanism).

---

## 2. Steal (after 1): one bounded repair turn on a red gate

### Mechanism

When the gate is red, before recording the attempt as failed, hand the implementer the failing output
once, in the same worktree and session key, with a repair persona ("make the configured verification
pass; do not weaken the test to pass" — the prompt carries the refusal), then re-run the gate. Green →
settle as normal (no failure is ever recorded). Still red → record the attempt failed as today. One
repair turn per execution, counted in the run's artifacts (the `attempted-ids.json` precedent), never in
the store.

### Evidence

- **Gas Town fixes in place, with the worker's context.** `mol-refinery-patrol.formula.toml`
  `handle-failures`: on a branch-caused failure it sends `FIX_NEEDED` to the **same polecat** with the
  failure type and error, notes `Attempt-Number`, and waits for a resubmit — explicitly "the polecat
  fixes the code in-place and resubmits the MR without losing context". The Go side has the same
  invariant: `engineer.go` `HandleMRInfoFailure` routes CI/gate failures back to the worker, never
  re-opening the source issue.
- **Kiro Crew bounds the number of retries per step, not per run.** `04-kiro-crew-task-runner.md`:
  `MAX_RETRIES` 3 per step, `MAX_RECOVERIES` 2, `MAX_REPLAN` 2, `MAX_TOTAL_TASKS` 50; on review failure
  it reverts the commit and retries the step. The pack's equivalent "retry" today is the next drain —
  unbounded in count but expensive per unit.
- **Issue-Orchestrator's rework budget is explicit config.** `configuration_reference.md`:
  `review.max_rework_cycles` default **5** ("Max times to re-queue work agent before escalating"),
  plus `review_exchange_max_rounds` (default 10) in `completion_processor.py` (ll. 1470–1494). The
  point is the same: repair inside the loop, bounded, then escalate.
- **The conflict turn is the precedent in this very pack.** The pack already runs a second agent turn
  in the same execution (`resolveConflict`), with git — not the agent's word — deciding whether it
  counts. A repair turn is the same shape with a deterministic gate as the judge.

### Conflict to name (settled-against check)

Predecessor **ADR-0036** (`/data3/yky/workflow/docs/adr/0036-pack-drain-end-readonly-review.md`)
rejected "per-ticket two-axis in implement; unattended `/code-review`; … failing the drain on
findings". That rejection is about **agent review axes** injected into the implement turn, and about
findings failing the run; the repair turn proposed here is neither an axis nor a finding — it is a
deterministic red test feeding back into the same execution. It also does not change the pack's
failure-is-an-event policy (consensus #13, spec §10.3): a failure is still recorded only if the repair
turn also fails. What it does change is the workflow contract's timeout arithmetic: `roles.ts` is the
single declaration and the contract test asserts the node timeout outlasts the sum of every role's wall
clock, so a third turn must be added to that sum (or the repair turn must be given a shorter clock —
e.g. 30 min — which is the cheaper choice for a test-fix turn).

### Landing sketch, cost, risk

- `roles.ts`: a `repair` role (persona + 30 min clock + session key `execute-repair`), reused for both
  the red-gate repair and possibly nothing else; `prompt.ts`: its brief, which includes the gate's tail
  and the artifact path of the full log.
- `execute.ts`: gate → red → one repair turn → gate again; the same code path serves the conflict-turn
  re-gate (a repair after a conflict resolution is just the normal gate again, no extra turn needed).
- Cost: one role entry, one prompt, one branch in `execute.ts`, timeout bump; the test suite's
  contract check enforces the arithmetic.
- Risk: the agent "fixes" the red by editing the test. Deterministic gates are gameable this way; the
  gate command is Target config, often `bun test`/`pytest`, and the repair persona can explicitly
  refuse test weakening, but nothing *enforces* it (Kiro's reviewer is fail-open, so it does not
  enforce it either). The post-merge review's "missing tests for changed behavior" axis is the
  backstop. If this proves insufficient, the stricter variant is to re-run the gate from a clean
  checkout of the branch (`git worktree` of the pre-repair tip) to detect test edits — not proposed
  now.
- **Falsifiers:** a measured repair success rate near zero (the failure is environmental, not
  code-fixable), or a repair turn that repeatedly weakens tests (then drop the turn and keep the
  gate).

---

## 3. Steal (small): checkpoint a dirty worktree before integrating Main

### Mechanism

In `execute.ts`, after `ensureWorktree` and before the first `bringMainIn`, if the worktree is dirty
(`git status --porcelain`), commit it as one checkpoint on the issue's branch
(`wip(beads-dag): <handle> checkpoint before integrating Main`), staging everything then unstaging the
pack's own runtime paths (`.beads/`, `worktrees/` are already ignored on Main by
`main-writes.ts`; the exclusion list is the Gas Town one, minus its tmux-era entries). No periodic dog,
no daemon: the moment the checkpoint is needed is the resume.

### Why this is a real hole, not just "data loss prevention"

`worktree.ts` `bringMainIn` is `git merge --no-edit <main>` in the worktree. Git refuses to start a
merge when local modifications overlap paths the merge updates (and when untracked files would be
overwritten). In `execute.ts` the first `bringMainIn` is wrapped so that a non-conflict failure becomes
`didNotLand(reason)` **before the implementer's turn runs** — there is no agent in the loop to commit
or stash. Sequence that produces a latch:

1. An attempt is killed mid-turn (wall-clock kill, runner error, process death) after editing file X,
   leaving the worktree dirty. The failure path keeps the worktree ("keeps the worktree on a failure
   because it holds the attempt" — `execute.ts` doc comment) and the issue goes back to `open`.
2. Another issue merges a change to X (or to any path the dirty tree overlaps).
3. The next drain resumes the worktree, calls `bringMainIn`, and git refuses. The reason is recorded,
   the issue reopens, and the loop repeats **without any agent ever running** — every subsequent drain
   hits the same wall until a human commits/stashes the worktree.

The pack has no other repair for a dirty worktree: `reconcile.ts` reads git for merge commits and
repairs the *store*, never the working tree.

### Evidence

- **Gas Town's checkpoint dog exists for exactly this class of death.** `gastown@649b832`
  `internal/daemon/checkpoint_dog.go` `runCheckpointDog` / `checkpointRigPolecats` (10-minute default
  interval): "When a polecat session crashes (context limit, API error, OOM), any uncommitted work is
  lost … creates WIP checkpoint commits for dirty working trees", only for **live** tmux sessions;
  `mol-dog-checkpoint.formula.toml` step `checkpoint`: `git add -A`, `git reset HEAD -- .claude/
  .beads/ .runtime/ __pycache__/`, `git commit -m "WIP: checkpoint (auto)"`. The formula states the
  safety property: "WIP commits are squashed by `gt done` before push" and "Refinery squash-merges
  anyway, so WIP commits never reach main".
- **The pack's own contract makes the dirty case visible but not repairable.** `prompt.ts` implement
  persona: "Commit your changes there before you stop: those commits are the issue's work, and nothing
  else carries it." A turn that follows the persona is clean; the checkpoint covers the turn that dies
  mid-sentence (the runner's kill paths) and the run killed between nodes.
- **The store's own ADR gives the right home for the *unsaved* half.** ADR-0005: state in the store,
  the work itself in git. Uncommitted worktree bytes are work in neither; a checkpoint commit puts the
  bytes where the model says work lives.

### Landing sketch, cost, risk

- New `beads-dag-drain/scripts/wip.ts` (or a function in `worktree.ts`): `checkpointDirty(worktree,
  handle)` — `git status --porcelain` → no-op when empty; else `git add -A`; `git reset HEAD --`
  the exclusion list; commit if anything remains. Called in `execute.ts` right after `ensureWorktree`.
- Cost: one small module, one call site, one exclusion-list constant, tests (dirty→clean, clean→no
  commit, ignored paths not committed). No new store field, no new artifact.
- Risk 1: committing junk (untracked build outputs). Git's own `.gitignore` handles most; the
  exclusion list handles the pack's paths; a Target with a wildly dirty tree gets one ugly commit on a
  branch that is not Main.
- Risk 2: the WIP commit's content later lands in Main with the issue's merge (the next attempt
  resumes the branch and merges). The content is the agent's own edits, the merge subject names the
  branch, the post-merge review sees it — and once the gate from §1 exists, the merged tree is gated.
  Without the gate this is a (small) new risk; the two recommendations are best taken together.
- **Falsifier:** reproduce the latch (see lab tests). If the drain's killed turns never leave
  overlapping dirty state, or if `git merge` in practice always proceeds, the module is dead weight.

---

## 4. No-steal now: gates-as-issues (`bd gate`) for external conditions — and when it flips

beads v1.2.2 (the pinned version) **does** ship gates: `bd gate create|list|check|resolve|show|
add-waiter|discover`, types `human`/`timer`/`gh:run`/`gh:pr` (probe receipt
`04-beads-bd-1.2.2-probe.md`; `bd gate create --help`, `bd gate check --help`). Semantics, verified on
the binary and in `beads@f56632` `cmd/bd/gate.go` ll. 600–800 and `docs/workflows/gates.md`:

- A gate is an **issue** (`issue_type: "gate"`) that blocks its waiter through a normal dependency edge.
- `bd gate check` closes satisfied gates (`gh:run` completed+success; `gh:pr` MERGED; timer elapsed;
  `bead` closed) and **escalates** failures (gh:run failure/canceled, gh:pr CLOSED) — escalation prints
  `⚠ ESCALATE`, and with `--escalate` calls `escalateGate`; the gate stays open otherwise. Human gates
  close only via `bd gate resolve`/`bd close`.
- **Someone must run `bd gate check`** (cron, CI, or another process). Nothing is automatic.
- My probe settles a design question the pack would otherwise have to guess: on 1.2.2, gate issues are
  **hidden from `bd ready` and from `bd list`/`bd list --all`** (only `bd gate list` / `bd list -t gate`
  show them), so a gate cannot leak into the drain's frontier. The "gates would pollute the frontier"
  objection is false.

Why **no-steal now**: the drain is single-operator, single-machine, local-Main, no PR and no CI; the
only "wait" in the domain is the operator's brake and a wayfinder question, both already modelled (the
`ready-for-agent` label and the `decision` type). The spec binds this: user story 36 — "the gate label
to be the only thing that admits an issue to the frontier" — and consensus decision #4 uses labels for
triage roles. A gate would add a store object per wait, a scheduler the pack does not have, and (for
`gh:*`) a network CLI with credentials in the unattended path.

**When it flips to a steal:** the moment a Target's issues must wait on a real external event — CI on a
push, a PR merge, a human approval outside the repo. Then a `gh:run`/`gh:pr` gate is the store-native
model, and the cheap landing is a `bd gate check --type=gh` call in `open.ts` before pick (the pack
already recomputes blocked-ness there) plus an ADR that says who schedules it. Do not adopt it before
such an event exists; the label is strictly simpler.

---

## 5. No-steal: merge queue, bisect, merge slots

The pack's `settle.ts` + `lock.ts` already are a merge queue of depth one: `withMainLock` serializes
`integrateMain` + `mergeIntoMain` as one transaction, a lock left by a killed run is stolen by pid, and
a merge that already landed is found rather than made twice (`main-writes.ts mergedOnMain`). Gas Town
needs a queue because N polecats push to a shared remote `main` and merges can arrive from outside
(`engineer.go` `doMerge` re-checks source/MR eligibility twice per merge, `recheckMRStillMergeable`,
and serializes pushes with a merge slot, `acquireMainPushSlot`, ll. 1030–1093). Issue-Orchestrator's
queue exists to respect GitHub branch protection (ADR-0030). Neither condition holds here.

What a queue costs, visible in the donor's own bug surface: Gas Town carries `merged-pr-sweep`,
`closeSupersededConflictArtifacts`, orphan-MR cleanup (`patrol-cleanup`: "NEVER close an MR bead
without verifying the work landed"), and slot-timeout classification — all machinery for states a
one-writer flow cannot enter. `bd merge-slot` on 1.2.2 stores `holder`/`waiters` in the slot bead's
metadata with status `open`/`in_progress` (`cmd/bd/merge_slot.go`; probe: `acquire` by a second actor
errors "slot held by: X", `--wait` queues); the holder is an actor string and **there is no dead-holder
recovery** — a crashed holder parks the slot until a human clears it, whereas the pack's lock notices a
dead pid and steals. Adopting it would be a downgrade.

Bisect: nothing to bisect while a red tree cannot land (§1 prevents it), and the pack has one writer,
so "which of N merges broke Main" is a single-entry range the review already covers. **Falsifier:** two
machines or two operators writing one Target's Main (then reach for a queue, and for a lock that works
across machines — the current lock is a local file).

---

## 6. No-steal: stall states distinguished from failure

Gas Town's model is rich because its workers are long-lived tmux sessions that can idle, hang at a
startup dialog, or die in a session: `GUPPViolationTimeout = 30m` ("work on the hook without
progressing"), `HungSessionThreshold = 30m`, `StuckThreshold` in worker config (`internal/config/
types.go` default `30m`), `ZombieClassification` values (`stuck-in-done`, `agent-dead-in-session`,
`agent-self-reported-stuck`, …) and `DetectStalledPolecats` for "alive-but-stuck agents that will never
make progress without intervention" (`internal/witness/handlers.go` ll. 1532–1580, 2237–2330), with
nudges/handoffs the interventions. Kiro Crew's watchdog does the same for its step sessions:
activity-aware, 60 min → warn, 2 h → reset + recovery retry, with a separate `MAX_RECOVERIES` budget
(vendor docs).

The pack's workers are one-shot turns with wall clocks (2 h implement/conflict, 30 min review/summary
in `roles.ts`), a runner that kills on the clock, and a failure policy that treats every non-landing
the same (comment + reopen; next drain retries). There is no idle state to detect and no nudge target:
the process is the session. A "stalled" status would add vocabulary the spec's ADR-0003 deliberately
kept at three statuses, and would have to answer the same question the timeout already answers. The
only thing Gas Town buys here is earlier turnover (30 min vs 2 h) and diagnostics — worth revisiting
only with evidence of turns that emit nothing for long stretches; the cheap version is a runner-level
activity watchdog inside the `agent.ts` seam, never a store state. **Falsifier:** measured drains
where wall-clock kills are common and the preceding 60 minutes had no tool activity.

---

## 7. No-steal: per-issue agent review and rework loops

Kiro Crew's reviewer is real: separate session (`taskrunner::review`), reads `git diff HEAD~1`, revert
and retry on failure — but its exceptions are **non-fatal** ("returns 'passed' to avoid blocking"), so
it is advisory in practice. Issue-Orchestrator runs full review exchanges (rounds, `needs-rework`,
`max_rework_cycles`) at GitHub scale. The predecessor already decided this question for this repo:
ADR-0036 rejected "per-ticket two-axis in implement; unattended `/code-review`", and the current pack
carries that forward deliberately — review is a drain-end reader over a **recorded range**
(`review-position.ts`, the distinctive property from `00-synthesis.md` §1), its findings advance the
position, and a failed review does not fail the run. A pre-merge agent review would (a) duplicate the
post-merge review with worse placement (it sees one issue, not the range), (b) add a second agent turn
and a round counter, (c) still be "self-evaluation", which the survey's independent evidence measures as
weak (METR: ~24 points below a human merge decision on grader-passing PRs; `00-synthesis.md` G4). The
deterministic gate in §1 is the pre-merge judgment worth having; the agent review stays where it is.
**What is worth stealing from this lane** is only the bounded repair turn of §2, on a red *gate*.

---

## 8. No-steal: crash-safe external truth / write-then-observe

Issue-Orchestrator's ADR-0002 ("all external writes are tentative until confirmed by subsequent
observation") and ADR-0013 ("GitHub labels are the authoritative source of truth") are correct answers
to GitHub's eventual consistency and to a stateless orchestrator that must rebuild from labels after a
crash. The pack's truths are different objects: beads is a local embedded store (consensus #5; 8
concurrent writers verified), and git is the truth for "did the work land" — read by `reconcile.ts`,
never written as a second status record (ADR-0005 "one record per fact"). Reading a `bd close` back to
observe it would be a second source for a fact that already has exactly one writer and one home.
**Falsifier:** the store becoming remote/federated (then writes can be tentative) — which the spec's
"Out of Scope: multi-machine store federation" keeps off the table.

---

## 9. No-steal now: circuit breaker / attempt cap

Gas Town's scheduler has `CircuitBreakerPolicy(maxFailures)` and `FilterCircuitBroken` (dispatch
failures per bead → quarantine; `internal/scheduler/capacity/pipeline.go` ll. 188–215), Kiro has
`MAX_RETRIES`/`MAX_TOTAL_TASKS`, and IO has `max_rework_cycles`. The pack's policy is the opposite on
purpose: a failed attempt is an event (comment + reopen), the next drain retries, and the only cap is
per-run (`attempted-ids.json`). Consensus decision #13 explicitly reversed even a status-level retry
protector: "the retry cap: per-run, in `attempted-ids.json`, never in the store". A store-side cap
would be a new policy the spec's retry section did not adopt, and it would need an ADR.

The risk §1 introduces is concrete: a deterministically red gate makes every future drain spend one
gate run + (with §2) one repair turn on the same issue forever. The failures block already reports the
count and the latest reason (`failures.ts`, `bd comments` reading), so the loop is **visible**; the
operator's lever is the `ready-for-agent` label (spec user story 13). If a real Target shows attempt
counts climbing with no operator watching, the least invasive next step is a **report-only** threshold
(summary names "attempt N (> 3)") before any pick-time exclusion — and that would be a new ADR, because
it changes the frontier's rules. Falsifier: a drained Target with attempts reaching double digits while
the operator never sees it.

---

## 10. No-steal: rate-limit/cost governance, quota rotation, budget gates

Gas Town's `internal/quota` rotates Claude accounts across tmux sessions on usage limits
(`internal/quota/executor.go`, `internal/daemon/usage_limit.go` detects `rate_limit_error` in session
output); Kiro records `tokens_used` per run; IO has provider resilience/backoff config. For the pack, a
rate-limited turn is just a turn that failed: the runner returns `lastError`, the node records the
attempt failed, and the next drain retries — no special vocabulary needed, and account rotation /
budget gates presume pools of accounts and a billing surface the pack does not have. The one piece
worth a lab check (not a steal yet): the run artifacts already hold one session file per role
(`README.md` "sessions/<key>/<role>.jsonl"), and the summary could print wall-clock per role and, if
the runner's file carries it, token totals — pure reporting, no policy. Do not build a budget gate
before there is a cost number to gate on.

---

## 11. No-steal: daemons, patrols, mail, dashboards, tmux, handoff, escalation

Everything that makes Gas Town a town — Witness/Deacon patrols, dogs, `gt mail`, `gt nudge`,
`gt escalate`, tmux sessions, dashboards, handoff — exists because Gas Town supervises many long-lived
agents on a schedule. The drain is one Archon run with one process tree, a run lock, and a summary a
human reads. The donors' *observation* loops (`mol-orphan-scan`, `mol-dep-propagate`) are already the
pack's `open` node in miniature: repair every `in_progress` leftover from git, recompute blocked-ness,
then pick. **Falsifier:** the drain being scheduled by cron with overlapping runs and no operator —
the run lock already refuses the second run, so even then the answer is not a daemon.

---

## 12. Smaller no-steals, one line each

| Mechanism | Why not |
|---|---|
| Post-squash gates on Main / `VerifyPushedCommit` | Pack's merge is local; `mergedOnMain` (subject + second parent) is the post-merge proof, and Main cannot be cheaply unmerged after a red result |
| Merge rehearsal as a separate step | Already `bringMainIn` inside the settle transaction (`worktree.ts`, `settle.ts`) |
| Conflict-as-task (`createConflictResolutionTaskForMR`) + merge-slot serialization | Pack resolves the conflict in the same execution (spec: "a conflict is resolved in the same execution"), so there is no orphan task to serialize |
| `bd merge-slot` dead-holder recovery | Worse than `lock.ts`'s pid steal (holder is an opaque actor string) |
| Push/branch cleanup exactly-once (`closeMergedWorkBead`, `removeMergedWorktree`) | Pack's removal refuses unless Main carries the merge and is idempotent (`main-writes.ts`) |
| `bd ready --claim` | Pack claims the whole batch in one `bd batch` transaction (all-or-nothing), which `--claim` per issue cannot; assignee is deliberately unused |
| `bd recompute-blocked`, `bd comments`, `bd history` | Already used (`store.ts`); history cannot carry failure reasons, comments can |
| `waits-for` / `conditional-blocks` / `external:` deps | `bd ready` already honours the first two (consensus §5.3–5.4); `external:` is cross-repo, out of scope |
| Validation result cache keyed by HEAD SHA (IO) | A second stored record of a fact the merge path already implies; re-running is the honest option (ADR-0005) |
| `bd swarm` | Epic fan-out is what `bd ready` + `pick` + `concurrency` already do; the drain has no epic layer by decision #8 |
| Backup dog / periodic `bd dolt push` | Spec Out of Scope: "Automating the store's remote backup (the mechanism is in scope; a scheduler is not)". A summary reminder was considered; `bd dolt status` on 1.2.2 does not report unpushed commits, so it would be new plumbing for a reminder |
| Safety-stop label on an agent bead | Kill the run; the next `open` repairs what it left, and the run lock already refuses a second drain |
| Warm pools / orphan PID tracking (Kiro) | Kiro's warm set is dashboard tunnels (multi-instance.md: live tunnel + WebSocket, LRU cap 8) — no analogue in a one-shot drain |
| Digest / standing reports (Gas Town) | The review position makes every run's report exactly the range nobody has read; a digest is a second report of the same fact |

---

## Lab tests (cheapest real experiments, in order)

1. **Red gate, clean Main** (settles §1's plumbing and the failure path). Throwaway Target, a real
   store, a cheap test command (a one-file `bun test`/`pytest`), config `verify: <cmd>`. Publish one
   issue whose body asks for a change that leaves exactly one test red. Run the drain. Expect:
   `attempt 1 failed: verify failed: …` on the issue, no merge commit on Main for the branch, worktree
   and branch kept, next drain retries it. Variant: green issue → merge + close unchanged.
2. **Repair turn saves the attempt** (settles §2's value). Same lab, but the red is a one-line fix the
   agent can see from the failure output (e.g. an expected string in a fixture). Expect: no failure
   comment, merge lands, store closes, summary reports the merge — and record the extra wall-clock to
   compare against a control run without the repair turn.
3. **Dirty-worktree latch** (settles §3). Simulate a killed run: an `in_progress` issue whose worktree
   has an uncommitted edit to file X, and a Main that has gained a commit touching X (merge another
   issue first). Run the drain without the checkpoint: expect repeated pre-agent failures
   (`cannot bring … into the worktree`) with no agent session. Add the checkpoint: expect a `wip`
   commit, then a normal turn. If the latch cannot be produced, drop §3.
4. **Concurrent settle race** (settles §1 Risk 1, cheap): `concurrency: 2`, two green issues, a gate
   that sleeps 60 s. Watch whether the second settle's merge lands a tree the gate tested. This decides
   whether the gate needs a post-merge Main check or the race is acceptable.

---

## Appendix: the pinned bd surface, re-verified on the binary

From `04-beads-bd-1.2.2-probe.md` (commands and full outputs in the receipt):

- `bd version 1.2.2 (6c124203e: HEAD@6c124203e771)`; `gate`, `merge-slot`, `swarm`, `batch` all
  present on the pinned binary (consistent with this repo's consensus §3).
- `bd gate create --type=<human|timer|gh:run|gh:pr>`; `bd gate check [--type=…] [--dry-run]
  [--escalate]`; escalation means the gate stays open and prints ESCALATE (optionally calls
  `escalateGate`).
- Gate issues are hidden from `bd ready` and from `bd list`/`bd list --all`; `bd gate list` and
  `bd list -t gate` show them. A gate therefore cannot leak into `pick` as work.
- `bd merge-slot`: slot bead `<prefix>-merge-slot` with `metadata.holder` / `metadata.waiters`,
  status `open`/`in_progress`; a second actor's `acquire` errors unless `--wait`; no dead-holder
  steal.
- Gas Town's own comment says "the `bd merge-slot` command was removed in v0.62"
  (`internal/beads/beads_merge_slot.go` header) while reimplementing it with plain CRUD — that does
  not match the pinned 1.2.2 binary, which has the command. `UNVERIFIED:` which beads lineage that
  comment refers to; the empirical fact on the pinned version is what the pack should trust.

**Could not verify:** Gas Town was not run (no `gt` install), so every Gas Town mechanism is read from
source/formulas, not observed; Kiro Crew's checkpoint internals are docs only; Issue-Orchestrator's
engine beyond the ADRs and two modules was not read; the predecessor-ADR check was a grep over 63 files
rather than a full read; no drain run was executed for this note (all labs above are proposed, not
performed).
