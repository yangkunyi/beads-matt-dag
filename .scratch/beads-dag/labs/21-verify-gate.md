# 21 — the verify gate and the checkpoint: evidence

The issue's brief is `.scratch/beads-dag/issues/21-verify-gate.md`. This file is the work's own
evidence: the two pack gates, the repros that pin the new behaviour, and one real lab run (two drains
against a throwaway Target) quoted with its run ids and artifacts. It is a note, not state: nothing here
is read by the pack.

## Gates

Both run from the repository root, the store binary's directory first on `PATH`, with the drain worker's
own environment variables unset (`BD_READONLY`, `INPUTS_*`, `ARTIFACTS_DIR`) — a shell inside a running
drain carries them, and the suite's fixtures are not workers.

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)

$ PATH=/data3/yky/.local/bin:$PATH env -u BEADS_BIN -u BD_READONLY -u INPUTS_ISSUE -u INPUTS_CONFIG \
    -u ARTIFACTS_DIR bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   bookkeeping-repro.ts  {"ok":true}
ok   brief-repro.ts  {"ok":true}
ok   checkpoint-repro.ts  {"ok":true}
ok   config-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   experiments-script-repro.ts  {"ok":true}
ok   failures-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   range-repro.ts  {"ok":true}
ok   reconcile-repro.ts  {"ok":true}
ok   report-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   run-lock-repro.ts  {"ok":true}
ok   runner-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   verify-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
26/26 repros passed
```

## The two new repros

- `beads-dag-drain/tests/verify-repro.ts` — `runVerify` itself (green, a bounded tail with a full log,
  a timeout that kills the process group), then the node seam: green lets the settle proceed unchanged
  (no comment, worktree dropped); red is an ordinary failed attempt (comment, issue `open`, nothing on
  Main, worktree and branch kept, full output in `verify-1.log`); an unset `verify` with a `sh` shim
  first on `PATH` proves no shell ran; a gate that outlives `verifyTimeoutMs` is killed and recorded; and
  the order is pinned by a record both the gate command and the stub turns append to —
  `implement, gate, conflict, gate`.
- `beads-dag-drain/tests/checkpoint-repro.ts` — a dirty worktree is checkpointed as one
  `wip(beads-dag): <handle> checkpoint before verify` commit carrying the uncommitted bytes into the
  merge, with `.beads/` excluded; a clean worktree gains none; and the latch case — an attempt killed
  with a dirty worktree, Main moving over the same file, and the next attempt checkpointing,
  integrating Main and reaching the implementer turn. The latch case asserts the old behaviour's
  signature would be absent (`cannot bring main into the worktree`, zero turns).

## Install checks

The installed skill copy is refreshed from this worktree, and the byte comparison is empty:

```
$ rm -rf ~/.agents/skills/drain && cp -a skills/drain ~/.agents/skills/drain
$ diff -rq skills/drain ~/.agents/skills/drain
(empty)
```

The pack link (`~/.archon/workflows/beads-dag`) is deliberately left pointing at the main checkout: the
lab below runs this branch's pack through its own `ARCHON_HOME`, so the machine's install keeps reading
the merged checkout until the drain lands this branch.

## The lab

A throwaway Target at `/tmp/beads-lab-21`: `git init -b main`, a real store
(`bd init --prefix lab --non-interactive --skip-agents --skip-hooks`), one seed commit holding
`config.txt` (`one`), `version.txt` (`1`), and the Target's own gate command in its config:

```yaml
# .scratch/beads-dag.yaml
store: /data3/yky/.local/bin/bd
verify: sh tests.sh
```

`tests.sh` is the cheap deterministic command — two independent tests, each printing one line and both
summed into the exit status:

```sh
fail=0
if [ "$(cat config.txt 2>/dev/null)" = "one" ]; then echo "ok: test 1, config.txt says one"; else echo "FAIL: test 1, config.txt should say one"; fail=1; fi
if [ "$(cat version.txt 2>/dev/null)" = "1" ]; then echo "ok: test 2, version.txt says 1"; else echo "FAIL: test 2, version.txt should say 1"; fail=1; fi
exit $fail
```

Two gate-labelled issues, both `open` and ready:

- `lab/01` `lab-b34` — "change `config.txt` so it contains exactly `two`". Its body leaves **exactly one
  test red**: `config.txt` becomes `two`, `version.txt` is untouched.
- `lab/02` `lab-c40` — "create `added.txt` containing `hello`". Green.

The pack under test is this worktree's, loaded through a private Archon home
(`/tmp/archonhome21/workflows/beads-dag -> <worktree>/.archon/workflows/beads-dag`), so the machine's
own install is not touched. Runs were detached, from the Target, with the worker environment unset:

```
$ cd /tmp/beads-lab-21
$ env -u BD_READONLY -u INPUTS_ISSUE -u INPUTS_CONFIG -u ARTIFACTS_DIR \
    ARCHON_HOME=/tmp/archonhome21 archon workflow run beads-dag-drain --detach
