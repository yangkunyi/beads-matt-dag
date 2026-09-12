# 12 — the drain-end report says what failed, and how often

**What to build:** After a drain, the run's own report answers "what failed here, and how many attempts has
each issue burned", read from the store's own history rather than from a counter the pack would keep.
§10.3's Retry paragraph is the requirement; step 1's acceptance deferred it because the build was told not
to change what the report says, and this is the ticket that changes it.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.3, Retry)
**Blocked by:** `10`
**Status:** BLOCKED

- [x] the report names every issue this run attempted and left `open` with a failure, with its attempt count
- [x] the count comes from the store's own history — read it with the store's own command, never from a file
      the pack writes — and the Comments record the predicate that was read
- [x] the count is cumulative across drains: the same issue failing in two runs reports 1, then 2
- [ ] an issue repaired at open is named with its reason, and the report says whether the repair closed it
      or reopened it — **reopened done; closed left unticked**, see the Comments
- [x] an issue that never failed reports nothing: no zero-filled rows
- [x] the numbers are read by the node, not by a model: the agent's job is to place them, and what a reader
      sees is exactly what the store answered
- [x] a run with nothing to say about failures says so in one line rather than an empty section, and a run
      with no report at all keeps its existing skip line
- [x] nothing new is recorded anywhere: no attempt counter, no failure log, no store field
- [x] the pack README's Gates section records how the gates are run now (Q11): `run-all` once with the store
      binary on PATH, plus the typecheck; "the store binary is absent" stays a repro inside the suite, not a
      second mode of it, because a machine that drains has the binary on PATH

## Comments

Built. The drain-end report now ends with a block the **node** writes from the store, and the pack records
nothing new to make it true: one new reading module (`failures.ts`), one new predicate in `store.ts`
(`recordedFailures`), and the summary node appending the block to the artifact it already wrote.

### The predicate, measured before it was chosen

Both readings were taken in the lab (`/tmp/beads-lab-t12c`, `bd` v1.2.2) on `lab-8yj`, an issue whose only
failure is the opening repair's reopen — the plainest failure record there is.

**`bd history <id> --limit 0 --json` does not record the failure.** Its `--help` offers `--limit int
(0 = all)` and `--json`; one entry holds the commit and the issue's snapshot *after* it:

```
$ bd history lab-8yj --limit 0 --json
{ "CommitHash": "kpo3e6plk5fka8f43o8r1mju2kmqt548", "Committer": "root",
  "CommitDate": "2026-09-12T22:38:52.764+08:00",
  "Issue": { "id": "lab-8yj", "title": "the braked leftover", "status": "open", "priority": 2,
             "issue_type": "task", "owner": "lab@example.com", "created_at": "…", "updated_at": "…" } }
… 5 entries in all:
  22:38:46.613 status=open        sha=i56md7sg     (created)
  22:38:47.087 status=in_progress sha=o2sn85ep     (claimed)
  22:38:47.567 status=in_progress sha=c68alpcg
  22:38:52.241 status=in_progress sha=cfmhvt2r     (the repair's comment)
  22:38:52.764 status=open        sha=kpo3e6pl     (the repair's update back to open)
```

An entry carries status, title, type, priority and owner — **no comment body, no reason**. A failure (a
comment plus a return to `open`) is therefore indistinguishable there from any other comment or update:
`i56md7sg`…`kpo3e6pl` are one create, one claim and the repair's two writes, and nothing in the five
entries says *what* happened. Counting `in_progress → open` runs instead would be a heuristic about
transitions (Dolt makes several commits per command, and a killed run converges on the same shape), and no
count of transitions can produce the reason the criterion asks the report to name.

**`bd comments <id> --json` is the store's own view of exactly what the flow wrote:**

```
$ bd comments lab-8yj --json
[ { "id": "01a0960e-9117-74bc-b9a1-1eeb3c2fb1b6", "issue_id": "lab-8yj", "author": "lab",
    "text": "attempt 1 failed: leftover in progress and main carries no merge commit of beads/lab/03-braked-leftover",
    "created_at": "2026-09-12T14:38:52Z" } ]
```

