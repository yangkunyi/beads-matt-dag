---
name: implement
description: "Implement a piece of work from a spec or an issue's published body, on the branch its handle names."
disable-model-invocation: true
---

Implement the work described by the user in a spec or an issue.

An issue reaches you as a **handle** (`<feature>/<NN>`) and the **path to its published body**. Read the body first: it is what to build, it is frozen, and the issue's state is the tracker's — the contract (`docs/agents/issue-tracker.md`) owns how an issue is read and written. A spec path is a brief too, and a spec is not an issue: it has no handle, no claim and no branch of its own, so its work happens on the branch you are already on.

## Where the work goes

Work on the branch the issue's handle and slug name, in the worktree they name. The contract's naming table derives the branch, the worktree and the body's path from those two keys, and it is the same derivation a drain makes: the next drain's opening step, repairing a stopped attempt, looks for a merge of exactly that branch on Main, and a branch named anything else is invisible to it.

A drain-launched worker is already in its worktree, on its branch. Run by hand, create both yourself, at those names, from Main.

## State

Which store writes are yours depends on how you were started:

- **A drain-launched worker makes no store writes.** The pack runs a worker with the store in read-only mode — `BD_READONLY=1`, set by the drain's `worker-env.ts` for the worker's whole process tree — so a claim, a status, a label, an edge and a comment are all refused by the store itself. The drain claimed the issue, and the drain records what happens to it.
- **A hand-run claims first.** The claim is the contract's own move (its "The frontier and the claim" section), and it is what takes the issue out of every drain's frontier: make it before the first commit, so nothing else starts the issue alongside you.

Closing is never yours. `closed` means the work is in Main: the merge lands first, and the close is written after it, naming the merged branch, by the orchestrator — the contract's "Closing, and failure" owns it. An attempt that does not land leaves the issue where it is; a claim left standing is repaired by the next drain's opening step, from git.

## The work

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch: those commits are the issue's work, and the merge that follows brings them into Main.
