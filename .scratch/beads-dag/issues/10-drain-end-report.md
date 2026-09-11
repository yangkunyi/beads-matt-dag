# 10 — Drain-end review and summary report the merged range

**What to build:** After the loop, review and summary read the range the drain actually merged — its base
recorded when the drain opened, before any merge — and report on it. A drain that merged nothing is a
clean no-op that still reports.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

## Comments

Built. The opening node now records the run's review base, and the two readers port the predecessor's
drain-end semantics over the range that base defines. `open` gains its fourth step -
`writeReviewBase(target, artifactsDir)`, after `reconcileLeftovers` - and requires `ARTIFACTS_DIR`
(`artifacts: true`) because that is where the base is recorded. The repair runs just before it and does
not move Main (it closes an issue whose merge already landed, or reopens one that never merged), so the
base is the commit the run opened on either way; both the code comment and the repro say so.

New modules `report-artifacts.ts` (the three artifact names, `readReviewBase`/`writeReviewBase`, and the
skip protocol that crosses the review -> summary boundary) and `report-node.ts` (the skeleton both
readers ride: base -> the node's own range probe -> Main and the range's commit menu -> the node's agents
-> the artifact -> the reader's token). `review.ts` and `summary.ts` now state only their differences:
review probes `git diff --stat <base>...<main>`, skips an empty range, and runs one `review` turn per
axis (`## <n>. <headline>` sections joined into review.md); summary reads review.md through the one skip
reader and runs one `summary` turn over the range and the review. The prompts are the predecessor's,
verbatim but for the vocabulary below. `roles.ts` gains `review` and `summary`: session keys
`drain-review-<n>` and `drain-summary`, the axes' personas/tasks, and `REVIEW_WALL_MS` (30 min), the
clock the predecessor gave its readers. `prompt.ts` gains the three axes and the four builders;
`node-outcomes.ts` gains `REPORTED`. The README documents the drain-end report.

`tests/report-repro.ts` is new (5 targets): it drives `open`/`execute`/`review`/`summary` through the
node protocol with the fake Pi SDK, and drives the readers' exported entry with recording stub agents
where the turn's own options are the assertion. `target.ts`'s fake Pi gains a `commit-cwd` mode (a second
issue in one repository needs its own content to land - `commit`'s fixed HELLO.md is already in Main after
the first merge) and the fixture's self-check now passes `ARTIFACTS_DIR` (open requires it).

**Gate 1, verbatim** (store's directory first on PATH, `BEADS_BIN` unset):

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)

$ PATH=/data3/yky/.local/node-v24.19.0-linux-x64/bin:$PATH env -u BEADS_BIN \
    timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
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
18/18 repros passed

real	6m36.931s
```

**Gate 2** (the store's directory off PATH; the fixture resolves `bd` through `npm prefix -g`): the
identical 18/18 list, `18/18 repros passed`, exit 0, 6m37.5s.

**Evidence per criterion** (all at the node seam; `report-repro.ts` stages Targets with the fixture's own
store and git commands and asserts the store's answers, git, and the run's artifacts)

1. *The base is recorded at the start, before any merge.* One target: `open` writes `review-base` with
   the SHA of Main at open time (`readReviewBase` returns it; `git rev-parse main` equals it). A second
   target stages a kill between merge and record (the branch merged into Main under the pack's subject,
   the issue still `in_progress`): `open` repairs through `reconcileLeftovers`, Main does not move, and
   the recorded base is exactly the commit the run opened on. A third target stages two runs over one
   repository: run 1's base is pre-merge, run 2's base is a descendant of run 1's merge (the lab-setup
   commit for run 2's brief is between them), and run 3's base is run 2's last merge.
2. *Exactly this run's merges.* In the two-run target, run 1's range `base1..head1` holds exactly one
   merge - `beads-dag: merge beads/feat/02-the-first-issue`, the subject `naming.ts` derives from the
   issue's handle - beside the pack's own non-merge setup commit (`chore(beads-dag): ignore runtime
   paths`), which is therefore inside the range and never mistaken for delivered work. Every reviewer
   turn in run 1 is handed that range's exact commit menu (`git log base1..head1 --oneline`), and each
   prompt is asserted equal to the whole worked brief. Run 2 (a repository where run 1 already merged)
   is handed its own range and menu, names its own merge, and never names run 1's. A fourth run's range
   is a merge the pack did not make (staged directly with git after the base): the readers report it,
   because the range is what the base and Main say it is. Run 1's review.md/summary.md are byte-identical
   after run 2.
3. *A run that merged nothing says so.* Run 3 opens, merges nothing: `reviewDrain` returns the `nothing`
   token, spends no reviewer, and writes `skip: empty diff <base>...main, skipped`; `summarizeDrain`
   returns `nothing`, spends no summariser, and writes `skip: review.md: <that line>`. The CLI cases
   agree: run 4 (a non-empty range, fake SDK) prints `reported`, run 3's scripts print `nothing`, and a
   missing `review-base` reads as `skip: no review-base` with no agent spent.
4. *The readers' read-only contract, made observable.* A reader turn's environment carries the store's
   read-only mode (`opts.env(process.env)[BD_READONLY] === "1"`), and the repro takes that very
   environment and runs a real `bd update <id> -s open`: the store refuses it (`read-only mode` on
   stderr, non-zero), the issue does not move, and the readers leave Main exactly where the merge put it.
   The readers themselves never touch the store: `report-artifacts.ts`/`report-node.ts` import no store
   module, and `store-module-repro.ts` scans the pack for that.

**Mutation proofs** (a fresh copy of the whole pack under `/tmp/report-mut/<name>/beads-dag` per case,
one edit each, then `bun <copy>/beads-dag-drain/tests/report-repro.ts` run against it)

| Mutation | The repro's failure |
| --- | --- |
| the pack as committed | (passes: 5 targets, 26 s) |
| `open` never writes the base | *the base is Main's tip at open time: got {"skip":"skip: no review-base\n"}* |
| the base is Main's parent (`~1`) | *the base is Main's tip at open time: got <parent>, want <tip>* |
| the reader's log is the repository's whole history | *reviewer 1 is handed the run's range, exactly: got …whole history…* |
| the empty-range skip dropped from review | *a run that merged nothing reports nothing: got "reported\n"* |
| the readers' read-only env dropped | *a reader's environment carries the store's read-only mode: got undefined* |
| summary summarises a skipped review | *its summary reports nothing too: got "reported\n"* |
| axis headings off by one | *review.md heads axis 1: "2. Bugs and incorrect assumptions in the diff…"* |
| the review session key flattened | *reviewer 1 has its own session: got "drain-review"* |
| the readers' clock shortened to 60 s | *reviewer 1's wall clock is the readers': got 60000, want 1800000* |
| the reported token is `nothing` | *run 1's review reports: got "nothing\n", want "reported\n"* |
| summary ignores its answer | *summary.md is the summariser's answer: got "(no summary text)\n"* |
| review joins only one section | *review.md has one section per axis: got 1, want 3* |

The wall-clock assertion reads a literal (30 min), not the pack's own `REVIEW_WALL_MS`: importing the
constant made the first version of the proof pass under a mutation. The run-1 "exactly" assertion was
also strengthened to whole-brief equality after the whole-history mutation slipped past an
`includes(menu)`: whole history *contains* the range menu as a prefix.

**Acceptance under the runner.** Installed by copy (`rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`, `diff -r` identical). Fresh `/tmp/beads-lab-10`:
`git init -b main`, seed commit, `bd init --prefix lab …`, one gate-labelled issue `lab/01` (`lab-nh3`,
"add HELLO.md with one line") whose body and config are committed; `bd` on the child's PATH; config
absent (defaults: `runner: pi`).

- Run `b0fc61c7b52c5227b0f5c27483722042`, **completed** (`open` 1.4 s, `review` 1 m 26 s, `summary`
  24.3 s, final token `reported`). `review-base` = `bd8ca97891f229f540de6f24435139d6d1c0b015` = Main's
  tip before the run. Main afterwards: `fb2e077 beads-dag: merge beads/lab/01-add-hello` /
  `6eb3c54 add HELLO.md` / `5ea48fd chore(beads-dag): ignore runtime paths` / `bd8ca97 lab setup` …; the
  only merge is `fb2e077`. Each of the three reviewer sessions records the brief
  `Review the range bd8ca97…HEAD (HEAD = fb2e077…)` with the range's menu `fb2e077 / 6eb3c54 /
  5ea48fd`; the summary session records
  `Git range bd8ca978…HEAD (HEAD = fb2e077…)` plus the reviews. review.md holds the three axis
  sections; summary.md names the range and the one merge (`# Merged review report — bd8ca97...fb2e077`).
  Store: `lab/01` closed, `close_reason merged beads/lab/01-add-hello`; `git status --porcelain` empty.
- Run `cbf28b45d8a3e1b0270af5d206e97b49` (the same lab, nothing left), **completed** (`review` 128 ms,
  `summary` 121 ms, final token `nothing`). `review-base` = `fb2e077…` = run 1's merge; `review.md` =
  `skip: empty diff fb2e077…...main, skipped`; `summary.md` = `skip: review.md: skip: empty diff …`; zero
  session files; Main unmoved.
- Run 1's artifacts after run 2: `md5sum` identical to before it (`review-base`
  `0bb4ec8f7b423be1bdd38ae9a0b21837`, `review.md` `4274d9bd21a180d3d196bd4f76d1e71c`, `summary.md`
  `720c1149c223b4b00e97b3909897d9fb`), and run 2's base is run 1's last merge - its report cannot reach
  run 1's work.

