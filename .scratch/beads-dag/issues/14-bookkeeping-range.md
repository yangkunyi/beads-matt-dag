# 14 — a range the pack wrote itself is not a review

**What to build:** The readers skip a range holding nothing but the pack's own bookkeeping, naming the
reason, instead of spending a session on it. In step 1's acceptance a first drain on a fresh Target left a
range holding only the pack's own `.gitignore` commit, and a reviewer spent about ten minutes of wall clock
on it.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§13 step 1)
**Blocked by:** `10`
**Status:** BLOCKED

- [x] a range whose every commit is one the pack wrote writes a skip line naming why, and starts no session
- [x] a range holding an issue merge is reviewed normally, the pack's own commits included
- [x] a range holding any commit the pack did not write — an operator's own commit on Main — is reviewed, so
      the guard is "nothing but our own bookkeeping", never "no merge"
- [x] the skip is visible in both readers exactly the way the existing skips are

**Rejected alternative:** moving the pack's bookkeeping write to before the range's base. It removes today's
only observed case and nothing else — a pack update that touches the ignore line lands inside a later range
anyway — so the guard is needed regardless. Say so in the Comments if it is revisited.

---

## Comments

Built. A range whose every commit is the pack's own bookkeeping is now a skip with its own reason in both
readers, spends no session, and leaves the recorded position where the run opened it. The four criteria are
ticked against the lab transcripts below.

