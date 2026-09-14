SOURCE-URL: https://docs.devin.ai/work-with-devin/stacked-prs.md
FETCHED: 2026-09-14T17:16:55+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Stacked PRs

> How Devin splits large changes into ordered, reviewable stacks of pull requests

When a task is too large to review comfortably as a single PR, Devin can split it into a **stack**: an ordered series of pull requests that make up one piece of work and land together, bottom-up. Each PR in the stack is a normal, focused PR that builds on the one below it — reviewers read one small, self-contained change at a time instead of a single monolithic diff.

Devin's stacks are built on GitHub's native stacked pull requests, so a stack is a first-class GitHub object — not a convention held together by branch naming.

<Note>
  Stacked PRs are supported for **GitHub.com repositories only**. GitHub
  Enterprise Server, GitLab, and other providers do not have a stacked PR API.
</Note>

## How a Stack Works

A stack is a patch series:

* PRs are ordered bottom-to-top. The bottom PR targets your trunk branch (e.g. `main`); every other PR's base branch is the head branch of the PR below it.
* Because each PR is diffed against the layer below it, every PR shows only its own change — nothing bleeds in from the layers above or below.
* The stack lands bottom-up. Merging a PR in the stack also merges every open PR below it, atomically, in a single operation. As lower PRs merge, GitHub automatically retargets the remaining PRs onto the trunk branch.

## When Devin Creates a Stack

Devin stacks deliberately, not opportunistically. It creates a stack only when it has intentionally decomposed one piece of work into an ordered series of PRs designed to land together — for example, a schema change, then the service layer that uses it, then the UI on top. PRs that merely happen to be based on another PR's branch are not grouped into a stack.

When Devin plans a stack, it:

1. **Announces the stack** by name before creating any PRs, so you can see the series taking shape in your session.
2. **Creates each PR** as a normal, focused PR — with its own description and its own CI — each one targeting the head branch of the PR below it.
3. **Groups the PRs into a stack** on GitHub once they exist.

Every layer is held to the same standard as any standalone PR Devin ships: a minimal, focused diff and a high-signal description written for a reviewer who hasn't seen the code.

## Keeping the Stack Coherent

A stack isn't frozen once it's created. Devin stays attached to every PR in the stack for the life of the session:

* **Conflict resolution** — If any layer develops merge conflicts with the branch below it (for example, after review feedback lands on a lower layer or the trunk moves underneath the stack), Devin is notified automatically and resolves the conflicts silently. It only asks you when a conflict reflects a substantive decision that needs your input.
* **CI across the stack** — Devin watches CI for every layer and fixes failures as they appear, tracking the readiness of the whole series rather than babysitting PRs one at a time.
* **Automatic retargeting** — As the bottom of the stack merges, GitHub retargets the remaining PRs onto trunk. No manual rebase bookkeeping is required.

## Working with Stacks

You can direct Devin's stacking behavior in a session:

* Ask Devin to split a large change into a stack, or to keep the work as a single PR.
* Ask Devin to add follow-up PRs to the top of an existing stack.
* Ask Devin to check the status of a stack — it reports each layer's state, CI, review decision, and mergeability.
* Ask Devin to **unstack** — the stack is dissolved and its unmerged PRs become independent PRs again, with their branches left as-is. Already-merged layers stay merged.

In the session view, PRs that belong to a stack show their stack membership, and announced stacks appear before their PRs exist so you can follow along as Devin builds the series.

## Reviewing and Merging Stacks

[Devin Review](/work-with-devin/devin-review#stacked-prs) treats stacks as first-class: the whole series is visible at a glance with per-layer readiness, and merging happens through the atomic bottom-up stack merge. See the [Stacked PRs section of the Devin Review docs](/work-with-devin/devin-review#stacked-prs) for details.

## Limitations

* **GitHub.com only** — stacks are not available on GitHub Enterprise Server, GitLab, Bitbucket, or Azure DevOps.
* **Stack size** — a stack contains between 2 and 100 PRs.
* **Merging** — stacked PRs cannot be merged through GitHub's regular merge flow; they merge through the stack merge, which lands the selected PR and every open PR below it together.
