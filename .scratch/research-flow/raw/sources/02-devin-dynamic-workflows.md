SOURCE-URL: https://docs.devin.ai/work-with-devin/dynamic-workflows.md
FETCHED: 2026-09-14T17:16:51+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Devin Dynamic Workflows

> Orchestrate many Devin sessions with a deterministic Python script: fan out work, pipe structured results between stages, and resume a run where it stopped.

<Info>
  Dynamic Workflows are available in any Devin session — just describe the work and ask Devin to run it as a workflow.

  **Enterprise accounts:** the feature is off until an enterprise admin turns on **Dynamic workflows** under [Enterprise Settings > Devin](https://app.devin.ai/settings/enterprise-devin). Until then, Devin won't run workflows in any of the enterprise's organizations.
</Info>

## What are Dynamic Workflows?

A dynamic workflow is a **deterministic Python script that orchestrates a team of Devin agents**. Devin writes the script, runs it, and the script decides which agents run, in what order, and what each one is told — using the structured results of earlier agents to build the prompts of later ones.

Every agent call is recorded, so a workflow run is observable while it executes and resumable if it is interrupted: completed agents replay their recorded results instantly, and only the unfinished work runs again.

This goes a step beyond [managed Devins](/work-with-devin/advanced-capabilities#managed-devins), where the coordinating session spawns and babysits child sessions by hand. In a workflow, the orchestration itself is code.

## When to use a workflow

Ask for a workflow when the work has real structure:

* **Wide fan-out with a combine step** — roughly five or more independent units (files, modules, endpoints, tickets) that each need judgment or verification, whose results are then rolled up.
* **A staged pipeline** — later stages consume the structured output of earlier ones, for example *audit → fix → verify*.

Stick with a plain session (or a couple of [managed Devins](/work-with-devin/advanced-capabilities#managed-devins)) when:

* The change is mechanical — a codemod, linter autofix, or generator does it faster and more reliably than agents.
* Only one or two independent sessions are needed, with no data flowing between them.
* The work is tightly coupled through shared state, or is small and sequential.

### Example prompts

You describe the task and ask for a workflow; Devin writes the script.

**Migration** — fan out one agent per unit on its own branch, then roll up:

```text theme={null}
Use a workflow to move every job in jobs/ from the legacy cron runner to our
new scheduler API — one agent per job, each working on its own branch and
running the job's tests — then roll up which jobs need manual attention
```

**Research** — gather evidence in parallel, then synthesize:

```text theme={null}
Use a workflow to evaluate Postgres, DynamoDB, and CockroachDB for the new
events service: one agent per option scoring it against our latency, cost,
and operations requirements, then a final agent that compares the evidence
and recommends one
```

**Code review** — one reviewer per file, then a merge step:

```text theme={null}
Use a workflow to review every file changed on this branch against
CONTRIBUTING.md — one reviewer per file — then merge the findings into a
single deduplicated list ordered by severity
```

**Codebase-wide audit** — a staged *audit → fix → verify* pipeline:

```text theme={null}
Use a workflow to audit every SQL query in the reporting module for
missing pagination and N+1 patterns, fix each confirmed issue on its own
branch, and verify each fix with an EXPLAIN before and after
```

**Loop** — repeat until a check passes or progress stalls:

```text theme={null}
Use a workflow to get the flaky integration suite green: run it, fix
whatever failed, and repeat until it passes three consecutive runs or a
round fixes nothing new
```

## How a run works

1. **Devin writes the script** to a file and starts the run. You approve it first unless you have turned on auto-approval in **Settings → Preferences → Auto-approve workflows**.
2. **The script runs on Devin's machine.** Workflow primitives are injected automatically — nothing to install or import.
3. **Each agent call spawns an agent** and waits for its structured output. By default that agent is an independent Devin session on its own VM.
4. **Progress streams into the session.** The workflow panel shows each phase, its agents, and their live status; you can open any agent's session from there.
5. **Results are recorded** against a run ID, which is what makes resuming possible.

The run happens in the background, so the session stays responsive — you can keep talking to Devin while it executes, ask for a progress summary, or ask it to stop the run. Stopping cancels the script and puts the remaining child sessions to sleep; everything already recorded stays resumable.

## Authoring model

The script is plain Python. Devin writes it, but it helps to know the shape when you review one:

| Primitive                              | What it does                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `register_workflow(meta)`              | Declares the workflow's name, description, and phases. Must be awaited before any agents run.                                                          |
| `agent(prompt, phase=..., schema=...)` | Runs one agent and returns its structured output as a dict.                                                                                            |
| `pipeline(items, stage1, stage2, ...)` | Runs each item through the stages independently — no barrier between stages, so item A can be in stage 3 while item B is still in stage 1.             |
| `parallel([...])`                      | Runs async callables concurrently and waits for all of them. Use only where a stage genuinely needs every prior result, such as a merge or dedup step. |
| `log("message")`                       | Writes a progress line that is visible while the run is still executing.                                                                               |

Each `agent()` call takes a JSON Schema and returns a dict shaped by it, which is how one stage's findings become the next stage's prompt. Keep schemas small and flat.

### Example

An audit-then-fix pipeline across three modules:

```python theme={null}
import asyncio
import json

REPO = "github.com/acme/api"
MODULES = ["auth", "billing", "search"]

META = {
    "name": "error-handling-audit",
    "description": "Audit and fix error-handling bugs across api modules",
    "phases": [
        {"title": "analyze", "detail": "audit each module for error-handling bugs"},
        {"title": "fix", "detail": "fix confirmed issues and push a branch"},
    ],
}

FINDINGS_SCHEMA = {
    "type": "object",
    "properties": {
        "module": {"type": "string"},
        "issues": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["module", "issues"],
}

FIX_SCHEMA = {
    "type": "object",
    "properties": {"branch": {"type": "string"}, "summary": {"type": "string"}},
    "required": ["branch", "summary"],
}

async def analyze(module):
    return await agent(
        f"In {REPO}, audit the '{module}' module for error-handling bugs. "
        "Report each issue as a one-line string.",
        phase="analyze",
        schema=FINDINGS_SCHEMA,
        label=f"analyze-{module}",
    )

async def fix(findings):
    if not findings["issues"]:
        return None
    return await agent(
        f"In {REPO}, fix these issues in the '{findings['module']}' module:\n"
        + json.dumps(findings["issues"], sort_keys=True)
        + "\nPush your work to a new git branch (do not open a PR) and "
        "report the branch name and a one-line summary.",
        phase="fix",
        schema=FIX_SCHEMA,
        label=f"fix-{findings['module']}",
    )

async def main():
    await register_workflow(META)
    results = await pipeline(MODULES, analyze, fix)
    for module, result in zip(MODULES, results):
        log(f"{module}: {result['branch'] if result else 'no fix needed/failed'}")

asyncio.run(main())
```

## Where agents run

Each agent runs on its own VM by default, and can instead be pinned to the orchestrating session's machine.

<CardGroup cols={2}>
  <Card title="Separate VM (default)" icon="server">
    A full child Devin session with its own machine, repo clones, and [environment](/onboard-devin/environment/blueprints). It cannot see the orchestrating session's files, so code handoffs go through git branches: each agent pushes a branch and reports the branch name, and later stages read it from the structured output.
  </Card>

  <Card title="Shared VM" icon="folder-tree">
    The agent runs on the orchestrating session's machine and shares its working tree, including uncommitted changes — no git handoff needed. Use it when agents must read or edit the current working tree, or when the repo only exists on that machine.
  </Card>
</CardGroup>

Shared-VM agents compete with the session for CPU, memory, and disk, and run at a lower concurrency cap. Because they share one working tree with no isolation, parallel writers must be given strictly non-overlapping files or directories.

Agents can also be pinned to a specific Devin mode — for example the cheaper Devin Lite for per-item classification in a wide fan-out.

## Determinism and resuming

A workflow script is re-executed from the top when a run resumes, and each agent call is keyed by a hash of its prompt, schema, and execution settings. Everything that already completed replays from its recorded result; the rest runs fresh with new sessions.

That only works if the script makes the same calls every time. Workflow logic and prompts must not depend on the current time or date, randomness, generated IDs, environment variables, filesystem state, or network responses. Anything that needs to inspect the outside world belongs inside an `agent()` call, whose recorded output the rest of the script consumes.

Two consequences worth knowing:

* **Editing a prompt re-runs that agent** and everything downstream of it, while untouched earlier agents still replay.
* **A run that timed out or was interrupted picks up where it left off** when resumed with its run ID. The default and maximum budget for a run is seven days.

If an agent fails — its session died or it produced no valid structured output — the script decides what happens: skip the item, substitute a default, retry, or fail the run. A resumed run retries failed agents with new sessions.

## Cost

Every agent in a workflow is a Devin session, so one run can consume far more ACUs than doing the same task in a single session. Before pointing a workflow at an entire repo, run it on a slice — one directory, three modules, a narrower question — and check the ACU usage of the agents in the workflow panel. Asking for a cheaper [mode](/essential-guidelines/when-to-use-devin) on high-volume stages, such as per-item classification, also keeps a wide fan-out affordable.

## Saving a workflow for reuse

Once a workflow works, it can be committed to your repo as a [skill](/product-guides/skills): a `workflow.py` next to a `SKILL.md` describing when to use it. Devin then discovers and reruns it on future tasks instead of authoring a new script. Ask Devin to save a workflow and it will create the necessary files for you.

## Related

* [Advanced Capabilities](/work-with-devin/advanced-capabilities) — orchestrating managed Devins directly
* [Skills](/product-guides/skills) — saving reusable procedures, including workflows, in your repos
* [Devin MCP](/work-with-devin/devin-mcp) — creating and monitoring sessions programmatically
