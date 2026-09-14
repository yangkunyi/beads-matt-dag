# 20 — one drain at a time per Target

**What to build:** nothing stops a second drain against a Target that is already draining. Ticket `07`'s
residual, still standing after `09`: two drains can each see the other's `in_progress` claims — and the damage
is worse than duplicated work. The second run's opening repair reads the first run's **live** claim as a
leftover, and its `pick` can offer an issue the first is implementing right now. `lock.ts` serialises the
writes that move Main; it does nothing about two runs.

Fix: **mutual exclusion at open.** The drain takes a Target-level run lock before it does anything, and a
second drain refuses to start — one loud line, no claim, no write, no stdout token — while another live run
holds it. A dead holder's lock is stolen, the way `lock.ts` already steals one.

**Spec:** `.scratch/beads-dag/issues/07-reconcile-leftovers.md`'s residual,
`.scratch/beads-dag/issues/09-brake-and-domains.md` (Residual risks, last bullet)
**Blocked by:** `07`
**Status:** BLOCKED

- [x] a second drain against a held Target refuses at open: exit 1, no stdout token, nothing claimed, nothing
      written, the message naming the holder (run id, or the pid it recorded)
- [x] `lock.ts` already holds the mechanisms (exclusive create, pid liveness, stealing a dead holder's) and
      must be reused, but the ticket says why the run lock needs its **own file** and must **not** wait: a
      second drain refuses instead of blocking for a run's length, and the Main lock's pid check would read
      the run's own live pid as a holder — re-entrancy there saves `withMainLock` from itself, and nothing
      would save this one
- [x] the operator-facing surface names this refusal: `skills/drain/SKILL.md`'s incident section lists what
      a refusal can be, so a second drain is one of them (with the install refreshed)
- [x] the lock is released when a run ends normally **and** after a kill: the next drain starts normally,
      stealing a dead holder's lock
- [x] the ticket says what the lock is, where it lives, and why it is not a store field (drain bookkeeping
      does not enter the store — the `attempted-ids.json` precedent)
- [x] a repro proves the refusal and the release; a real lab shows a second `archon workflow run` refused while
      the first is running, quoted with both runs' ids
- [x] the run's own artifacts say the lock was taken (one line), so an operator can explain a refusal without
      reading the pack

## Comments

**Built.** The drain now takes a Target-level **run lock** as the very first thing `open` does, and a second
drain refuses — exit 1, empty stdout, one line on stderr, nothing claimed or written, not even a store call.

**What the lock is, where it lives, and why it is not a store field.** `scripts/run-lock.ts` owns it. It is
`beads-dag-run.lock`, a second file beside the Main lock `beads-dag.lock`, in the Target's git directory
(`git rev-parse --absolute-git-dir` — the directory the Main lock already lives in, so every process
draining the Target agrees on the path). It is created exclusively (`O_CREAT|O_EXCL`) and holds two lines:
the pid it trusts to be alive for the run — `process.ppid`, the workflow runner every node of a run is a
child of — and the run id, the basename of Archon's per-run artifacts directory
(`.../artifacts/runs/<run-id>/`; the pack has no run-id field of its own). The mechanism is not a copy:
`lock.ts` now exports its primitives (`createLockFile`, `readLockHolder`, `lockHolderAlive`, `removeLockFile`)
and the run lock reuses them, so exclusive create, pid liveness and stealing a dead holder's lock are spelled
once. It is a file and not a store field because it is mutual exclusion between the processes on this machine,
not a fact about any issue: a store field would be backed up and restorable into a state that says "held" with
nothing holding it, visible to every store reader, with no pid to check — and it would put drain bookkeeping
into the issue database, which the pack keeps out (ADR-0005; the `attempted-ids.json` precedent). The README's
new "One drain at a time" section says all of this where a reader looks.

**Why its own file, and why it must not wait.** The run lock's lifetime is a run, so its holder's pid is alive
for the whole run. In the Main lock's file it would poison exactly the writes it must not: a Main write from
another process of the same run (`settle.ts` runs in an `execute` node, not in `open`) would read that live pid
as a contender, wait `LOCK_WAIT_MS` (60 s) and then throw — the Main lock's re-entrancy saves `withMainLock`
from *itself*, in one async context, and would not save this. And the run lock's loser must not wait at all:
the wait would be a run's length, and the state it woke to would be a run old. So: two files, two lifetimes,
and refuse instead of wait.

**The release is best effort, which is why the pid is the holder.** A run that ends normally releases the lock
from `summary`, its last node, and `open` releases it when its own work fails before the loop. But `open` is the
only always-run node — a run that dies, or fails on the way, leaves the file behind and Archon skips the nodes
that would have released it; that is not a leak, because the next drain reads the dead holder's pid and steals
the lock (stealing is also what happens to a file a kill left half-written, with no readable pid).

**The refusal line, verbatim from the lab:**

```
beads-dag: refusing to start: another drain is running (run 8a4abd4bff6c807d40cf4e96e7e32a07 (pid 2076890), lock
/tmp/beads-lab-20/.git/beads-dag-run.lock); one drain at a time per Target - wait for it to end, or kill it and the
next drain steals a dead holder's lock
```

A holder that recorded no run id reads `(pid <pid>, lock <path>)` instead; the repro pins both.

**Evidence per criterion** (all in `scripts/` and `tests/`; the repro is `tests/run-lock-repro.ts`, driven
through the node protocol like every other repro — no session is started):

1. A live holder refuses `open`: exit 1, stdout exactly `""`, stderr naming the holder's run id *and* pid and
the lock file; the holder is not stolen; the eligible issue is still `open`; the refused run's `ARTIFACTS_DIR`
is never created; Main does not move and the tree is unchanged; a probe store records **no store command at
all**; the Main lock is not taken. A pid-only holder refuses too, and the message names the pid.
2. `lock.ts` is the Main lock and only that; the repro asserts the two files are different and that
`withMainLock` completes its own write while the run lock is held (measured, well under `LOCK_WAIT_MS`), which
is the distinctness in behaviour and not only in names. Both module docs carry the argument.
3. `skills/drain/SKILL.md`: the incident list now reads "no store in the Target, no store binary, a blocking
relation across the domains, another drain already running against this Target", with a sentence naming the
holder's run id and pid, the refusal-not-wait, and the dead-holder steal; `run-lock.json` joins the artifact
list. The skill install was refreshed and `diff -rq` is empty.
4. Normal end: `summary` releases the lock (asserted gone after the node runs), and the next `open` succeeds.
Kill: a dead pid's lock is stolen, one line says so, and the run proceeds to write its artifacts. A failed
`open` (storeless Target) also gives the lock back, so the next drain reads the store's reason, not a lock
refusal.
5. The lock's identity is stated in `lock.ts`'s and `run-lock.ts`'s module docs, in the README's "One drain at
a time" section and module table, and above in this comment.
6. The repro proves the refusal, the steal and the release (including the half-written file); the lab below
shows a real second `archon workflow run` refused while the first runs.
7. `open` writes `run-lock.json` — one line, `{run, pid, path}` plus `stole` when it stole one — into
`ARTIFACTS_DIR`; the repro reads it back and the lab shows the file.

**Gates, verbatim**

```
$ timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   bookkeeping-repro.ts  {"ok":true}
... (23 files) ...
ok   yaml-contract-repro.ts  {"ok":true}
23/23 repros passed            (exit 0)

$ timeout 300 ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors; exit 0)
```

Two existing repros needed a fixture adjustment to exist under the lock, and neither changed what it tests:
`range-repro.ts`'s second `openRun` over one Target now ends the previous run (its lock released, as a real
run's `summary` would), and `store-open-repro.ts`'s "binary cannot be found anywhere" case keeps `git` on the
PATH it builds, because the run lock resolves the Target's git directory before the store preflight. (A Target
with no `git` at all now fails at the lock, which is the order the ticket asks for.)

