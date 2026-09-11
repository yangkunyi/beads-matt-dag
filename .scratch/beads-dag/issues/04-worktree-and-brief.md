# 04 — One issue, one worktree, one brief

**What to build:** Given a claimed issue, the executor derives everything it needs from the issue's two
metadata keys — the body's path, the branch name, the worktree name — creates the worktree from Main,
brings Main into it, and hands the implementer the body's **path** as its whole brief. The role protocol
says which role is running, what it may do and how long it may run; a node names its role and nothing
else. The implementer cannot write issue state: the environment it runs under is read-only against the
store.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `03`
**Status:** BLOCKED

- [x] the worktree and its branch are named from the issue, and nothing globs a directory to find them
- [x] the implementer receives the body's path and can read the whole issue from it
- [x] the brief cannot change once published: no node in the pack writes the body
- [x] the role protocol is the single declaration of each role's arguments, persona and wall clock
- [x] a worker that attempts to write the store is refused
- [x] the worktree ends holding the implementer's commits, on a branch off Main

## Comments

Built. The executor takes a claimed issue and, from the issue's two metadata keys alone, derives its
body's path, its branch and its worktree, creates the worktree from Main (or resumes the one an earlier
attempt left), brings Main into it, and hands the implementer the body's **path** as its whole brief,
under the `implement` role. The environment the drain hands the worker carries the store's own read-only
mode, so a worker's write attempt is refused by the store and not by a sentence in a persona.

**Gates, verbatim**

