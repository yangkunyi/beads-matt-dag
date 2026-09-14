SOURCE-URL: https://kiro.dev/docs/specs/quick-spec.md
FETCHED: 2026-09-14T17:15:58+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://kiro.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Quick Spec

> Generate requirements, design, and tasks in one pass without approval gates between phases

Quick Spec is a session mode that auto-generates requirements, design, and tasks in a single pass. Instead of approving each phase before the next begins, you answer clarifying questions up front and land directly on an actionable task list.

## When to use Quick Spec

Quick Spec is best for:

- **Well-understood features** where you trust Kiro's output and don't need to iterate on requirements or design
- **Rapid prototyping** where speed matters more than review

Use standard Feature Specs when you're exploring unfamiliar territory, when requirements need iteration, or when the review gates genuinely add value for your team.

## How it works

1. Choose **Quick Spec** from the workflow options on the **"Let's build"** screen when starting a new session. To switch mid-session, click the agent name in the bottom bar of the chat input and select **Quick Spec** from the agent picker.
2. Kiro asks a set of clarifying questions up front - scope, constraints, edge cases, and anything else that affects the output.
3. Using your answers, Kiro auto-generates `requirements.md`, `design.md`, and `tasks.md` in sequence, with no approval gates between phases.
4. You land on the task list, ready to review or begin implementation.

The clarifying questions are the key interaction point. Instead of reviewing and approving each artifact, you front-load your input so Kiro has enough context to produce high-quality specs autonomously.

## Artifacts

Quick Spec produces the same artifacts as a standard Spec session, saved to `.kiro/specs/`:

- `requirements.md` - user stories and acceptance criteria in EARS notation
- `design.md` - technical architecture and implementation approach
- `tasks.md` - discrete, trackable implementation tasks

You can review and edit any of them after the fact, the same as in a standard Spec session.

## FAQ

### How is Quick Spec different from Vibe mode?

Vibe mode is conversational and unstructured - there are no artifacts saved to `.kiro/specs/`. Quick Spec still produces the full Spec artifacts (requirements, design, tasks), just without approval gates between phases.

### Can I switch from Quick Spec to a standard Feature Spec?

There's no explicit mode switch, but the artifacts are identical in format to a standard Feature Spec - you can continue working with them using any Spec workflow, refine them, regenerate tasks, or reference them with `#spec` in chat.

### What if the auto-generated requirements miss something important?

Edit `requirements.md` directly, or ask Kiro in a spec chat session to add or refine specific requirements. Then regenerate tasks using **Sync Files**.

### Should I use Quick Spec for complex features?

Use your judgment. For features where requirements quality is critical - compliance-sensitive domains, high-stakes systems, unfamiliar territory - a standard Feature Spec with explicit review gates is usually the better fit. For features you've built variants of many times, Quick Spec is faster without losing much.