**Install checks.** `rm -rf ~/.archon/workflows/beads-dag && cp -r .archon/workflows/beads-dag
~/.archon/workflows/beads-dag && diff -rq <both>` — empty. `cp -a skills/drain ~/.pi/agent/skills/ && diff -rq
skills/drain ~/.pi/agent/skills/drain` — empty.

**The lab.** Fresh `/tmp/beads-lab-20` (`git init -b main`, `bd init --prefix lab --non-interactive
--skip-agents --skip-hooks`, one gate-labelled issue `lab/01` — `lab-xhj`, "add HELLO.md with one line" — its
body committed).

- Run 1: `archon workflow run beads-dag-drain --detach` → **`8a4abd4bff6c807d40cf4e96e7e32a07`**. Its `open`
exited 0 with stdout `opened` and its one config line on stderr; a real Pi session was live in its `execute`
node (it had committed `feat: add HELLO.md` in its worktree when the run was ended — the lock is the lab's
subject, not the merge). While it ran, `.git/beads-dag-run.lock` held:

```
2076890
8a4abd4bff6c807d40cf4e96e7e32a07
```

  and `ps -p 2076890` was `/data3/yky/.local/bin/archon workflow run beads-dag-drain --cwd /tmp/beads-lab-20
  ...` — the detached runner, exactly the pid the lock records. Its `run-lock.json`:
  `{"run":"8a4abd4bff6c807d40cf4e96e7e32a07","pid":2076890,"path":"/tmp/beads-lab-20/.git/beads-dag-run.lock"}`.
