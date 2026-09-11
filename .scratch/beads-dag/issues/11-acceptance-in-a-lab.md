# 11 — Acceptance: a real run in a lab

**What to build:** A real run of the drain against a throwaway lab Target, with a real runner, completes
and satisfies the four properties the design rests on — not only under the node-level tests but through
the whole workflow. The lab is created under the temporary directory and torn down afterwards, and no
other Target is touched.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `06`, `07`, `08`, `09`, `10`
**Status:** BLOCKED

- [x] a real run over a lab holding eligible, blocked, decision, unlabelled and previously-failed
      issues starts exactly the eligible ones
- [x] decision issues and issues without the gate label never start; a failure is retried by the next
      run and never by the one that failed it; closure never crosses domains; and a kill between the
      merge and the record is repaired by the next open — all four observed in the real run
- [x] running again against the same lab does the right thing the second time: nothing eligible, and a
      clean no-op report
- [x] the lab lives under the temporary directory and is removed; no other Target is written to, and the
      drain that is currently live elsewhere is left alone

## Comments

Accepted at `f2865ae` — the repository head when the runs were made. The pack it contains is
byte-identical to `2178c2b`'s (the commit between the two is docs-only, §12's interactions-log ruling),
and the installed copy at `~/.archon/workflows/beads-dag` matched the repository before and after the
acceptance (`diff -rq`, clean). Four throwaway labs under `/tmp`, all removed; seven usable detached
runs across them (three labs run twice; one run failed on purpose at the cross-domain preflight, one
killed mid-settlement), with `bd` v1.2.2 on the child's PATH and a real Pi session behind every agent
turn. All four criteria below are verified. The runs' artifacts live under
`~/.archon/workspaces/_local/beads-lab-1{1,2,3,4}/artifacts/runs/<run-id>/`, which is the `ARTIFACTS_DIR`
named in each piece of evidence.

