SOURCE-URL: https://github.com/gastownhall/gastown/blob/649b832b7672bc7a2dbef26f5983aba6198b819b/internal/formula/formulas/mol-orphan-scan.formula.toml
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/gastown
CLONE-SHA: 649b832b7672bc7a2dbef26f5983aba6198b819b

# Files: mol-orphan-scan.formula.toml (complete), mol-dep-propagate.formula.toml (complete), mol-digest-generate.formula.toml (complete), mol-polecat-work.formula.toml (excerpt: checkpoint commit + gates/verification references)

description = """
Find and reassign orphaned work.

Dogs work through molecules (poured from this formula) to scan for orphaned state:
- Issues marked in_progress with no active polecat
- Molecules attached but worker gone
- Merge queue entries with dead owners
- Wisps from terminated sessions

This is a cleanup and recovery formula. Found orphans are either:
- Reassigned to available workers
- Reset to open status for next dispatch
- Escalated if data loss occurred

## Dog Contract

This is infrastructure work. You:
1. Receive scan scope via hook_bead (rig or town-wide)
2. Scan for orphaned state
3. Classify and triage orphans
4. Take recovery action
5. Report findings
6. Return to kennel

## Variables

| Variable | Source | Description |
|----------|--------|-------------|
| scope | hook_bead | Scan scope: 'town' or specific rig name |

## Why Dogs?

Orphan scanning requires multi-rig access and may need to interact with
multiple Witnesses. Dogs have the cross-rig worktrees needed for this."""
formula = "mol-orphan-scan"
version = 2

[squash]
trigger = "on_complete"
template_type = "work"
include_metrics = true

[[steps]]
id = "determine-scope"
title = "Determine scan scope"
description = """
Establish what to scan for orphans.

**1. Check assignment:**
```bash
gt hook               # Shows scope in hook_bead
```

**2. Resolve scope:**
- 'town': Scan all rigs
- '<rig>': Scan specific rig only

```bash
# If town-wide
gt rigs                     # Get list of all rigs

# If specific rig
# Just use that rig
```

**Exit criteria:** Scope determined, rig list established."""

[[steps]]
id = "scan-orphaned-issues"
title = "Scan for orphaned issues"
needs = ["determine-scope"]
description = """
Find issues marked in_progress with no active worker.

**1. For each rig in scope, find in_progress issues:**
```bash
bd list --status=in_progress
```

**2. For each in_progress issue, check assignee:**
```bash
bd show <issue-id>
# Get assignee field
```

**3. Check if assignee session exists:**

Parse the assignee field to extract rig and polecat name:
- Assignee format: `<rig>/polecats/<name>` (e.g., `nrpk/polecats/rust`)
- Extract: rig and name from the path

```bash
# Check session liveness using gt session status (handles prefix derivation)
gt session status <rig>/<name> --json | jq -r '.running' | grep -q true && echo ALIVE || echo DEAD
```

If the assignee is NOT a polecat (e.g., witness, refinery), use:
```bash
gt session status <rig>/<role> --json | jq -r '.running' | grep -q true && echo ALIVE || echo DEAD
```

**4. Identify orphans:**
- Issue in_progress + assignee session dead = orphan
- Issue in_progress + no assignee = orphan

Record each orphan with:
- Issue ID
- Last assignee (if any)
- How long orphaned (last update timestamp)

**Exit criteria:** Orphaned issues identified."""

[[steps]]
id = "scan-orphaned-molecules"
title = "Scan for orphaned molecules"
needs = ["determine-scope"]
description = """
Find molecules attached to dead sessions.

**1. List active molecules:**
```bash
bd mol list --active
```

**2. For each molecule, check owner session:**
```bash
bd mol show <mol-id>
# Get agent/session info
```

**3. Check if owner session exists:**

Parse the owner/agent field to extract rig and name:
- Owner format: `<rig>/polecats/<name>` or `<rig>/<role>`

```bash
# Check session liveness using gt session status (handles prefix derivation)
gt session status <rig>/<name> --json | jq -r '.running' | grep -q true && echo ALIVE || echo DEAD
```

**4. Identify orphans:**
- Molecule in_progress + owner session dead = orphan
- Molecule hooked + owner session dead = orphan

Record each orphan for triage.

**Exit criteria:** Orphaned molecules identified."""

