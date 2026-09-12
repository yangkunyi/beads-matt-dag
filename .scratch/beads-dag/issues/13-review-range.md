# 13 — the review range is what nobody has looked at yet

**What to build:** "Which Main tip was last reviewed" becomes a recorded position in the Target, and the
drain-end readers report on `position..HEAD` instead of on `Main's tip at open..HEAD`. Today a run that
dies after merging and before its review drops every merge it made out of every future report: in step 1's
acceptance, run `a03cb8d2` merged `d88c3266` and was SIGKILLed at the close call, and the run that repaired
it (`2be20b45`) recorded a base *past* that merge and reported `skip: empty diff` — so that diff appeared in
no report at all. A run that had already closed three issues and died on the fourth loses all four, and the
repair only ever names the fourth.

The repair half is this ticket's too, and ticket `12` measured why it needs a decision rather than a
reader: a repair that **closed** an issue writes no failure comment, its `close_reason` is byte-identical
to a settlement's (`merged <branch>`), and the store has no clock that could attribute a write to a run.
So the fact that a *repair* closed an issue exists only in the run's own shape — `reconcileLeftovers`
returns its repairs to the opening node today, and they reach stderr only. Where that list lives is part of
this ticket (the precedent is the run's own bookkeeping: `attempted-ids.json`, `pick-exclusions.json`), and
so is distinguishing this run's merges from an earlier run's inside one range.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.6, §13 step 1)
**Blocked by:** `10`
**Status:** BLOCKED

- [x] the base of the range is the recorded position, not Main's tip at open
- [x] after a review writes findings, the position advances to the end of the range it covered
- [x] a review that failed (`review error:`) does not advance it, so the next run reports that range again
- [x] a run killed between its merge and its review leaves that merge inside the next run's range — staged
      with a kill the way 11 staged its own, and observed in a real run
- [x] a Target with no recorded position behaves as today for one run and then starts recording
- [x] the report states the range it covered, and when the range holds merges this run did not make, it says
      so and names them
- [x] a repair this run performed at open is named in the report (today it reaches stderr only), including
      the ones it **closed** — which ticket `12` could not name, because their close reason is identical to
      a settlement's and nothing in the store says which run wrote it
- [x] a merge inside the range that this run did not make is named, and the mechanism telling the two apart
      is a record, not prose: if no existing record can, this ticket decides the smallest honest run-scoped
      one and says why it is not store state and not a maintained mirror
- [x] both readers cover the **same** range in one run, and a review that failed leaves the position where
      it was, so the next run reports that range again
- [x] the position is a local git ref in the Target: never a store field, never a file the pack maintains
      elsewhere, and its absence is not an error

## Comments

Built. The range's base is now a position the Target keeps across runs, and the drain-end report names what
is in the range that this run did not make - earlier runs' merges, the operator's commits, and the repairs
this run's opening step performed, **closes included**. The repair half ticket `12` handed over is answered
by the run's own bookkeeping, not by the store.

New modules: `scripts/review-position.ts` (the ref) and `scripts/run-record.ts` (the run's record and the
range section it writes). Changed: `open.ts`, `reconcile.ts`, `settle.ts`, `report-artifacts.ts`,
`report-node.ts`, `review.ts`, `summary.ts`, `execute.ts`, and the README. New repro `range-repro.ts`;
`report-repro.ts`/`failures-repro.ts` grew the new artifact shapes.

### The position is `refs/beads-dag/reviewed`, a local ref, and why

**A ref and not a file**, in the code's own comment (`review-position.ts`): the fact is a git fact - which
commit's work has been reviewed is a place in this repository's history - and a ref can only point at a
commit the repository has, moves atomically, and travels with the repository instead of living beside it as
a second record a checkout can drift from. It is not a store field either: it says nothing about any
issue, only how far Main's reviews have reached (ADR-0005 - state in the store, the work itself in git).

