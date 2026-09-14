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
`beads-dag-drain/scripts/config.ts`. The opening node prints the effective configuration on stderr — one
line naming each value and whether the Target's file or the built-in default supplied it, the store
binary's resolution on PATH included — so a run says what it runs even when the Target has no file.

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
Open also refuses the run while the graph lets closure cross domains (`Closure never crosses domains`,
below), before anything is claimed or repaired.

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
  is the operator's brake. The drain reads the gate and nothing else: a triage move is the role label
  replacing `ready-for-agent`, and the brake holds from every side — fresh work, a retried failure, an
  issue that was eligible before the label came off — because it is a store state, not a run's memory.
  `wontfix` is a label, never a closure: the issue stays `open`, and whatever waits on it stays blocked.
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
away - and brings Main into it. On a resumed worktree whose branch already conflicts with Main, that
merge is rolled back and deferred: the execution's one conflict turn belongs after the implementer's
turn, where both sides of the conflict include the turn's own work, and the integration there
re-attempts the same merge. A merge that conflicts with nobody to resolve it (a plain failure, not a
conflict under way) still fails the attempt.

The implementer's whole brief is the body's **path** (absolute, and the Target's own published copy, not
a checkout of it): one tool call reads the whole issue. No node writes the body; state lives in the store.

## A conflict is resolved in the same execution

Bringing Main into the worktree is a step inside a running issue: not a state, not a second workflow, and
not something a stdout token gates. The executor does it twice - before the implementer's turn on a
resumed worktree, and again after the turn as the settlement's first half - and the second integration
and the merge into Main are **one Main-lock transaction** (`settle.ts`), so no other writer can land a
change between them.

If that integration conflicts, git leaves the merge standing in the worktree (`MERGE_HEAD` and the
unmerged paths are the record) and the same execution runs the `conflict` role there: the agent reads
the issue's body and the commits on both sides, resolves the hunks, and commits the merge. The executor
does not take the agent's word for it - the turn counts as done only when git says the merge is concluded
and the Main it was merging is in the branch - and then runs the integration and the merge again. The
issue settles exactly as a clean one does.

A merge that is clean starts no conflict turn at all, and an execution runs at most one. If the conflict
turn cannot resolve the merge, the standing merge is rolled back, the reason goes on the issue as a
comment, and the worktree, its branch and its commits stay for the report; the next drain retries it.

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
- **a decision issue.** Nothing in this flow claims one, so an `in_progress` decision issue is the
  wayfinder operator's, not the drain's: the repair leaves it exactly where it found it and reports it on
  stderr, rather than closing or reopening a status it does not own. A decision issue never enters the
  frontier, so its closure never releases implementation work.

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

## Closure never crosses domains

Only the settlement closes an issue, and only to mean the work is in Main (ADR-0004). A decision issue's
`closed` means its question is answered, so an edge from an implementation issue to a decision issue would
let an answer release implementation work that was never built — and the store cannot police it, because
`bd ready` trusts a closed blocker whoever closed it and whatever its type.

So the opening node refuses the whole run while such an edge exists, naming it:

```
closure would cross domains: lab/11 [lab-vn5] is blocked by the decision issue lab/12 [lab-8dx]; an
implementation issue may only be blocked by another implementation issue (ADR-0004), because a decision's
closure means its question is answered, not that work is in Main. Remove the edge with the store's
dependency command (`dep remove <dependent> <blocker>`) or restructure the dependency; nothing was claimed.
```

The drain exits non-zero and nothing is claimed or repaired; removing the edge is the operator's act,
never the drain's. Only blocking (`blocks`) edges are refused — a `relates-to` link carries no blocking,
and implementation-to-implementation blocking is the graph working as designed — and every issue is read,
closed ones included, because a decision the wayfinder has already closed is exactly the state where the
store has released its dependents.

## The drain-end report

The run's two readers report on the range **since the recorded position** — what nobody has looked at
yet. The position is a local git ref in the Target (`refs/beads-dag/reviewed`): a ref, because the fact
is a git fact and a ref can only name a commit in this repository and moves with it; not a file the pack
maintains elsewhere, and not a store field, because it says nothing about any issue (ADR-0005). The
opening node records Main's tip as the first position on a Target that has none — absence is not an
error — and writes `review-base` in the run's artifacts; review and summary read that one artifact, so
both cover the same range and the review's advance below cannot hide the range from the summary.
Nothing before the base is in this run's report.

