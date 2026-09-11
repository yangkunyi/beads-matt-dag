# 08 — Conflict resolved in the same execution

**What to build:** When bringing Main into the worktree conflicts, the same execution turns to the
conflict agent and merges after it — no second workflow, no node gate keyed on a stdout token, and no
status of its own. When the merge is clean, the conflict agent never runs at all.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [x] a conflicted merge starts the conflict agent, and the issue ends merged after it
- [x] a clean merge starts no conflict agent at all
- [x] no workflow other than the drain is needed for a conflicted issue
- [x] a conflict the agent cannot resolve fails the issue with a reason, and leaves its work for the
      report

## Comments

Built. Bringing Main into the worktree after the implementer's turn is now the acceptance test for a
conflict: if that merge conflicts, git leaves it standing in the worktree, the same execution runs the
`conflict` role there, and the executor does not take the agent's word for it - git must show the merge
concluded and the Main that conflicted in the branch before the integration and the merge into Main run
again. One conflict turn per execution, after the implementer; a clean merge starts none. New
`conflictPersona` (prompt.ts), the `conflict` entry in the role table (roles.ts), `mergeUnderway` and
`abortMerge` (worktree.ts), and an `integrateMain` step inside `settleMerged`'s lock transaction
(settle.ts). `execute.ts` is the whole route; the two YAMLs and every other node are untouched.

