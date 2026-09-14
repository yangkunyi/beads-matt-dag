SOURCE-URL: https://docs.devin.ai/product-guides/automations.md
FETCHED: 2026-09-14T17:16:52+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Automations

> Set up Devin automations: event-driven workflows that start Devin sessions from Slack, GitHub, Linear, schedules, and webhooks.

Automations let you wire external events — Slack messages, GitHub webhooks, Linear ticket updates, schedules, and custom webhooks — to Devin sessions that start automatically. Instead of manually tagging Devin every time a bug is reported or a CI check fails, you define the trigger once and Devin handles each event as it arrives. You can also manage automations declaratively with the [Terraform provider](/api-reference/terraform-provider).

## Core concepts

An automation has three parts:

| Part           | What it does                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Trigger**    | The event that fires the automation (e.g. a Slack message in `#bugs`, a GitHub CI failure, a Linear label change)     |
| **Conditions** | Optional filters that narrow the trigger (e.g. only fire when the label is `bug`, only for a specific repo)           |
| **Action**     | What Devin does when the trigger fires — start a new session, message an existing session, or act as a triage monitor |

### Action types

| Action                 | Description                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Start session**      | Creates a new Devin session with the prompt you define. The event payload is automatically included as context.                                                                                                                                  |
| **Message session**    | Sends a message to an existing, long-running Devin session — useful for feeding events into a session that maintains state.                                                                                                                      |
| **Triage Devin**       | A persistent Devin that monitors a Slack channel. It watches every incoming message, decides what needs attention, and spawns child sub-devins for items that require investigation. See [Auto-triage](/product-guides/auto-triage) for details. |
| **Email notification** | Sends you an email when the automation runs — on every run, only on failures, or only on successes.                                                                                                                                              |

### Trigger sources

| Source       | Event types                                                                             | Example use case                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Slack**    | New message, reaction added                                                             | Triage bug reports in `#incidents`, react with 🚨 to start an investigation                                                      |
| **GitHub**   | Issue, issue comment, PR opened/updated, PR review, check run (CI), push                | Auto-fix CI failures, respond to `/devin` comments on issues                                                                     |
| **GitLab**   | Merge request, MR comment, issue, issue comment, push, pipeline                         | Auto-fix failing pipelines, respond to comments on merge requests                                                                |
| **Linear**   | Issue created, label added, status changed, priority changed, assigned, moved to a team | Triage bugs when labeled, implement tickets when assigned to Devin                                                               |
| **Jira**     | Issue created, issue updated, label added, status changed, assigned, commented          | Implement tickets when assigned to Devin, track status changes                                                                   |
| **Pylon**    | Issue created, tag added, status changed                                                | Triage customer bug tickets filed in Pylon                                                                                       |
| **Schedule** | Recurring (cron-based) or one-time (run once)                                           | Daily Sentry error sweeps, weekly dependency updates, nightly smoke tests, or a one-off task that runs at a specific future time |
| **Webhook**  | Incoming HTTP request                                                                   | Wire any external system (PagerDuty, Datadog, Sentry, custom tools) to Devin via a webhook URL                                   |

Non-schedule sources appear in the trigger picker once the corresponding integration is connected in **Settings > Connections**.

A single automation can have **multiple triggers** — they act as an OR, so the automation fires when any of its triggers match. For example, you can have one automation that fires on both a GitHub CI failure and a Slack reaction.

## Creating an automation

### From the automations page

1. Navigate to **Automations** in the sidebar
2. Click **Create automation** (or use the chat input to describe what you want in natural language — Devin will generate the automation config for you)
3. Configure the trigger, conditions, and action
4. Click **Save**

### From a template

1. Navigate to **Automations** in the sidebar
2. Click **View all examples** in the top-right of the **Featured automations** box
3. Browse the template gallery — each template is a pre-configured automation for a common workflow
4. Click a template to pre-fill the editor with its trigger, action, and suggested limits
5. Customize the configuration (e.g. select your Slack channel or repo) and save

### Using natural language

On the automations page, you can describe what you want in the chat input at the bottom — for example, "When a CI check fails on my-org/my-repo, have Devin fix it and push to the same branch." Devin will generate the automation configuration for you, which you can review and save.

## Configuring triggers

