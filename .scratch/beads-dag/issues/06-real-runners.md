# 06 — The runners come back

**What to build:** The same execution, with a real runner configured instead of a stub, produces a real
implementation in the worktree: a live session runs under the node's role, its answer is read from the
one channel the pack trusts, and its session file lands where the runner keeps it and is reported back on
the result. A runner that cannot start fails the run rather than silently skipping an issue.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `04`
**Status:** BLOCKED

- [x] with a real runner configured, the executor produces commits in the worktree from a live session
- [x] the answer is read from one channel only; the runner's own log is never treated as the answer
- [x] the session file path is reported on the result and lands under the run's artifacts
- [x] a runner that cannot start fails the run loudly, and never lets an issue be recorded as merged
- [x] the role's wall clock is enforced, and a node that can run two turns has a timeout covering both

## Comments

Built. `agent.ts`'s `defaultAgent` now starts a real session for the Target's configured runner —
`pi` (default) through the in-process Pi SDK, `dsh` through the harness as a JSON-RPC child — and both
report their session file on `PackAgentResult.sessionFile`. Each runner reads its answer from its own
product and nothing else: Pi's session jsonl's last assistant text (`readPiSession`; the value
`session.prompt()` returns is ignored), dsh's event stream (`DshRuntime.lastMessage()`; the harness's
log file is never opened). The session file is diagnostics; only `answer` crosses back to a node. A
runner that cannot start throws `RunnerUnavailable` (unreachable SDK, refused model, no credentials, no
`dsh` binary): the execute node exits non-zero with no token, the drain's `join: all_success` fan-out
fails the run, and the issue is never closed — the failed-attempt path is only for turns that happened.

New modules: `pi-session.ts` (SDK ladder, `ARTIFACTS_DIR/sessions/<key>/<role>.jsonl`, session reader,
wall-clock abort, and the one custom tool — Pi's bash definition with the seam's environment on its
spawn hook, which is how `BD_READONLY` reaches the agent's shells), `dsh-agent.ts` (profile, gateway,
effort fold, wall-clock SIGKILL), `dsh-runtime.ts` (the wire protocol, no pack nouns). `prompt.ts`
gained `composeMessage`, the one place persona + brief become one message. `beads-dag-execute.yaml`'s
`timeout` is 15 000 000 ms: one node runs both turns, so it has to outlast 2 × the 2 h role wall clock.

**The defect ticket 05 flagged, fixed.** `ensureWorktreesIgnored` now writes two rules
(`/worktrees/` and `/.beads/interactions.jsonl`) in one idempotent commit under the Main lock, and
untracks the store's interaction log when it is tracked — `bd init` commits it and every write command
rewrites it, so ignored-but-tracked still reads as modified. The acceptance run leaves
`git status --porcelain` empty on the lab Target.

**Gates, verbatim**