[[steps]]
id = "scan-orphaned-wisps"
title = "Scan for orphaned wisps"
needs = ["determine-scope"]
description = """
Find wisps from terminated sessions.

**1. List wisps in ephemeral storage:**
```bash
ls .beads-wisp/             # Or equivalent location
```

**2. For each wisp, check spawner session:**
Wisps should have metadata indicating the spawning session.

**3. Identify orphans:**
- Wisp age > 1 hour + spawner session dead = orphan
- Wisp with no spawner metadata = orphan

**4. Check for unsquashed content:**
Orphaned wisps may have audit-worthy content that wasn't squashed.

**Exit criteria:** Orphaned wisps identified."""

[[steps]]
id = "triage-orphans"
title = "Classify and triage orphans"
needs = ["scan-orphaned-issues", "scan-orphaned-molecules", "scan-orphaned-wisps"]
description = """
Classify orphans by severity and determine action.

**1. Classify by type:**

| Type | Severity | Typical Action |
|------|----------|----------------|
| Issue in_progress, no work done | Low | Reset to open |
| Issue in_progress, work in progress | Medium | Check branch, reassign |
| Molecule mid-execution | Medium | Resume or restart |
| Wisp with content | Low | Squash or burn |
| Wisp empty | None | Delete |

**2. Check for data loss:**
For issues/molecules with possible work:
```bash
# Check for branch with work
git branch -a | grep <polecat-or-issue>
git log --oneline <branch>
```

**3. Categorize for action:**
- RESET: Return to open status for normal dispatch
- REASSIGN: Assign to specific worker immediately
- RECOVER: Salvage work from branch/state
- ESCALATE: Data loss or complex situation
- BURN: Safe to delete (empty wisps, etc.)

**Exit criteria:** All orphans categorized with planned action."""

[[steps]]
id = "execute-recovery"
title = "Execute recovery actions"
needs = ["triage-orphans"]
description = """
Take action on each orphan based on triage.

**1. RESET orphans:**
```bash
bd update <issue> --status=open --assignee=""
# Clears in_progress, ready for dispatch
```

**2. REASSIGN orphans:**
```bash
# Notify Witness to handle assignment
gt mail send <rig>/witness -s "Orphan needs assignment: <issue>" \
  -m "Issue <id> was orphaned. Has partial work. Needs reassignment."
```

**3. RECOVER orphans:**
```bash
# For issues with work on branch:
# - Preserve the branch
# - Create recovery note
bd update <issue> --status=open \
  --note="Recovery: work exists on branch <branch>"
```

**4. ESCALATE orphans:**
```bash
gt mail send mayor/ -s "Orphan requires escalation: <issue>" \
  -m "Issue <id> orphaned with possible data loss.
Details: ...
Recommended action: ..."
```

**5. BURN orphans:**
```bash
# For empty wisps, etc.
rm .beads-wisp/<wisp-file>
```

**Exit criteria:** All orphans handled."""

[[steps]]
id = "report-findings"
title = "Generate and send orphan report"
needs = ["execute-recovery"]
description = """
Create summary report of orphan scan and actions.

**1. Generate report:**
```markdown
## Orphan Scan Report: {{timestamp}}

**Scope**: {{scope}}
**Orphans found**: {{total_count}}

### By Type
- Issues: {{issue_count}}
- Molecules: {{mol_count}}
- Wisps: {{wisp_count}}

### Actions Taken
- Reset to open: {{reset_count}}
- Reassigned: {{reassign_count}}
- Recovered: {{recover_count}}
- Escalated: {{escalate_count}}
- Burned: {{burn_count}}

### Details
{{#each orphan}}
- {{type}} {{id}}: {{action}} - {{reason}}
{{/each}}
```

**2. Send to Deacon (for logs):**
```bash
gt mail send deacon/ -s "Orphan scan complete: {{total_count}} found" \
  -m "{{report}}"
```

**3. Send to Mayor (if escalations):**
```bash
# Only if there were escalations
gt mail send mayor/ -s "Orphan scan: {{escalate_count}} escalations" \
  -m "{{escalations_section}}"
```

**Exit criteria:** Reports sent."""

[[steps]]
id = "return-to-kennel"
title = "Signal completion and return to kennel"
needs = ["report-findings"]
description = """
Signal work complete and return to available pool.

**1. Signal completion to Deacon:**
```bash
gt mail send deacon/ -s "DOG_DONE $(hostname)" -m "Task: orphan-scan
Scope: {{scope}}
Orphans found: {{total_count}}
Actions taken: {{action_summary}}
Status: COMPLETE

Ready for next assignment."
```

**2. Return to kennel:**
Dog returns to available state in the pool.

**Exit criteria:** Deacon notified, dog ready for next work."""

