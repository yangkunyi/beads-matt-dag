SOURCE-URL: https://kiro.dev/docs/crew/features/task-runner.md
FETCHED: 2026-09-14T17:16:00+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Task Runner

> Run multi-step autonomous tasks from a spec file. Checkpoints, retries, git per-step commits, self-review, and pause/resume.

Hand the Task Runner a spec in markdown and it decomposes it into ordered steps, runs each one in its own session, tests the result, retries on failure, and checkpoints progress. Designed for 10+ hours of unattended operation.

## The loop

```
Spec → LLM decomposes → Tasks → Execute → Test → Self-review → Commit or retry
```

For each task:

1. Fresh session (`taskrunner::task`) with full memory injection
2. Prompt built from the spec + working memory + prior git state
3. Agent executes tools, streams progress, may call subagents
4. If tests pass, git commits the change
5. Independent reviewer session reads the actual `git diff` and validates
6. If review fails, revert commit and retry (up to 3 attempts, then re-plan)

## Run a task

### From the dashboard (recommended)

Open the **Projects** panel, describe what you want in the Compose area, optionally refine it into a structured spec (✨ Refine), then click **Run**. The task appears in the sidebar with live progress, step status, and pause/cancel controls.

You can also upload an existing spec file (From Spec tab) or ask in chat: "run this task spec."

### From the CLI

```bash
kirocrew run TASK.md              # auto-resume from checkpoint on restart
kirocrew run TASK.md --fresh      # ignore checkpoint, start over
kirocrew run TASK.md --timeout 3600
kirocrew run TASK.md --no-test    # skip test verification
```

Also available via Slack (`run <path>`) and the `task_run` MCP tool.

## Spec format

Any markdown file. The Task Runner isn't picky — it decomposes what's there:

```markdown
# Migrate user service to Go

## Goal
Rewrite the Node.js user service in Go, preserving all behavior.

## Requirements
- Every existing endpoint must continue to work
- Existing tests must pass
- The new implementation must handle the same load

## Acceptance criteria
- `curl` smoke tests pass against a local instance
- All unit tests pass with `go test ./...`
- No behavior change observable from the client
```

The LLM decomposes this into ordered tasks with dependencies, acceptance criteria, and approval gates.

## Refine mode (dashboard)

If you have a rough idea rather than a spec, use **✨ Compose** in the dashboard:

1. Type your idea in natural language
2. Click **✨ Refine into Spec**
3. The LLM rewrites it into a structured spec (Goal / Requirements / Acceptance Criteria)
4. Edit the result before running

Refine is a single-shot LLM call — no tools, no clarifying questions.

## Concurrent tasks

Up to 3 concurrent task runs are allowed (`_MAX_CONCURRENT_TASKS`). Each gets its own:

- `task_id` — collision-resistant ID
- Work directory — `//`
- Session pool — every step gets its own `taskrunner::task` session
- Git branch — `kirocrew/task/` (in a worktree if a repo exists)

Cancel a specific task with `kirocrew run cancel <task_id>`, or all with `kirocrew run cancel`.

## Pause and resume

Tasks can be paused mid-run and resumed later without losing progress:

```bash
# In the dashboard Tasks panel: Pause button
# In Slack: run pause <task_id>
# REST: POST /api/taskrunner/{task_id}/pause
```

Resume by calling execute with `fresh=false`:

- Incomplete tasks are reset to `PENDING`
- Passed and skipped tasks are kept as-is
- The run continues from the first pending task

With `fresh=true`, all tasks reset — you re-run from the beginning.

## Crash recovery

On gateway restart, any task with `status == "running"` is automatically transitioned to `"paused"`. This prevents zombie tasks that appear running but have no backing asyncio task. Resume manually from the dashboard.

Runs are persisted to `~/.kiro/crew/tasks/runs.json` and reload on startup.

## Force approval gates

Steps can be marked with `force_approval: true` in the spec. These gates block execution **even in YOLO mode**:

- The task pauses at the gate
- Inline **Approve** / **Deny** buttons appear in the dashboard
- You must explicitly approve before the step executes

Use force-approval for destructive operations (deploy, delete, publish, `rm -rf`).

## Git coordination

Each task runs on its own isolated git branch:

- **Existing repo** — `git worktree add` creates an isolated working directory; your checkout is untouched
- **No repo** — `git init` in the work directory, then checkout `kirocrew/task/`

Per-step:

- `git add -A && git commit` after each passed step
- `git reset --hard HEAD~1` when review fails, before retry
- `git log --oneline` + `git diff --stat` injected into the next step's prompt
- `git diff HEAD~1` fed to the independent reviewer

Git init failure is non-fatal — the task continues without git coordination.

## Self-review

Each step passes through an independent reviewer using a separate session (`taskrunner::review`):