**Predicate read: `bd comments <id> --json`, counting the comments matching `/^attempt (\d+) failed: /`** —
the record `recordFailedAttempt` writes (the reason as a comment, the issue back to `open`), and the only
place the reason lives. `store.ts` owns it (`recordedFailures`, returning each record's ordinal, reason and
raw text), and `recordFailedAttempt` uses the same count for the `attempt N` ordinal it writes, so the
number in the comment and the number in the report are one reading, not two. **So the honest answer is the
failure comments, not history**: history is where the commits are, the comment is where the failure is.

An issue's count is the number of those comments the store holds — cumulative across drains by
construction, and never a counter the pack keeps. Nothing was added anywhere for it: no file, no store
field, no artifact, and `comment_count` on `StoreIssue` is an existing store field being *read* (the cheap
prefilter that keeps the scan off issues that cannot carry a failure).

### Where the block lands

**`summary.md`, the human-facing artifact, and nowhere else.** The summary node reads the store, renders
the block and appends it below whatever the artifact already held — the summariser's prose, or the review's
`skip:` line. Why there and only there:

1. `review.md` is the range's findings, and its one consumer is the summariser's brief, which is `review.md`
   verbatim (report-repro pins that). Putting the numbers in it would hand them to a model to restate.
2. One writer, one artifact: there is no second copy to drift.
3. A model's failure cannot take the numbers with it. The block is appended after the turn; a turn with a
   `lastError` leaves the answer as that error, and a turn that *threw* leaves the node's own
   `summary error:` line — either way the block follows it. `failures-repro.ts` pins both.
4. The model is never handed the block, an id, or a count: the brief is the range, its commit menu and the
   review, exactly as before (`failures-repro.ts` asserts the brief carries no failed id and no number).

The rows are the store's answers, rendered by `failures.ts`: the count, the store's own `open` status, the
latest comment's text unchanged, and a scope marker from the run's own `attempted-ids.json` (the store
cannot know what a run claimed; `pick` already keeps that file for the same reason). No zero-filled rows:
an issue without a failure comment is not a row, and a closed issue is not a row.

The roster is the store's `open` issues *with a failure record*, narrowed to the ones this run touched: the
ones it attempted, and the ones an opening repair reopened. The second kind is why a repair is named even
when this run never retried it.

### The lab transcript: four drains, one lab, real sessions

`/tmp/beads-lab-t12c` (removed afterwards), `bd` v1.2.2 on the child's PATH, real Pi sessions
(`model: packy/deepseek-flash`, `thinkingLevel: off`, `concurrency: 2`). Two published issues: `lab/01`
(`lab-4p6`, a brief that commits nothing) and `lab/02` (`lab-umo`, a brief that commits `HELLO.md`).
Artifacts: `~/.archon/workspaces/_local/beads-lab-t12c/artifacts/runs/<run-id>/`.

**Run 1 `cd28f88c5fb360071102fc669fcd6842` (72 s):** `open` → `pick ["lab/01","lab/02"]` → `execute failed`
(stderr `lab/01: nothing to merge: beads/lab/01-nothing-to-commit carries no commit main does not have`) and
`execute merged` → `pick []` → `review reported` → `summary reported`. Its `summary.md` ends, verbatim:

```
## Failed attempts

- lab/01 [lab-4p6] — 1 recorded failure, open; attempted by this run; latest: attempt 1 failed: nothing to merge: beads/lab/01-nothing-to-commit carries no commit main does not have
```

`lab/02` is nowhere in it — it never failed. `attempted-ids.json` is `["lab-4p6","lab-umo"]`; the store's
own answer is one `attempt 1 failed:` comment on `lab-4p6`.

**Run 2 `de87e0238233e2a1cbcdbf0ec0812a05` (14 s):** the same lab; `pick ["lab/01"]` → `execute failed` →
`pick []` → `review nothing` → `summary reported`. `summary.md` verbatim, whole file:

```
skip: review.md: skip: empty diff cd3260a694c174808ffd24604b1ad53d9ae4800f...main, skipped

## Failed attempts

- lab/01 [lab-4p6] — 2 recorded failures, open; attempted by this run; latest: attempt 2 failed: nothing to merge: beads/lab/01-nothing-to-commit carries no commit main does not have
```

**1 → 2, read from the store** — `bd comments lab-4p6 --json` now holds `attempt 1` and `attempt 2`. The run
merged nothing at all and still says what failed: this is the run ticket 11 saw print `nothing` while it
burned a worker slot. The `skip:` line is kept, above the block, because the empty range is still true.

