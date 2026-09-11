# 05 — The merge lands before the record

**What to build:** Settlement runs in one order and only that order: merge the issue's branch into Main
under the write lock, and only once that has landed, record the outcome in the store. A recorded close
therefore always has its merge commit behind it, and a crash in between leaves an issue still in progress
while its work is in Main — repairable, and never the other way round. A failure records its reason as a
comment and puts the issue back to `open` so the next drain retries it; nothing was merged, so nothing is
closed and its dependents stay exactly where they were — and it is not offered again by the run that
failed it.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `04`
**Status:** BLOCKED

- [x] a clean merge lands, and only then does the issue close
- [x] no code path closes an issue without a merge commit on Main behind it
- [x] a failed implementation records its reason as a comment and puts the issue back to `open`, never
      closed
- [x] the failed issue is not offered again by the same run, and is offered by the next one
- [x] a worktree and its branch are removed only after the merge landed
- [x] the store write sits outside the git lock, while every function that writes Main still refuses to
      run without the lock (asserted, not assumed)

## Comments

Built. The executor settles now, in one order: a turn whose work is in the worktree has the issue's
branch merged into Main (a real merge, `--no-ff`, under the Main-write lock), the issue closed in the
store **after** that (outside the lock, in the store's own transaction), and only then the worktree and
branch dropped. A turn that failed — or a merge that could not land — writes `attempt N failed: <reason>`
as a comment and puts the issue back to `open`; nothing merged, so nothing closes, the worktree stays for
the report, and the next drain's `bd ready` offers the issue again while the run that failed it is kept
off by its own `attempted-ids.json`.

New modules: `lock.ts` (the Main-write lock), `main-writes.ts` (every git write to Main, and the merge
subject and merge-commit lookup derived from the issue's names), `settle.ts` (the two settlements), and
`git.ts` (the plumbing `worktree.ts` used to keep private). `store.ts` gained `closeIssue` and
`recordFailedAttempt`; `execute.ts` calls the settlement after its turn.

**What 04 deliberately left, settled here.** The executor's outcome after a successful turn was `failed`,
because the work was in the worktree and nothing was in Main. It now merges, so a settled turn yields
`merged`; a turn that failed yields `failed` with its reason recorded. 04's repro pins both, and was
updated to the new truth (the token, and what the worktree ends up as — the commit is Main's second
parent instead of sitting unmerged on the branch). 04 also left the Target's `.gitignore` unwritten;
`main-writes.ts` now writes `/worktrees/` once per Target, idempotently, inside the lock, before the
first worktree exists — and the pack respects a Target that already carries the rule in one of its usual
spellings.

**Gates, verbatim**

```
$ bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts         # the store's directory on PATH
ok   brief-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
13/13 repros passed

$ env -u BEADS_BIN bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts   # and with it off PATH
ok   brief-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
13/13 repros passed

$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

Both suite runs are with no `BEADS_BIN`. 13 repros: 11 before, `lock-repro.ts` and `settle-repro.ts`
added.

**Evidence per criterion** (all at the node seam: the repros drive `execute.ts`/`pick.ts` the way the
runner does, with a stub implementer where a turn is needed, and read only the store's answers, git and
the runner's own artifacts).

1. *A clean merge lands, then the close.* `settle-repro.ts`: a turn that commits is merged; Main's tip is
   a merge commit with two parents whose second parent is the implementer's commit and whose first was
   Main when the turn ran; the issue is `closed` with `close_reason` `merged beads/feat/01-a-clean-merge`;
   the worktree and branch are gone; Main carries no worktree dirt. The order is observed, not assumed: a
   probe around the store binary records, on every store command, whether Main's tip was already a merge
   commit, and the `close` call is the one whose record says it was (`parents=3`; a close before the
   merge would record `parents=2` — that mutation fails the repro).
2. *No close without a merge.* The one `closeIssue(` call in the pack is in `settle.ts`, after
   `mergeIntoMain(` (asserted over the sources), and the paths that reach `closed` all go through the
   merge: a turn that commits nothing (`nothing to merge: …`), a merge that conflicts (aborted, Main left
   clean, no `MERGE_HEAD`), a turn with no runner at all, and a merge that produces no commit — each
   leaves the issue `open` with a reason and Main without a merge commit. A failure never closes.
3. *A failure records its reason and reopens.* `settle-repro.ts`: with the pack's own agent (no runner
   yet) the comment is `attempt 1 failed: no pi session ran: this slice of the pack starts no runner
   yet`, the status is `open`, `close_reason` is null, Main has no merge commit, and the attempt's
   worktree and branch are still there. A second attempt of the same issue records `attempt 2 failed: …`.
3b. *Its dependents stay blocked.* The same case: a second issue with `dep add` on the failing one stays
   `open`+blocked (`bd blocked` names it) and is never offered by `bd ready`, before and after the
   failure.
4. *Not offered again by this run, offered by the next.* `settle-repro.ts`, end to end through the node
   scripts: `pick` claims `feat/06`; `execute` (through `runScript`, the runner's own invocation) prints
   `failed` and exits 0; the same artifacts directory's next `pick` prints `[]` and its report names the
   issue with rule `attempted-by-this-run`; a fresh artifacts directory's `pick` offers `feat/06` again
   and claims it. The dependent is still blocked at every step.
5. *Removal only after the merge.* `removeMergedWorktree` refuses while Main does not carry the merge
   (a worktree holding an unmerged attempt: `refusing to remove …`, worktree and branch still there), and
   the merged path deletes both — the merge-commit lookup, not the caller, is what decides.
6. *The store write outside the lock; the Main writers refuse without it.* Behavioural, both halves:
   calling `ensureWorktreesIgnored`, `mergeIntoMain` or `removeMergedWorktree` outside `withMainLock`
   throws (`… writes Main and must run inside withMainLock`), leaves Main's tip unmoved and the worktree
   untouched; and `recordFailedAttempt` lands with no lock held at all (comment + reopen observed), while
   the probe records that no command of the settlement's store path ran with this process holding the
   lock (including the `close` of the merged path). The lock itself: one file in the Target's git
   directory, held while a callback runs, re-entered from inside it, released after it; a second process
   waits for it (measured: the callback ran after the holder released, ≥500 ms); a lock file naming a
   dead pid is stolen instead of blocking the next drain.

**Mutation proofs** (a copy of the whole pack under `/tmp`, one edit each, the named repro then run
against the copy — every new assertion above was shown to fail):

| Mutation | Repro's failure |
|---|---|
| `assertMainLock` a no-op | *unlocked ensureWorktreesIgnored: did not throw* |
| the close wrapped in `withMainLock` | *with this process holding no Main lock: got true, want false* |
| the close moved before the merge | *and then Main already carried the merge: got 2, want 3* |
| `--no-ff` dropped | *Main's tip is a merge commit with two parents: got 2, want 3* |
| the removal's merge check dropped | *removal before the merge landed: did not throw* |
| the reopen dropped from `recordFailedAttempt` | *the issue is never closed: got "in_progress", want "open"* |
| `attempt N` pinned to 1 | *… got ["attempt 1","attempt 1"], want ["attempt 1","attempt 2"]* |
| the ignore line written every time | *the ignore line is already there: got true, want false* |
| removal skipped after the merge | *the worktree is gone once the merge landed: got true, want false* |
| pick's attempted subtraction dropped | *the run that failed it offers it no more: got ["feat/06"], want []* |
| the merge subject made a constant | *the merge commit names the issue's branch* |
| the failure not recorded at all | *the issue is never closed: got "in_progress", want "open"* |
| `closeIssue` called from the executor too | *the only module that closes an issue is the settlement: got [… execute.ts], want [… settle.ts, store.ts]* |
| `withMainLock` a no-op | *the lock file is in the Target's git directory* |

**Acceptance under the runner.** After `rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`, in a fresh `/tmp/archon-lab-05` lab
(`bd init --prefix lab --non-interactive --skip-agents --skip-hooks`, two published issues — `lab/01`
gated, `lab/02` blocked by it): `archon workflow run beads-dag-drain --detach` → run
`33bb739e7235061a86b015fb01c1f27b`, **completed**. Its node log: `open` 501 ms, `pick` 776 ms, one
`execute` instance 1823 ms, second `pick` 468 ms with an empty fan-out, `drain` 630 ms, `review` 108 ms,
`summary` 118 ms, "Workflow completed successfully."

There is no runner until 06, so the turn fails on purpose — and that is what the run demonstrates end to
end. `execute`'s stderr: `lab/01: no pi session ran: this slice of the pack starts no runner yet`. The
Target afterwards: the store says `lab-45p` (`lab/01`) **`open`**, `comment_count 1`, `close_reason`
null, with the comment `attempt 1 failed: no pi session ran: this slice of the pack starts no runner
yet`; `lab-c9l` (`lab/02`) is still `open` and blocked, and `bd ready` offers only `lab/01`; Main has no
merge commit at all (`git log --merges` empty) and one new commit, `chore(beads-dag): ignore worktrees/`;
the worktree `worktrees/lab-01-a-lab-issue` is still there on branch `beads/lab/01-a-lab-issue`; the run's
artifacts hold `attempted-ids.json` = `["lab-45p"]` and a final `pick-exclusions.json` of
`{"picked": [], "excluded": [{"id": "lab-45p", "handle": "lab/01", "rule": "attempted-by-this-run"}]}`.
A **second** run (`0921031c01a32e845070289142b7f631`, completed) retries the issue: a second comment
`attempt 2 failed: …`, still `open`, still no merge commit, still one ignore commit (so the line is
idempotent in a real run too). The clean-merge path is covered by `settle-repro.ts` at the node seam with
a stub implementer that commits, as the ticket asks: a real runner arrives with 06.

**Deviations, each deliberate**

- **A merge into Main that conflicts is aborted and reported as the attempt's failure.** Leaving Main
  torn would be worse, and this slice has no conflict turn to hand it to: the worktree's own git state is
  where a conflict under way is recorded, and `bringMainIn` still leaves a conflict there for 08. 08
  turns the failure into the conflict agent's route; `mergeIntoMain` is where it re-merges.
- **Removal is after the record, and best-effort.** The merge and the close are the facts; dropping the
  worktree is housekeeping, and a removal that fails is reported on stderr and does not rewrite the
  record (`settleMerged` returns what landed). A crash between merge and record leaves the issue
  `in_progress` with its worktree and branch — which is what 07's repair needs.
- **`attempt N` counts the failure records on the issue** (`bd comments`, one comment per failed
  attempt), not the claims in `bd history`: the comment reads as the history of attempts, the read is
  cheap, and it does not depend on the store's history ordering. `bd comments` is one extra store read on
  the failure path only.
- **The lock covers writes that move Main.** `ensureWorktreesIgnored` (a commit) and `mergeIntoMain` are
  under it and assert it; `removeMergedWorktree` is too, and asserts the merge landed. `ensureWorktree`
  is *not*: creating a branch and a worktree registration does not move Main's branch or tree, and each
  issue's worktree is its own path. `store.ts` imports nothing from the lock at all, which is also the
  structural half of criterion 6.
- **The pack writes `.gitignore` before the first worktree, not inside `ensureWorktree`.** Worktree
  creation is not a Main write (`worktree.ts` still writes no part of Main), and the line has to be on
  Main before the worktree exists for Main to stay clean. It is one commit per Target (`chore(beads-dag):
  ignore worktrees/`), skipped when the Target already spells the rule.
- **A turn that answers and left an error set is merged if it committed.** The settlement reads git (the
  branch carries what Main does not) rather than the runner's mood; how a runner's `lastError` relates to
  its answer is 06's to define. What this slice pins is that no answer at all is a failure with the
  runner's reason recorded.
- `git.ts` was extracted from `worktree.ts` (which now imports it) because three modules need the same
  two git calls; no behaviour changed there.

**Surfaces tickets 06-10 build on**

- **The settlement — `scripts/settle.ts`.** `settleMerged(target, store, issue, names)` merges (or finds
  the merge that already landed), closes, drops the worktree, and returns `{ mergeCommit, created }`;
  it throws only from the merge, so a caller records a failure for exactly the attempts that did not
  land. `settleFailed(store, target, issue, reason)` records the reason and reopens. 08 calls
  `settleMerged` after its conflict turn; 07 calls both from its repair, and `mergeIntoMain`'s
  already-merged branch is that repair's "close it without merging twice".
- **The lock — `scripts/lock.ts`.** `withMainLock(target, fn)` (async, serialises Main writes, joins
  the transaction when this async context already holds it, waits up to `LOCK_WAIT_MS` = 60 s for
  another process, steals a lock whose pid is gone), `isMainLockHeld()`, `lockFilePath(target)`
  (`<git-dir>/beads-dag.lock`), `LOCK_NAME`. A compound step opens one `withMainLock` and calls the
  writers inside it.
- **Main's writers — `scripts/main-writes.ts`.** `ensureWorktreesIgnored(target)` (idempotent, returns
  whether it committed), `mergeSubject(names)` and `mergedOnMain(target, names)` (the merge-commit
  lookup 07's reconcile and the removal both read — by subject *and* second-parent ancestry),
  `mergeIntoMain(target, names)` → `{ mergeCommit, created }`, `removeMergedWorktree(target, names)`
  (refuses unless the merge landed; idempotent when the branch is already gone). All assert the lock.
- **The store's two outcome writes — `scripts/store.ts`.** `closeIssue(store, target, id, reason)` (the
  only close) and `recordFailedAttempt(store, target, id, reason)` (comment `attempt N failed: …`, then
  `-s open`).
- **What removal leaves behind on a failure:** everything. The worktree and its branch stay exactly
  where they were, with the attempt's commits on the branch, Main unmoved, and the reason on the issue.

**Review, both axes, over the diff since `63d88c5`** (no sub-agents available here, so both axes were
run inline rather than in parallel). *Standards:* no hard violations; two judgement calls kept —
`settleFailed` is a one-line delegate to `recordFailedAttempt`, on purpose because the settlement is the
one module 07 and 08 import (a caller should not have to know which store function is the failure
policy), and `mergeIntoMain` carries its already-merged check, its empty-branch check and its merge in
one function because one lock transaction is one operation. `gitOrThrow`'s message format was preserved
exactly in the extraction, so no other module's diagnostics moved. *Spec:* every criterion in this
ticket is implemented and pinned; the one deliberate boundary is that a merge into Main that conflicts
fails the attempt instead of leaving Main torn or starting the conflict agent — ticket 08 owns that
route, and the ticket text above says so. No scope creep: `pick.ts`, the YAMLs and every doc outside the
pack's own README are untouched.

**Observed while working here, not fixed (outside this ticket's scope):** `docs/CONTEXT.md` still lists
`failed` as one of the four statuses, which §10.3's 2026-09-11 reversal (and ADR-0003) retired — ticket
03 noticed the reversal and fixed its own criteria, but the vocabulary file was never updated. The
acceptance lab also shows the one remaining entry in `git status` on Main after a drain:
`.beads/interactions.jsonl`, which `bd init` itself commits and every store command rewrites. Neither is
this ticket's file to change; both are flagged for whoever owns docs and the tracker integration.