Changed: `main-writes.ts` (the housekeeping write's subject and the paths it touches, defined once and
shared with the guard), `report-node.ts` (the per-commit recognition), `review.ts` (the review's read
skips and names the reason), `README.md` (the drain-end report's skip paragraph), and the new repro
`bookkeeping-repro.ts`. No ticket `12`/`13` behaviour changed beyond what the guard needs. The rejected
alternative was not revisited and not done: the bookkeeping write happens exactly where it did, and the
recorded reason for rejecting the move still holds (it would remove today's observed case only, since a
pack update that touches the ignore line lands inside a later range anyway).

### The predicate: the pack's own write, positively recognised per commit

**Chosen: the subject the pack's housekeeping write uses, plus that write's own content and shape.**
`PACK_BOOKKEEPING_SUBJECTS` (`chore(beads-dag): ignore runtime paths`) is defined once, beside the write
that uses it, and shared with the guard so the message cannot drift from what is accepted;
`PACK_BOOKKEEPING_PATHS` is `.gitignore` and `.beads/interactions.jsonl`. A commit is recognised only when
**all** of these hold: the exact subject, at most one parent, and a diff whose every path is one the write
owns. Every commit of `base..head` must be recognised — all reachable commits, so a branch commit that
arrived inside a merge is in the check too — and one unrecognised commit means review.

**The measurements that decided it** (`git log --format=%H%n%s%n%an%n%ae%n%b` over the lab's range): the
housekeeping commit's subject is that constant, its body is empty, and its author/email is the
**operator's own git identity** (`the operator <operator@example.com>`) — as is the merge's and the
implementer's. Git therefore carries no authorship mark, and the ticket's three candidates weigh as:

- **a trailer** would be a new mark: no pack commit carries one today (the housekeeping commit's `%b` is
  empty), so it could not recognise any commit already on Main — including the very range step 1's
  acceptance observed. It would also change the write's commit message.
- **a record** (`main-commits.json`) is run-scoped by ticket `13`'s own decision and never kept: a later
  run cannot see an earlier run's housekeeping commit. Because this skip does not advance the position,
  the record alone would fail on the next run and the ten-minute session would come straight back.
- **the subject** is the write's existing, shared name, so it recognises history as it stands; paired with
  the content check it recognises *the write itself*, not a message anyone could copy.

**What it costs.** A future housekeeping write must register its subject and the paths it may touch, or it
is reviewed — the cheap direction. An operator commit that copies the subject but changes real content,
and an operator's own `.gitignore` edit under their own subject, are both unrecognised (both pinned in
`bookkeeping-repro.ts`). The one way a range is wrongly skipped is an operator who writes the pack's
subject *and* makes the commit touch only the pack's runtime paths; the guard's threat model is
coincidence, not an operator forging the pack's own write in a Target they already own.

### Position: a bookkeeping skip does not advance it

The position means "which Main tip a **review** has looked at" (`review-position.ts`, the README), and a
skip is not a review — so the skip leaves the ref where the run opened it, and the invariant stays one rule:
only findings advance, never backwards. Keeping it also keeps the dangerous mistake visible: if the
predicate were ever wrong, the range stays inside every later run's report, named by the same skip line,
instead of disappearing behind the ref forever. The cost is the one the ticket names: a Target whose Main
gains only bookkeeping re-probes `base..main` each run (one `git log`; one `git show` per recognised
candidate) and writes the same skip — no session, no agent, no store write, no Main write. The lab's run-1
shows the ref unmoved; the repro pins a second run over the same range skipping again with no reviewer.

### Where the skip lives

The recognition is in `report-node.ts`, the skeleton both readers ride (`rangeHoldsOnlyPackBookkeeping`),
so it has one home and a fourth report node inherits it. The decision is the **review's `read`**, beside the
empty-diff probe, because the skip goes through the skeleton's stop path — write the artifact, spend no
agent, print `nothing`, run no after-step — exactly as `empty diff` does. The **summary** inherits the skip
through the protocol (`skip: review.md: <reason>`), exactly as it inherits the empty one, and still runs its
own store read: its failures block is the node's, and short-circuiting that in the skeleton would drop a
run's failures from a report that is otherwise a skip (pinned in the repro). Both lines are written by the
same skeleton, and both name why.

### The lab: one Target under `/tmp/beads-lab-14`, four transcripts

A real Target (real git, a real `bd` v1.2.2 store) driven through the pack's own node scripts; the agent
turns ran under the suite's fake Pi SDK. "No session" is shown twice: the fake writes `FAKE_PI_RECORD` the
moment `createAgentSession` runs, so `test -e …/reader-record.json` answers it directly; and the runner's
own `sessions/` tree under the run's artifacts names its session keys.

**1. A fresh Target's first drain whose range holds only the pack's own bookkeeping.** `open` recorded the
base; `execute` of a failing issue landed the housekeeping commit and nothing else:

```
$ git log --format=%H%n%s%n%an%n%ae%n%b d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056..main
a6f95d0746457146f5fa022c15b935c8ebc9bbeb
chore(beads-dag): ignore runtime paths
the operator
operator@example.com
```

`review` and `summary` each printed `nothing` (status 0), and the artifacts:

```
$ cat run-1/review.md
skip: only the pack's own bookkeeping d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056...main, skipped
$ cat run-1/summary.md
skip: review.md: skip: only the pack's own bookkeeping d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056...main, skipped
$ test -e run-1/reader-record.json -> absent (no session was started)
$ ls run-1/sessions -> lab      # the failed attempt's implementer session; no drain-review-N, no drain-summary
$ git rev-parse refs/beads-dag/reviewed -> d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056
$ base the run opened on            -> d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056   (equal: the skip did not advance)
```

**2. The same lab after an issue merges** — the range now holds the pack's housekeeping commit and a real
pack merge; both readers report, and the position advances:

```
$ git log --format=%H%n%s%n%P d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056..main
370ad44ba1254dd49dbfbbd0312c73af878a05cd  beads-dag: merge beads/lab/02-the-merging-issue   (2 parents)
1c4a444a9ad8c3694ddad0a3bda2b009e76b8095  hello from the fake session
a6f95d0746457146f5fa022c15b935c8ebc9bbeb  chore(beads-dag): ignore runtime paths
$ cat run-2/summary.md
the session's answer

## Range

`d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056..370ad44ba1254dd49dbfbbd0312c73af878a05cd` — 2 commits on Main, 1 made by this run, 1 not made by this run

## Commits this run did not make

- a6f95d074645 chore(beads-dag): ignore runtime paths

## Failed attempts

none this run
$ ls run-2/sessions -> drain-review-1  drain-review-2  drain-review-3  drain-summary  lab
$ test -e run-2/reader-record.json -> exists (a session was started)
$ git rev-parse refs/beads-dag/reviewed -> 370ad44ba1254dd49dbfbbd0312c73af878a05cd   (= the range's end)
```

(The pack's own housekeeping commit is named as one this run did not make because it was run 1's write:
the run-scoped record of ticket `13` — exactly the case the report's range section exists for.)

**3. An operator's own commit beside pack commits** — the operator committed after run-3's open, then an
issue merged; the range is reviewed, not skipped:

```
$ git log --format=%H%n%s%n%P 370ad44ba1254dd49dbfbbd0312c73af878a05cd..main
c87e9071afa225d838b77c9302939ac401a8f883  beads-dag: merge beads/lab/03-the-third-issue   (2 parents)
2403347361c7ba4242738af423ad516021385723  hello from the fake session
cf2d33492910a77e404ffd84a0ec1cf44348f423  the operator's own commit
$ cat run-3/summary.md
the session's answer

## Range

`370ad44ba1254dd49dbfbbd0312c73af878a05cd..c87e9071afa225d838b77c9302939ac401a8f883` — 2 commits on Main, 1 made by this run, 1 not made by this run

## Commits this run did not make

- cf2d33492910 the operator's own commit

## Failed attempts

none this run
$ test -e run-3/reader-record.json -> exists (a session was started)
$ git rev-parse refs/beads-dag/reviewed -> c87e9071afa225d838b77c9302939ac401a8f883   (= the range's end)
```

**4. The existing skip, unchanged** — an empty range still says `empty diff`, in both readers:

```
$ cat run-0/review.md
skip: empty diff d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056...main, skipped
$ cat run-0/summary.md
skip: review.md: skip: empty diff d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056...main, skipped
$ test -e run-0/reader-record.json -> absent (no session was started)
```

### Gates

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)

$ timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   bookkeeping-repro.ts  {"ok":true}
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
21/21 repros passed
```

`bookkeeping-repro.ts` is new: the predicate's own facts (the write recognised alone; an operator commit
defeating the range; the subject alone with foreign content; the pack's paths alone under another subject;
a merge that carries the subject; an empty range; an unreadable base), the bookkeeping-only skip in both
readers with no agent and the position unmoved, a second run over the same range skipping again, an
operator commit beside the write reviewed, a pack merge beside the write reviewed, and the failures block
still written under the skip line.

### The install

`~/.archon/workflows/beads-dag` was replaced from this repository and compared: `diff -rq` clean, 57 files
byte-identical (56 + the new repro). `/data3/yky/endo_label` and `/data3/yky/workflow` were not touched;
the lab and its helper script under `/tmp` are removed; no branch was created or left.

### What this implementation settled (for the design record)

- A range is skipped only when **every** commit in it is positively recognised: the pack's housekeeping
  subject (defined once beside the write), at most one parent, and a diff confined to the paths that write
  owns. Anything unrecognised — an operator's commit, a branch's work, a copied subject — means review.
- The recognition lives in `report-node.ts`, the skip is decided in the review's read beside the empty-diff
  probe, and the summary inherits the reason through `review.md`; both readers write a skip line naming why.
- A bookkeeping-only skip does not advance the recorded position; the position still moves only when a
  review wrote findings.

### What this ticket did not settle

- **The mark is per-write and registered by hand.** A future pack housekeeping write is reviewed until its
  subject and the paths it may touch are added to the two lists in `main-writes.ts`; nothing derives them.
- **The skip's reason names the range, not the commits.** An operator who wants to see which commits were
  demoted reads `base..main` themselves (the range is in the line).
- **A bookkeeping range is re-probed by every run until something else lands** — the accepted cost of not
  advancing; on a Target that only ever gains bookkeeping, the skip line repeats each run.