**Run 3 `044947530b0c27286b040cfc6341f709` (13 s):** the same issue failed a third time and the run reported
`3 recorded failures`; the lab's brief was then rewritten so `lab/01` could land.

**Run 4 `2b1b202b825b68aaf8478a13df15b7fe` (52 s):** `pick ["lab/01"]` → `merged` → `review reported` →
`summary reported`. The artifact's tail, verbatim:

```
## Failed attempts

none this run
```

One line, not an empty section, and no row for the issue that never failed.

**Run 5 `5e0f94a237f82530485a776f4cba1a90` (3 s):** nothing eligible; `review nothing`, `summary nothing`,
no session. Both artifacts are their skip lines and nothing else — verbatim:

```
$ cat review.md
skip: empty diff 3e15948442f68c0e62a6199026599304bd079bba...main, skipped

$ cat summary.md
skip: review.md: skip: empty diff 3e15948442f68c0e62a6199026599304bd079bba...main, skipped
```

### A repair, in a real run

`lab/03` (`lab-8yj`) was left `in_progress` by a "killed run" with its gate label pulled (the operator's
brake), and run 6 `c64f9d67f6e542341e531edaaa347bcc` (4 s) ran: `open` repaired it (stderr `lab/03: leftover
in progress and main carries no merge commit of beads/lab/03-braked-leftover`), `pick []` (nothing ready),
`review nothing`, `summary reported`. `summary.md` verbatim:

```
skip: review.md: skip: empty diff 3e15948442f68c0e62a6199026599304bd079bba...main, skipped

## Failed attempts

- lab/03 [lab-8yj] — 1 recorded failure, open; not attempted by this run; reopened by an opening repair: leftover in progress and main carries no merge commit of beads/lab/03-braked-leftover
```

The repair is named with its own reason and the row says it **reopened** the issue; `not attempted by this
run` is the run's own bookkeeping, and no session was spent writing it. `isRepairReopen` recognises the
comment by equality with the string the repair writes — `leftoverReason` (now one exported builder shared by
`reconcile.ts` and the report) or the naming failure `issueNames` throws — never by matching prose.
`failures-repro.ts` also covers a leftover that cannot be named in git at all: reopened with the naming
failure, named by its store id.

### The one criterion not ticked: a repair that *closed* an issue

A repair that closes a leftover writes no failure comment at all, and its close is indistinguishable from a
settlement's. Measured in the same lab: `lab/05` (`lab-01m`) staged the way ticket 11 staged its kill — the
merge already on Main, the store still `in_progress` — and run 7
`b9eb305397a70bc8716e9a4cfe3f6f62` repaired it. The store's own answers afterwards:

```
open's stderr: lab/05: repaired: ef437b8ded8303b4f14318b702d1445fc3a11326 had already landed, so the issue is closed

$ bd show lab-01m --json   → {"status": "closed", "close_reason": "merged beads/lab/05-repaired-close", "comment_count": 0}
$ bd comments lab-01m --json → []
$ bd show lab-4p6  --json   → {"status": "closed", "close_reason": "merged beads/lab/01-nothing-to-commit", "comment_count": 3}
```

The repair's close reason is exactly the settlement's (ticket 07's deliberate "the same `merged <branch>`
reason the settlement would have written"), there is no comment, and the store has no clock a run could be
attributed by — so *"this run's open closed an issue whose merge had already landed"* is not answerable from
the store by any reader, and the run's block does not name `lab/05`.

**It was not invented.** Naming it needs a record the store does not keep: a `Repair[]` file the open node
writes, a distinct close reason, or a comment on every repaired close. The ticket forbids exactly that
("nothing new is recorded anywhere"), ADR-0005 says an artifact no node consults as truth is a view and not
a source, and the criterion that already owns this is **ticket 13's** — *a repair this run performed at open
is named in the report (today it reaches stderr only)*, plus *when the range holds merges this run did not
make, it says so and names them*: with the recorded position replacing Main's tip at open, the repaired
merge lands in the next run's range and is named there as a merge that run did not make. The half that
belongs to a failure record — the reopen — is done and evidenced above.

### The README's Gates section (Q11)

```
-All three run from this repository, cheapest first.
+Both run from this repository, cheapest first, and the store binary sits on `PATH` when they do:
…
+The suite is run **once, with the store binary on PATH**: a machine that drains has `bd` there - the
+premise the pack resolves the binary by - so one `run-all` on that PATH is the whole gate, and there is
+no second mode in which it is run with the binary hidden. `BEADS_BIN` is the override for an operator who
+keeps the binary somewhere else.
…
+"There is no store binary" is a repro *inside* that one run, not an argument for a second:
+`store-open-repro.ts` runs the opening node against a PATH that cannot resolve a binary and reads the
+reason it fails with.
```

(`AGENTS.md`'s copy of the same gate list was already just "the typecheck plus the suite", so it needed no
edit.)

### Gates, verbatim

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)

