# beads-dag

The Archon pack that drains implementation issues from a Target whose issues live in a store. The design
it is built against is `docs/specs/2026-09-11-beads-dag.md`, with the decision record behind it in
`docs/specs/2026-09-11-beads-issue-tracker-consensus.md`, the ADRs in `docs/adr/`, and the vocabulary in
`docs/CONTEXT.md`.

## Install

Copy the folder — copy, not a symlink, because the runner reads it as its own:

```
cp -r .archon/workflows/beads-dag ~/.archon/workflows/beads-dag
```

Then, from the Target:

```
archon workflow run beads-dag-drain --detach
```

The Target does not commit `.archon/`. Its config is optional and lives at `.scratch/beads-dag.yaml`; the
keys are `model`, `thinkingLevel`, `concurrency`, `runner` and `store`, and the defaults are in
`beads-dag-drain/scripts/config.ts`.

## The store

A Target owns a real beads store in its own `.beads/`. The drain opens it before anything else, so a
broken or missing store fails at the opening node — before pick, before a worktree — naming what was
missing and everywhere it looked. The store binary is resolved with the Target's config override first,
then from the environment:

```yaml
store: /home/me/.local/node-v24.19.0-linux-x64/bin/bd   # optional; unset, bd is looked for on PATH
```

One module builds every store command for the pack: `beads-dag-drain/scripts/store.ts`. Nothing else in
either workflow folder names the binary, and the suite asserts that. The store's derived blocked-ness is
recomputed at open, so a change made outside the drain cannot leave a stale answer behind — and work a
killed run left claimed is repaired there too, before pick (`Leftovers are repaired from git`, below).

**Back the store up to its Dolt remote** — one command, from the Target, once the remote is configured
(`bd dolt remote add <name> <url>`):

```
bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts
```

## The frontier

The drain starts what the store says can start, minus what the store cannot know. `pick` asks one
question — `bd ready`, the whole answer, not the store's default cap — and then applies three rules:

- **the other domain.** Type `decision` never enters a drain, excluded by type, so a new flavour of
  question cannot leak in by omission.
- **the gate label.** An issue without `ready-for-agent` is not the drain's work; pulling that label back
  is the operator's brake.
- **what this run already tried.** The store cannot know it: a failed attempt records its reason as a
  comment and puts the issue back to `open`, so the retry channel is the store's own ready answer, and
  the only thing that stops a run retrying its own failure is the run's `attempted-ids.json`. A drain
  with no attempts of its own works such an issue exactly like fresh work.

What is left is truncated to the configured `concurrency` and claimed in **one transaction** (`bd batch`,
all-or-nothing), so a claim that fails part-way leaves nothing claimed. Every issue the store offered and
this step left out is written to `pick-exclusions.json` in the run's artifacts, with the rule that
excluded it — so a drain that did nothing can say why. The file is rewritten each cycle: it describes the
cycle that just ran, and the cycles before it are in the store's own history.

## One issue, one worktree, one brief

An issue's git identity comes from its two metadata keys, and from nothing else:

| Key | Carries |
|---|---|
| `handle` | `<feature>/<NN>`, the human-readable identifier |
| `slug` | the one path segment the names end with |

From those two, `naming.ts` derives every name the issue has in git:

```
branch        beads/<feature>/<NN>-<slug>
worktree      worktrees/<feature>-<NN>-<slug>
body          .scratch/<feature>/issues/<NN>-<slug>.md
```

The bead's own id never appears in git, so the store can be restored or rewritten without invalidating
the code's history. A name is computed, never discovered: nothing lists `worktrees/` looking for a
candidate, and an issue whose metadata cannot name a place fails the node instead of starting work
somewhere nobody can name.

`worktree.ts` creates that worktree from Main (`git worktree add -b <branch> <path> <main>`), or resumes
the one an earlier attempt left - the branch is the issue's, so re-creating it would throw that attempt
away - and brings Main into it. A merge that conflicts is left standing: the worktree's own git state is
where this flow records a merge under way.

The implementer's whole brief is the body's **path** (absolute, and the Target's own published copy, not
a checkout of it): one tool call reads the whole issue. No node writes the body; state lives in the store.

## The settlement: merge, then record

An issue's turn ends in one of two settlements, and there is only one order in which either can happen.