- **only a review that wrote findings advances the position.** The review node advances it to the
  range's end when review.md holds findings. A skipped review — an empty range, or nothing but the
  pack's own bookkeeping (below) — and a failed one — review.md is the protocol's `review error:` line,
  which is what every axis failing or answering nothing produces — leave the position where the run
  opened it, so the next run reports that range again. A run killed between its merge and its review
  therefore leaves that merge inside the next run's range. The position is never moved backwards.
- **review** (`review.md`) runs one reviewer per axis over the range - bugs and incorrect assumptions
  in the diff, missing tests for changed behavior, cross-file breakage - and joins their sections into
  one artifact. The reviewers fetch the range themselves; the diff is never pasted into a prompt.
- **summary** (`summary.md`) reads review.md and ranks, dedupes and merges the reviews into the one
  report a human reads first, then appends the run's range section and its failures block (below). It
  runs a session only when review.md holds findings; with failures to report and no review to merge it
  writes the failures block itself.

An empty range is a clean no-op, not a failure: both readers spend no agent and write a skip line naming
the empty range — and print the `nothing` token, unless the run has a failure to report, in which case
the summary keeps that line, writes the failures block under it, and prints `reported`. A range holding
nothing but the pack's own bookkeeping is the same no-op with its own reason: the readers recognise a
commit the pack wrote as bookkeeping by its exact subject — shared between the writer and the guard — its
single parent, and a diff confined to the paths that write owns, and skip only when **every** commit in
the range is one of them. One commit the pack did not write, an operator's own included, means the range
is reviewed, the pack's own commits and all. So a drain that merged nothing says so, and a second drain
in the same repository reports exactly what the first drain's review left unviewed (its base is the
recorded position). A reader that wrote a report prints `reported`. The three artifacts live in the
run's `ARTIFACTS_DIR`, beside `pick-exclusions.json`, `attempted-ids.json`, `main-commits.json` and
`repairs.json`.