**Deviations, each deliberate**

- **The no-op token stays `nothing`; a produced report prints a new `reported` token.** The reader used
to print `nothing` unconditionally; the run that reported was not distinguishable at the protocol level
from one that had nothing to report. One token, in the same vocabulary (`node-outcomes.ts`), makes the
two observable; the drain YAML does not read either.
- **The axes' wording follows the repo's vocabulary.** `prompt.ts` ports the predecessor's axes verbatim
but for "tickets interacting" -> "issues interacting" and "ticket acceptance criteria" -> "issue
acceptance criteria". The three axes, the personas and the tasks are otherwise unchanged - this build
changes what the report reads, not what it says.
- **`open` now requires `ARTIFACTS_DIR`** (`runNode({ artifacts: true })`): the base has to land in the
run's artifacts, and a run that cannot record it would let a reader report a range nobody recorded. The
fixture's self-check was updated to pass one.
- **The YAML timeouts are unchanged, with comments.** The ported reader clock is 30 min
(`REVIEW_WALL_MS`), so the existing 2 000 000 ms already outlasts it by 10 minutes - the same relation
`yaml-contract-repro.ts` checks (`2000000 > 1800000`). The comments in `beads-dag-drain.yaml` name the
constant, so the next change to either side is visible.
- **`runReportNode` creates `ARTIFACTS_DIR`** rather than review alone (the predecessor's `reviewDrain`
did it): both readers are safe against a fresh directory, and the special case lived in the node that
was not the one writing first. `review-repro`-style behaviour (a fresh dir gets the base skip) is pinned
in `report-repro.ts`.
- **`reportNodeCli` takes the reader's own function.** `reviewDrain`/`summarizeDrain` are exported and
return the node's token; the CLI is `runNode({ artifacts: true, run })`. A test can therefore drive the
node's whole behaviour with a stub runner, and the protocol case with a script.

