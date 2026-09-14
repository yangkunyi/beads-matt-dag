SOURCE-URL: https://kiro.dev/docs/crew/features/subagents.md
FETCHED: 2026-09-14T17:16:02+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Subagents & orchestration

> Spawn parallel background agents to research, prototype, or investigate — results flow back into your conversation automatically.

Subagents are short-lived background agents that run in parallel to your main conversation. Use them to research, prototype, or investigate something without blocking your current work.

## How to use them

### From the dashboard (recommended)

Ask in any chat session:

- "Research these three options in parallel and recommend one."
- "Check my open CRs, the pipeline status, and whether the deploy landed — all at once."
- "In parallel, run this test in 6 languages."

Crew spawns isolated subagents and brings their results back into your conversation. You don't need to invoke any command — the agent decides when parallel work makes sense.

You can also watch running subagents in the **Activity** panel: each one shows its task, elapsed time, and a Stop button.

### From the CLI

```bash
kirocrew spawn run "check my open CRs"        # blocking — waits for the result
kirocrew spawn run --async "check CRs"        # fire-and-forget
kirocrew spawn list                           # see running subagents
```

## What you see

When subagents are running:

- The **Activity** panel shows each one with its task description, elapsed time, and status (running / done / failed / stalled)
- When a subagent finishes, its result is injected into your conversation — the agent summarizes it in its next response
- For a batch of parallel work, results arrive incrementally as each subagent completes

You don't need to poll or check back — results come to you.

## Isolated context

Each subagent gets its own independent session with full memory injection (your preferences, lessons, project context). But it doesn't see your current conversation's in-progress work — this keeps your main session lean and prevents subagents from interfering with each other.

## Stopping and retrying

- **Stop one** — click the Stop button on its row in the Activity panel
- **Stop all** — header Stop-all control in the Activity panel
- **Retry a failed one** — click "Retry" on a failed subagent's row (spawns a fresh attempt with the same task)

Stopping is neutral — partial output is preserved and marked as "stopped by user," not as a failure.

## Limits

- **Concurrency** — there's a cap on how many subagents run simultaneously (auto-sized based on your machine's resources, usually 3–32). Extra requests are queued until a slot opens.
- **Timeout** — each subagent can run for up to three hours and make up to 1000 tool calls. For the related limits, see [Configuration](https://kiro.dev/docs/crew/configuration.md).
- **Stall detection** — if a subagent shows no activity for ~2 minutes, a warning appears on its row. It's not auto-killed — you decide whether to stop it or let it continue.

## Crew member workers

Crew members can dispatch worker sessions from their own thread on the Claude Code and KAS backends. Each worker inherits the member's trust posture, so a trusted member's worker does not stop at its first tool call. This session-control capability is on by default. To change it for every agent, see [Configuration](https://kiro.dev/docs/crew/configuration.md).

## Approval

Subagents inherit your session's approval mode:

- **Autopilot on** — subagent tool calls are auto-approved (deny rules still apply)
- **Autopilot off** — tool calls that need approval are either denied by default (headless channels) or prompt you (dashboard)

You don't configure approval per-subagent — it follows whatever your main session is set to. When a subagent is waiting for spawn approval, Crew shows that parked state in its running-work views so you can approve it or change the plan.

## Reading full results

When a subagent's output is long, your conversation gets a summary. To read the full transcript:

- Click the subagent in the Activity panel to expand its output
- Or ask: "show me the full output from subagent X"

Results are retained for about an hour after delivery, then cleaned up.

## When to use subagents vs. other features

| Need | Use |
|---|---|
| Parallel research or investigation | **Subagents** — ask in chat |
| Recurring scheduled work | [Cron & scheduling](https://kiro.dev/docs/crew/features/cron.md) |
| Multi-step autonomous task with checkpoints | [Task Runner](https://kiro.dev/docs/crew/features/task-runner.md) |
| Reactive monitoring | [Scheduling](https://kiro.dev/docs/crew/features/cron.md) (heartbeats section) |