[vars]
[vars.scope]
description = "Scan scope: 'town' or specific rig name"
required = true

[vars.action]
description = "Recovery action taken for an orphan (computed during execution)"
default = ""

[vars.action_summary]
description = "Summary of all actions taken (computed during execution)"
default = ""

[vars.burn_count]
description = "Number of orphans burned/deleted (computed during execution)"
default = ""

[vars.escalate_count]
description = "Number of orphans escalated (computed during execution)"
default = ""

[vars.escalations_section]
description = "Formatted escalations section for Mayor report (computed during execution)"
default = ""

[vars.id]
description = "Orphan identifier (computed during execution)"
default = ""

[vars.issue_count]
description = "Number of orphaned issues found (computed during execution)"
default = ""

[vars.mol_count]
description = "Number of orphaned molecules found (computed during execution)"
default = ""

[vars.reason]
description = "Reason for orphan cleanup action (computed during execution)"
default = ""

[vars.reassign_count]
description = "Number of orphans reassigned (computed during execution)"
default = ""

[vars.recover_count]
description = "Number of orphans recovered (computed during execution)"
default = ""

[vars.report]
description = "Full orphan scan report text (computed during execution)"
default = ""

[vars.reset_count]
description = "Number of orphans reset to open (computed during execution)"
default = ""

[vars.timestamp]
description = "Timestamp of the scan (computed during execution)"
default = ""

[vars.total_count]
description = "Total number of orphans found (computed during execution)"
default = ""

[vars.type]
description = "Type of orphan (issue, molecule, wisp) (computed during execution)"
default = ""

[vars.wisp_count]
description = "Number of orphaned wisps found (computed during execution)"
default = ""

===== mol-dep-propagate.formula.toml =====

description = """
Propagate cross-rig dependency resolution.

Dogs work through molecules (poured from this formula) when dependencies resolve across rig boundaries.
When an issue in one rig closes, dependent issues in other rigs may unblock.
This formula handles:
- Finding cross-rig dependents
- Notifying affected rigs
- Updating blocked status
- Triggering work dispatch if appropriate

## Dog Contract

This is infrastructure work. You:
1. Receive closed issue ID via hook_bead
2. Find all cross-rig dependents (issues in other rigs blocked by this)
3. Notify affected Witnesses
4. Optionally trigger dispatch if issues are now ready
5. Return to kennel

## Variables

| Variable | Source | Description |
|----------|--------|-------------|
| resolved_issue | hook_bead | The issue that just closed |

## Why Dogs?

Cross-rig work requires multi-rig worktrees. Dogs have these, polecats don't.
The Deacon detects the closure, but the propagation needs rig access."""
formula = "mol-dep-propagate"
version = 1

[squash]
trigger = "on_complete"
template_type = "work"
include_metrics = true

[[steps]]
id = "load-resolved-issue"
title = "Load resolved issue and find dependents"
description = """
Load the closed issue and identify cross-rig dependents.

**1. Check your assignment:**
```bash
gt hook               # Shows hook_bead = resolved issue ID
bd show {{resolved_issue}}  # Full issue details
```

**2. Verify issue is closed:**
```bash
bd show {{resolved_issue}}
# Status should be 'closed' or similar terminal state
```

**3. Find dependents (issues blocked by this one):**
```bash
bd show {{resolved_issue}}
# Look at 'blocks' field - these are issues waiting on this one
```

**4. Identify cross-rig dependents:**
- Same-rig dependents: Already handled by local beads (automatic unblock)
- Cross-rig dependents: Different prefix (e.g., gt- vs bd-) need propagation

```bash
# Example: resolved_issue is bd-xxx, blocks gt-yyy
# gt-yyy is cross-rig and needs notification
```

**Exit criteria:** Resolved issue loaded, cross-rig dependents identified."""