- Reads the actual `git diff HEAD~1` (not the LLM's self-report)
- Separate session — no bias from having written the code
- On review failure: revert commit, retry step, re-commit on success
- Review exceptions are non-fatal (returns "passed" to avoid blocking)

Set the step's status transitions through `REVIEWING` (visible in the UI as 🔍) before promoting to `PASSED`.

## Retries and re-planning

| Layer | Cap | Purpose |
|---|---|---|
| `MAX_RETRIES` | 3 | Logic/test failure retries per step |
| `MAX_RECOVERIES` | 2 | Process crash recovery budget per step |
| `MAX_REPLAN` | 2 | Plan revisions after a step exhausts retries |
| `MAX_TOTAL_TASKS` | 50 | Hard cap on total tasks (including replans) |

When a step exhausts its retries, the task runner asks the LLM to revise the plan. Up to 2 replans before failing the run.

Cycle detection: 2 identical errors → warning; 3 identical errors → step marked FAILED with "Loop detected". Process crashes don't count toward this.

## Parallel task execution

Tasks in the spec can declare dependencies. Tasks without cross-dependencies run in parallel batches of 3 (`_MAX_PARALLEL_TASKS`):

- Each batch runs via `asyncio.gather(..., return_exceptions=True)`
- The next batch starts only after the current one completes
- Per-task sessions are reset after the loop

This prevents 5N MCP-server-process cold-start bursts (N parallel tasks = ~5N processes if not batched).

## Task-level tools

Every step gets:

- Full [ContextBuilder](https://kiro.dev/docs/crew/features/memory.md) injection — preferences, projects, history, semantic memory, lessons, episodic memory, triggered skills
- The step's own text as the primary prompt
- `is_new=True` on the first message so injection fires once, then follow-ups reuse context

## Watchdog and stall detection

Activity-aware stall detection tracks `run.last_task_time`, bumped on every stream chunk, tool approval, or recovery:

| Threshold | Action |
|---|---|
| 60 min no activity | ⚠️ Warning notification |
| 2 h no activity | 🔧 Session reset → recovery retry |

Reset cancels the current step session; the retry can fire again if it also stalls.

## Notifications

Every event gets a notification prefixed with `[spec_name]`:

- 🚀 Task started
- 📋 Plan ready (step list)
- ✅ Step N/M passed (title + result preview)
- ❌ Step N/M failed (title + error)
- ⚠️ Task may be stalled (minutes since last activity)
- 🔄 Re-planning (attempt N/2)
- 📝 Lesson learned
- ✅ Task completed (final summary with elapsed time and step list)

## Send results to a chat slot

Once a task completes, you can open its result inline in a new chat slot:

```
POST /api/taskrunner/{task_id}/to-chat
```

This creates a new chat session pre-loaded with the task's spec, plan, and per-step results. From there you can ask follow-up questions or iterate.

## Runtime state

Task state is projected into `~/.kiro/crew/tasks/runs.json` with:

- task_id, spec_path, status, timestamps, error, tokens_used, replan_count
- per-step details (result truncated to 2K per step)

Deleting a run via `DELETE /api/taskrunner/` removes it from memory and disk.

## Auto-approve trust

The dashboard exposes an `auto_approve` toggle per-run:

- **Off (default)** — tool permission requests prompt interactively
- **On** — tool permission requests auto-approve within the run

The trust is TTL-bounded (dashboard window, 6h max, 24h hard ceiling). Each auto-approved tool call slides the grant forward — an actively-progressing run won't lose trust mid-flight, but an abandoned idle run lapses.

Force-approval gates still block. Hook deny-lists and sensitive-path blocks still apply. `auto_approve` is scoped tightly and never leaks to cron or MCP-launched runs (those are headless by construction).

## Integration with subagents

A task step can spawn subagents:

- The step's session inherits `parent_session_key = taskrunner::task`
- Subagent completions inject back into the step session
- The step's LLM can synthesize the subagent's output before continuing

This composes cleanly for tasks like "run this analysis against every package in the repo" — the step fans out to subagents, waits for the digest, then continues.

## Configuration reference

Task-runner-related settings:

| Constant / config | Default | Purpose |
|---|---|---|
| `MAX_RETRIES` | 3 | Retries per step |
| `MAX_RECOVERIES` | 2 | Crash recoveries per step |
| `MAX_REPLAN` | 2 | Replans per run |
| `MAX_TOTAL_TASKS` | 50 | Total task cap including replans |
| `_MAX_PARALLEL_TASKS` | 3 | Parallel batch size |
| `_MAX_CONCURRENT_TASKS` | 3 | Concurrent runs |
| `CONTEXT_COMPACT_PCT` | 80.0 | Session compact threshold |
| `TEST_TIMEOUT` | 5400 | 90 min for test command |
| `STALL_TIMEOUT` | 3600 | 60 min → warn |
| `STALL_CANCEL_TIMEOUT` | 7200 | 2 h → reset session |
| `PROGRESS_FILE` | `TASK_PROGRESS.md` | Written next to spec file |
