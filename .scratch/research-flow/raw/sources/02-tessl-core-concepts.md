SOURCE-URL: https://docs.tessl.io/introduction-to-tessl/core-concepts.md
FETCHED: 2026-09-14T17:19:03+08:00
HTTP: 200

> For the complete documentation index, see [llms.txt](https://docs.tessl.io/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.tessl.io/introduction-to-tessl/core-concepts.md).

# Core concepts

> **Takeaway:** Understand the building blocks of Tessl, namely the kinds of context, how they are packaged, where they live, and how Tessl measures quality, so the rest of the docs make sense.

If you have worked through the getting started flow, you have already used most of these ideas. This page names them and explains how they fit together.

## Context as software

Giving an agent good context is useful, but on its own it does not last. Libraries change, APIs evolve, and conventions drift, and static instructions quietly go stale. Tessl treats agent context the way you treat code: something you build, evaluate, distribute, and keep up to date. That single idea, context managed with a real lifecycle, is what everything below supports.

## The two kinds of context

Tessl works with two types of context, each suited to a different job.

| Type   | When it is used | Purpose                                            |
| ------ | --------------- | -------------------------------------------------- |
| Rules  | Always          | Your team's standards, applied to every task       |
| Skills | When relevant   | Procedural workflows, loaded when the task matches |

Rules and skills are where Tessl starts, not where it stops. Plugins can also carry other agent capabilities alongside context; see the [Plugins](#plugins) section below.

## Skills

A skill is a folder of instructions, and sometimes scripts, that teaches an agent how to do something: a specific workflow, a procedure, or a way of using a tool correctly. An agent loads a skill when its description matches the task at hand. Skills are the primary unit of context in Tessl, and they are agent-agnostic, so the same skill works across Claude Code, Cursor, Gemini, Codex, and others.

## Plugins

A plugin is a versioned bundle. It packages skills and rules, and can also carry MCP servers, which connect agents to external tools and services, and hooks, which run deterministic commands in response to specific agent events: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, and `Stop`. Everything in a plugin is installed, versioned, and updated as one unit, much like a package in npm or pip. When you want to share a coherent set of context and capabilities rather than a single skill, you publish a plugin.

## The Registry

The [Tessl Registry](https://tessl.io/registry) is where context is discovered and distributed. Your team's private context lives in your workspace; the public registry, with thousands of evaluated skills and plugins you can browse and install, is there when you want to reach beyond it. It is also where your published quality scores appear, so others can judge whether a skill is worth installing.

## Organizations

An Organization is the account-wide boundary for people, SCM connections, and reporting. Its **Context** view shows skills and configuration observed across connected or uploaded repositories. Its **Findings** view shows issues derived from the latest account scans. Organization members can view Context and Findings, while Organization admins manage SCM connections and scan settings.

## Workspaces

A workspace is the shared, private publishing boundary for a team. It holds the skills and plugins you publish privately and controls who can view, install, and publish them. Workspace context stays with your team unless you choose to share it.

## Projects

A project is the stable anchor for Tessl inside a repository. It identifies the repository and gives Tessl a fixed place to attach repository-connected data, such as evaluation runs, so your results stay tied to the right codebase over time even as branches and checkouts come and go.

## How Organizations, projects, workspaces, and plugins fit together

These concepts are easy to mix up because each one groups things, but they work on different axes. A plugin is content and capability: the skills, rules, MCP servers, and hooks you package. An Organization is account-wide access, SCM connections, Context, and Findings. A workspace is the team boundary for private publishing. A project is location: the tie between Tessl and one repository, so project results stay attached to the right codebase.

In practice, your Organization connects SCM accounts and reports Context and Findings across repositories. Teams publish private plugins to workspaces, and each project maps one repository into a workspace. An Organization can contain many workspaces, and a workspace can hold many plugins and back many projects.

## Reviews and evals

Tessl offers two ways to judge context quality, and they answer different questions. It is worth being clear on the distinction, because the names sound similar.

A **review** checks a single skill against best practices. It is fast and cheap, it runs automatically when you publish, and it produces a score across three areas: validation (structure and format), description (how well the description triggers the skill at the right time), and content (how well the instructions guide the agent once loaded). It is also where a team enforces its own skill-authoring standards, much like static analysis for code. Use a review for quick, structural feedback on the skill itself.

A **scenario eval** measures impact rather than structure. It runs an agent on real tasks, once with your context and once without, and compares the results, so you can see how much the context actually improves performance. Each scenario pairs a task with a rubric of weighted criteria used to grade the result. Evals are slower and more involved, and they attach to a project. Use an eval when you want evidence that context helps, not just that it is well formed.

In short: a review tells you whether a skill is well written; an eval tells you whether it works.

## Security checks

Alongside quality, Tessl checks the safety of skills and plugins. A security scan looks for risky or malicious patterns in a component's content and behavior, such as prompt injection buried in instructions, hardcoded secrets, suspicious download URLs, unverifiable external dependencies, or hidden and obfuscated text. Findings are graded by severity. Tessl surfaces critical and high severity findings when you install, warning rather than blocking and leaving the decision to you. A serious finding on a third-party skill can signal a supply-chain attack, so treat it with care.

## Next

With the vocabulary in place, the Tutorials section goes deeper on creating, improving, and distributing context.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.tessl.io/introduction-to-tessl/core-concepts.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
