# 07 — Leftovers are reconciled from git

**What to build:** A drain that was killed mid-issue is repaired at the start of the next one, by reading
git rather than trusting the store: an issue left in progress whose branch has a merge commit on Main
becomes closed; one whose work never landed goes back to `open` with the reason recorded as a comment.
Nothing is hand-repaired, and the repair happens before pick, so the same run can offer a repaired issue
as a retry.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [x] a kill between the merge and the record is repaired on the next open: the issue ends closed
- [x] a kill with work that never landed puts the issue back to `open` with a reason on it, and its
      worktree and branch stay for the report
- [x] an issue whose branch has only ancestor history is not mistaken for merged
- [x] the repair runs before pick in the same run

## Comments

Built. The opening node repairs before pick, in the order the spec gives it: preflight, recompute
blocked-ness, `reconcileLeftovers` — every issue the store holds `in_progress`, resolved from **git** —
then its token. New module `reconcile.ts`, exporting `reconcileLeftovers(target, store)` and the `Repair`
each leftover resolved to; `store.ts` gained `inProgressIssues` (a plain `list -s in_progress`, built
where every store command is built); `open.ts` calls the repair between the recompute and `opened`.
`pick`, `settle`, the two YAMLs and the executor are untouched.

Each leftover takes one of the two resolutions the flow already has, through 05's settlements. A merge of
its branch on Main → `settleMerged`, which finds that merge instead of making a second one, records the
close as `merged <branch>`, and drops the worktree and branch a settled merge drops. No merge →
`settleFailed` with the reason recorded as a comment, worktree and branch left for the report. Neither
path writes `attempted-ids.json`: the repaired failure is not an attempt by this run, so the same run's
`pick` offers it.

**Deviations, each deliberate**

- **`mergedOnMain` was tightened: the merge's second parent has to *be* the branch's tip, not merely on
  the branch.** 05's lookup accepted any merge whose subject matched and whose second parent was an
  ancestor of the branch. Read by a repair, that also accepted a branch re-created from Main after an
  *earlier attempt of the same issue* merged — its tip is past that merge, and the earlier merge's second
  parent is in its history — which is exactly the state an operator reopening a closed issue and a kill
  before the retry commits produces. The repair would have closed it, and the settle path would have taken
  the earlier merge for the retry's own: `mergeIntoMain` returns `created: false`, the issue closes, and
  `removeMergedWorktree` deletes the branch holding the retry's unmerged commit. Requiring the tip to be
  the parent fixes both, and changes nothing in any state the flow itself can produce (`--no-ff` records
  the tip as the second parent, and the flow never commits to a branch after merging it). Both directions
  of ancestry express "the tip is that parent" and stay correct when the branch is gone. `settle-repro`,
  `lock-repro` and `worktree-repro` are green on it.
- **A leftover that cannot be named in git is reopened, not fatal.** An `in_progress` issue without
  `handle`/`slug` cannot be checked against git at all; it goes back to `open` with the naming failure as
  its reason (`attempt N failed: issue <id> carries no handle metadata: …`), so one unresolvable issue
  does not become a drain that never runs. `pick` still refuses such an issue before it claims anything.
- **The repair does not filter by domain.** Its input is every `in_progress` issue, decision-type included.
  No path in this pack can claim a decision issue (`pick` excludes the type), so this is a boundary rather
  than a behaviour today; 09 owns the domain rules and can filter the repair's input if it wants to.
- **The merged leftover's worktree and branch are dropped; the unlanded one's are kept.** Criterion 1 asks
  for `closed` only; converging on the settled state is what makes a repaired issue indistinguishable from
  a recorded one afterwards, and criterion 2 asks for the other half explicitly.

**Gates, verbatim**

