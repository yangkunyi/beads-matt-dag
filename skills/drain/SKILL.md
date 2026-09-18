---
name: drain
description: Operate a beads-dag drain on a store-backed Target — run one, read its report, brake an issue, and clear the incidents that stop one.
disable-model-invocation: true
---

# Drain

The operator surface for **loom**'s pack (`beads-dag` on disk). Unsure whether to drain, inquire, or
triage? `/ask-loom`.

The store's own commands live in the tracker contract — the installed sibling
`ask-loom/issue-tracker.md`, not a file copied into the repo. This file names the pack and the
`archon` calls that drive it, and points there for everything the store does.

The pack is machine-global: a symlink at `~/.archon/workflows/beads-dag` (from `beads-dag install`).
A Target does not contain a copy. `archon workflow list` shows `beads-dag-drain` when the link is in
place. The drain is that workflow; `beads-dag-execute` is not an entry point.

The operator has two actions: **run a drain**, and **move the gate label**. Everything else a drain
does itself, or the store derives.

## Daily operation

One loop: **publish → gate label → drain → read the report**.

### Publish

`/to-tickets` owns this step: the body file, the bead with its `handle` and `slug` metadata, the
`ready-for-agent` gate label, one `blocks` edge per `Blocked by` entry. Run it, and the rest of this
file is your day — the contract has the command shapes.

### Gate label

`ready-for-agent` is the gate: only a gated issue enters a drain's frontier, and publication applies it.
A blocked issue waits for its blocker's closure by itself, so a fresh day needs nothing here.

The one move that is the operator's: **brake** an issue by moving its label off the gate — `needs-info`
means waiting on a human answer. The contract's "Labels: the gate and the brake" has the command, and
the move is store state, so the brake holds from every side: fresh work, a retried failure, an issue
that was eligible before.

### Drain

From the Target root (archon takes its project from the working directory):

```bash
archon workflow run beads-dag-drain --detach
```

The drain acts on the Target's Main and its store, and disables Archon's own worktree isolation: each
issue gets its own under the Target's `worktrees/`. It opens the store — preflight, then repair of a
killed run's leftovers — loops `pick` (claims up to `concurrency` eligible issues in one transaction)
and `execute` (one issue per worktree; the Target's `verify` command gates the tree before each merge;
merge first, record after), then `review` and `summary`; it ends
when `pick` finds nothing eligible. A blocker's closure inside the run releases its dependent into the
same run — `pick` asks the store again on every cycle — so holding a dependent for a later drain takes
the brake, not the edge.

The loop's cadence is the work rather than a clock: the first `pick` runs once `open` is done, and each next
one runs when the previous batch has finished (every issue in it merged and recorded) — seconds after the
last of them, with a batch as long as its slowest issue. `pick` itself is about two seconds.

So publishing while a drain runs is a move, not a race to avoid. A bead published — and, for an amendment,
a body committed to Main — before the next cycle's read is in that cycle's frontier, and the same run claims
it, fresh ticket or released dependent alike. Only the tail is out of reach: the loop ends on the first
`pick` that comes back empty, so what is published after that read (while `review` and `summary` run) waits
for the next drain. Publishing early is free; publishing at the end costs a run.

Nothing waits for work, though: the pack has no daemon and no mode that blocks on an empty frontier, and a
second drain against this Target is refused by the run lock until the first one ends. "Add work as the
drain goes" therefore means keeping the frontier non-empty ahead of that last read; past it, the next drain
is a second `archon workflow run beads-dag-drain --detach`.

The Target's config is optional at `.scratch/beads-dag.yaml`:

| key | sets |
| --- | --- |
| `model`, `thinkingLevel` | the runner's session |
| `concurrency` | how many issues one `pick` starts at once |
| `runner` | which runner spends a turn: `pi` (the default) or `dsh` |
| `store` | the store binary; the contract's resolution puts this key first, then `bd` on PATH |
| `verify` | the pre-merge gate: one shell command, run in the issue's worktree on the tree that would be merged, immediately before each merge. Unset means no gate runs and nothing is recorded |
| `verifyTimeoutMs` | how long one gate run may take before its process group is killed and the attempt fails (default 15 min) |
| `postMerge` | the post-merge act: one shell command, run **in the Target** after a merge has landed, for keeping something true outside the Target's own git tree (the design repo's own refresh of the machine's installed copies). Unset means no act runs and nothing is recorded |