$ PATH=/data3/yky/.local/bin:$PATH env -u BEADS_BIN \
    timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   failures-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
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
19/19 repros passed
```

The suite gained `failures-repro.ts` (9 targets: the row and its count, the model never handed a number, a
dying and a throwing runner, 1 → 2 across two runs, `none this run`, the untouched skip line, a failure
with nothing merged, the repair reopen and the naming-failure reopen, the repair-closed gap, and a store the
report cannot read). `report-repro.ts`'s summary assertions grew the block; `store-module-repro.ts` names
`summary` among the nodes that must import `store.ts`, and still passes the scan that no other module builds
a store command.

The installed copy at `~/.archon/workflows/beads-dag` was compared with the repository before and after
(`diff -rq`, clean); `/data3/yky/endo_label` and `/data3/yky/workflow` were not touched, and the lab was
removed.

### Criteria

| # | Criterion | Evidence |
|---|---|---|
| 1 | names every issue this run attempted and left `open` with a failure, with its count | run 1's block (`lab/01`, 1) and run 2's (`lab/01`, 2); `lab/02`, attempted and merged, is absent |
| 2 | the count comes from the store's own command; the predicate is recorded | the measurement above; `store.ts`'s `recordedFailures` over `bd comments <id> --json` |
| 3 | cumulative across drains: 1, then 2 | runs 1 and 2, verbatim; the store holds both comments |
| 4 | a repair at open is named with its reason, and the report says closed or reopened | reopened: run 6 (real repair) + `failures-repro.ts`; closed: **not done**, the section above |
| 5 | an issue that never failed reports nothing | run 1's block names only `lab/01`; run 4's block is one line, `none this run` |
| 6 | the numbers are the node's, not a model's | the block is appended by the node; the summariser's brief carries no id and no number; a dying and a throwing turn both still carry the block |
| 7 | nothing to say → one line; no report at all → the skip line kept | runs 4 and 5, verbatim |
| 8 | nothing new is recorded anywhere | no new file, no store field, no artifact; the only new module reads the store; `failures-repro.ts` asserts the artifact is the node's reading |
| 9 | the README's Gates section (Q11) | the diff above |

### What this ticket did not settle

- **A repaired *close* cannot be told from a settlement, and nothing was invented to make it tellable**
  (above). If ticket 13's range naming is not considered enough, the smallest honest alternative is one line
  the *open* node writes into its own run's artifacts naming what it repaired — deliberately not taken here.
- **A reopen's row is not attributed to this run's open.** The reason text is the same on every run and the
  store has no run clock, so the row says `reopened by an opening repair`, never `this run's`. `not attempted
  by this run` is exact (it is the run's own bookkeeping).
- **The scan is one store call per `open` issue with comments** (`bd list --all` once, then
  `bd comments <id> --json` for each). §10.3 says the store cannot answer "what failed" in one query, so the
  reader walks the candidates; on a Target of a few hundred open commented issues that is a few seconds of
  local calls at drain end, beside three reviewer sessions.
- **A row is written for an issue that failed in an earlier run and was not attempted by this run** only
  when its latest record is an opening repair's reopen (the case the ticket asks about). An earlier run's
  failure that this run simply did not reach is not named; the store still holds it, and per-issue
  `bd history` and `bd comments` answer for it.
- **`store.ts`'s failure predicate is a comment-text shape** (`attempt N failed: `). It is the shape the
  flow writes and reads back for its own ordinals, so the two cannot drift silently: if the text changes,
  `recordFailedAttempt`'s numbering and the report change together, and `failures-repro.ts` fails.