**Surfaces ticket 11 builds on** (what it will find in a run's artifacts)

- **Where the base and the two reports live:** the run's `ARTIFACTS_DIR` (under Archon,
`…/artifacts/runs/<run-id>/`) holds `review-base` (one SHA, Main's tip at open), `review.md` (three
axis sections, or one `skip:` line), and `summary.md` (the merged report, or one `skip:` line). Session
files land at `sessions/drain-review-<n>/review.jsonl` and `sessions/drain-summary/summary.jsonl`, and
their recorded briefs carry the same range and commit menu the readers were handed.
- **What a no-op run leaves:** `review-base` (== the current Main tip), `review.md` =
`skip: empty diff <base>...main, skipped`, `summary.md` = `skip: review.md: <that line>`, no session
directories, both nodes exit 0 and print `nothing`, and nothing on Main or in the store moves.
- **What "the report covers the merges" means for a walker:** `git log --merges <review-base>..main
--format=%s` is exactly the run's delivered work (run 1: one subject), and the non-merge commits in
between are the pack's own setup commit and the issue's implementation commit - neither is a merge, so
neither is delivered work.

**Review, both axes** (no sub-agents available in this session, so both axes were run inline over the
diff since `fb03ae5`). *Standards:* no hard violations - every new module carries its doc comment;
`store.ts` is still the only place a store command is built (`store-module-repro` green); no new
dependency; the role table is still the single declaration of persona/prompt/clock and the nodes name
only a role and its arguments; the two readers share the one skeleton rather than copying six steps.
Judgement calls kept: `{base, head, log}` travels together in both readers' role args (a shared `type`
would put a node concern into the role table for three fields); `ReportOutcome` is an exported union with
one consumer today; the axis-3 wording change is the repo's vocabulary. One finding fixed during review:
the fake SDK's new `commit-cwd` block shadowed the outer `file` variable, renamed to `cwdFile`. *Spec:*
all four criteria are implemented and pinned; the scope boundary holds - the report's content is the
predecessor's, no failure counts or per-issue history were added, and the only source change is the range
the readers read (`base..Main`, recorded once at open).

**Residual risks, flagged rather than hidden**

- **A reader reports the range as it stands when it runs.** Between the loop's last merge and the review
node Main does not move in this flow, but an out-of-band commit or merge landing in that window would
be inside the range and reviewed (pinned deliberately in the fourth target). That is the honest
reading of `base..Main`; what it cannot be is another *run's* work, because another run's base is
recorded in another run's artifacts.
- **A run killed before `review` never writes a report**; its artifacts hold `review-base` and the pick
report only. The next run's base is past whatever that run merged, so its readers do not report the
killed run's work - by design (this ticket changes where the readers read, not what a killed run
leaves).
- **`git diff --stat base...main` is the empty-range probe.** A merge whose tree equals Main's (an empty
merge) would read as an empty range and be skipped; the predecessor's review had the same probe, and the
failure mode is a skipped review of a change that changed nothing.
- **A store whose HEAD is not Main** (a Target checked out on another branch) resolves the range's end
through `mainBranch(target)`, which is that branch; the flow's model is that the Target's checkout is
Main, and the repro pins the normal case.

- [x] the review base is recorded at the start of the run, before any merge
- [x] review and summary cover exactly the merges this run landed, and nothing another run landed
- [x] a run that merged nothing completes cleanly and says so
- [x] the drain-end readers keep their read-only contract