Absent is fine. The defaults are in
`~/.archon/workflows/beads-dag/beads-dag-drain/scripts/config.ts`.

Find the run, follow it, and read where it got:

```bash
archon workflow runs              # this project's recent runs
archon workflow status            # what is running or paused now
archon workflow wait <run-id>     # block until the run ends or needs a decision
archon workflow get <run-id>      # one run's detail; --json for machine-readable
```

### Read the report

A run's views live under its artifacts directory: `artifacts/runs/<run-id>/` beneath the run's
`output_root`, which `archon workflow get <run-id> --json` reports. A local Target's is
`~/.archon/workspaces/_local/<repo>/artifacts/runs/<run-id>/`.

- `summary.md` — open this first: the summary turn's report on the range, then the run's own blocks
  under it — `## Range`, `## Commits this run did not make`, `## Repairs at open`, `## Failed attempts`
  in that order, the middle two only when they are non-empty.
- `review.md` — the review that summary is built from, one section per axis; a `skip:` line or a
  `review error:` line where no review ran, and either of those leaves the recorded position where the
  run opened it, so the next run covers the same range again.
- `pick-exclusions.json` — why the last `pick` cycle left each issue it offered out, with the rule.
- `run-lock.json` — the run lock this run holds: the run id, the runner's pid, and what dead holder it
  was stolen from when it was; the refused second drain names the same run id.

The range is `review-base..Main`: what no review has covered yet, which is why it can hold an earlier
run's work. `## Range` names its two ends, how many commits Main itself gained in it (its first-parent
line, so a branch's commits arrive inside the merge that brought them) and how many of those were this
run's; `## Commits this run did not make` names the rest — an earlier run's merge, your own commit, a
previous run's bookkeeping — one short SHA and subject per line. They are inside this range, so this
review is where they were read.

`## Repairs at open` names what the opening step did to the leftovers it found: `closed` (its merge had
already landed), `reopened` (Main carries no merge for it, or the issue cannot be named in git), or
`left alone` (a decision issue, which no drain claims), each with its reason. Nothing is owed for a
repair, and a repair is named by the run that performed it: a later run carries only its merge, as a
commit it did not make.

`## Failed attempts` is the brake list: the issues this run attempted and left failing, each with the
number of failures the store records for it — cumulative across drains, so an issue that has burned in
three of them reads 3 — and the latest reason. An issue an opening repair reopened is named too, whether
or not this run retried it. A run with nothing to report writes the one line `none this run` under the
heading.

The numbers are the node's readings, never a model's: the failure count is the store's own answer (the
`attempt N failed:` comments it holds for the issue), the range's counts are git's — both read and
written into the artifact by the node. The summary turn is handed the range and the review and never an
id, a count or a row, and the node appends the blocks after the turn's answer, so a turn that failed or
died leaves them in place.
A run with failures to report and no review to merge keeps its skip line and writes the failures block
under it. The line naming the configuration a run used is in no artifact: `open` prints it on the run's
stderr.

What the report does not carry:

- the failures block names this run's own attempts. An issue that failed in an earlier run and was not
  touched here is not in it; the store holds each issue's own history.
- the range is set by the Target's recorded reviewed position (`refs/beads-dag/reviewed`), never by a
  report: the review node advances that position as soon as it has findings, with no human step in
  between. So a report skimmed, unread, or never written changes nothing about what the next run
  reviews — and a merge no review has covered yet, a killed run's most of all, is inside the next range
  and reviewed there.

Two skips stand in for a review, written by the node and not by a model: `skip: empty diff
<base>...main, skipped` where the range holds no commits, and `skip: only the pack's own bookkeeping
<base>...main, skipped` where it holds nothing the pack did not write itself. Neither spends a session,
and the summary carries the same reason on its own line, behind `skip: review.md:`.

The prose of both artifacts is the model's, language included: the pack's prompts and its config name no
language, so a report comes back in whatever language the runner's model answers in, and a Target that
wants one fixed language pins it in its own configuration — the `model:` it names, and the runner's
settings for it.

## Incidents