```
$ bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts         # store's directory first on PATH
ok   brief-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   runner-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
14/14 repros passed

real    3m38.5s

$ env -u BEADS_BIN bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts   # and with it off PATH
… identical 14/14 list …
14/14 repros passed

$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

Both suite runs are provider-free: a fake Pi SDK (`tests/target.ts`'s `fakePiSdk`, loaded through
`PI_SDK_PATH`) and a stub dsh (`DSH_BIN`) are the only sessions the suite starts. The first accidental
draft of this ticket had two repros reaching `defaultAgent` with no shim — they really did start live
sessions against the machine's Pi install (one even merged, ~minutes of wall clock). All such paths are
gone from the suite; a live session now exists only in the acceptance run below.

**Acceptance under the runner.** Installed by copy (`rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`; `diff -r` identical apart from the test file
edited after the run). Fresh `/tmp/beads-lab-06` lab: `git init -b main`, `bd init --prefix lab
--non-interactive --skip-agents --skip-hooks`, two published issues — `lab/01` (`lab-xlm`, "add
HELLO.md with one line", gated, body committed) and `lab/02` (`lab-l9d`, gated, `dep add lab-l9d
lab-xlm`). Config absent: the pack's defaults (`runner: pi`), `bd` on PATH. Before the run the store
answered `bd ready` = `["lab-xlm"]`, `bd blocked` = `["lab-l9d"]`.

`archon workflow run beads-dag-drain --detach` → run `d7a3f9d640877c9b258e9c4d6b5dc8e0`, **completed**.
Workflow execution: first node `1789140058.25` → `dag_workflow_finished` `1789140096.11` = **37.9 s**
(detached CLI reported completed ~50 s later). Node log: `open` 568 ms; `pick` 860 ms → `execute`
instance 1 **14.5 s**; `pick` 834 ms → `execute` instance 2 **18.5 s**; `pick` 469 ms with an empty
fan-out; loop exited after 3 iterations (`drain` 620 ms); `review` 109 ms, `summary` 94 ms; "Workflow
completed successfully."

Both sessions were live and committed in their worktrees. Session files (under the run's artifacts,
`/data3/yky/.archon/workspaces/_local/beads-lab-06/artifacts/runs/d7a3f9d640877c9b258e9c4d6b5dc8e0/`):

- `sessions/lab/01/implement.jsonl` (8 229 B) — last assistant text: "新建 `HELLO.md` … 提交 `c708790
  feat: add HELLO.md` …"
- `sessions/lab/02/implement.jsonl` (11 220 B)

Merges landed: `783546bde3752787b50962abfc260729c3e8a9d1 beads-dag: merge beads/lab/01-add-hello`
(second parent `c708790 feat: add HELLO.md`) and
`0d63507601079db36bd99c068310920ed2f29a09 beads-dag: merge beads/lab/02-add-goodbye`. After the run:
`HELLO.md` = `hello`, `GOODBYE.md` = `goodbye`, `git status --porcelain` **empty**, both worktrees and
branches gone, `git branch` = `main` only. The store: both issues `closed` with
`close_reason` `merged beads/lab/01-add-hello` / `merged beads/lab/02-add-goodbye`, `bd ready` = `[]`,
`bd blocked` = `[]`, no comments (no failed attempts); `attempted-ids.json` =
`["lab-l9d","lab-xlm"]`; final `pick-exclusions.json` = `{"picked": [], "excluded": []}`. `lab/02` was
blocked before the run and was claimed, executed and merged in the same run only after `lab/01`
closed — the release is visible as its own `pick`/`execute` pair in the loop log.

**Evidence per criterion**

1. *Commits from a live session.* The acceptance run above: merge `783546b`'s second parent is a commit
   the live session made inside `worktrees/lab-01-add-hello`; the run's own session jsonl records it.
   At the node seam, `runner-repro.ts` drives the executor with `fakePiSdk(…, "commit")`, whose session
   commits `HELLO.md` in `opts.cwd`; the node settles `merged`, Main's merge second parent is
   `hello from the fake session`, and the worktree is dropped.
2. *One channel.* `runner-repro.ts`: the fake SDK's `prompt` returns `PROMPT-RETURN-VALUE` while writing
   `the session's answer` into the session file; the result is the file's text, and the session file is
   at `roleSessionFile(artifacts, …)`. A hand-written session whose only part has `type:"thinking"`
   reads as no answer. Source pin: `runPackPi` never assigns `pi.session.prompt`'s return. For dsh, the
   stub writes `{"stub":true}` into its session file and puts `STUB-ANSWER` on the event stream: the
   result is `STUB-ANSWER` and the reasoning part never leaks; `dsh-runtime.ts` reads no file.
3. *Session path reported; under the artifacts.* `PackAgentResult.sessionFile` is the path
   `roleSessionFile` derived and `startPiSession` opened — asserted equal and `existsSync` in
   `runner-repro.ts`, and observed on the live run (`sessions/lab/01/implement.jsonl`). dsh reports the
   path the harness actually wrote (see Deviations).
4. *Cannot start fails loudly.* `defaultAgent` throws `RunnerUnavailable` for an unreachable SDK, a
   model the SDK refuses, and a missing dsh binary (all three pinned in `runner-repro.ts`). Through the
   node (`runScript`): exit non-zero, **no stdout token at all**, stderr `the pi runner could not start:
   …`, issue still `in_progress`, no comment recorded, no merge commit on Main, the attempt's worktree
   left for 07, and the Target still clean. The drain's `fan_out` `join: all_success` (asserted) is what
   turns that non-zero exit into a failed run.
5. *Wall clock; two turns covered.* `armSessionAbort` fires `session.abort()` for Pi (fake `hang` mode,
   100 ms clock: result `answer: none`, `lastError: "agent aborted after wall clock"`, measured under
   5 s); dsh races the turn against `wallMs` and SIGKILLs the child (stub `STUB_HANG`, 500 ms clock).
   `beads-dag-execute.yaml`'s execute node timeout is 15 000 000 ms > 2 × `AGENT_WALL_MS` (14 400 000),
   asserted in `runner-repro.ts`; `yaml-contract-repro.ts`'s role-sum check still holds.