**Two writers, both forward-only.** The opening node records Main's tip as the first position when the
Target has none (`positionToOpenOn`, a must-not-exist `git update-ref` so two fresh runs cannot jump the
position over each other); the review node advances it (`advanceReviewed`) once it has written findings,
and refuses a head the current position is ahead of. Absence is not an error: before any run the ref does
not exist, and the first run's range is exactly today's.

**Why recording at open is load-bearing.** Ticket 11's actual kill was on a fresh Target: run 1's open was
the only place a pre-merge commit was ever written down, and the ref is how run 2 learns it. Recording the
position at open (not at the review's advance) is what makes the killed run's merge fall inside the next
run's range. A review that fails or is skipped leaves the position exactly there, so the next run covers the
same range again.

### The advance rule and both readers' range

**The advance is the review node's, after its artifact is written**, and only when the artifact holds
findings, read back through the protocol (`reviewWroteFindings` -> `reviewSkipReason`): a `skip:` and a
`review error:` line are not findings. A review where **every** axis failed or answered nothing is
normalised to one whole-artifact `review error:` line - before this ticket three error sections would have
started with a heading and read as findings - so the failure is exactly the shape the readback already
knows, and the summary treats it as a skip. An axis that answers nothing is now that axis' failure rather
than `(no review text)`; a mixed review (at least one axis with findings) is a review and does advance.

**One range serves both readers because only `open` reads the ref.** The run's base lives in the
`review-base` artifact; review and summary both read that artifact, and the review's advance moves the ref
behind them. If the summary re-read the ref, it would see `position..Main` = empty after a successful
review - the exact failure the criterion names - so this is pinned: `range-repro.ts` runs a review that
advances the ref, then a summary that still reports `base..head`, prompts included.

### The repair record, and the record that tells this run's merges apart

**`repairs.json`, in the run's `ARTIFACTS_DIR`, written once by the opening node** from the `Repair[]`
`reconcileLeftovers` already returns. This is the precedent ticket 13 names: `attempted-ids.json` and
`pick-exclusions.json` are the same kind of thing - written by the run about the run, read by that run's
report, kept nowhere else. It is not store state (a repair's close reason is byte-identical to a
settlement's, and the store has no run clock - ticket 12's measurement; naming it in the store would mean a
new field or comment, new state for a fact that is about one run) and it is not a maintained mirror (one
writer, one reader, never updated).

**`main-commits.json`, the commits this run added to Main, written under the Main lock** by the two writers
of Main - the settlement (`settle.ts`, only when it creates the merge) and the ignore-rules step
(`execute.ts`). This is the smallest honest record that answers "which of the range's commits are not this
run's": a merge subject is the same bytes whichever run wrote it, `attempted-ids.json` says what a run
*claimed* (not what it merged), and there is no git- or store-side authorship mark. Concurrent executions
are serialised by the lock, which is what makes one file safe.

**What it costs.** (1) The naming is one run long: a run killed after repairing and before its report
leaves that repair in its own `repairs.json` and its stderr, but the next run's report cannot know it was a
repair - the merge is named, as a commit that run did not make, not as a close. (2) A `main-commits.json`
write that fails is reported on stderr and never thrown (a landed merge must not become a failed attempt);
the report then names the merge as not this run's, which is wrong-in-the-safe-direction. (3) An artifacts
dir with no record names every range commit as not its own, never the reverse. None of these invents a
record; the alternative - a store field - was rejected.

### The report's new sections

The summary node appends, above the failures block (which stays last, so ticket 12's reading is unchanged):
`## Range` (the base, the head, and how many of Main's first-parent commits were this run's) - always, when
the node writes a merged-report body; `## Commits this run did not make` (one line each, short SHA and
subject) - only when there is one; `## Repairs at open` (closed / reopened / left-alone, with the reason)
- only when there was one. The "did not make" partition is Main's **first-parent** line: the branch commits
that arrived inside a merge this run made are this run's work, not foreign ones. A skipped review keeps its
plain skip line and gains no range section; the skip line already names the range it did not cover.

### The lab: four scenarios under `/tmp/beads-lab-13`

A real Target per scenario (real git, a real `bd` v1.2.2 store), driven by the pack's real node scripts; the
agent turns ran under a small fake Pi SDK, the channel the suite's protocol-level cases drive, so the
artifacts are deterministic and the criteria - all node-written - are what is read. Every claim below is a
quoted artifact. The lab and its transcript are removed afterwards.

**1. a real SIGKILL between the merge and the record** (ticket 11's staging: a `store:` wrapper that
`kill -9 $PPID`s the node at the `close` call, after `mergeIntoMain`). Run 1 opened (position
`33addb42...`), the drain claimed, and the execute node was killed mid-settlement:

```
run 1 execute             status=null signal=SIGKILL
$ git -C .../work/kill log --merges --format=%h %s
23b9b3e beads-dag: merge beads/lab/01-merged-then-killed
$ bd show lab-e8g --json   (before the repair)
"status":"in_progress", ... "close_reason": absent, "comment_count":0
$ git -C .../work/kill rev-parse refs/beads-dag/reviewed   (after the kill)
33addb42288c9e8aa6c1fdb2ee324847e9b9e3d6
```

Run 2 (fresh artifacts) opened on the position, so the merge is inside its range, and repaired the close;
its stderr and summary, verbatim:

```
run 2 open stderr         lab/01: repaired: 23b9b3eea108e4aaf97021ac81483c033635f90b had already landed, so the issue is closed
run 2's review-base       33addb42288c9e8aa6c1fdb2ee324847e9b9e3d6   (run 1's position, so the merge is inside)
$ cat run-2/summary.md
the session's answer

## Range

`33addb42288c9e8aa6c1fdb2ee324847e9b9e3d6..23b9b3eea108e4aaf97021ac81483c033635f90b` — 2 commits on Main, 0 made by this run, 2 not made by this run

## Commits this run did not make

- 23b9b3eea108 beads-dag: merge beads/lab/01-merged-then-killed
- 134c99644eba chore(beads-dag): ignore runtime paths

## Repairs at open

- lab/01 [lab-e8g] — closed: merge 23b9b3eea108 had already landed

## Failed attempts

none this run

$ bd show lab-e8g --json   (status after the repair)
closed
```

**2. a review whose node fails, and the next run reporting the same range.** Run 1 opened on
`cd9d109b...`, a commit landed after it, and the review ran with `model: nope/nope` (every axis' runner
unavailable). Both runs of `review.md`/`review-base` and run 2's summary, verbatim:

```
$ cat run-1/review.md
review error: all 3 review axes failed: the pi runner could not start: unknown model nope/nope

$ git rev-parse refs/beads-dag/reviewed   (after the failed review)
cd9d109b0fe1012ceddd084faaf4b1731d794659

run 2's review-base       cd9d109b0fe1012ceddd084faaf4b1731d794659   (the same commit: the range was left where it was)
run 1 review-base == run 2 review-base: true
$ cat run-2/summary.md
the session's answer

## Range

`cd9d109b0fe1012ceddd084faaf4b1731d794659..d4c272050ed8bd3d91b9bc6169a128e6b08f4fcc` — 1 commit on Main, 0 made by this run, 1 not made by this run

## Commits this run did not make

- d4c272050ed8 the operator's delivered work

## Failed attempts

none this run
```

**3. a range of an earlier run's merges plus the operator's own commit.** Run 1 opened on `9b536683...`,
its executor made a real merge, its review failed (a runner that answers nothing: `review error: all 3
review axes failed: the reviewer produced no answer`), so the position stayed at the run's open; the
operator then committed. Run 2 merged nothing and reported, verbatim:

```
run 2's review-base       9b536683d9f596731a6ff56249ae345207c43a49   (still the start of the unreviewed range)
run 2 made no Main commits: (no main-commits.json)
$ cat run-2/summary.md
the session's answer

## Range

`9b536683d9f596731a6ff56249ae345207c43a49..5ccdc619847a42963ee37e04f0b46addd2902cba` — 3 commits on Main, 0 made by this run, 3 not made by this run

## Commits this run did not make

- 5ccdc619847a the operator's own commit
- 61acd9b99c94 beads-dag: merge beads/lab/03-the-earlier-issue
- 51d2660fd649 chore(beads-dag): ignore runtime paths

## Failed attempts

none this run
```

**4. a Target with no position: one run behaves as before, then starts recording.**

```
$ git rev-parse refs/beads-dag/reviewed before any run: exit 128 (absence is not an error)
run 1's review-base       5b2094389bc1e7e4a279c5702855141549639a3c  == Main's tip at open: true
position after run 1's open: 5b2094389bc1e7e4a279c5702855141549639a3c
position after the review: 33a1d94101f3386a9c235bbd58487b053c7e6db1  == the range's end: true
$ cat run-1/summary.md
the session's answer

## Range

`5b2094389bc1e7e4a279c5702855141549639a3c..33a1d94101f3386a9c235bbd58487b053c7e6db1` — 2 commits on Main, 2 made by this run, 0 not made by this run

## Failed attempts

none this run

run 2's review-base       33a1d94101f3386a9c235bbd58487b053c7e6db1  == run 1's reviewed head: true
run 2 review: nothing
```

### Gates, verbatim

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)

$ PATH=/data3/yky/.local/bin:$PATH timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   failures-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   range-repro.ts  {"ok":true}
ok   reconcile-repro.ts  {"ok":true}
ok   report-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   runner-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
20/20 repros passed
```

`range-repro.ts` is new (the readback seam, the forward-only guard, a fresh Target recording and advancing,
a failed review and a silent review leaving the position, one failed axis not losing the range, both
readers over one advanced range, foreign commits and a closed repair named, a reopened repair named).

### The install

`~/.archon/workflows/beads-dag` was replaced from this repository and compared (`diff -rq`, clean: 56 files
byte-identical). `/data3/yky/endo_label` and `/data3/yky/workflow` were not touched; the lab was under
`/tmp/beads-lab-13` and is removed.

### What this implementation settled (for the design record)

- The position is `refs/beads-dag/reviewed`, Target-local. `open` records Main's tip when it is absent (a
  must-not-exist write); `review` advances it only when its artifact holds findings, and never backwards.
- Both readers cover one base, taken from the run's `review-base` artifact; the ref is read only by `open`.
- A review where every axis failed or answered nothing is the whole-artifact `review error:` line; a mixed
  review is findings and the position advances.
- The run keeps two run-scoped artifacts: `main-commits.json` (Main commits it made, written under the Main
  lock) and `repairs.json` (what its open repaired).
- summary.md gains `## Range`, `## Commits this run did not make` and `## Repairs at open`, above the
  failures block; the failures block's shape is unchanged.
- Ticket `14`'s "nothing but our own bookkeeping" skip is **not** implemented; a range holding only the
  pack's ignore-rules commit is still reviewed, and the commit is named as not this run's.

### What this ticket did not settle

- **The review advances, not the summary.** A run that wrote findings and died before its summary has
  reviewed that range: the position advanced, the findings are in its `review.md`, and the next run will not
  re-cover it. This follows the criterion's wording ("after a review writes findings"); if the record should
  mean "reported" rather than "reviewed", the advance belongs after the summary instead.
- **The ref's history is not otherwise safeguarded.** A rewritten Main can leave the position pointing at a
  commit no longer on the branch: the range still reads (`base..HEAD`), and an operator can move or delete
  the ref; the pack never rewrites it backwards on its own.
- **The record-to-report path is one run long.** A killed repair run's `repairs.json` is not consulted by the
  next run; only its merges remain visible (as commits this run did not make).
- **Concurrency beyond the lock is untested.** Two drains on one Target are not a supported shape; the
  must-not-exist record and the forward-only advance are the guards if one is ever run.