**A drain stopped loudly.** Read the run's own record: `archon workflow get <run-id>`, `--verbose
--json` for each node's state and output, and the run's log at
`~/.archon/workspaces/_local/<repo>/logs/<run-id>.jsonl` for what a node printed. `open` writes one line
naming the configuration the run is using — `beads-dag: config: runner=…, model=…, thinkingLevel=…,
concurrency=…, store=…, verify=…, verifyTimeoutMs=…, postMerge=…`, each value followed by its source:
`(default)`, the
Target's resolved config
file, or `PATH` for a store found there — so what actually ran is read rather than guessed. A refusal —
no store in the Target, no store binary, a blocking relation across the domains, another drain already
running against this Target — names the fix. It can arrive at `open`, where it writes nothing at all, or
at a `pick` cycle, which stops the run: work those cycles already merged stands, nothing from the refused
cycle is claimed, and removing the edge is the operator's move before the next drain. The run-lock
refusal names the holder's run id and the pid of the runner that started it, and it refuses rather than
waits — a second drain must not spend a run's length waiting to read a state that would be a run old; a
run killed before its end leaves the lock behind, and the next drain steals a dead holder's lock, so
nothing has to be cleaned up by hand. A runner that cannot start fails the whole drain rather than
recording an attempt on an issue no session ever saw, and the claim it left is repaired by the next
drain's `open`.

**A run's verdict is its own.** Whether a run succeeded is read from its own status and artifacts,
never from a wrapper's exit code — `archon workflow wait` prints `Run … failed.` and still exits 0.

**The store cannot be found.** A machine that drains has the store binary on PATH, or the Target's
`store:` key pointing at it; preflight names every PATH entry it searched and refuses the run before
`pick`. The contract owns the resolution order.

**An issue failed at the gate.** If the Target configured `verify`, the reason on the issue says so:
`attempt N failed: verify failed: …`, followed by the tail of the gate's own output. Nothing merged, so
nothing closed, and the issue is `open` for the next drain; the full output is in the run's
`verify-1.log` (the gate after the implementer's turn) or `verify-2.log` (the gate after a conflict turn),
under the run's artifacts directory. `attempt N failed: verify failed: timed out after Nms: …` means the
gate outlived `verifyTimeoutMs` and its process group was killed. The command is the Target's own — fix
the tree or the command, or brake the issue while you do.

**The Target's post-merge act failed.** It is not an issue failure and must not be read as one: the merge
landed, the issue closed, and the merge stands. The act's failure is on the run's stderr — `merged and
recorded, but the Target's post-merge command failed: …` — and its whole output is in the run's
`post-merge-<handle>.log`. What it means is that whatever the Target keeps true outside its git tree
(the machine's installed copies, in this repository) is now behind Main: `bun tools/flow.ts check` says
by how much, and `install` fixes it.

**An issue failed twice.** The reason is a comment on the issue and the issue is `open` again, so the
store's own ready answer — the query the contract's frontier row names — is the whole retry channel, and
the next drain works it like
fresh work. There is no retry command, and no lever that narrows a drain to one issue: a drain starts
every eligible issue. To stop one burning worker slots, brake it, fix what is wrong, then let it back
in; how often it has burned is the count in `## Failed attempts`, read from the store's comments.

**A run was killed.** The next drain's `open` repairs every issue the killed run left `in_progress`,
from git: Main carries the merge, so the issue is closed with the same `merged <branch>` reason a live
run writes; Main does not, so it goes back to `open` with the reason as a comment. That repair is named
in the repairing run's `## Repairs at open`, and the killed run's merge is inside the same run's range —
no review moved the recorded position — so the range section names it as a commit that run did not make
and the review reads it. A repair reaches only the report of the run that performed it; after that, the
merge is what stays visible.

**Did it claim anything?** The run's `attempted-ids.json` holds the ids it claimed: a run with no
`attempted-ids.json` claimed nothing (an absent file, not `[]`).

**Back the store up.** One pack command, from the Target, once a Dolt remote is configured (the
contract's "Backing the store up"):

```bash
bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts
```

Status history lives only in the store and git carries only the merge commits, so that push is the
backup. After a restore or a pull, the contract's recompute step matters: the store's ready answer
trusts its stored blocked flag.