[[steps]]
id = "update-blocked-status"
title = "Update blocked status in affected rigs"
needs = ["load-resolved-issue"]
description = """
Update the blocked status for cross-rig dependents.

**1. For each cross-rig dependent:**
```bash
# Navigate to the rig containing the dependent issue
# Dogs have multi-rig worktrees for this

bd show <dependent-id>
# Check if this was the only blocker
```

**2. Check if now unblocked:**
```bash
bd blocked <dependent-id>
# If empty or only shows other blockers, issue is now unblocked
```

**3. Verify automatic unblock worked:**
Beads should auto-update blocked status when dependencies close.
This step verifies and fixes if needed:
```bash
# If still showing as blocked by resolved issue (shouldn't happen):
bd dep remove <dependent-id> {{resolved_issue}}
```

**Exit criteria:** All cross-rig dependents have updated blocked status."""

[[steps]]
id = "notify-witnesses"
title = "Notify affected rig Witnesses"
needs = ["update-blocked-status"]
description = """
Send notifications to Witnesses of affected rigs.

**1. Group dependents by rig:**
- gastown/witness: for gt-* issues
- beads/witness: for bd-* issues
- etc.

**2. For each affected rig, send notification:**
```bash
gt mail send <rig>/witness -s "Dependency resolved: {{resolved_issue}}" -m "$(cat <<EOF
External dependency has closed, unblocking work in your rig.

## Resolved Issue
- ID: {{resolved_issue}}
- Title: {{resolved_issue.title}}
- Rig: {{resolved_issue.prefix}}

## Unblocked in Your Rig
{{range dependent}}
- {{dependent.id}}: {{dependent.title}} ({{dependent.status}})
{{end}}

These issues may now proceed. Check bd ready for available work.
EOF
)"
```

**3. Log notification:**
Note which Witnesses were notified for audit trail.

**Exit criteria:** All affected Witnesses notified."""

[[steps]]
id = "trigger-dispatch"
title = "Optionally trigger work dispatch"
needs = ["notify-witnesses"]
description = """
Trigger work dispatch for newly-unblocked issues if appropriate.

**1. For each unblocked issue, check if ready for work:**
```bash
bd show <issue-id>
# Check:
# - Status: should be 'open' (not already in_progress)
# - Priority: high priority may warrant immediate dispatch
# - No other blockers: bd blocked should be empty
```

**2. Decision: trigger dispatch?**

| Condition | Action |
|-----------|--------|
| High priority (P0-P1) + open + unblocked | Recommend immediate dispatch |
| Medium priority (P2) + open + unblocked | Note in Witness notification |
| Low priority (P3-P4) | Let Witness handle in next patrol |

**3. If triggering dispatch:**
```bash
# For high priority, suggest to Mayor:
gt mail send mayor/ -s "High-priority work unblocked: <issue>" -m "..."
```

Usually, the Witness notification (previous step) is sufficient - Witnesses
handle their own dispatch decisions.

**Exit criteria:** Dispatch recommendations sent where appropriate."""

[[steps]]
id = "return-to-kennel"
title = "Signal completion and return to kennel"
needs = ["trigger-dispatch"]
description = """
Signal work complete and return to available pool.

**1. Signal completion to Deacon:**
```bash
gt mail send deacon/ -s "DOG_DONE $(hostname)" -m "Task: dep-propagate
Resolved: {{resolved_issue}}
Cross-rig dependents: {{dependent_count}}
Witnesses notified: {{witness_list}}
Status: COMPLETE

Ready for next assignment."
```

**2. Update activity feed:**
The propagation creates implicit feed entries (dependency updates).
No explicit entry needed.

**3. Return to kennel:**
Dog returns to available state in the pool.

**Exit criteria:** Deacon notified, dog ready for next work or retirement."""

[vars]
[vars.resolved_issue]
description = "The issue ID that just closed and needs propagation"
required = true

[vars.dependent_count]
description = "Number of cross-rig dependents found (computed during execution)"
default = ""

[vars.witness_list]
description = "List of Witnesses notified (computed during execution)"
default = ""

===== mol-digest-generate.formula.toml =====

description = """
Generate daily digest for overseer (Mayor).

Dogs work through molecules (poured from this formula) on a scheduled basis (daily, or triggered by plugin)
to create summary digests of Gas Town activity. This aggregates:
- Work completed across all rigs
- Issues filed and closed
- Incidents and escalations
- Agent health metrics
- Key statistics and trends

## Dog Contract

This is infrastructure work. You:
1. Receive digest period via hook_bead (e.g., daily, weekly)
2. Collect data from all rigs you have access to
3. Generate formatted digest
4. Send to overseer
5. Archive digest as bead
6. Return to kennel

## Variables

| Variable | Source | Description |
|----------|--------|-------------|
| period | hook_bead | Time period for digest (daily, weekly) |
| since | computed | Start timestamp for data collection |
| until | computed | End timestamp (usually now) |

## Why Dogs?

Digest generation requires reading from multiple rigs. Dogs have multi-rig
worktrees. This is also a periodic task that doesn't need a dedicated polecat."""
formula = "mol-digest-generate"
version = 1