### Slack triggers

Slack triggers fire when a message is posted or a reaction is added in a channel where Devin has been invited.

* **Slack message**: Fires on new messages in a specific channel. You must select the channel when configuring the trigger.
* **Slack reaction**: Fires when a specific emoji reaction is added to a message (e.g. 🚨 for incidents). You can filter by the reaction name and the channel.

<Note>Devin must be invited to the Slack channel for the trigger to work. You must also have your personal Slack account connected in **Settings > Connections > Slack**.</Note>

### GitHub triggers

GitHub triggers fire on repository events. You must select a specific repository for each trigger.

* **Issue**: Fires on issue events (opened, closed, reopened, edited, labeled).
* **Issue comment**: Fires when a comment is posted on a GitHub issue. Commonly used with a `starts_with "/devin"` condition so users can type `/devin` on any issue to trigger Devin.
* **Pull request**: Fires on PR events (opened, synchronized, etc.).
* **Pull request review**: Fires when a review is submitted on a PR.
* **Pull request review comment**: Fires on individual review comments.
* **Check run (CI)**: Fires when a CI check completes. Filter by `conclusion = failure` to auto-fix broken builds.
* **Push**: Fires on pushes to a branch.

<Note>By default, GitHub automations only fire on private repositories. An admin can opt an individual GitHub connection into public repositories: in [Settings → Connections → GitHub](https://app.devin.ai/settings/connections/github), open the connection's menu and set **Automation scope** to **All installed repos**. Anyone on the internet can comment on or open a PR against a public repo, so public-repo triggers carry a higher prompt-injection risk — enable this deliberately and keep your trigger conditions narrow.</Note>

### GitLab triggers

GitLab triggers fire on project events in your connected GitLab instance:

* **Merge request**: Fires on MR actions (opened, closed, merged, reopened, approved, updated).
* **MR comment**: Fires when a comment (note) is posted on a merge request, including diff review threads.
* **Issue**: Fires on issue actions (opened, closed, reopened, updated).
* **Issue comment**: Fires when a comment is posted on an issue.
* **Push**: Fires on pushes to a branch.
* **Pipeline**: Fires when a pipeline reaches a given status — filter by status (e.g. `failed`) to auto-fix failing pipelines.

### Linear triggers

Linear triggers fire on issue events in your connected Linear workspace. You must select a team for each trigger.

* **Issue created**: Fires when a new issue is created in the selected team.
* **Label added**: Fires when a label is applied to an issue (e.g. `bug`, `devin`).
* **Status changed**: Fires when an issue's status changes (e.g. moved to "In Progress").
* **Priority changed**: Fires when an issue's priority changes.
* **Assigned**: Fires when an issue is assigned to someone.
* **Issue moved**: Fires when an issue is moved to a different team — the trigger's team filter matches the destination team.

### Jira triggers

Jira triggers fire on issue events in your connected Jira site. You can filter by project, labels, status, assignee, and epic:

* **Issue created**: Fires when a new issue is created.
* **Issue updated**: Fires when an issue's fields change.
* **Label added**: Fires when a label is applied to an issue.
* **Status changed**: Fires when an issue's status changes.
* **Assigned**: Fires when an issue is assigned to someone.
* **Comment created or edited**: Fires when a comment is added or edited on an issue.

### Schedule triggers

Schedule triggers fire on a time-based schedule — either recurring or as a single one-time run. In the trigger dropdown, expand **Schedule** and choose **Every hour**, **Every day**, **Every week**, **Run once**, or **Custom schedule**.

* **Recurring**: Set the frequency (hourly, daily, weekly) and time. Under the hood, schedules use the iCalendar RRULE format. Choose **Custom schedule** to build a custom recurrence (repeat every N minutes/hours/days/weeks/months) or enter a raw RRULE string directly (e.g. `FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0`) for more complex cadences.
* **Run once**: Fires a single time at a specific future date and time, then automatically disables itself. Useful for one-off delayed work — e.g. "wake Devin up in 12 hours to run a task." Pick the date and time (defaults to one hour from now); it must be in the future.

<Tip>Times are displayed in your local timezone but stored as UTC internally.</Tip>

### Webhook triggers

Webhook triggers let you connect any external system to Devin via a unique HTTPS endpoint.

1. Create an automation with a **Webhook** trigger
2. Copy the webhook URL and secret shown in the trigger configuration
3. Configure your external system (PagerDuty, Datadog, Sentry, or any custom tool) to send HTTP POST requests to this URL
4. Optionally add a **payload filter** — a regex pattern that the request body must match for the automation to fire

Pass the webhook secret in any one of these ways:

* `X-Webhook-Secret: <secret>` header
* `Authorization: Bearer <secret>` header
* `?secret=<secret>` query parameter

Prefer a header — query strings are often captured in proxy, CDN, and server access logs.

The webhook payload is included in the Devin session prompt as context. Payloads larger than 200 KB are automatically truncated.

#### Webhook secret

Every webhook trigger has a secret that authenticates incoming requests — calls without the correct secret are rejected. The secret is generated for you and shown when you add the webhook trigger in the automation editor.

<Note>Copy the secret when it's shown — it will not be shown again. A lost secret cannot be recovered; regenerate it instead.</Note>

Each request must include the secret in the `X-Webhook-Secret` HTTP header. For example, to test with curl:

```bash theme={null}
curl -X POST '<webhook-url>' \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Secret: <secret>' \
  -d '{"test": true}'
```

If you lose the secret or need to rotate it, open the webhook trigger in the automation editor and regenerate it. The old secret stops working immediately, so update your external system with the new value.

## Configuring actions

### Start session

The most common action. When the trigger fires, Devin starts a new session with your prompt. The event payload (e.g. the Slack message text, GitHub webhook body, or Linear ticket details) is automatically appended to the prompt so Devin has full context.

Options:

* **Prompt**: The instructions Devin follows. Write this like you would a normal Devin prompt.
* **Playbook** (optional): Use `@playbook-name` in your prompt to include a [playbook](/product-guides/using-playbooks) for additional instructions.
* **Tags** (optional): Add tags to sessions created by this automation for easy filtering.

### Message session

Sends a message to an existing, long-running Devin session. Useful when you want a single persistent session to process events over time instead of spawning a new session for each event.

You must select the target session when configuring this action.

### Triage Devin (monitor)

Creates a persistent Devin session that monitors a Slack channel. See the [Auto-triage guide](/product-guides/auto-triage) for full details on this action type.

### Email notification

Sends an email notification when the automation runs. Choose when to notify:

* **Always** — on every invocation
* **On failure** — only when the session fails or errors
* **On success** — only when the session completes successfully

## Limits and safeguards

Automations include built-in controls to prevent runaway usage:

### ACU limit

Set a maximum ACU (Agent Compute Unit) budget per session started by this automation. If Devin hits the limit, the session stops. This prevents any single invocation from consuming excessive resources.

### Invocation limit

Set a cap on how many times the automation can fire within a time window. For example, "at most 10 invocations per hour" prevents a noisy Slack channel or a flurry of CI failures from spawning dozens of sessions.

Both fields are optional — if unset, the automation runs without limits.

### Network policy

You can enable a network policy to restrict which external hosts the automation's sessions can access. This is especially important for automations that process untrusted user input (e.g. Slack messages, webhook payloads). You can add specific domains to the allowlist if Devin needs to reach external services. An automation's network policy only ever narrows access: it is intersected with the [security profile](/product-guides/security-profiles) governing the automation's sessions.

## MCP integrations

<Tip>Connecting MCP integrations is highly recommended — they dramatically improve automation quality by giving Devin access to runtime data like logs, metrics, and error details.</Tip>

Automations work with [MCP integrations](/work-with-devin/mcp) to give Devin access to external tools. When creating an automation, the **Connections** section shows which MCP servers are recommended and their connection status.

For example, the "Fix Sentry Errors Daily" template recommends the Sentry MCP so Devin can query Sentry for unresolved errors. The "Investigate Alerts Triggered" template recommends the Datadog MCP for pulling metrics and traces.

Enable MCP servers on the **Settings → Connections → MCPs** tab (or install their plugins from the plugin marketplace) before creating automations that need them.

## Slack tool access

By default, automation sessions can read and write to the Slack channels involved in the trigger. You can grant access to additional Slack channels in the **Slack tools** section of the automation editor. This is useful when Devin needs to read from multiple channels beyond the one that triggered the automation.

## Activity and monitoring

Each automation tracks its invocation history. On the automation detail page, the **Activity** tab shows:

* Recent invocations with timestamps
* Whether each invocation succeeded or was skipped
* Links to the Devin sessions that were created
* Error messages for failed invocations

The automations list page shows a sparkline for each automation, giving you a visual overview of activity over the past 30 days.

## Enabling and disabling

Toggle an automation on or off at any time from the automations list or detail page. Disabled automations stop processing events but retain their configuration. Re-enabling an automation resumes event processing immediately.

## Templates

Devin includes a library of pre-built automation templates for common workflows:

| Template                         | Category            | What it does                                                                                                                                                   |
| -------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage Bug Reports               | Monitoring & Triage | Watches a Slack channel for bug reports — Devin triages each one, investigates the root cause, and replies in the thread                                       |
| Triage Support Requests          | Monitoring & Triage | Watches a support channel — Devin drafts an accurate reply in the thread and flags anything needing escalation                                                 |
| Triage Customer Bug Tickets      | Monitoring & Triage | When a customer files an issue in Pylon, Devin reproduces the bug, investigates the codebase, and reports findings for the support team                        |
| Investigate Alerts Triggered     | Monitoring & Triage | When an alert lands in your Slack alerts channel, Devin uses the Datadog MCP to pull metrics, logs, and traces, then posts a root-cause analysis in the thread |
| Fix Sentry Errors Daily          | Monitoring & Triage | Every morning, pulls the top unresolved Sentry errors, investigates each one, and opens fix PRs                                                                |
| Daily Error Report               | Monitoring & Triage | Every morning, scans Datadog for new and spiking errors across your services and posts a concise report to Slack                                               |
| Recurring Capacity Planning      | Monitoring & Triage | On a schedule, reviews usage and resource-utilization trends to forecast capacity needs and flag services approaching their limits                             |
| Fix CI Failures                  | CI/CD & Release     | Automatically fixes failing CI checks on non-Devin PRs — reads the build logs, identifies the root cause, pushes a fix, and verifies it passes                 |
| /devin Issue Fix                 | CI/CD & Release     | When someone comments `/devin` on a GitHub issue, Devin investigates the codebase and opens a fix PR                                                           |
| Weekly Dependency Update         | CI/CD & Release     | Every Monday, scans for outdated packages, reviews changelogs for breaking changes, and opens update PRs grouped by risk level                                 |
| Weekly Changelog                 | CI/CD & Release     | Every Friday, compiles merged PRs into a categorized changelog and opens a PR updating CHANGELOG.md                                                            |
| Stale PR Cleanup                 | CI/CD & Release     | Weekly scan for PRs not updated in over a week — checks for merge conflicts and posts a friendly nudge                                                         |
| Dependency Vulnerability Scanner | Security            | Daily scan for known CVEs in your dependencies, prioritized by severity, with fix PRs                                                                          |
| Secret Scanner                   | Security            | Daily scan for leaked credentials, API keys, and tokens — replaces hardcoded secrets with environment variable references and opens fix PRs                    |
| Code Pattern Enforcer            | Security            | Weekly comparison of your repo against a golden reference repository, opening alignment PRs for deviations                                                     |
| OWASP Security Hardening         | Security            | Weekly scan for OWASP Top 10 vulnerabilities — injection flaws, XSS, missing auth checks, insecure defaults — with fix PRs                                     |
| Cloudflare Security Audit        | Security            | Weekly review of Cloudflare audit logs to flag suspicious activity, configuration changes, and potential security issues                                       |
| Weekly Status Digest             | Project Management  | Every Monday, compiles the past week's merged PRs into a concise status update and posts it to Notion                                                          |
| Sprint Progress Report           | Project Management  | A daily standup summary from Asana — pulls task status across projects and posts a progress update to Slack                                                    |
| Backlog Cleanup                  | Project Management  | A weekly pass over your Linear backlog — closes stale and duplicate issues, flags untriaged ones, and fills in missing labels, priorities, and estimates       |

To browse all templates, open the **Automations** page in the Devin app and click **View all examples** next to "Featured automations" above the chat input (or go directly to `/automations/templates`).