- Archon 0.10.1 has its own per-home guard: a plain second `archon workflow run beads-dag-drain` in the same
  home is refused by **Archon** before any node runs (`❌ This worktree is in use by beads-dag-drain (running
  57s, run 8a4abd4b). … Error: Workflow failed: Workflow already active on this path`, CLI exit 1). So the
  pack's lock is exercised by a second Archon *home* — its own `archon.db` and a copy of the workflow tree
  (`ARCHON_HOME=/tmp/archonhome20`) — which is two install states/daemons meeting one Target, the gap Archon's
  guard does not cover.
- Run 2: `ARCHON_HOME=/tmp/archonhome20 archon workflow run beads-dag-drain` →
  **`39e0b79a-e9ee-42f6-94e2-9f814daef158`**, CLI exit 1, node `open` failed (exitCode 1) with the refusal
  line quoted above; `drain`, `review` and `summary` were skipped, and `archon workflow get` reports the run
  `failed` with "node open failed. 3 downstream nodes were skipped".
- `archon workflow cancel 8a4abd4bff6c807d40cf4e96e7e32a07` stopped run 1; as documented, the lock file stayed
  behind (the process tree died, the file did not).
- Run 3: `ARCHON_HOME=/tmp/archonhome20 archon workflow run beads-dag-drain` →
  **`ac1156bc0ecf4898ba267193706a449d`**, `open` exit 0, stdout `opened`, stderr's first line:

```
beads-dag: run lock: stole /tmp/beads-lab-20/.git/beads-dag-run.lock from run
8a4abd4bff6c807d40cf4e96e7e32a07 (pid 2076890); that holder is gone and did not release it
```

  followed by the config line and the repair the killed run had earned (`lab/01: leftover in progress and main
  carries no merge commit of beads/lab/01-add-hello`), and its `run-lock.json` records
  `"stole":{"pid":2076890,"name":"8a4abd4bff6c807d40cf4e96e7e32a07"}`.

**Residual risks and windows left open**

- Liveness is pid liveness (as the Main lock's is): a recycled pid belonging to some other live process would
  look like a live holder and refuse rather than steal. The window is a run's length, as before.
- `releaseRunLock` compares the run id (the lock's identity), not the pid: that is what lets `summary` release
  from its own process and lets a test drive `summarizeDrain` in-process, and a lock another run took carries
  another run id. Two runs sharing an artifacts-directory basename is the only collision, and Archon's run ids
  are unique.
- The lock keys on the Target's `--absolute-git-dir`, the Main lock's directory. A drain started in a *linked
  git worktree* of the same repository resolves a different git directory and would not see this lock — but it
  also treats its own checked-out branch as Main (`mainBranch` reads `HEAD`), so in the pack's own definition
  it is a different Target. Named, not closed.
- `run-lock.json` is written at the end of `open`, after the refusable steps and before the `opened` token, so
  an `open` killed mid-way leaves no record — the lock file still names the holder, and the next open's steal
  line and record carry what it found.
- Archon's own same-home guard means the common two-operator case is refused before the pack speaks; the pack's
  lock is the second line, and the one that covers installs/daemons Archon's per-home state cannot see.