**Merged.** The issue's branch is merged into Main first - a real merge (`--no-ff`), so the merge commit
exists on Main to be found later - and only once that has landed is the issue closed in the store, with
`merged <branch>` as the reason. The worktree and its branch are dropped last, and only because Main now
carries the merge. So `closed` always has its merge commit behind it, and the one dangerous
interleaving - a store saying the work is done while Main is missing it, releasing dependents against
nothing - cannot arise. The other interleaving is safe and repairable: a run killed between the merge and
the record leaves the issue `in_progress` while its work is in Main, and the next drain's opening
reconcile reads git and closes it.

**Failed.** Nothing merged, so nothing closes. The reason becomes a comment - `attempt N failed: <reason>`
- and the issue goes back to `open`, which is the retry channel itself: the next drain works it exactly
like fresh work, and the run that failed it is kept off by its own `attempted-ids.json`. Nothing was
closed, so its dependents stay blocked exactly where they were, and the worktree and branch are left for
the report.

**The lock guards git, not the store** (ADR-0002). Every function that writes Main (`main-writes.ts`)
refuses to run unless the caller holds the Main-write lock; the store write that records an outcome is
deliberately outside it, under the store's own transaction. The lock is one file in the Target's git
directory (`beads-dag.lock`): a second process waits for it, a call made while this process holds it
joins the same transaction, and a lock left behind by a killed run (its pid gone) is stolen rather than
waited for. `main-writes.ts` also writes the `.gitignore` rules that keep the checkout clean - `/worktrees/`
and `/.beads/interactions.jsonl` - and untracks the store's interaction log, which `bd init` commits and
every command rewrites. Ignored-but-tracked still reads as dirty, so untracking it is part of the same
idempotent, under-the-lock commit; a Target that already carries both rules gains no commit.

## Leftovers are repaired from git

A drain can be killed between the merge and the store write, or before its work landed at all. Either way
the issue is left `in_progress`, and a later drain's `bd ready` will never see it — so the opening node
repairs every `in_progress` issue it finds, and decides from **git**, because the store is the thing being
repaired:

- **the merge landed.** Main carries a merge commit whose subject names the issue's branch *and* whose
  second parent is that branch's own tip, so the repair records the close the killed run never wrote — the
  same `merged <branch>` reason the settlement would have written — and drops the worktree and branch the
  settled path would have dropped. The merge commit is found, never made a second time.
- **the work never landed.** The issue goes back to `open` with a comment on it — `attempt N failed:
  leftover in progress and main carries no merge commit of <branch>` — and its worktree and branch are
  left for the report, exactly as an ordinary failed attempt leaves them.
- **the issue cannot be named in git** (no `handle`/`slug` metadata): it goes back to `open` with the
  naming failure as its reason, rather than one unresolvable issue failing the whole drain.

A repaired failure is deliberately **not** put in the run's `attempted-ids.json`: this run never attempted
it, so the same run's `pick` offers it as a retry. That is what running the repair before pick is for. A
branch that carries only history Main already had — an attempt killed before its first commit, or a branch
re-created from Main after an earlier attempt of the same issue merged — is not merged work: the merge
that counts is one whose subject names the branch *and* whose second parent is the branch's own tip, so
neither an earlier attempt's merge nor a merge that merely mentions the branch in its subject can be
mistaken for this attempt landing.

The store is never the evidence: an issue's `in_progress` says it was claimed, and only Main says whether
the claim's work landed. A repaired issue is therefore never worse off than one the settlement recorded
itself, and the two resolutions it can take are the same two the settle step has.

## The agent roles

`roles.ts` is the single declaration of each agent role: the arguments it takes, the session key it runs
under, its persona, the brief its prompt is, and how long it may run. A node names its role and hands it
the role's own arguments - nothing else about the role is spelled at a call site. The workflow's `timeout`
is the other half of that agreement and the same test checks it: it must outlast the wall clock of every
role the node's script names (two turns in one node means the sum).

| Role | Turn | Wall clock |
|---|---|---|
| `implement` | one issue, in its worktree, from the body's path | 2 h |

**A worker cannot write issue state**, and the mechanism is the store's own read-only mode rather than a
sentence in a persona: `workerEnv` (worker-env.ts) adds `BD_READONLY=1` to the environment the drain hands
the runner, and the store then refuses every write operation for that whole process tree - a shell, a
child, a command through a tool - while reads keep working.