**Mutation proofs** (one fresh copy of the pack under `/tmp` per case, the named `runner-repro.ts`
assertion failing on it):

| Mutation | Failure |
|---|---|
| `agent.ts` statically imports `pi-session.ts` | *the seam statically imports no runner* |
| `pi-session.ts` assigns `await pi.session.prompt(…)` | *the pi runner never reads the prompt call's return* |
| `piTurn(` renamed | *its answer is its session reader* |
| `dsh-runtime.ts` imports and calls `readFileSync` | *the dsh protocol reads no log file* |
| execute `timeout: 1000` | *and it outlasts the two turns the node can run: "1000ms vs 14400000ms"* |
| execute `timeout` line dropped | *the execute node declares a timeout* |
| drain `join: all_success` → `all_done` | *the drain's fan-out is all_success, so a throwing issue node fails the run* |
| the untracking line dropped from `ensureWorktreesIgnored` | *the store's interaction log is untracked: got ".beads/interactions.jsonl", want ""* |
| `execute.ts` catches `RunnerUnavailable` | *the node exits non-zero: got true, want false* |

**Deviations, each deliberate**

- **dsh's session file is not under the run's artifacts.** `DSH_HOME` is the harness's config root —
  `dsh --profile <name>` boots "the profile under `$DSH_HOME/profiles`" — so redirecting it under
  `ARTIFACTS_DIR` would break the profile the pack boots for every run. The adapter keeps the
  predecessor's rule (environment first, then `~/.dsh-pack`) and reports the path the harness really
  wrote, which is the one path that is a fact rather than a guess. Pi, the default runner and the one
  under live acceptance, is contract-pinned under `ARTIFACTS_DIR/sessions/<key>/<role>.jsonl`. If the
  criterion is read as unconditional for both runners, this is the one place it is not met.
- **`PiSdkModule` is a structural type in `pi-session.ts`, not an import of the SDK's types.** The pack
  is copied to `~/.archon/workflows/` with no `node_modules` above it, so the SDK is loaded by name at
  run time; the repo has no Pi SDK dependency for `tsc` to resolve. The type names the exact surface the
  adapter uses, and the live acceptance is what proves the contract against the real 0.85.1 package.
- **The role table still has one role.** `implement` is the only turn the executor runs today; the
  timeout already covers the second turn 08 adds, which is what the ticket's last criterion asks for.
- **The suite is provider-free but not seconds-fast.** 3m38s wall for 14 repros (13 at 3m23s on the
  previous commit); the new file is ~17 s. The cost is the two-hundred-odd real `bd` invocations the
  spec's testing decisions require ("the tests run against a real store and a real git repository",
  "never skipped"), not any live session: every runner in the suite is a shim. `runner-repro.ts` is the
  slowest new part only because it sets up two real Targets and one dsh wall-clock kill.

**Surfaces tickets 07-10 build on**

- **How a node reaches a runner** — `roleAgent(call)` (roles.ts) builds `PackAgentOpts` from the role
  table, the call's arguments and the config; `execute.ts` calls `runAgent(...)` where `runAgent =
  opts.runAgent ?? defaultAgent`. `defaultAgent` picks by `config.runner` and dynamically imports
  `pi-session.ts`'s `runPackPi` or `dsh-agent.ts`'s `dshAgent`; the seam's shape is unchanged from 04
  (`sessionFile`, `answer`, `lastError`), so 08's conflict turn and 10's readers get a runner by calling
  the same seam with their own role options. A runner failure is `RunnerUnavailable` and is not caught
  by the executor — 07's repair is the only thing that should touch an issue left claimed by one.
- **Where a session file lands** — Pi: `ARTIFACTS_DIR/sessions/<sessionKey>/<role>.jsonl`
  (`roleSessionFile`, exported from `pi-session.ts`), the path the run's artifacts keep and the result
  reports. dsh: `DSH_HOME/sessions/<dash-slug>/<sessionId>/session.v3.jsonl`, reported as written.
  10's readers get one session per role per session key from the same formula.
- **What a runner failure does to the run** — the node exits non-zero with no token; the fan-out's
  `join: all_success` fails the drain; the issue keeps its claim and its worktree, and no comment or
  close is written. The store's answer is untouched, so 07's reconcile is the path that resolves the
  leftover — a runner failure never masquerades as a failed attempt, and no path exists from it to
  `closed`.
