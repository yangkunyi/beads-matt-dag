SOURCE-URL: https://kiro.dev/docs/crew/features/workflows.md
FETCHED: 2026-09-14T17:16:01+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Workflows

> Orchestrate agents across sessions with the built-in conductor, a versioned global workflow library, and cross-session message delivery.

Some work is too structured for one agent turn and too branching for a single [Task Runner](https://kiro.dev/docs/crew/features/task-runner.md) spec. A workflow is an authored Python script that orchestrates many agents through explicit stages, running them in parallel, chaining their output, and checking results before moving on.

You rarely write one by hand: describe the goal in plain English and the agent usually authors the script for you.

## When to use a workflow

Reach for a workflow when the shape of the work matters as much as the work itself:

| Pattern | What it does | Example |
|---|---|---|
| **Fan-out** | Run the same step across many inputs in parallel | Review every changed file in a PR at once |
| **Pipeline** | Feed one stage's output into the next | Draft → critique → rewrite → format |
| **Judge-and-verify** | Produce a result, then have a separate agent check it | Generate a fix, then validate it against the spec |

For a single autonomous run from a spec, use the [Task Runner](https://kiro.dev/docs/crew/features/task-runner.md). For ad-hoc parallelism inside a conversation, use [Subagents](https://kiro.dev/docs/crew/features/subagents.md). Workflows are for when you need repeatable structure across many agents.

## Get a workflow written for you

The fastest way to a workflow is to describe the outcome and let the agent write the script:

> "Write a workflow that takes every markdown file in `docs/`, has one agent summarize each in parallel, then a second agent merges the summaries into a single index."

The agent produces a Python script that composes the stages. Read it, adjust it, and run it. Because it's plain Python, you can version it, share it, and re-run it whenever the inputs change.

## Cross-session message delivery

`session_send` delivers a message into another session as its next turn. A coordinator agent can direct peer sessions instead of only opening, reading, or stopping them. This is the primitive underlying the conductor and any cross-session orchestration pattern you build yourself.

## The built-in conductor

The conductor agent handles goals too large for a single session:

1. It decomposes the goal into discrete work items
2. It starts a session for each item
3. It checks acceptance criteria for each completed session
4. It decides the next round based on results: sending follow-ups, retrying, or finishing

The conductor runs on a monitoring loop that survives tab closes and turn caps, so a long multi-session plan keeps going while you're away.

Invoke the conductor from any session by describing a goal that naturally splits into parallel work streams.

## Global workflow library

Promote a session's workflow definition into the global library for reuse across sessions:

- **Manage** versions and lineage from **Agent Capabilities → Workflows**
- **Invoke** a saved definition with `/workflow <name>` in any session
- Task Runner plans share the same library, so a plan you've used before is available as a named workflow

Workflows in the library are versioned. You can view revision history and roll back to an earlier version.

## Longer-running work

A chat turn can run for up to four hours. For work that runs longer, use a monitor loop or Task Runner so Crew can continue between turns. See [Configuration](https://kiro.dev/docs/crew/configuration.md) for the timeout settings.

## Agent-controlled monitor loops

An agent can start, revise, and stop a monitor loop for its own session from the dashboard, a Slack thread, or a Discord DM. When the loop names one pull request, Crew wakes the agent only when that pull request changes instead of spending a turn on each quiet interval.

The goal chip shows the cycle count and cap, such as `23/24`. If a loop stops after an approval goes unanswered, approve or re-enable the needed access, then arm it again. Monitor loops also work on KAS.

The interrupt controller turns polling monitors into wake-on-change interrupts for any script cron. Instead of checking every N seconds, the cron sleeps until a real change arrives.

## Task run recovery

A Task Runner run keeps its worktree, branch, and learned lessons across a gateway restart. See [Task Runner](https://kiro.dev/docs/crew/features/task-runner.md) for the end-to-end workflow.

## How it relates to subagents

Under the hood, a workflow coordinates the same background agents you can spawn yourself. Each stage can fan out to [subagents](https://kiro.dev/docs/crew/features/subagents.md), wait for their results, and pass a synthesized output to the next stage. The workflow script owns the structure: which stages run, in what order, and what "done" means. Each agent does the work.

## The Workflows app

The bundled **Workflows** app provides a dashboard surface to author, validate, and watch workflow runs. It ships disabled and hidden from the main app catalog by default.

Enable it from the CLI:

```bash
kirocrew app enable workflows
```

Once enabled, the app appears in the sidebar at `/workflows` and lets you validate a workflow script against the sandboxed API before anything runs, then watch each phase and per-agent event as the run progresses. Runnable examples are included to start from.

## Related

- [Subagents](https://kiro.dev/docs/crew/features/subagents.md): parallel background agents a workflow coordinates
- [Task Runner](https://kiro.dev/docs/crew/features/task-runner.md): single-spec autonomous execution with checkpoints and self-review
