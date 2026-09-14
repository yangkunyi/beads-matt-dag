SOURCE-URL: https://kiro.dev/docs/specs.md
FETCHED: 2026-09-14T17:15:53+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Specs

> Use Kiro's structured specifications to break down complex features into detailed implementation plans with tracking

## What are specs?

Specs or specifications are structured artifacts that formalize the development process for features and bug fixes in your application. They provide a systematic approach to transform high-level ideas into detailed implementation plans with clear tracking and accountability.

| Capability | IDE | CLI | Web | Mobile |
|------------|:---:|:---:|:---:|:------:|
| Feature Specs | ✓ | ✓ | ✓ | — |
| Bugfix Specs | ✓ | ✓ | ✓ | — |
| Quick Spec | ✓ | ✓ | ✓ | — |
| Parallel task execution | ✓ | ✓ | ✓ | — |
| [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements.md) | ✓ | ✓ | — | — |
| [Correctness](https://kiro.dev/docs/specs/correctness.md) (property-based testing) | ✓ | — | — | — |

With Kiro's specs, you can:

- **Break down requirements** into user stories with acceptance criteria
- **Build design docs** with sequence diagrams and architecture plans
- **Track implementation progress** across discrete tasks
- **Collaborate effectively** between product and engineering teams

## Core Structure

Every spec generates three key files that form the foundation of your specification:

- **requirements.md** (or **bugfix.md**) - Captures user stories, acceptance criteria, or bug analysis in structured notation
- **design.md** - Documents technical architecture, sequence diagrams, and implementation considerations
- **tasks.md** - Provides a detailed implementation plan with discrete, trackable tasks

``` mermaid
flowchart TD
    A["Idea for feature 'foo'"] --> B["Open spec session in chat"]
    A["Idea for feature 'foo'"] --> C["Click '+' in spec pane"]
    B --> D[".kiro/specs/foo"]
    C --> D[".kiro/specs/foo"]
    D --> E["requirements.md / bugfix.md"]
    D --> F["design.md"]
    D --> G["tasks.md"]
    
    style A stroke-dasharray:5,5
    style D stroke:#4A90E2,stroke-width:3px
    style E stroke:#666,stroke-width:2px
```

## Three-Phase Workflow

All specs follow a three-phase workflow that transforms your idea into executable implementation:

**Requirements or Bug Analysis** - Define what needs to be built or fixed
- Feature Specs: User stories and acceptance criteria in `requirements.md`
- Bugfix Specs: Bug analysis with current/expected/unchanged behavior in `bugfix.md`

**Design** - Create technical architecture and implementation approach in `design.md`
- System architecture and component design
- Sequence diagrams and data flow
- Error handling and testing strategy

**Tasks** - Generate discrete, executable implementation tasks in `tasks.md`
- Trackable tasks with clear outcomes
- Real-time status updates as you implement
- Run tasks individually or all at once

## Task Execution

    IDE
    CLI
    Web

    Kiro provides a task execution interface for `tasks.md` files that displays real-time status updates. Tasks are updated as in-progress or completed, allowing you to efficiently track implementation progress.

    [Video](https://kiro.dev/videos/spec-task.mp4)

    Run `/spec run <name>` to open the full-screen task execution view. Choose the task scope, then follow progress in real time as Kiro executes the selected tasks. You can interrupt at any point. Alternatively, resume a spec with `/spec <name>` and step through tasks interactively.

    Once you're happy with the plan, tell the agent how to proceed in the chat:

    - To execute the entire plan, ask the agent to work through all tasks.
    - To scope the work, name the specific tasks you want implemented (for example, "implement tasks 1 and 2").

    When the work is complete, the agent opens a pull request with a description of what was done. You can continue to provide feedback and have the agent push updates.

### Running tasks in parallel

When you run all tasks on a spec, Kiro analyzes your task list, figures out which tasks depend on each other, and runs independent tasks concurrently. For most feature specs, this cuts execution time significantly without any setup.

Kiro builds a **dependency graph** of the tasks in your `tasks.md` and groups independent tasks into **waves**:

- **Wave 1** - all tasks with no dependencies. These run concurrently.
- **Wave 2** - all tasks whose dependencies were satisfied by Wave 1. These run concurrently.
- **Wave N** - continues until all tasks are complete.

Waves execute sequentially; tasks within a wave execute concurrently.

## Types of Specs

Kiro supports two types of specs to match your development needs:

### Feature Specs

For building new features and capabilities in your application. Feature Specs guide you through requirements gathering, technical design, and implementation planning with two workflow variants: Requirements-First and Design-First. For well-understood features, you can also use [Quick Spec](https://kiro.dev/docs/specs/quick-spec.md) to auto-generate all three artifacts without approval gates.

[Learn more about Feature Specs →](https://kiro.dev/docs/specs/feature-specs.md)

### Bugfix Specs

For systematically diagnosing and fixing bugs with surgical precision while preventing regressions. Bugfix Specs help you identify root causes, design fixes, and validate that nothing else breaks.

[Learn more about Bugfix Specs →](https://kiro.dev/docs/specs/bugfix-specs.md)

## Getting Started

    IDE
    CLI
    Web

    1. From the Kiro pane, click the `+` button under **Specs**. Alternatively, choose **Spec** from the chat pane.
    2. Kiro will ask if you are developing a Feature or fixing a Bug
       - If you choose Feature, describe your feature and choose your workflow: **Requirements-First** or **Design-First**
       - If you choose Bug, describe your bug
    3. Follow the workflow through each phase to implementation

    [Video](https://kiro.dev/videos/specs-start.mp4)

    1. In a session, run `/spec new <name>` to start a new spec. The agent switches to Spec mode and asks what kind of spec you want (Feature, Bug, or Quick Spec).
    2. Describe what you want to build or fix. The agent asks clarifying questions if needed.
    3. Follow the workflow through each phase - artifacts are generated in `.kiro/specs/<name>/`.
    4. At each phase checkpoint, press `Ctrl+X` to read that phase's document and stage line comments. Answering the checkpoint question sends your comments to the agent as one revision request. See [Spec review](https://kiro.dev/docs/cli/terminal-ui.md#spec-review) for the shortcuts.
    5. Run `/spec run <name>` to open the full-screen task execution view, choose the task scope, and track progress in real time, or step through tasks interactively.

    1. Go to [app.kiro.dev](https://app.kiro.dev) and start a new session.
    2. Select one or more repositories using **Select repo** at the bottom of the chat input. You can add multiple repositories to a single spec session, and the agent plans and coordinates changes across all of them.
    3. Choose **Spec** from the chat input box, then describe what you want to build or fix.
    4. Review and refine the plan directly in your browser - chat with Kiro to add a requirement, rethink part of the design, or adjust the task breakdown, and the agent updates the artifacts in place. When ready, the agent implements the tasks and opens a pull request.

    To keep an artifact, share it, or continue working with it in the Kiro IDE, open it in the browser and select the **Download** button to save the `.md` file to your local machine.

    
**⚠️ Warning:** Only select repositories you trust, especially when mixing public and private repos. The agent follows instructions in the repository code.

## Learn more

Go deeper into Kiro's Spec system with these guides:

  - [Feature Specs](https://kiro.dev/docs/specs/feature-specs.md) — Build new features with structured workflows.
  - [Quick Spec](https://kiro.dev/docs/specs/quick-spec.md) — Generate requirements, design, and tasks in one pass without approval gates.
  - [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements.md) — Catch inconsistencies, ambiguities, and gaps in your requirements before design.
  - [Bugfix Specs](https://kiro.dev/docs/specs/bugfix-specs.md) — Fix bugs surgically while preventing regressions.
  - [Best Practices](https://kiro.dev/docs/specs/best-practices.md) — FAQs on best practices when working with specs.