**The runners.** `agent.ts` is the seam; the Target's `runner:` key picks which one a turn spends.

- `pi` (default) runs the session in-process through the Pi SDK (`pi-session.ts`). The SDK is loaded at
  run time by a ladder - `PI_SDK_PATH` first, then the bare package name, then the `pi` CLI's own
  install tree and this process's global `node_modules` - because an Archon run executes the pack with
  no `node_modules` above it. The session file is contract-pinned: `ARTIFACTS_DIR/sessions/<key>/<role>.jsonl`,
  and the answer is read back from that file's last assistant text. The session mounts one custom tool,
  Pi's own bash definition with the seam's environment on its spawn context, which is how the store's
  read-only mode reaches the agent's shells.
- `dsh` runs the harness as a child over JSON-RPC (`dsh-agent.ts`, `dsh-runtime.ts`). It carries the
  persona as the harness system prompt and the brief as the first message, folds the seven thinking
  levels onto dsh's four efforts, and enforces the wall clock by killing the child. Its session log
  stays where the harness keeps it (`DSH_HOME`, its config root); the result reports that real path.

Either way the answer is read from the runner's own product and nothing else - never its terminal
output, never the value a prompt call returns - and both report the session file on
`PackAgentResult.sessionFile` as diagnostics. A runner that cannot start (an unreachable SDK, a refused
model, no credentials, no `dsh` binary) throws `RunnerUnavailable`: the execute node exits non-zero and
the drain fails loudly, rather than recording a failed attempt on an issue no session ever saw. A runner
that starts and goes wrong is a turn with a `lastError`, and the node's own failure path records it.

## Gates

All three run from this repository, cheapest first.

```
bun install                                                        # once: the gate's dev dependencies
bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts   # the repro suite
./node_modules/.bin/tsc -p tsconfig.pack.json                      # typecheck, dev-only, not in the pack
```

The repro suite drives a real store, never a fake one: it resolves the store binary from `BEADS_BIN`,
then PATH, then `npm prefix -g` plus `/bin/bd`, and fails loudly when it cannot find one — no test skips.
Install it with `npm i -g @beads/bd@1.2.2`, or point `BEADS_BIN` at one.

The third gate is the acceptance: a real `archon workflow run` against a throwaway Target. It runs once
per release rather than per change, and never against a Target someone is draining.

## Layout

```
beads-dag-drain/     the drain: open, the loop (pick, execute), then the two readers, and backup.ts,
                     the operator's one-command store backup
beads-dag-execute/   one issue, start to finish. Not a public entry: its issue input is required.
```

A workflow folder holds its YAML, its `scripts/` (each entry script is a node that folder's YAML declares),
and, for the drain, its `tests/`. `backup.ts` sits beside the YAML rather than in `scripts/` because it is
an operator command, not a node. A module may be imported across the two folders; a node body may not,
because the folder whose YAML declares a node is where that node's script resolves.

The modules the two workflows share, all in the drain's `scripts/`:

| Module | Owns |
|---|---|
| `store.ts` | every store command: the binary, its arguments, its working directory |
| `naming.ts` | the one derivation of an issue's branch, worktree and body path |
| `git.ts` | git plumbing: the two calls the readers and writers share |
| `worktree.ts` | the issue's worktree: create, resume, bring Main in |
| `lock.ts` | the Main-write lock: one writer at a time on the Target's branch |
| `main-writes.ts` | every git write to Main: the merge, the ignore line, the removal after a merge |
| `settle.ts` | the one order: merge then record, or record the failure and reopen |
| `reconcile.ts` | the repair of a killed run's leftovers: closed from git, or reopened with a reason |
| `roles.ts` | the role table: a role's arguments, session key, persona, brief, wall clock |
| `prompt.ts` | the personas themselves |
| `agent.ts` | the agent seam: one turn in, one session's report out, and the two runners behind it |
| `pi-session.ts` | the Pi runner: the SDK ladder, the session file, the answer reader, the bash spawn hook |
| `dsh-agent.ts` | the dsh runner's policy: profile, gateway, effort fold, wall-clock kill |
| `dsh-runtime.ts` | the dsh wire protocol, with no pack nouns |
| `worker-env.ts` | the environment a worker runs under (the store's read-only mode) |