[squash]
trigger = "on_complete"
template_type = "work"
include_metrics = true

[[steps]]
id = "determine-period"
title = "Determine digest time period"
description = """
Establish the time range for this digest.

**1. Check assignment:**
```bash
gt hook               # Shows period type
```

**2. Calculate time range:**

| Period | Since | Until |
|--------|-------|-------|
| daily | Yesterday 00:00 | Today 00:00 |
| weekly | Last Monday 00:00 | This Monday 00:00 |
| custom | From hook_bead | From hook_bead |

```bash
# For daily digest
since=$(date -v-1d +%Y-%m-%dT00:00:00)
until=$(date +%Y-%m-%dT00:00:00)
```

**3. Record period for reporting:**
Note the exact timestamps for the digest header.

**Exit criteria:** Time period established with precise timestamps."""

[[steps]]
id = "collect-rig-data"
title = "Collect activity data from all rigs"
needs = ["determine-period"]
description = """
Gather activity data from each rig in the town.

**1. List accessible rigs:**
```bash
gt rigs
# Returns list of rigs: gastown, beads, etc.
```

**2. For each rig, collect:**

a) **Issues filed and closed:**
```bash
# From rig beads
bd list --created-after={{since}} --created-before={{until}}
bd list --status=closed --updated-after={{since}}
```

b) **Agent activity:**
```bash
gt polecats <rig>           # Polecat activity
gt feed --since={{since}}   # Activity feed entries
```

c) **Merges:**
```bash
# Git log for merges to main
git -C <rig-path> log --merges --since={{since}} --oneline main
```

d) **Incidents:**
```bash
# Issues tagged as incident or high-priority
bd list --label=incident --created-after={{since}}
```

**3. Aggregate across rigs:**
Sum counts, collect notable items, identify trends.

**Exit criteria:** Raw data collected from all accessible rigs."""

[[steps]]
id = "generate-digest"
title = "Generate formatted digest"
needs = ["collect-rig-data"]
description = """
Transform collected data into formatted digest.

**1. Calculate summary statistics:**
- Total issues filed
- Total issues closed
- Net change (closed - filed)
- By type (task, bug, feature)
- By rig

**2. Identify highlights:**
- Biggest completions (epics, large features)
- Incidents (any P0/P1 issues)
- Notable trends (increasing backlog, fast closure rate)

**3. Generate digest text:**
```markdown
# Gas Town Daily Digest: {{date}}

## Summary
- **Issues filed**: N (tasks: X, bugs: Y, features: Z)
- **Issues closed**: N
- **Net change**: +/-N

## By Rig
| Rig | Filed | Closed | Active Polecats |
|-----|-------|--------|-----------------|
| gastown | X | Y | Z |
| beads | X | Y | Z |

## Highlights
### Completed
- {{epic or feature}} - completed by {{polecat}}

### Incidents
- {{incident summary if any}}

## Agent Health
- Polecats spawned: N
- Polecats retired: N
- Average work duration: Xh

## Trends
- Backlog: {{increasing/stable/decreasing}}
- Throughput: {{issues/day}}
```

**Exit criteria:** Formatted digest ready for delivery."""

[[steps]]
id = "send-digest"
title = "Send digest to overseer"
needs = ["generate-digest"]
description = """
Deliver digest to the Mayor.

**1. Send via mail:**
```bash
gt mail send mayor/ -s "Gas Town Digest: {{date}}" -m "$(cat <<EOF
{{formatted_digest}}
EOF
)"
```

**2. Archive as bead:**
Create a digest bead for permanent record:
```bash
bd create --title="Digest: {{date}}" --type=digest \
  --description="{{formatted_digest}}" \
  --label=digest,{{period}}
```

**3. Sync:**
```bash
bd sync
```

**Exit criteria:** Digest sent to Mayor and archived as bead."""