- **the range section** (at the end of summary.md, above the failures block). The summary node writes it,
  from the run's own record and from git: the range both readers covered, then - when Main gained commits
  in it that this run did not make - one line naming each of them, then the leftovers the opening step
  repaired, **closes included**. A merge this run made and a merge an earlier run made look identical on
  Main (a subject is not a record of authorship), and a repair that closed an issue writes nothing at all
  (its close reason is the settlement's own), so the run writes down what it did: `main-commits.json`, the
  Main commits it made, appended under the Main lock by the settlement and the ignore-rules step, and
  `repairs.json`, written once by the opening node. They are run-scoped bookkeeping, like
  `attempted-ids.json` - read by that run's report, kept nowhere else, and never consulted as state.
- **the failures block** (`## Failed attempts`, at the end of summary.md). The summary node itself writes
  it, from the store: one row per issue this run attempted and left `open` with a failure, each with the
  number of `attempt N failed:` comments the store holds for it (`bd comments <id> --json`) and the latest
  reason. That count is a *reading*, never a counter the pack keeps: the same issue failing in two drains
  reports 1, then 2, and nothing had to be written down to make that true. `bd history` cannot answer it -
  a failure leaves the store's commits and the issue's statuses there, but not the reason; the comment is
  where the reason lives.
- an issue an **opening repair reopened** is named too, with the repair's own reason, whether or not this
  run retried it (its record is a failure comment like any other). A repair that **closed** an issue wrote
  no comment at all, so it has no row here; the range section names it and the merge it closed above.
- nothing is invented: an issue that never failed gets no row, a run with nothing to say writes the one
  line `none this run` under the heading, and a run whose summary is a `skip:` with nothing to report
  keeps that line and gains no block. A run that has failures to report and merged nothing - the run that
  used to print `nothing` while it burned a worker slot - keeps its skip line and writes the block under
  it.
- the numbers are the node's, not a model's: the summary role's brief is the review and the range, the
  blocks are appended after whatever the turn answered, and they are still there when the turn answered
  nothing at all. A Target whose store cannot be read fails the summary node loudly rather than reporting
  that nothing failed.

The position is recorded in the opening node, after its repair: the repair does not move Main (it closes
an issue whose merge already landed, or reopens one that never merged), so the commit recorded is the one
the run opened on. Recording it there, before the loop, is what makes it one commit per run and before
every merge the run can make. It is read there and **only** there — a reader that read the ref again
after the review had advanced it would see an empty range.

Both readers share one wall clock (`REVIEW_WALL_MS`, 30 min) and the same read-only contract as every
worker: the environment the role call carries puts the store in its own read-only mode, so a reader
cannot move the frontier.

## The agent roles

`roles.ts` is the single declaration of each agent role: the arguments it takes, the session key it runs
under, its persona, the brief its prompt is, and how long it may run. A node names its role and hands it
the role's own arguments - nothing else about the role is spelled at a call site. The workflow's `timeout`
is the other half of that agreement and the same test checks it: it must outlast the wall clock of every
role the node's script names (two turns in one node means the sum).

| Role | Turn | Wall clock |
|---|---|---|
| `implement` | one issue, in its worktree, from the body's path | 2 h |
| `conflict` | the merge of Main standing in that worktree, from the same body's path | 2 h |
| `review` | one axis of the drain-end review, over the range this run merged | 30 min |
| `summary` | one report over the review, for the human who reads the run afterwards | 30 min |

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
  stays where the harness keeps it (`DSH_HOME`, its config root); once the harness is closed - it
  finishes writing the turn's tail just after it reports the turn idle - the pack copies that file
  into the run's artifacts as a **view**: `sessions/<key>/<role>.jsonl`, the shape Pi's session file
  has, so a run's artifacts hold one session file per role whichever runner ran it. The result reports
  the copy. Nothing keeps the two in sync and the harness's file is neither moved nor rewritten: an
  artifact the run leaves behind, not a mirror of state (ADR-0005). A copy that cannot happen (the
  harness wrote no session file, the artifacts are not writable) says so on stderr and reports the
  harness's own path, because a turn whose work landed is not failed by its diagnostics.

Either way the answer is read from the runner's own product and nothing else - never its terminal
output, never the value a prompt call returns - and both report the session file on
`PackAgentResult.sessionFile` as diagnostics. A runner that cannot start (an unreachable SDK, a refused
model, no credentials, no `dsh` binary) throws `RunnerUnavailable`: the execute node exits non-zero and
the drain fails loudly, rather than recording a failed attempt on an issue no session ever saw. A runner
that starts and goes wrong is a turn with a `lastError`, and the node's own failure path records it.

## Gates

Both run from this repository, cheapest first, and the store binary sits on `PATH` when they do:

```
bun install                                                        # once: the gate's dev dependencies
bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts   # the repro suite, once
./node_modules/.bin/tsc -p tsconfig.pack.json                      # typecheck, dev-only, not in the pack
```

The suite is run **once, with the store binary on PATH**: a machine that drains has `bd` there - the
premise the pack resolves the binary by - so one `run-all` on that PATH is the whole gate, and there is
no second mode in which it is run with the binary hidden. `BEADS_BIN` is the override for an operator who
keeps the binary somewhere else.

The repro suite drives a real store, never a fake one: it resolves the store binary from `BEADS_BIN`,
then PATH, then `npm prefix -g` plus `/bin/bd`, and fails loudly when it cannot find one — no test skips.
Install it with `npm i -g @beads/bd@1.2.2`, or point `BEADS_BIN` at one. "There is no store binary" is a
repro *inside* that one run, not an argument for a second: `store-open-repro.ts` runs the opening node
against a PATH that cannot resolve a binary and reads the reason it fails with.

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
| `worktree.ts` | the issue's worktree: create, resume, bring Main in, and the standing-merge state |
| `lock.ts` | the Main-write lock: one writer at a time on the Target's branch |
| `main-writes.ts` | every git write to Main: the merge, the ignore line, the removal after a merge |
| `settle.ts` | the one order: merge then record, or record the failure and reopen |
| `reconcile.ts` | the repair of a killed run's leftovers: closed from git, or reopened with a reason |
| `domains.ts` | the domain boundary: the decision type, and the cross-domain graph preflight |
| `failures.ts` | the drain-end failures block: the store's own failure records, and how they read |
| `report-artifacts.ts` | the drain-end artifacts: the range's base, review.md/summary.md, the skip protocol |
| `report-node.ts` | the skeleton both drain-end readers ride: the base, the run's range, the agents, the artifact, and the recognition of a range the pack wrote itself |
| `review-position.ts` | the recorded position: the Target's local ref, how a run opens on it, how a review advances it |
| `run-record.ts` | the run's own bookkeeping: the Main commits it made, the repairs its open performed, the range section |
| `roles.ts` | the role table: a role's arguments, session key, persona, brief, wall clock |
| `prompt.ts` | the personas themselves |
| `agent.ts` | the agent seam: one turn in, one session's report out, and the two runners behind it |
| `pi-session.ts` | the Pi runner: the SDK ladder, the session file, the answer reader, the bash spawn hook |
| `dsh-agent.ts` | the dsh runner's policy: profile, gateway, effort fold, wall-clock kill, and the session view it leaves under the run's artifacts |
| `dsh-runtime.ts` | the dsh wire protocol, with no pack nouns |
| `worker-env.ts` | the environment a worker runs under (the store's read-only mode) |
