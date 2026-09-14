SOURCE-URL: https://conductor.build/docs/concepts/git-worktrees.md
FETCHED: 2026-09-14T17:19:49+08:00
HTTP: 200

---
title: "Git worktrees"
url: "/docs/concepts/git-worktrees"
description: "Understand how Conductor uses Git worktrees to create isolated coding-agent workspaces"
---

# Git worktrees



Conductor uses Git worktrees to give each workspace its own files, branch, commands, chats, and review flow.

A Git worktree is a second working tree attached to the same repository. Instead of copying the whole project or asking several agents to share one checkout, Conductor creates a separate working tree for each workspace. That lets agents work in parallel without editing the same files on disk.

For Git's own reference, see the official [Git worktree documentation](https://git-scm.com/docs/git-worktree).

## How Conductor uses worktrees [#how-conductor-uses-worktrees]

When you create a workspace, Conductor creates a Git worktree for that workspace and checks out a branch inside it.

That workspace becomes the container for the rest of the workflow:

* The agent edits files inside the workspace directory.
* Setup, run, terminal, and test commands execute from that workspace directory.
* The workspace branch becomes the unit you review, push, and turn into a pull request.
* Chats, diffs, PR state, and archive actions stay attached to the same workspace.
* Workspace notes and handoffs can live in the gitignored `.context` folder.

The original repository checkout remains the project root. Conductor workspaces are usually created under `~/conductor/workspaces/<repo name>/<workspace name>`, but each one is still connected to the same underlying Git repository.

## What is isolated [#what-is-isolated]

Each Conductor workspace gets its own working tree. That means code changes, generated files, local terminal commands, and running app processes can belong to one task instead of your main checkout or another agent's task.

This is the foundation for parallel agents in Conductor:

* One workspace can implement a feature while another investigates a bug.
* One branch can be reviewed and merged while another stays experimental.
* One agent can run a dev server or tests without taking over another workspace's terminal state.

Workspace isolation is development isolation, not a security boundary. Agents and commands still run on your Mac with your user permissions unless you configure stricter controls.

## What is shared [#what-is-shared]

Worktrees share the same Git repository data. They use the same history, refs, remotes, and object database, while each workspace has its own checkout on disk.

That shared Git backing is why Conductor can create a workspace quickly without cloning the repository again. It is also why normal Git operations still work: you can commit, rename branches, push to `origin`, open a PR, or merge from the Conductor UI or the terminal.

## What Conductor copies [#what-conductor-copies]

A new worktree starts from tracked files. Git does not automatically bring along untracked or gitignored local files from your main checkout.

That matters for files such as:

* `.env.local`
* local certificates
* generated configuration
* tool state that is intentionally gitignored

Use [Files to copy](/docs/reference/files-to-copy) when every new workspace needs specific gitignored files. Conductor uses `.worktreeinclude`-style patterns and only copies files that Git already ignores.

Use a [setup script](/docs/reference/scripts#setup-scripts) when the workspace needs commands instead of copied files, such as dependency installation, code generation, symlinks, or database setup.

## Branches and worktrees [#branches-and-worktrees]

Git only allows a branch to be checked out in one worktree at a time.

In Conductor, that means a workspace branch usually belongs to exactly one workspace. If a branch is already checked out in one workspace, Git will not let another workspace or your project root check out that same branch at the same time.

Use one of these patterns when you need similar work in more than one place:

* Give each worktree its own branch.
* Create a new branch from the existing branch.
* Switch the first workspace to a different branch before checking out the branch somewhere else.

Conductor's workspace and PR flow is built around this rule. A workspace branch is the review unit, and the workspace keeps the agent sessions, diff, terminal state, and PR status together.

## When to create another workspace [#when-to-create-another-workspace]

Create another Conductor workspace when work should have its own branch, files, running environment, and review path.

Keep agents in one workspace when they need to collaborate on the same branch and latest file state.

For the decision model, see [Parallel agents](/docs/concepts/parallel-agents). For the full Conductor workspace model, see [Isolated workspaces](/docs/concepts/workspaces-and-branches).

## How this differs from raw Git worktrees [#how-this-differs-from-raw-git-worktrees]

Raw Git worktrees give you separate checkouts. Conductor builds the agent workflow around those checkouts.

Conductor handles the recurring workspace operations: creating the branch and worktree, copying allowed local files, running setup and run scripts, keeping the diff visible, connecting pull request state, and archiving the workspace when the task is done.

You can still use normal Git commands inside a workspace. Conductor is adding structure around the worktree so each agent task has a clear place to run, review, merge, or discard.
