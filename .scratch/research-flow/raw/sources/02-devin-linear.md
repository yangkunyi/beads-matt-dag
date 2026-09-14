SOURCE-URL: https://docs.devin.ai/integrations/linear.md
FETCHED: 2026-09-14T17:16:56+08:00
HTTP: 200

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Linear

> Assign Linear tickets to Devin and turn them into PRs

<Note>
  When you connect the Linear integration, Devin automatically has access to native Linear tools using your integration's authentication. You do not need to configure the Linear MCP separately from the [MCP Marketplace](/work-with-devin/mcp).
</Note>

## Setting up the integration

1. In your Devin account at app.devin.ai, go to [Settings > Connections > Linear](https://app.devin.ai/settings/connections/linear), and click "Connect".
2. You'll be redirected to Linear to review permissions and grant Devin access. You can select which teams in Linear Devin will have access to. You can always change Devin's access directly in the Linear Apps settings later.
3. Once connected, configure your **synced playbook labels** and optionally set up **automation triggers** in the settings page.

## How to trigger Devin from Linear

There are three ways to start a Devin session from a Linear ticket:

### Assign Devin to a ticket

Assign the ticket to Devin directly in Linear. Devin will use the **default playbook** configured in your [Linear integration settings](https://app.devin.ai/settings/connections/linear) to start working on the ticket.

### Add a playbook label

Add a playbook label (e.g. `!plan`, `!implement`, `!triage`, `!review`) to the ticket. Devin will start a session using the specific playbook that matches the label. These labels are synced from your configured **synced playbook labels** in the integration settings.

### @mention Devin in a comment

Mention Devin in a ticket comment with specific instructions. Devin will start a session and use your comment as the task instruction, without applying a playbook.

## Configuring the integration

### Synced playbook labels

Playbook labels let you control which Devin [playbooks](/product-guides/using-playbooks) are available directly from Linear as labels. When you add a playbook to the synced list, its macro (e.g. `!plan`) becomes available as a Linear label in the "Devin Playbooks" label group.

* **Default playbook**: One playbook is marked as the default. When a ticket is assigned to Devin without a specific playbook label, Devin uses this default playbook. The `!plan` playbook is set as the default for new connections.
* **Adding playbooks**: Click "Add playbook" to sync additional playbooks. Only playbooks with a macro can be synced.
* **Removing playbooks**: Remove a playbook to stop syncing its label to Linear.

### Automation triggers

Automation triggers let Devin automatically start working on tickets when they match certain conditions, without manual assignment or labeling. You can configure triggers based on:

* **Teams**: Only trigger for tickets in specific Linear teams.
* **Labels**: Only trigger when a ticket has specific labels.
* **Statuses**: Only trigger when a ticket reaches a specific status (e.g. "Todo", "In Progress").
* **Playbook**: Optionally specify which playbook Devin should use for the triggered session.

Triggers use **edge detection**, meaning they only fire when a ticket transitions from not matching to matching the trigger conditions (e.g. when a label is added or a status changes), not for tickets that already match.

### Enterprise: Linear team mapping

For enterprise deployments with multiple Devin organizations, admins can map Linear teams to specific Devin organizations. This ensures tickets from each Linear team are routed to the correct Devin organization. A mapping is required for the Linear integration to work in enterprise setups.

## Interacting with Devin in Linear

Once Devin starts working on a ticket, it uses Linear's agent session interface to communicate:

* **Activity feed**: Devin posts real-time updates as it works, including commands run, files edited, and progress summaries.
* **Plan tracking**: Devin's todo list syncs to Linear's plan UI so you can see progress at a glance.
* **Follow-up messages**: Send messages in the agent session thread to give Devin additional instructions or ask questions.
* **Stop Devin**: Use the stop signal in Linear to put Devin to sleep on the current task.
* **PR links**: When Devin creates a pull request, the PR URL is automatically added to the agent session for easy access.
* **Session link**: A direct link to the Devin session in the web app is added to the agent session, along with a link to the playbook used (if applicable).

## Connecting your Linear user account

In addition to the organization-level integration, individual team members can link their Linear account to their Devin account. This allows Devin to recognize who triggered a ticket and attribute sessions to the correct user.

To connect your user account, go to [Settings > Connections > Linear](https://app.devin.ai/settings/connections/linear) and link your account in the user connection section.
