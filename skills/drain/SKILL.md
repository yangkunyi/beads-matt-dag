---
name: drain
description: Operate a beads-dag drain on a store-backed Target — run one, read its report, brake an issue, and clear the incidents that stop one.
disable-model-invocation: true
---

# Drain

The operator surface for the `beads-dag` pack. The store's own commands live in the tracker contract,
`docs/agents/issue-tracker.md`; this file names the pack and the `archon` calls that drive it, and
points there for everything the store does.

The pack is a folder installed by copy at `~/.archon/workflows/beads-dag` — the copy is what the runner
reads, so an update is a re-copy — and `archon workflow list` shows `beads-dag-drain` when it is in
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
and `execute` (one issue per worktree; merge first, record after), then `review` and `summary`; it ends
when `pick` finds nothing eligible.

The Target's config is optional at `.scratch/beads-dag.yaml`:

| key | sets |
| --- | --- |
| `model`, `thinkingLevel` | the runner's session |
| `concurrency` | how many issues one `pick` starts at once |
| `runner` | which runner spends a turn: `pi` (the default) or `dsh` |
| `store` | the store binary; the contract's resolution puts this key first, then `bd` on PATH |

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

- `summary.md` — open this first: the reviewers' findings, ranked and merged.
- `review.md` — the findings behind it, one section per review axis.
- `pick-exclusions.json` — why the last `pick` cycle left each issue it offered out, with the rule.

A report covers the diff **this run** merged (`review-base..Main`): bugs and incorrect assumptions in
the diff, missing tests for changed behavior, cross-file breakage. An empty range is a skip line, not an
agent. Today the report carries no failure counts and no repair — a failed attempt is a comment on its
issue, and a repair this run performed at `open` prints on the run's own output.

## Incidents

**A drain stopped loudly.** Read the run's own record: `archon workflow get <run-id>`, `--verbose
--json` for each node's state and output, and the run's log at
`~/.archon/workspaces/_local/<repo>/logs/<run-id>.jsonl` for what a node printed. An `open` refusal (no
store in the Target, no store binary, a `blocks` edge across the domains) names the fix and claimed
nothing; a runner that cannot start fails the whole drain rather than recording an attempt on an issue
no session ever saw, and the claim it left is repaired by the next drain's `open`.

**A run's verdict is its own.** Whether a run succeeded is read from its own status and artifacts,
never from a wrapper's exit code — `archon workflow wait` prints `Run … failed.` and still exits 0.

**The store cannot be found.** A machine that drains has the store binary on PATH, or the Target's
`store:` key pointing at it; preflight names every PATH entry it searched and refuses the run before
`pick`. The contract owns the resolution order.

**An issue failed twice.** The reason is a comment on the issue and the issue is `open` again, so the
store's own ready answer — `bd ready` — is the whole retry channel, and the next drain works it like
fresh work. There is no retry command, and no lever that narrows a drain to one issue: a drain starts
every eligible issue. To stop one burning worker slots, brake it, fix what is wrong, then let it back
in; how often it has burned is in its comments and the store's history.

**A run was killed.** The next drain's `open` repairs every issue the killed run left `in_progress`,
from git: Main carries the merge, so the issue is closed with the same `merged <branch>` reason a live
run writes; Main does not, so it goes back to `open` with the reason as a comment. The repair is named
on the next run's `open` output; the next run's report does not replay it.

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