```

### Run 1 — a red gate is recorded, a green one merges

`a03cf822ec2fc1518e556e4962b7b37a`, completed. Main before and after:

```
$ git log --oneline -1 main        # before
53281e6 lab: the target, its checks, and the two issues

$ git rev-parse main               # before
53281e63d9a1be0bf5309b1a38c8414cdf773fd5

$ git log --oneline -1 main        # after
bce4409 beads-dag: merge beads/lab/02-add-added

$ git log --merges --oneline main  # after: only the green issue's merge
bce4409 beads-dag: merge beads/lab/02-add-added
```

The store after the run — `lab/02` closed with the settlement's own reason, `lab/01` `open`:

```
$ bd show lab-c40 --json | grep -E '"status"|"close_reason"'
    "status": "closed",
    "close_reason": "merged beads/lab/02-add-added"

$ bd list --all
✓ lab-c40 ● P2 task add added.txt
○ lab-b34 ● P2 config.txt must say two
```

The failure comment on `lab/01`, verbatim (the head is the reason; the tail of the gate's output is the
second line):

```
$ bd comments lab-b34

Comments on lab-b34:

[lab] at 2026-09-15 07:25

    attempt 1 failed: verify failed: FAIL: test 1, config.txt should say one
    ok: test 2, version.txt says 1
```

Exactly one test is red, and the full gate output is the run's artifact
(`.../artifacts/runs/a03cf822ec2fc1518e556e4962b7b37a/verify-1.log`):

```
FAIL: test 1, config.txt should say one
ok: test 2, version.txt says 1
```

Nothing merged for the red issue and its work survives — Main carries no merge of its branch, the
branch is still there, and its worktree is still registered (the listing below is the state after run 2:
run 2 integrated the new Main into that same worktree and committed nothing else):

```
$ git branch --list
* main
+ beads/lab/01-config-two

$ git worktree list
/tmp/beads-lab-21                              bce4409 [main]
/tmp/beads-lab-21/worktrees/lab-01-config-two  f86ac79 [beads/lab/01-config-two]
```

The run's own record names both, and the summary's failures block reads the store's count:

```
$ cat .../a03cf822.../main-commits.json
["bce44092ea34e1966386da6ff2b9d1769eff9d69"]

$ cat .../a03cf822.../attempted-ids.json
["lab-b34","lab-c40"]

$ tail -4 .../a03cf822.../summary.md

## Failed attempts

- lab/01 [lab-b34] — 1 recorded failure, open; attempted by this run; latest: attempt 1 failed: verify failed: FAIL: test 1, config.txt should say one
ok: test 2, version.txt says 1
```

### Run 2 — the next drain retries it

`61c8e5de81ddac9c5addaf850fc909d0`, completed. Main did not move at all: the red issue was picked
again (it is `open`; run 1's `attempted-ids.json` is run-scoped), its resume-path integration brought
the new Main in cleanly (different files), the implementer produced no new commit — the file already
said `two` — and the gate was red again.

```
$ git rev-parse main               # before run 2
bce44092ea34e1966386da6ff2b9d1769eff9d69
$ git rev-parse main               # after run 2
bce44092ea34e1966386da6ff2b9d1769eff9d69
$ git log --oneline -1 main
bce4409 beads-dag: merge beads/lab/02-add-added

$ cat .../61c8e5de.../attempted-ids.json
["lab-b34"]

$ bd comments lab-b34
    attempt 1 failed: verify failed: FAIL: test 1, config.txt should say one
    ok: test 2, version.txt says 1

    attempt 2 failed: verify failed: FAIL: test 1, config.txt should say one
    ok: test 2, version.txt says 1

$ tail -3 .../61c8e5de.../summary.md

## Failed attempts

- lab/01 [lab-b34] — 2 recorded failures, open; attempted by this run; latest: attempt 2 failed: verify failed: FAIL: test 1, config.txt should say one
ok: test 2, version.txt says 1
```

The lab Target and the private Archon home were left under `/tmp` (not removed) so the artifacts above
stay readable; nothing outside them was written except the refreshed skill copy.

## Residual risks

- **The gate's log is the run's, not the issue's.** `verify-1.log` / `verify-2.log` are named as the
  ticket specifies, and `ARTIFACTS_DIR` is the run's directory (shared by every issue a fan-out starts).
  With `concurrency > 1`, two gates in one run write the same path and the last writer wins — a red gate
  that fails while another writes still records its reason in the comment, but only one full log
  survives. The lab run made this visible (run 1 had one gate log for two gated issues).
- **The gate-to-merge race** with `concurrency > 1` is the deliberate, documented one: Main can move
  between the gate and the settlement's re-integration, and the conflict turn's second gate is the
  mitigation. It is stated in `verify.ts`'s module doc and in the pack README.
- **`verify: true` is a config error, not a command.** The reader parses a bare `true`/number/null as a
  non-string and refuses it loudly (`invalid verify in …`); a Target that wants the shell's `true` must
  quote it. This is stricter than `model`/`store`, deliberately: an empty `verify` means no gate runs, so
  silence there would be the one misreading that costs a merge.
