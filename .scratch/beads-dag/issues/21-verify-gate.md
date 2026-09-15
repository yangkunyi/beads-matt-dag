# 21 — verify before the merge, and checkpoint the worktree first

**What to build:** nothing checks the work before it lands. The executor trusts the implementer's turn text
and git's own state: `settle.ts` merges the branch into Main, and `closed` therefore implies "a merge commit
exists" (ADR-0002) — but not that anything ran. A worker that misreads the issue, or breaks a file it was
never asked to touch, merges anyway; its dependents are released on `close` (ADR-0004), and the only
backstop is the drain-end review, which reads the merged range **after** the fact and whose findings cannot
unmerge anything.

Fix: a **pre-merge verification gate**. The Target configures one command (`verify:` in
`.scratch/beads-dag.yaml`); the executor runs it in the issue's worktree — after the implementer's turn, and
again after a conflict turn — immediately before each `settle()`. Red means the attempt is recorded exactly
as any other failed attempt: the reason as a comment, the issue back to `open`, nothing merged, the worktree
and branch kept. Green means `settle()` proceeds unchanged. The gated tree is the tree that merges: a
dirty worktree is committed as one `wip` checkpoint first, and the same checkpoint runs before the resume
path's integration, so a killed turn's dirty tree can never block a later attempt before an agent runs.

**Spec:** `docs/specs/2026-09-11-beads-dag.md` — "The per-issue executor is one node" and "The settlement:
merge, then record"; evidence and donors: `.scratch/research-flow/raw/04-what-to-steal.md` §1 (Gas Town
`internal/refinery/engineer.go` `doMerge` + `runGatesForPhase` and `mol-refinery-patrol`'s `handle-failures`;
Issue-Orchestrator `docs/architecture/validation.md`; Kiro Crew's TaskRunner, vendor docs). The hole is the
one the review's placement leaves open: it is a reader, not a gate.

## What the gate is, and what it is not

- **One command, the Target's own.** `verify` is a shell command string, run as `sh -c <command>` with
  cwd = the issue's worktree. Empty (the default) means *this Target has not configured one*: no process,
  no record, no behavior change — the same convention Gas Town uses for its rig test command.
- **Trust boundary: config, never the issue body.** The command is read from the Target's config file, like
  every other key. It must never be taken from the issue body or anything the worker can write.
- **Not an agent, not a role.** No session, no prompt, no model; it is deterministic and belongs beside
  `settle.ts`'s git work, not in `roles.ts`.
- **Not a second record of anything.** The gate writes no store field and no status (ADR-0005): a green gate
  is implied by the merge path that follows it, and a red one is an ordinary failed attempt — the same
  comment + reopen the git contract failure uses.
- **Not a CI system.** One command on the would-be-merged tree. There is no push and no PR, so there is
  nothing on GitHub to observe (Issue-Orchestrator's "observe CI rather than reproduce it" does not apply).

## Design

**Placement and order.** In `beads-dag-execute/scripts/execute.ts`:

```
turn (implement)  →  checkpoint-if-dirty  →  verify   →  settle()          (merge, then record)
                     └─ red ──────────────────────────────→  didNotLand("verify failed: <tail>")
   …if that settle's integration conflicts:
conflict turn  →  checkpoint-if-dirty  →  verify   →  settle()  (again)
```

A gate runs **before each settle attempt**, because the conflict turn can change the tree. The resume-path
`bringMainIn` (before the implementer) and a conflict it causes start no gate: there is no work of this
attempt in the tree yet. That call is the checkpoint's second home, though — see below.

**Dirty worktree: the gate must test what merges.** The merge carries the branch's commits; uncommitted
bytes in the worktree are not part of it. So before gating, if `git status --porcelain` is non-empty, commit
the tree as one checkpoint on the issue's branch (`wip(beads-dag): <handle> checkpoint …,` naming the call
site that made it), excluding the pack's own runtime paths (`.beads/`, `worktrees/` — `main-writes.ts`
already ignores both on Main). Nothing is discarded, the gate's subject and the merge's subject become the
same tree, and a red gate leaves the worktree exactly as it was plus that commit. One module owns this
primitive; both call sites below use it.

**The same primitive on the resume path.** The first `bringMainIn` of an attempt runs *before any agent
turn*. Git refuses a merge over uncommitted changes to files the merge touches — `error: Your local changes
to the following files would be overwritten by merge` — and that refusal is not a conflicted merge:
`MERGE_HEAD` is never written, so `mergeUnderway()` is false and `execute.ts` takes the plain
`didNotLand(reason)` branch. A turn killed mid-edit, whose worktree is still dirty when a later drain finds
it, plus a Main that has moved over one of those files, therefore locks the issue out **permanently**: every
later attempt fails at the same line before an agent runs, `reconcile.ts` repairs the store and not the
tree, and only a human can unstick it. That is the failure mode this pack exists to remove, so the
checkpoint gets a second call site: after `ensureWorktree`, immediately before the first `bringMainIn`. A
checkpoint holding a killed turn's half-work is visible on the branch and in the review range, and the next
implementer turn resumes its own session (the role's session key is the handle) against exactly that tree.

**Red path.** `didNotLand(\`verify failed: <tail>\`)` — the existing failure path, unchanged: `settleFailed`
writes the reason as a comment and puts the issue back to `open`, nothing merges, nothing closes, the
worktree and branch stay because they hold the attempt, the node prints `failed`. `<tail>` is the bounded
tail of the gate's combined output; the **full log** is written into `ARTIFACTS_DIR` as `verify-<n>.log`
(n = 1 for the post-implement gate, 2 for the post-conflict one). The reason in the comment names the gate
and the tail; the operator reads the file for the rest.

**Timeout.** The gate is not a role, so the contract test's role sum cannot see it. `verifyTimeoutMs`
(configurable, default 15 min) bounds one gate run; the process group is killed on expiry and the attempt
fails with a timeout reason rather than hanging the node. The execute node's `timeout` must therefore
outlast `implement + conflict + 2 × verifyTimeoutMs`: with the current clocks that is
`7 200 000 + 7 200 000 + 2 × 900 000 = 16 200 000`, plus the pack's 10-minute margin → `16 800 000` ms. The
default must be exported from the pack and the contract test taught to add the two gate runs, so a later
timeout edit cannot silently make the node shorter than its budget.

**The residual race, stated not hidden.** `settle()` re-integrates Main inside the Main lock, so with
`concurrency > 1` Main can move between the gate and the merge; a clean re-merge then produces a tree the
gate did not test. Accepted deliberately: gating inside the lock would serialize every merge for the gate's
duration and undo the reason concurrency exists. The conflict turn's gate is the mitigation (any divergence
that conflicts is re-tested after resolution), and the window is stated in `verify.ts`'s module doc. A
post-merge check on Main is **not** in scope; the lab below decides whether the window is real enough to
need one.