```
$ bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
11/11 repros passed
$ PATH=/data3/yky/.local/node-v24.19.0-linux-x64/bin:$PATH bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
… 11/11 repros passed
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

Both suite runs are with no `BEADS_BIN`. The store-dir-first run is the one that used to be 6/7.

**The defect ticket 03 reported, fixed.** `store-open-repro.ts` asserted that the "cannot find the store
binary" message contains the *first entry of the ambient PATH* — false whenever the store binary's own
directory is first on PATH, which is exactly the PATH the suite runs nothing under. It now drives `open`
with a PATH the test chooses and asserts the message names every directory it searched (and says
`looked in:`). Measured before the fix: plain `7/7`, store-dir-first `6/7` (*"the reason lists where it
looked"*). After: `11/11` in both. The fix's mutation: drop the `(looked in: …)` clause from
`resolveStore` → *"the reason lists every directory it searched"*.

**Evidence per criterion**

1. *Named from the issue, nothing globs.* `worktree-repro.ts`: an issue `feat/07`/`one-worktree` yields
   exactly `<target>/worktrees/feat-07-one-worktree` on branch `beads/feat/07-one-worktree`, registered
   with git, with Main as its merge base. A real worktree of another branch at
   `worktrees/feat-07-elsewhere` (chosen to sit where a listing by feature and number would find it) is
   left alone while the issue's own path is created. A handle the store does not carry, an issue with no
   `slug`, two issues sharing one handle, and a handle like `../01` each fail the node, non-zero, naming
   what was missing, with no worktree created.
2. *The path, whole.* `brief-repro.ts`: the stub agent is handed `prompt` = the absolute published body
   path (`<target>/.scratch/feat/issues/01-the-whole-issue.md`) and reads the whole issue from it, byte
   for byte, while running in the issue's worktree.
3. *Frozen.* `brief-repro.ts`: the body's bytes and its mtime are unchanged after a run (the mtime is
   pinned to a past instant no rewrite could reproduce); a second run completes with the body file
   `0444`, so any write attempt would fail the run; and the one module that derives the body's path
   carries no write call at all.
4. *The role protocol.* `roles-repro.ts`: one table entry per role declaring `sessionKey`, `persona`,
   `prompt` and `wallMs`; `roleAgent` composes the seam's options from the table, the call's arguments
   and the config; the executor's source names `role: "implement"` and spells no `wallMs`, `persona` or
   `prompt` of its own; every role a node body names is declared and every declared role is a node's to
   run. `yaml-contract-repro.ts` checks the other half: the `execute` node's `timeout` (7 500 000 ms)
   outlasts the wall clocks of the roles its script names (2 h), summing them so ticket 08's second turn
   cannot be forgotten.
5. *The refused write.* `worker-readonly-repro.ts`: the stub worker runs a real `bd update <id> -s closed`
   under `opts.env(process.env)` — the environment the pack assembles for it — and the store refuses it
   (`exit 1`, *"operation 'update' is not allowed in read-only mode"*), the issue stays `in_progress`,
   and a `show` under the same environment still works. The control is the same write with the same store
   and issue but without the worker's environment, and it is accepted — so the refusal is the
   environment's doing.
6. *The commits.* `worktree-repro.ts`: the stub implementer commits in the worktree; the worktree's HEAD
   is the issue's branch, its tip is that commit, `main..HEAD` counts one, and Main has not moved. A
   second attempt on the same issue reuses the one worktree (a `readdirSync` of `worktrees/` shows
   exactly one entry), brings a Main that moved in the meantime into it, and keeps both attempts'
   commits.

**Mutation proofs.** Every new text-level assertion was shown to fail on a mutated copy of the pack under
`/tmp` (one copy per case, nothing in the repo touched): an undeclared role name → *"execute names a
declared role"* (both `roles-repro` and `yaml-contract-repro`); a `wallMs` at the call site → *"the
executor spells no wallMs of its own"*; the role table reading the filesystem → *"the role table reads no
filesystem"*; the role table naming the store binary → *"the role table writes no store command"*; the
table losing `wallMs` → *"implement declares its session key, persona, brief and wall clock"*; a
`timeout: 1000` → *"execute outlasts the wall clocks of implement"*; the executor importing the store
through a re-export → *"execute imports the store module"*; a `writeFileSync` in the naming rule →
*"the naming rule carries no write of any kind"*; the PATH message losing its list → *"the reason lists
every directory it searched"*. Two behavioural mutations too: finding the worktree by listing
`worktrees/` → *"…/feat-07-elsewhere is a worktree on decoy, not on beads/feat/07-one-worktree"*; the
worker's environment without the read-only mode → the write attempt is no longer refused.

**Acceptance under the runner.** After `rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`, in a fresh `/tmp` lab (`bd init --prefix lab
--non-interactive --skip-agents --skip-hooks`, `/worktrees/` ignored, one eligible issue `lab/01` with a
published body): `archon workflow run beads-dag-drain --detach` → run
`4d2b6176a83eda6dd2f8e1cb41699960`, **completed**. Its node log: `open` 568 ms, `pick` 820 ms, one
`execute` instance 634 ms, second `pick` 452 ms with an empty fan-out, `review` 109 ms, `summary`
111 ms, "Workflow completed successfully". The Target afterwards: worktree
`worktrees/lab-01-a-lab-issue` on branch `beads/lab/01-a-lab-issue` at Main's tip (its base is Main),
`git status` clean, no new commit on Main; the store says `lab-kxx` (`lab/01`) `in_progress`;
`attempted-ids.json` is `["lab-kxx"]` and the last `pick-exclusions.json` is
`{"picked": [], "excluded": []}`; the published body's md5 is unchanged. `execute`'s stderr on that run:
`lab/01: no pi session ran: this slice of the pack starts no runner yet` — the honest outcome of a turn
that started nothing.

**Deviations, each deliberate**

- **The outcome after a successful turn is `failed`, until 05 settles.** The implementer's commits are in
  the worktree; nothing is in Main; so the node reports the only true outcome available. Reporting
  `merged` now would be the lie ADR-0002 exists to forbid. Tests pin the token and the reason
  (`"the work is in the worktree, not in Main: the merge and its record arrive with the settlement"`), so
  05 changes a visible expectation rather than a hidden one.
- **Main is brought into the worktree before the implementer's turn, as this ticket's sentence has it.**
  At creation that is a no-op; on a resumed worktree it is what stops an attempt working against a Main
  that moved while the issue waited. `bringMainIn` is exported: 05/08 may call it again after the turn
  (the spec's "implement, integrate Main into the worktree, merge") without a second helper.
- **`defaultAgent` starts nothing.** The pi and dsh sessions arrive with 06; until then the seam returns
  "no answer" with a reason, and the node reports `failed`. That keeps a real drain runnable end to end
  (the acceptance above) and keeps "a work outcome exits 0" exercised through the node.
- **The pack does not write the Target's `.gitignore`.** `/worktrees/` has to be ignored for Main to stay
  clean, but that is a Main write and the Main-write lock arrives with 05; the lab sets it itself. 05 owns
  the decision.
- **No `.venv`/`uv sync` rule in the worker's environment.** The predecessor's per-worktree toolchain is
  not carried here: nothing in this ticket's criteria or the spec asks for it, and the read-only rule is
  the environment's one job in this slice.
- **`issueByHandle` uses `bd list --metadata-field handle=… --all`** (verified on v1.2.2): an exact
  metadata match, all statuses, so a repair path can look up a closed issue too. Two issues carrying one
  handle throw rather than either being chosen.
- **The handle rule rejects `.`/`..` segments** and other characters that cannot be pasted into a git ref
  and a filesystem path, so a published handle can never make the body's path climb out of `.scratch/`.
- `store.ts` gained a private `issueList`, so its two list queries share one place where "the store
  answered with something that is not an issue" is decided.

**Surface the later tickets build on**

- **The naming rule** — `scripts/naming.ts`: `issueNames({id, handle, slug})` → `{handle, branch,
  worktreeRel, bodyRel}`; `bodyPath(target, names)` → the absolute brief. The bead's id appears nowhere in
  git: branch `beads/<feature>/<NN>-<slug>`, worktree `worktrees/<feature>-<NN>-<slug>`, body
  `.scratch/<feature>/issues/<NN>-<slug>.md`. 05's merge subject and 07's branch lookup derive from
  `issueNames`, never from a directory listing.
- **The worktree helper** — `scripts/worktree.ts`: `mainBranch(target)`,
  `ensureWorktree(target, names)` → `{path, branch, created}`, `bringMainIn(worktree, main)` (throws with
  git's own words; a conflict is left standing in the worktree's git state). 05 adds
  removal-after-merge and the Main write; 08 branches on the conflict `bringMainIn` leaves behind.
- **The role protocol** — `scripts/roles.ts`: `ROLES` (one entry per role: `sessionKey`, `persona`,
  `prompt`, `wallMs`), `AGENT_WALL_MS` (2 h), `roleAgent(call)` → the agent seam's options. A node names
  its role and hands the role's declared arguments; 06 adds `resolve` and the runner modules behind
  `agent.ts`, 10 adds `review` and `summary` (its YAML timeouts are checked against the same table).
- **The agent seam** — `scripts/agent.ts`: `PackAgentOpts`, `PackAgentResult` (`sessionFile`, `answer`,
  `lastError`), `AgentRunner`, `defaultAgent`. 06 replaces `defaultAgent` with the pi and dsh sessions
  and nothing else about the seam.
- **The worker's environment** — `scripts/worker-env.ts`: `READONLY_ENV` (`BD_READONLY`) and
  `workerEnv(base)`, applied by `roleAgent` as the `env` transform on every role call, so whichever
  runner runs a turn applies the read-only rule to that turn's whole process tree.