**Gates, verbatim** (both with no `BEADS_BIN`, the store's directory first on PATH):

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

real	6m38.140s
```

**1. The run starts exactly the eligible ones** — lab `/tmp/beads-lab-11`, run
`eda997adc51c49baa1443c2363f946ae`, **completed**. Six published issues: `lab/01` eligible
(`lab-khw`), `lab/05` previously-failed (`lab-860`, one seeded `attempt 1 failed: …` comment and back
to `open`), `lab/02` blocked by `lab/03` (`lab-rcq`), `lab/03` gate pulled and moved to `needs-info`
(`lab-9qg`), `lab/04` a ready decision issue (`lab-zub`), `lab/06` blocked by `lab/01` (`lab-qzl`).
The store before the run: `bd ready --limit 0` = `lab-zub lab-860 lab-9qg lab-khw`; `bd blocked` =
`lab-qzl lab-rcq`.

The loop, from the run's log (`~/.archon/workspaces/_local/beads-lab-11/logs/eda997…jsonl`): `pick` →
`["lab/05","lab/01"]` → two `execute`s → `merged` each → `pick` → `["lab/06"]` → `merged` → `pick` →
`[]` → `review` `reported` → `summary` `reported`. So the previously-failed issue starts exactly like
fresh work, the fresh issue starts, and the dependent starts only after its blocker's real closure
released it; the blocked, the braked and the decision issues never appear in a pick.

After: `bd list --all` — `lab-khw`/`lab-860`/`lab-qzl` `closed` with `close_reason merged
beads/lab/0N-…`, `lab-rcq` `open` and blocked, `lab-9qg` `open` (`needs-info`), `lab-zub` `open`;
`bd ready` = `lab-zub lab-9qg`; `bd blocked` = `lab-rcq`. `git log --merges` = `eda00f6 …
beads/lab/06-after-hello`, `b86e92e … beads/lab/05-add-goodbye`, `b34fd4f Merge branch 'main' into
beads/lab/05-add-goodbye`, `647ce95 … beads/lab/01-add-hello`; `git worktree list` = the Target only;
`git status --porcelain` empty. Artifacts: `attempted-ids.json` = `["lab-860","lab-khw","lab-qzl"]`;
`pick-exclusions.json` = the two excluded ready issues under their rules; session files for the three
implementers, the three review axes and the summary; `review.md` (three axis sections) and
`summary.md`.

**2a. Decision issues and gate-less issues never start.** The same run: the first cycle's candidates
were `lab/05` and `lab/01` only, and at the end `lab/03` and `lab/04` are still `open`, zero comments,
`close_reason=None`, absent from `attempted-ids.json` — never claimed. The final `pick-exclusions.json`
still names them: `{"id":"lab-zub","handle":"lab/04","rule":"decision-type"}`,
`{"id":"lab-9qg","handle":"lab/03","rule":"missing-gate-label"}`. The adversarial version of this
property is 2c's lab.

**2b. A failure is retried by the next run, never by the one that failed it** — lab
`/tmp/beads-lab-12`, one issue `lab/10` (`lab-0jw`) whose published brief guarantees it commits
nothing. Both failures below are produced by the pack, not staged.

Run 1 `9edd5ce26c37a6d21120896762c0c336`, **completed**: `pick` → `["lab/10"]` → `execute` exit 0
`failed`, stderr `lab/10: nothing to merge: beads/lab/10-no-op-brief carries no commit main does not
have` → then the same run's `pick` → `[]`. Store: one comment `attempt 1 failed: nothing to merge: …`,
`status=open`, `close_reason=None`; `attempted-ids.json` = `["lab-0jw"]`; `pick-exclusions.json` =
`{"picked":[],"excluded":[{"id":"lab-0jw","handle":"lab/10","rule":"attempted-by-this-run"}]}`.
Main carries no merge (only the pack's own ignore commit); the worktree and branch stay for the report.

Run 2 `a3c88dbc157f4e5c04a9a7c90ccb0eb0`, **completed**, fresh artifacts: `pick` → `["lab/10"]` →
`execute` `failed` again → comment `attempt 2 failed: nothing to merge: …` → `pick` `[]`.
`bd comments` holds both reasons and `bd history lab-0jw` both claim cycles (`open → in_progress →
open`, twice). The next run retried it; the run that failed it did not.

**2c. Closure never crosses domains** — lab `/tmp/beads-lab-13`: `lab/20` (`lab-ouz`, task, gated)
depends on `lab/21` (`lab-c7o`, decision), which the wayfinder had closed `answered`, so the store had
already released its dependent (`bd ready` offered `lab/20`). Run `09205497543321ec53a7bc46d7eb7562`
**failed**: `open` exit 1, no token, stderr

```
closure would cross domains: lab/20 [lab-ouz] is blocked by the decision issue lab/21 [lab-c7o]; an
implementation issue may only be blocked by another implementation issue (ADR-0004), because a
decision's closure means its question is answered, not that work is in Main. Remove the edge with the
store's dependency command (`dep remove <dependent> <blocker>`) or restructure the dependency; nothing
was claimed.
```

and the run log's `workflow_error` — `DAG workflow 'beads-dag-drain' failed: node open failed. 3
downstream nodes were skipped.` The store and git are identical before and after (`lab/20` still
`open`, 0 comments; `lab/21` still `closed`), and the run's artifacts hold no `pick-exclusions.json`
and no `attempted-ids.json` — pick never ran, so nothing was claimed or repaired. In lab A the ready
decision issue was never claimed either, so no path runs from a decision's closure to implementation
work.

**2d. A kill between the merge and the record is repaired by the next open** — lab
`/tmp/beads-lab-14`. Produced, not staged: run 1's Target config points `store:` at a wrapper that
execs the real `bd` for every command except `close`, where it SIGKILLs the drain node — the call the
settlement makes after `mergeIntoMain` has returned.

Run 1 `a03cb8d212f482c3929eb34406f4aec8`: `execute` exit `SIGKILL`, run failed (`composed fan_out node
'execute' (join: all_success): instance e454e48f04f2bdb6 failed: Script node
'execute__e454e48f04f2bdb6__execute' failed: no diagnostic output`). The state it left: store
`lab-39q` `in_progress`, `close_reason=None`, 0 comments; Main =
`d88c326624cd3f9842fb2f45502957dec5917d61 beads-dag: merge beads/lab/40-add-hello`; worktree
`worktrees/lab-40-add-hello` still present. `open` had already written `review-base = bceda1e…` and
`attempted-ids.json` = `["lab-39q"]`.

Run 2 `2be20b45fb170fde5b345ef4d7d70c81`, **completed**, with the ordinary store again: `open` exit 0,
stderr `lab/40: repaired: d88c326624cd3f9842fb2f45502957dec5917d61 had already landed, so the issue is
closed`; then `pick` `[]`, `review` `nothing`, `summary` `nothing`. After: `lab-39q` `closed` with
`close_reason merged beads/lab/40-add-hello`; `git log --merges` is still exactly the one merge
`d88c326` — found, not made again; worktree and branch gone; `git status --porcelain` empty;
`bd history lab-39q` = `open → in_progress → closed`. (Main's tip at run 2 was `f405e64`, my lab-side
config commit between the runs, not the repair — the repair moves nothing.)

**3. The second run over the same lab is the clean no-op** — lab A, run
`4284d2e7c0e4f0c7a988e4e24ef6878d`, **completed**: `open` `opened`, `pick` `[]` on the first cycle,
`review` `nothing`, `summary` `nothing`, zero session files. Artifacts: `review-base` = `eda00f6…`
(run 1's last merge); `review.md` = `skip: empty diff eda00f6…...main, skipped`; `summary.md` = `skip:
review.md: …`; `pick-exclusions.json` again names `lab/04` `decision-type` and `lab/03`
`missing-gate-label`. The store and git dumps are identical to after run 1: the two ready-looking
issues stayed where they were, and run 2's report cannot reach run 1's merges.

**4. Temporary labs, nothing else touched.** All four labs were created under `/tmp`
(`beads-lab-11`…`-14`) and are removed; the helper material lived in `/tmp/beads-accept` and is
removed with them. (`/tmp` still holds earlier tickets' `beads-lab-06`…`-10`; this acceptance did not
create them and did not touch them.) The only archon workspaces the acceptance created are
`~/.archon/workspaces/_local/beads-lab-1{1,2,3,4}` (the runner's own record of the runs);
`~/.archon/workflows/beads-dag` is the installed copy, and `/data3/yky/workflow` was not touched.
`/data3/yky/endo_label` at 04:13 and again at 04:42: identical `HEAD 337d509…`, empty
`git status --short`, identical `git worktree list`, identical newest-file mtimes (last write
2026-09-11 20:52), identical workspace artifact listing and run-log tail (`dfa7e54…`
`workflow_complete` at 2026-09-11T13:10:56Z — its drain had already finished), so the live drain was
left alone across the whole window.

**What could not be produced, and what is weaker than it looks.** All four properties were observed in
real runs, and the failure and the kill were produced rather than staged — but one lever is test-side
and should be read as such: lab D's kill trigger (a `store:` wrapper that kills the node at the `close`
call). The interleaving is real — the drain really merged and really died before the record — but
*when* to kill is the wrapper's decision, not the flow's. If that counts as staging, then 2d is a
staged kill with a produced state, and it is the weakest of the four. 2b's failure is produced in run 1
and again in run 2; the previously-failed issue of criterion 1 was seeded with the store's own record
(`bd comment` + `bd update -s open`), the way the fixture stages one. No conflict path was exercised
(ticket 08's own lab covers it); none of the four properties needs it.

**Observed, not covered by a criterion, and worth an operator's attention.**

- §10.3's requirement that *"the drain-end report must say which attempts failed and how many times
  each issue has burned"* is not implemented (the build spec puts report content out of scope). Lab
  B's second run printed `nothing` while the issue had burned two worker slots; the count is only in
  `bd comments` and `bd history`.
- A killed run's merge is closed by the next open but never lands in any run's review range: lab D
  run 1 died before `review`, and run 2's own range was already past the merge (`review.md` `skip:
  empty diff`). Ticket 10's residual risk said the same; this is the operator-facing consequence.
- A run with no issue merge can still spend a full report on the pack's own housekeeping commit
  (`chore(beads-dag): ignore runtime paths`): lab B run 1's three reviewers and its summariser read
  it (ticket 10's fourth target pins this as intended).
- A live reader turn can take many minutes on a trivial range (lab B run 1's summary spent ~10 minutes
  of wall clock); the 30-minute `REVIEW_WALL_MS` is the only bound.
- `archon workflow wait` prints `Run … failed.` and exits 0 — the CLI's exit status is not the run's.
- A run that claims nothing leaves no `attempted-ids.json` (lab A run 2, lab D run 2): "what this run
  tried" is an absent file, not `[]`.
- `pick-exclusions.json` is rewritten every cycle, so after a run it explains the final `[]` cycle
  only; earlier cycles' reports are gone unless something kept a copy.