[[steps]]
id = "return-to-kennel"
title = "Signal completion and return to kennel"
needs = ["send-digest"]
description = """
Signal work complete and return to available pool.

**1. Signal completion to Deacon:**
```bash
gt mail send deacon/ -s "DOG_DONE $(hostname)" -m "Task: digest-generate
Period: {{period}}
Date range: {{since}} to {{until}}
Status: COMPLETE

Digest sent to Mayor.
Ready for next assignment."
```

**2. Return to kennel:**
Dog returns to available state in the pool.

**Exit criteria:** Deacon notified, dog ready for next work."""

[vars]
[vars.period]
description = "The digest period type (daily, weekly, custom)"
required = true
default = "daily"

[vars.date]
description = "The date for the digest header (computed during execution)"
default = ""

[vars.formatted_digest]
description = "The formatted digest text (computed during execution)"
default = ""

[vars.polecat]
description = "Polecat name for attribution (computed during execution)"
default = ""

[vars.since]
description = "Start timestamp for data collection (computed during execution)"
default = ""

[vars.until]
description = "End timestamp for data collection (computed during execution)"
default = ""

===== mol-polecat-work.formula.toml (lines 130-230) =====

source_issue from the bead-id embedded in your branch name. A reused branch
carries the PREVIOUS bead's id: your MR gets attributed to the wrong (often
closed) bead, close credit goes to the wrong issue, and your real issue stays
open and hooked forever. NEVER reuse a branch from a previous assignment —
even if your worktree is already checked out on it.

**1. Check current branch state:**
```bash
git status
git branch --show-current
```

If the current branch name embeds a bead-id that is not {{issue}}, it is
leftover from a previous assignment. Do NOT work on it — create a fresh
branch in step 3.

**2. Exception — rejected-MR rework for THIS bead only:**

If the bead notes contain "MERGE REJECTION" with a branch name, that branch
holds previous work on {{issue}} itself. Reusing it preserves all previous work:
```bash
git fetch origin
# Check for prior branch
git branch -r | grep <prior-branch>
# If found, check it out:
git checkout -b <prior-branch> origin/<prior-branch>
git rebase origin/{{base_branch}}
```

This exception applies ONLY when the prior branch is for {{issue}}. A branch
from a different bead is never reusable.

**3. Otherwise, create a fresh branch NAMED FOR THE HOOKED BEAD:**
```bash
git fetch origin
git checkout -b "polecat/<name>/{{issue}}+$(openssl rand -hex 3)" origin/{{base_branch}}
```

The format is `polecat/<your-name>/<bead-id>+<short-unique-suffix>`. The
embedded bead-id is what makes MR attribution work; the suffix keeps the
name unique across re-dispatches of the same bead.

**4. Ensure clean working state:**
```bash
git status                  # Should show "working tree clean"
git stash list              # Should be empty
```

If dirty state from previous work:
```bash
# If changes are relevant to this issue:
git add -A && git commit -m "WIP: <description>"

# If changes are unrelated cruft:
git stash push -m "unrelated changes before {{issue}}"
# Or discard if truly garbage:
git checkout -- .
```

**5. Sync with {{base_branch}}:**
```bash
git fetch origin
git rebase origin/{{base_branch}}      # Get latest, rebase your branch
```

If rebase conflicts:
- Resolve them carefully
- If stuck, mail Witness

**6. Run project setup (if configured):**

If setup_command is set, run it to install dependencies:
```bash
{{setup_command}}
```

This ensures dependencies are installed before you start work.
Empty setup_command means "not configured" — skip this step.

**Exit criteria:** You're on a clean feature branch whose name embeds {{issue}}, rebased on latest {{base_branch}}, dependencies installed."""

[[steps]]
id = "implement"
title = "Implement the solution"
needs = ["branch-setup"]
description = """
Do the actual implementation work.

**Working principles:**
- Follow existing codebase conventions
- Make atomic, focused commits
- Keep changes scoped to the assigned issue
- Don't gold-plate or scope-creep
- **Scope is a contract.** The bead description defines what you build. If you believe \
the issue requires work beyond what is described, mail the mayor BEFORE implementing it:
  ```bash
  gt mail send mayor/ -s "Scope question: {{issue}}" -m "I think we also need X because Y. Proceed?"
  ```
  Wait for a response before expanding scope. Do NOT build unrequested features and \
present them as complete.
- **NEVER run `sudo` or install system packages** (apt, dnf, yum, pacman, brew install,