```
$ PATH=/data3/yky/.local/node-v24.19.0-linux-x64/bin:$PATH env -u BEADS_BIN \
    timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
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
15/15 repros passed
gate1 exit=0 in 269s

$ env -u BEADS_BIN PATH=<the store's directory removed from PATH> \
    timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
… identical 15/15 list …
15/15 repros passed
gate2 exit=0 in 270s

$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

Both suite runs are with no `BEADS_BIN`; the first has the store's directory first on PATH, the second has
it off PATH, where the fixture resolves the binary through `npm prefix -g` (which answered in 0.13 s —
checked with a 25 s timeout first, after the earlier ticket's wedge). 15 repros: 14 before,
`reconcile-repro.ts` added (5 targets, ~49 s).

**Evidence per criterion** (all at the node seam: `reconcile-repro.ts` drives the `open` node through
`runScript`, stages each kill as a store state plus a git state with the fixture's own `bd` and `git`
commands, and asserts only the store's answers and git)

1. *A kill between the merge and the record ends closed.* One target: an issue `in_progress`, its branch
   merged into Main under `beads-dag: merge <branch>` (the merge half of a settle, staged directly), the
   worktree and branch still present. `open` → `closed` with `close_reason` `merged <branch>`, Main's tip
   *unmoved* (the repair found the merge; it made no second one), `git log --merges` still the one commit,
   the worktree and branch gone, the work still in Main, and the issue's blocked dependent released.
2. *A kill before landing reopens, and its work stays.* One target: an attempt committed in the worktree,
   Main without the merge. `open` → `open` with `attempt 1 failed: leftover in progress and main carries
   no merge commit of <branch>`, no `close_reason`, Main unmoved and merge-free, the branch still at the
   attempt's commit, the worktree still there, the dependent still blocked. A third issue in that target
   has no worktree, no branch and no merge at all and reopens the same way; a fourth, published with no
   `handle`/`slug`, reopens with the naming failure as its reason instead of failing the node.
3. *Only ancestor history is not merged.* Two stagings in one target: (a) the branch cut from Main, with a
   merge on Main whose subject is the flow's own but whose second parent is a decoy commit the branch does
   not carry; (b) an *earlier attempt of the same issue* genuinely merged, then the branch was re-created
   from Main — its tip is that merge — with nothing committed on it. Both branches carry nothing Main lacks
   (`rev-list --count main..<branch>` = 0); both issues end `open` with the reason recorded, neither
   closes, Main does not move, and both branches and worktrees stay. In (b) the earlier merge's second
   parent *is* in the branch's history, so only the tip check rejects it. The retry side of (b) is its own
   target: with the issue claimed again, `executeIssue` resumes the re-created branch, the turn commits,
   and Main's tip is a *second* merge whose second parent is the retry's commit — not the earlier merge
   reused.
4. *The repair runs before pick, in the same run.* In the same target as (2): `pick` before `open` prints
   `[]` (a claimed issue is invisible), `open` repairs, `attempted-ids.json` is still `[]`, and the same
   artifacts directory's next `pick` prints `["feat/03"]` and claims it. The live run below shows the same
   order in one drain: `open`'s stderr carries both repairs, and the first `pick` after it carries
   `["lab/02"]`.

**Mutation proofs** (a fresh copy of the whole pack under `/tmp/reconcile-mut/<name>/beads-dag` per case,
`bun <copy>/beads-dag-drain/tests/reconcile-repro.ts` run against it; every new assertion above was shown
to fail)

| Mutation | The repro's failure |
| --- | --- |
| the pack as committed | (passes: 5 targets, 49 s) |
| the merge lookup dropped (every leftover reopens) | *the merged leftover is closed: got "open", want "closed"* |
| every leftover closed (nothing reopens) | *the unlanded leftover goes back to open: got "closed", want "open"* |
| the old loose check — the branch tip may be past the merge | *beads/feat/06-re-created-branch is not mistaken for merged: got "closed", want "open"* |
| only the reverse direction — the merge's parent may be off the branch | *beads/feat/05-only-ancestor-history is not mistaken for merged: got "closed", want "open"* |
| the opening node never repairs | *the merged leftover is closed: got "in_progress", want "closed"* |
| the repair hand-rolls merge + close + removal (same behaviour, bypasses the settlement) | *the repair goes through settleMerged: "settleMerged"* |
| the repair reaches for the merge (behaviour unchanged) | *and merges nothing of its own: "mergeIntoMain("* |
| an unnameable leftover fails the node | *open exits clean: "issue target-… carries no handle metadata: …"* |
| the merge step takes an earlier same-subject merge (the retry never lands) | *git … show main:retry.txt — fatal: path 'retry.txt' does not exist in 'main'* |

**Acceptance under the runner.** Installed by copy (`rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`; `diff -r` identical apart from the repro edited
after the run). Fresh `/tmp/beads-lab-07` lab: `git init -b main`, `bd init --prefix lab --non-interactive
--skip-agents --skip-hooks` (bd 1.2.2), both bodies committed, both leftovers staged directly:

- `lab/01` (`lab-mi9`) — merged-then-killed: branch `beads/lab/01-merged-then-killed` with one commit,
  merged into Main as `8da09d2 beads-dag: merge beads/lab/01-merged-then-killed`, the issue `in_progress`,
  worktree and branch still there.
- `lab/02` (`lab-5ql`) — killed-before-landing: branch `beads/lab/02-killed-before-landing` created from
  Main with no commits on it, the issue `in_progress`, worktree present.

The store before the run: both `in_progress`, `close_reason` null, no comments; `bd ready` `[]`; `bd
blocked` `[]`. Git before: `git log --graph --oneline` = `8da09d2 (HEAD -> main, beads/lab/02-killed-
before-landing) beads-dag: merge beads/lab/01-merged-then-killed` / `8603504 (beads/lab/01-merged-then-
killed) lab/01: the work` / `e7897b2 bd init: initialize beads issue tracking` / `e5f488a the lab's seed
commit`; `git worktree list` = the Target plus both issue worktrees.

`PATH=<the store's directory>:$PATH archon workflow run beads-dag-drain --detach` → run
`6acd59480e54892dc2470648f53ae127`, **completed**. Its node log, abridged to the boundaries:

