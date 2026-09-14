SOURCE-URL: https://kiro.dev/docs/specs/bugfix-specs.md
FETCHED: 2026-09-14T17:15:57+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Bugfix Specs

> Systematically diagnose and fix bugs with surgical precision while preventing regressions

The Bugfix Spec models how experienced developers approach bug fixes: identify the root cause, understand what should change, and explicitly preserve what shouldn't. Bugfix Specs provide a structured approach using that workflow, guiding you through root cause analysis, fix design, and regression prevention.

## Key Benefits

**Scoped fixes** - Explicit constraints ensure only necessary changes are made

**Regression prevention** - Unchanged behavior is documented and tested

**Documentation** - Complete record of the bug, fix, and reasoning for future reference

**Reliability** - Structured workflow prevents common pitfalls of ad-hoc fixes

## When to Use Bugfix Specs

**Best for:**
- Complex bugs requiring root cause analysis
- Bugs in critical code paths where regressions are costly
- Bugs that need documentation for compliance or team knowledge
- Situations where previous fix attempts caused regressions

## How It Works

Bugfix Specs follow the same three-phase workflow as Feature Specs (Requirements → Design → Tasks), but with content tailored specifically for bug fixes:

``` mermaid
flowchart TD
    A["Start a spec"] --> B["bugfix.md"]
    B --> C{Happy?}
    C -->|no| D["Edit/Request changes"] --> B
    C -->|yes| E["design.md"]
    E --> F{Happy?}
    F -->|no| G["Edit/Request changes"] --> E
    F -->|yes| H["Implementation"]
```

### 1. Bugfix Analysis Phase

Instead of a requirements document, you create a `bugfix.md` that captures:

**Current Behavior (Defect)**
- WHEN [condition] THEN the system [incorrect behavior]

**Expected Behavior (Correct)**
- WHEN [condition] THEN the system SHALL [correct behavior]

**Unchanged Behavior (Regression Prevention)**
- WHEN [condition] THEN the system SHALL CONTINUE TO [existing behavior]

This explicit structure ensures Kiro understands not just what's broken, but what must remain working.

### 2. Design Phase

Kiro explores the codebase to root cause the issue and generates a `design.md` with:

- Root cause analysis
- Proposed fix approach
- Properties to test for:
  - Current implementation produces incorrect behavior (validates the bug exists)
  - Fixed implementation produces correct behavior (validates the fix works)
  - Unchanged implementation continues working (prevents regressions)

### 3. Tasks Phase

Implementation tasks are generated with [property-based tests (PBTs)](https://kiro.dev/docs/specs/correctness.md) that validate:
- The bug is reproducible
- The bug is fixed
- No regressions are introduced

## Getting Started

    IDE
    CLI
    Web

    1. Choose **Bug Fix** from the workflow options on the **"Let's build"** screen when starting a new session. To switch mid-session, click the agent name in the bottom bar of the chat input and select **Bug Fix** from the agent picker.
    2. Describe the bug, including:
       - When the bug occurs (reproduction steps)
       - What should happen instead
       - Any constraints (code that shouldn't be modified)
    3. Follow the workflow through analysis, design, and implementation.

    1. In a session, run `/spec new <name>` to start a new spec. The agent switches to Spec mode.
    2. Describe the bug with reproduction steps, expected behavior, and constraints.
    3. Choose **Fix a Bug** when prompted.
    4. Follow the workflow through analysis, design, and tasks in `.kiro/specs/<name>/`.
    5. Run `/spec run <name>` to execute the fix autonomously.

    1. Go to [app.kiro.dev](https://app.kiro.dev) and start a new session.
    2. Select your repositories and choose **Spec** from the chat input.
    3. Describe the bug and choose Bug when prompted.
    4. Review the bugfix analysis, design, and tasks in your browser. The agent opens a pull request when implementation is complete.

## Learn More

  - [Best Practices](https://kiro.dev/docs/specs/best-practices.md#bugfix-specs) — Tips for effective bug fixing with Bugfix Specs