## Acceptance criteria

- [ ] `config.ts` gains `verify: string` (default `""`) and `verifyTimeoutMs: number` (default `900000`) in
      `PackConfig`, `DEFAULTS` and `CONFIG_KEYS`; `configLine` names both (the typecheck's
      `Record<ConfigKey, …>` forces it), with the file's path as the source when the Target set them; an
      empty `verify` spawns nothing and records nothing.
- [ ] New `beads-dag-drain/scripts/verify.ts`: `runVerify(worktree, command, timeoutMs)` runs `sh -c` with
      cwd = the worktree, captures combined stdout+stderr bounded, kills the process group on expiry, and
      returns `{ ok, tail, timedOut }`. No agent, no store call, no git write. Its module doc states the
      trust boundary (Target config, never the issue body) and the residual race above.
- [ ] `execute.ts` gates immediately before each `settle()` — after the implementer's turn, and again after
      `resolveConflict()` returns, before the second settle. `bringMainIn`'s resume-path call is not gated.
- [ ] The dirty-tree rule above: a checkpoint commit before each gate when `git status --porcelain` is
      non-empty, nothing when clean, both call sites through one exported primitive.
- [ ] The checkpoint's second call site: after `ensureWorktree` and before the first `bringMainIn`, so an
      attempt whose predecessor was killed with a dirty worktree checkpoints, integrates Main, and reaches
      the implementer turn instead of failing before any agent runs.
- [ ] Red: the store holds `attempt N failed: verify failed: …`, Main carries **no** merge commit for the
      issue's branch, the issue is `open`, the worktree and branch survive, and the full log is in
      `ARTIFACTS_DIR/verify-<n>.log`.
- [ ] Green: `settle()` runs unchanged — the merge lands, the issue closes with `merged <branch>`, no
      comment is written. A Target with no `verify` behaves exactly as today.
- [ ] The YAML timeout arithmetic above is done and the contract test accounts for two gate runs on the
      execute node (and still passes).
- [ ] Repro suite: red path; green path; unset `verify` (a probe proves no `sh` ran); dirty worktree →
      checkpoint commit visible on the branch and in the merge; a gate that outlives `verifyTimeoutMs` is
      killed and recorded as a timeout failure without hanging; the order implement → gate → settle →
      conflict → gate → settle is pinned. All drive the node protocol with a real store, real git and the
      stub agent.
- [ ] Repro for the latch: a worktree left dirty by an earlier attempt, with Main moved over the same file,
      and the next attempt checkpoints, integrates Main, and runs the implementer — asserted against the old
      behavior's signature (`didNotLand` before any turn) so the test would fail without the fix.
- [ ] Docs: pack `README.md` (the config paragraph and its key table, the settlement section, the artifacts
      list, and the module table if it gains a row), `docs/specs/2026-09-11-beads-dag.md`'s per-issue
      executor paragraph, and `skills/drain/SKILL.md` (its config table gains `verify`, and the incident
      list says what a verify failure reads like) — with the installed skill copy refreshed and
      `diff -rq` empty.
- [ ] Both pack gates green: `bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts` and
      `./node_modules/.bin/tsc -p tsconfig.pack.json`.
- [ ] One real lab run, quoted with its run id and artifacts: a throwaway Target, a real store, a cheap test
      command, one issue whose body leaves exactly one test red → the drain records the failure, Main does
      not move, the next drain retries it; and a green issue → merge + close. `git log --oneline -1 main`
      and the failure comment verbatim.

## Out of scope

- The **repair turn** (hand a red gate's output back to the same execution once before recording failure,
  then re-gate) — `.scratch/research-flow/raw/04-what-to-steal.md` §2. Deliberately not written yet: a red
  gate is already retried by the next drain, so the question is whether one more turn inside this execution
  earns its wall clock, and whether that turn needs the implementer's own session (the role table's session
  file is per role, so a new `repair` role would start cold). The failure comments and histories this ticket
  produces are the evidence for both.
- Post-merge gates on Main, CI/PR gates (`bd gate`), merge queues and bisection, and any per-issue agent
  review before the merge (predecessor ADR-0036 rejected that; the deterministic gate is the pre-merge
  judgment worth having).