**The step order, and why the integration moved after the turn.** The executor now does: worktree →
bring Main in (04's freshness step) → implementer → **integrate Main again and merge, one Main-lock
transaction** → close. This is the spec's sentence ("Implement, integrate Main into the worktree, merge;
if that merge conflicts, run the conflict agent in the same execution and merge again") and it is what
makes a conflict reachable at all for a fresh worktree: with `concurrency > 1` two issues cut their
worktrees from the same Main, both implementers commit, and whichever execution takes the Main lock
second would meet a conflict at its *settlement* merge - a route ticket 05 recorded as a failure. With
the integration inside the same lock transaction as the merge, the second execution always integrates
the first's merge into its branch first, and the conflict is discovered exactly where the ticket says
it is: bringing Main into the worktree. The merge into Main after that integration cannot conflict (its
merge base is Main's tip), so an execution never needs more than one conflict turn. A `settle()` failure
without a merge standing ("nothing to merge", a dirty tree) is not a conflict route: it stays the
attempt's failure, as 05 built it.

**The pre-turn conflict is rolled back and deferred, not resolved there.** A resumed worktree whose
branch already conflicts with Main would otherwise need a conflict turn *before* the implementer - a
second one, if Main moved again during the turn, and a third to settle. It is aborted instead (the
worktree is left workable, 04's pre-turn integration still runs when it is clean), and the integration
after the turn re-attempts the same merge: one conflict turn per execution, always with the
implementer's work on the table. A pre-turn failure that is *not* a merge under way still fails the
attempt immediately.

**The session decision: the conflict turn opens its own session, under the issue's key.** The
predecessor keyed implement and conflict to the same `sessionKey`, and the argument for continuing the
implementer's session is real: the resolver needs the intent that produced the code. But this pack's
session path is `<key>/<role>.jsonl` (`roleSessionFile`, pi-session.ts): a shared key gives the two
roles the same directory, **not** the same file, and Pi's `SessionManager.open` resumes the file it is
handed. So "continuing the implementer's conversation" is not what a shared key buys, and claiming it
would be false. The conflict turn therefore opens `sessions/<handle>/conflict.jsonl` - its own file,
beside the implementer's, and the file `PackAgentResult.sessionFile` reports and the run's artifacts
hold (proved by the acceptance below). The intent it needs is reachable where the work is: both sides
of the standing merge, the commits, and the body it is handed as its brief. The resume that matters is
its own: a later attempt's conflict turn reopens `conflict.jsonl` and continues the prior conflict
turn. `roles-repro.ts` pins the key and the file derivation, and `conflict-repro.ts` pins the session
file the conflict turn writes.

**Gates, verbatim**

```
$ time PATH=/data3/yky/.local/node-v24.19.0-linux-x64/bin:$PATH env -u BEADS_BIN \
    timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
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
16/16 repros passed

real	5m11.325s
user	6m30.401s
sys	2m1.822s
gate1 exit=0

$ time env -u BEADS_BIN timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
… the identical 16/16 list …
16/16 repros passed

real	5m11.448s
user	6m30.866s
sys	2m1.037s
gate2 exit=0

$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

Both suite runs are with no `BEADS_BIN`: gate 1 has the store's directory first on PATH, gate 2 has it
off PATH (the fixture resolves the binary through `npm prefix -g`). 16 repros: 15 before,
`conflict-repro.ts` added (7 targets, ~43 s). The YAML timeout was already dimensioned for this ticket
(15 000 000 ms > implement + conflict = 2 × 2 h), and `yaml-contract-repro.ts` now sums the two roles
`execute.ts` names - it was failing before the role was declared and is the reason the timeout needs no
edit.

**Evidence per criterion** (all at the node seam: `conflict-repro.ts` drives `executeIssue` with a stub
runner that records every turn's role, cwd, brief and session key, and reads only the store's answers
and git)

1. *A conflicted merge starts the conflict agent, and the issue ends merged after it.* One target:
   `shared.txt` on Main, the implementer commits `the issue's side`, Main moves to `Main's side` during
   the turn. `executeIssue` → turns `["implement","conflict"]`, the conflict turn in the issue's
   worktree, handed the body's path and the issue's session key; the stub asserts the merge was really
   standing (`MERGE_HEAD` + `UU shared.txt`) before it resolves and commits; the issue is `closed` with
   `close_reason=merged beads/feat/03-a-conflict-resolved`; exactly one `beads-dag: merge <branch>`
   commit is on Main; its first parent was Main at the conflict, its second parent is the conflict
   turn's commit (`resolve the conflict`), whose second parent is that same Main; `main:shared.txt` is
   the resolution; worktree and branch are gone.
2. *A clean merge starts no conflict agent at all.* Two targets, both asserting the recorded roles:
   Main unmoved (roles `["implement"]`, one flow merge on Main) and Main moved **cleanly** during the
   turn on an unrelated path (roles `["implement"]`, the integration merge is in Main's history, the
   work still lands). The role record is the assertion, so a conflict turn started "just in case"
   fails both.
3. *No workflow other than the drain is needed.* The whole route lives in `execute.ts`; the execute
   workflow is still one node with no `when:`, and `yaml-contract-repro.ts` asserts the included
   workflow has none. The acceptance below is one `archon workflow run beads-dag-drain`.
4. *An unresolvable conflict fails the issue with a reason, and leaves its work for the report.* Two
   targets: the conflict turn answers nothing (`attempt 1 failed: the conflict runner died`) and the
   conflict turn answers but leaves the merge standing (`…: the conflict agent left the merge
   unresolved`). Both: `FAILED`, issue back to `open`, the standing merge rolled back (no `MERGE_HEAD`,
   clean worktree), the worktree and branch still there at the implementer's commit, and no flow merge
   on Main. A third target pins the git-fact check: a turn that answers after `git merge --abort` is
   `attempt 1 failed: the conflict agent did not conclude the merge: main is not in the branch`.

**Mutation proofs** (a fresh copy of the whole pack under `/tmp/mut08/work/<name>/beads-dag` per case,
the named repro run against the copy; every new assertion above was shown to fail)

| Mutation | The repro's failure |
| --- | --- |
| the executor treats a conflicted merge as a plain failure (no conflict turn) | *the conflicted integration settles the issue: got "failed", want "merged"* |
| the conflict turn started even when the merge is clean | *and only the implementer ran: got ["implement","conflict"], want ["implement"]* |
| the conflict agent's answer trusted instead of git | *with the reason naming the merge that stayed unresolved: got "attempt 1 failed: the merge still conflicts after the conflict agent: cannot bring main into …"* |
| the pre-turn conflict not rolled back and deferred | *the retry settles: got "failed", want "merged"* |
| the conflict role keys a session of its own | *the conflict turn keys the same issue session: got "feat/01-conflict", want "feat/01"* (roles-repro) |
| the conflict role runs under the implementer's persona | *its persona is the conflict resolver's: got "You are the implementer of exactly one issue…"* |
| a failed conflict turn leaves the merge standing | *the standing merge was rolled back: got true, want false* |
| the settlement does not integrate Main before merging | *the integration merge is in Main's history: ["beads-dag: merge …", "something else landed", …]* |
| no merge is ever seen as standing (git's state ignored) | *the conflicted integration settles the issue: got "failed", want "merged"* |
| the executor names no conflict role | *a node runs conflict: "implement"* |

**Acceptance under the runner.** Installed by copy (`rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`; `diff -r` identical apart from the repro
edited after the run). Fresh `/tmp/beads-lab-08` lab: `git init -b main`, a seed commit with
`shared.txt` = `base`, `bd init --prefix lab --non-interactive --skip-agents --skip-hooks` (bd 1.2.2),
two published issues whose bodies both say "set `shared.txt` to exactly one line" - `lab/01`
(`lab-auq`) to `issue one's side`, `lab/02` (`lab-xuy`) to `issue two's side` - both gate-labelled, the
bodies committed.

The store before the run: both `open`, `bd ready` = both, `bd blocked` = `[]`, `close_reason` null, no
comments. Git before: `058a6e3 lab: publish both issues` on Main.

`PATH=<the store's directory>:$PATH archon workflow run beads-dag-drain --detach` → run
`b25a7fe1fa7caa8956ea7a08bd35dfbf`, **completed** (started 17:34:31Z, completed 17:35:09Z). Its node log,
abridged to the boundaries:

```
open         961ms
pick         834ms      out: ["lab/01","lab/02"]
execute__446af3d97d50e65b__execute   started together, completed 10.9s
execute__f912ec4524e00edc__execute   started together, completed 33.5s
                       stderr: lab/02: conflict session …/artifacts/runs/b25a7fe1fa7caa8956ea7a08bd35dfbf/sessions/lab/02/conflict.jsonl
pick         466ms      out: []
review       145ms      out: nothing
summary      133ms      out: nothing
```

Both executions started at the same instant (the run's fan-out is parallel), so both worktrees were cut
from the same Main and both implementers changed the same line: the first execution's settlement
merged (10.9 s), and the second's integration found Main moved - `bringMainIn` conflicted **for real**,
inside `lab/02`'s execution. There was no other workflow, no gate, no status of its own.

The run's own artifacts: `sessions/lab/01/implement.jsonl` (8 298 B) and `sessions/lab/02/`'s
`implement.jsonl` (9 868 B) plus `conflict.jsonl` (22 055 B) - the file the conflict turn actually
wrote, in the role's own directory under the issue's key, as reported on stderr. Its first user message
is the conflict persona ("You are the conflict resolver of exactly one issue…"); its tool evidence
includes `Unmerged paths: … both modified: shared.txt`; and its last assistant text ends:

> **Commit:** `892a07d` — `Merge branch 'main' into beads/lab/02-change-shared-file`, with `64f2b1b`
> (Main) now in the branch history, no abort, nothing staged or left unmerged.

Git after: `38447a7 beads-dag: merge beads/lab/02-change-shared-file` (parents `64f2b1b 892a07d`) on
Main at the tip; `892a07d Merge branch 'main' into beads/lab/02-change-shared-file` (parents
`17fd170 64f2b1b`) the conflict turn's resolution commit; `64f2b1b beads-dag: merge
beads/lab/01-change-shared-file` (parents `2ba46a7 564900e`) the first issue's merge, untouched;
`main:shared.txt` = `issue two's side`; `git worktree list` = the Target only; `git branch --list` =
`main` only; `git status --porcelain` empty.

The store after the run: `lab-auq` `closed`, `close_reason` `merged beads/lab/01-change-shared-file`;
`lab-xuy` `closed`, `close_reason` `merged beads/lab/02-change-shared-file`; no comments on either (no
attempt failed); `bd ready` `[]`; `bd blocked` `[]`; `attempted-ids.json` = `["lab-auq","lab-xuy"]`;
the final `pick-exclusions.json` = `{"picked":[],"excluded":[]}`.

**Deviations, each deliberate**

- **The integration after the turn is new; the pre-turn integration stays.** 04's step is kept (a
  resumed worktree works against Main when that merge is clean) and the spec's step is added. Keeping
  both costs one extra `git merge` per execution (a no-op when Main has not moved) and is what makes
  the conflict reachable after the implementer instead of at the settlement. `worktree-repro.ts` is
  unchanged and green on it.
- **A pre-turn conflict is rolled back rather than resolved before the implementer.** The execution has
  one conflict turn and the resolver should see the implementer's work; the alternative is a second
  conflict turn (three agent turns in one node) for a state the retry path can also reach a turn later.
  Recorded on stderr: `<handle>: Main conflicts in the worktree; the conflict agent integrates it after
  the turn`.
- **`settleMerged` gained an optional `integrateMain` step** rather than the executor opening its own
  lock transaction: the integration and the merge must be one lock transaction, and settle.ts is still
  the one module that closes an issue (settle-repro asserts the `closeIssue(` call sites are exactly
  settle.ts and store.ts). 07's reconcile keeps calling it without the step - a landed leftover needs no
  integration - so its behavior is unchanged.
- **The conflict turn's session is its own file under the issue's key** (above). The predecessor's
  same-key choice is kept; the "continues the implementer's conversation" reading of it is not, because
  this pack's session path includes the role.
- **A conflict after the retry is not retried again.** If Main moves during the conflict turn and the
  second integration conflicts too, the merge is rolled back (the resolution's commit stays on the
  branch) and the issue fails with `the merge still conflicts after the conflict agent: …`; the next
  drain retries it. Bounded by construction: at most two settle attempts, one conflict turn.
- **settle-repro's old "a merge that conflicts" case became "nothing to merge".** That case asserted a
  conflicted merge into Main is the attempt's failure; 05's Comments left that route to this ticket, and
  the conflict route is now `conflict-repro.ts`'s. The non-conflict un-landable merge (an attempt that
  carries no commit Main lacks) stays pinned in settle-repro, with the same observable failure and
  clean Main.
- **The conflict role's wall clock is the same 2 h** (`AGENT_WALL_MS`), so the node timeout still covers
  the two turns; no YAML edit was needed.

**Surfaces tickets 09-11 build on**

- **The conflict role's declaration** - `ROLES.conflict` in `roles.ts`: `sessionKey` = the issue's
  `handle`, `persona` = `conflictPersona()` (prompt.ts), `prompt` = the body path, `wallMs` =
  `AGENT_WALL_MS`. A node calls it as `roleAgent({ role: "conflict", args: { handle, bodyPath }, cwd:
  worktree.path, artifactsDir, config })`; the Pi session file is
  `<artifacts>/sessions/<handle>/conflict.jsonl` (dsh reports its own harness path). The YAML contract
  sums implement + conflict (4 h) against `execute`'s 15 000 000 ms.
- **The executor's step order now is:** preflight + issue lookup + names → `withMainLock(ensureWorktrees
  Ignored)` → `ensureWorktree` → `bringMainIn` (resumed freshness; a conflict is rolled back and
  deferred) → implement turn → `settleMerged(…, integrateMain: () => bringMainIn(worktree, main))` →
  close → drop the worktree. A conflict in that integration runs the conflict turn and repeats the
  `settleMerged` step once.
- **What a failure-to-resolve leaves behind:** the issue `open` with `attempt N failed: <reason>`
  (`the conflict runner died` / `the conflict agent left the merge unresolved` / `the conflict agent did
  not conclude the merge: <main> is not in the branch`), the worktree's standing merge aborted so the
  branch sits at the attempt's commits with a clean tree, Main unmoved, and the conflict session file
  under the run's artifacts for the report. `mergeUnderway(worktree)` and `abortMerge(worktree)`
  (worktree.ts) are the two new reads/writes 09-11 can use.
- **For 10's merged range:** a conflict-resolved issue contributes *two* merge commits to the range -
  the integration merge the conflict turn committed on the branch, and the settle merge on Main (whose
  second parent is the branch tip). `mergedOnMain` is unchanged: the settle merge's second parent is
  the branch tip, and that tip's own second parent is the Main that conflicted.
- **For 11's acceptance:** `conflict-repro.ts` covers the seam, and the lab above is the replay recipe
  (two gate-labelled issues on one file, one drain, default `concurrency` 4 - the fan-out is parallel,
  which is what makes the second integration meet the first's merge).

**Review, both axes, over the diff since `1d1f2a5`** (no sub-agents available here, so both axes were
run inline rather than in parallel). *Standards:* no hard violations - the diff follows the pack's
conventions (every module keeps its doc comment; `roleAgent` is still the only place a persona, brief or
wall clock is spelled; the new helpers are named for what they do; the diff carries no new dependency).
Judgement calls kept: the three conflict sites in `execute.ts` share only the `mergeUnderway` probe and
differ in what they do with it (defer / resolve / fail), so extracting a helper would name the wrong
thing; the personas duplicate a sentence about the frozen body and the read-only store, deliberately -
each role states its own contract, which is the roles-repro property; `integrateMain` is a function
parameter used by one caller today, but it is what keeps the integration and the merge in one lock
transaction without a second closer. *Spec:* all four criteria are implemented and pinned; the two
deliberate boundaries are the pre-turn conflict's roll-back-and-defer and the own-file conflict session,
both argued above; no scope creep - the two YAMLs, the store module, the pick/open/review/summary nodes
and every doc outside the pack's README are untouched.