```
16:25:47.783Z node_start open
16:25:50.645Z exec_output open       exit 0 | out: opened
                                      err: lab/02: leftover in progress and main carries no merge commit of beads/lab/02-killed-before-landing
                                           lab/01: repaired: 8da09d2640664fc74302d52688823c4be6857375 had already landed, so the issue is closed
16:25:50.667Z node_start pick
16:25:51.541Z exec_output pick       exit 0 | out: ["lab/02"]
16:25:51.692Z node_start execute__f912ec4524e00edc__execute
16:26:09.684Z exec_output execute…   exit 0 | out: merged
16:26:09.705Z node_start pick
16:26:10.161Z exec_output pick       exit 0 | out: []
16:26:10.326Z node_start review       16:26:10.433Z review       out: nothing
16:26:10.436Z node_start summary      16:26:10.550Z summary      out: nothing
16:26:10.555Z workflow_complete
```

Both repairs are on `open`'s stderr, before the first `pick` — which is therefore already offering the
repaired failure — and the session `execute` started was trivial and live:
`sessions/lab/02/implement.jsonl` (10 061 B), whose last assistant text says it created `HELLO.md`
containing `hello`, committed `d70bdbf lab/02: add HELLO.md`, and left merging and the issue's state to the
drain.

The store after the run: `lab/01` `closed`, `close_reason` `merged beads/lab/01-merged-then-killed`;
`lab/02` `closed`, `close_reason` `merged beads/lab/02-killed-before-landing`, one comment —
`attempt 1 failed: leftover in progress and main carries no merge commit of beads/lab/02-killed-before-
landing`; `bd ready` `[]`; `bd blocked` `[]`; the run's `attempted-ids.json` = `["lab-5ql"]` (only the
retried issue) and its final `pick-exclusions.json` = `{"picked": [], "excluded": []}`.

Git after: `14ab1be (HEAD -> main) beads-dag: merge beads/lab/02-killed-before-landing` / `d70bdbf (…) lab/02:
add HELLO.md` / `beb7385 chore(beads-dag): ignore runtime paths` / `8da09d2 beads-dag: merge
beads/lab/01-merged-then-killed` (the *same* commit as before the run — no second merge) / `8603504 lab/01:
the work` / …; `git log --merges` = `14ab1be … lab/02-killed-before-landing`, `8da09d2 … lab/01-merged-then-
killed`; `git worktree list` = the Target only; `git status --porcelain` empty; `HELLO.md` = `hello`.

A first attempt at the run, before the store's directory was put on the child's PATH, failed at `open` with
exit 1 and `cannot find the store binary: .scratch/beads-dag.yaml sets no store, and bd is not on PATH
(looked in: …)` and wrote nothing to the Target's store or git — the preflight still fails before anything
else, as 02 built it.

**Surfaces tickets 08-11 build on**

- **What `open` does now, in order:** `preflightStore(target, config)` (throws before any write when the
  binary or the store is missing) → `recomputeBlocked(store, target)` → `reconcileLeftovers(target, store)`
  → `opened`. 10 adds the review base as the fourth step, after the repair (its comment says so).
- **`reconcileLeftovers(target, store): Promise<Repair[]>`** — every `in_progress` issue, in the store's
  order; `Repair` is `{id, handle, outcome: "merged", mergeCommit}` or `{id, handle, outcome: "failed",
  reason}`. Nothing consumes the return today; a drain-end reader (10) that wants to say what *this run*
  repaired can take it from there instead of diffing `bd history`.
- **What a repair leaves for the drain-end report:** a closed issue with `close_reason` `merged <branch>`
  and Main's merge commit behind it (worktree and branch dropped), or an `open` issue with one more
  `attempt N failed: leftover in progress and main carries no merge commit of <branch>` comment and
  `bd history` carrying the `in_progress → open` transition — plus one stderr line per repair
  (`<handle>: repaired: <sha> had already landed, so the issue is closed` / `<handle>: leftover in progress
  and …`), which the runner's node log keeps as `stderr_tail`.
- **`mergedOnMain` now means "the branch tip *is* that merge's second parent"** — the removal and 08's
  conflict route share it, so a branch that moved past a merge is no longer "merged": the merge step merges
  the extra work instead of closing over it.
- **The repaired failure is in the frontier** — it is `open` and it is not in `attempted-ids.json` — so the
  drain that repaired an issue can work it in the same run. That is what 11's acceptance measures.

**Residual risks, flagged rather than hidden**

- **The repair's input cannot tell a dead drain's claim from a live one's.** `bd list -s in_progress` is
  the store's whole answer, and no liveness marker for a drain exists (the Main lock is held only around
  git writes). Two drains against one Target at once would have the later one reopen the earlier one's
  claims; the spec's story is sequential ("the next drain's reconcile"), the predecessor's leftover pass
  had the same exposure, and 11's acceptance runs one drain at a time. A claim timestamp or an artifacts
  handshake would be the fix, and is nobody's ticket yet.
- **The repair closes a leftover without reviewing what landed.** It reuses the merge the killed run made,
  which is the same work the settlement would have recorded; asking a reviewer to re-read that range is
  10's report, not this step's.
- **A `bd` that answers `list -s in_progress` differently** (a store version that drops the status filter,
  or a custom status registered in the store) would feed the repair a wrong set; the suite drives the real
  store, so a version bump would surface it as a repro failure rather than a silent repair.
