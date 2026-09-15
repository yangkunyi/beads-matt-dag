SOURCE-URL: https://github.com/gastownhall/gastown/blob/649b832b7672bc7a2dbef26f5983aba6198b819b/internal/formula/formulas/mol-polecat-lease.formula.toml
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/gastown
CLONE-SHA: 649b832b7672bc7a2dbef26f5983aba6198b819b

# Files: mol-polecat-lease.formula.toml (complete); internal/constants/constants.go excerpt (GUPPViolationTimeout/HungSessionThreshold); internal/config/types.go excerpt (StuckThreshold, WorkerStatus); internal/witness/handlers.go excerpts (ZombieClassification, DetectStalledPolecats, heartbeat-stuck handling 1726-1800, 2237-2340)

description = """
Witness-side tracking of a single polecat's lifecycle.

The Witness bonds this molecule for each active polecat, creating a lease that
tracks the polecat from spawn through work to cleanup. This is the WITNESS'S
view of the polecat, not the polecat's own work molecule.

## Lifecycle States

```
BOOT ─► WORKING ─► VERIFYING ─► MERGE_REQUESTED ─► DONE
  │         │           │              │
  └─► STUCK ─┴─► STUCK ──┴──► STUCK ───┘
```

## Variables

| Variable | Required | Description |
|----------|----------|-------------|
| polecat | Yes | Name of the polecat |
| issue | Yes | The issue assigned to the polecat |
| rig | Yes | The rig this polecat belongs to |"""
formula = "mol-polecat-lease"
version = 2

[[steps]]
id = "boot"
title = "Verify polecat boots successfully"
description = """
Polecat has been spawned. Verify it initializes and starts working.

**Check if alive:**
```bash
tmux capture-pane -t gt-{{rig}}-{{polecat}} -p | tail -20
```

Look for:
- Claude prompt visible ("> " at start of line)
- `gt prime` output
- Signs of reading the assigned issue

**If idle for >60 seconds:**
```bash
gt nudge {{rig}}/polecats/{{polecat}} "Begin work on {{issue}}."
```

**If still no response after nudge:**
```bash
gt nudge {{rig}}/polecats/{{polecat}} "Are you there? Please acknowledge."
```

After 3 failed nudges, mark as stuck and escalate.

**Exit criteria:** Polecat shows signs of active work on {{issue}}."""

[[steps]]
id = "working"
title = "Monitor polecat progress"
needs = ["boot"]
description = """
Polecat is actively working. Monitor for stuck or completion.

**Periodic checks:**
- Use standard nudge protocol from Witness CLAUDE.md
- Watch for POLECAT_DONE mail or agent_state=done

**Signs of progress:**
- Git commits appearing
- File changes visible in peek
- Active tool usage in tmux capture

**Signs of stuck:**
- Idle >15 minutes
- Repeated errors
- Explicit "I'm stuck" messages

**If POLECAT_DONE received or agent_state=done:**
Proceed to verifying step.

**Exit criteria:** Polecat signals completion (POLECAT_DONE mail or state=done)."""

[[steps]]
id = "verifying"
title = "Verify polecat work is merge-ready"
needs = ["working"]
description = """
Polecat claims completion. Verify before sending to Refinery.

**1. Check git state:**
```bash
cd polecats/{{polecat}}
git status                    # Must be "working tree clean"
git stash list                # Must be empty
git log origin/main..HEAD     # Should have commits
```

**2. Verify branch is pushed:**
```bash
git log origin/$(git branch --show-current)..HEAD  # Should be empty
```

**3. Verify issue is closed:**
```bash
bd show {{issue}}             # Status should be 'closed'
```

**4. Spot-check quality (ZFC - your judgment):**
- Commits have reasonable messages
- Changes look related to issue
- No obvious problems in git log

**If verification fails:**
Nudge polecat to fix:
```bash
# Use --mode=queue to avoid interrupting in-flight tool calls
gt nudge --mode=queue {{rig}}/polecats/{{polecat}} "Verification failed: <issue>. Please fix."
```
Return to working step.

**If verification passes:**
Proceed to merge_requested step.

**Exit criteria:** Git clean, branch pushed, issue closed, work looks legit."""

[[steps]]
id = "merge_requested"
title = "Request merge from Refinery"
needs = ["verifying"]
description = """
Work verified. Send MERGE_READY to Refinery and wait.

**Send merge request:**
```bash
gt mail send {{rig}}/refinery -s "MERGE_READY {{polecat}}" -m "Branch: $(cd polecats/{{polecat}} && git branch --show-current)
Issue: {{issue}}
Polecat: {{polecat}}
Verified: clean git state, issue closed"
```

**Update cleanup wisp state:**
```bash
bd update <wisp-id> --labels cleanup,polecat:{{polecat}},state:merge-requested
```

**Wait for MERGED response:**
The Refinery will:
1. Fetch and rebase the branch
2. Run tests
3. Merge to main (if pass)
4. Send MERGED mail back

This may take several minutes.

**If MERGED received:** Proceed to done step.
**If merge fails:** Refinery notifies, return to working state.

**Exit criteria:** MERGED mail received from Refinery."""

[[steps]]
id = "done"
title = "Complete polecat cleanup"
needs = ["merge_requested"]
description = """
Merge confirmed. Clean up the polecat.

**1. Kill the polecat session:**
```bash
gt session kill {{rig}}/polecats/{{polecat}}
```

**2. Remove worktree (if ephemeral):**
```bash
git worktree remove polecats/{{polecat}} --force
```

**3. Delete local branch (if exists):**
```bash
git branch -D polecat/{{polecat}} 2>/dev/null || true
```

**4. Close this lease:**
```bash
bd close <this-lease-id>
```

**Exit criteria:** Polecat session killed, worktree removed, lease closed."""

[vars]
[vars.polecat]
description = "Name of the polecat"
required = true

[vars.issue]
description = "The issue assigned to the polecat"
required = true

[vars.rig]
description = "The rig this polecat belongs to"
required = true

===== constants.go 60-110 =====

	// BdSubprocessTimeout is the timeout for bd subprocess calls in TUI panels.
	// Configurable via operational.session.bd_subprocess_timeout.
	BdSubprocessTimeout = 5 * time.Second

	// DialogPollInterval is the interval between pane content checks when
	// polling for startup dialogs (workspace trust, bypass permissions).
	DialogPollInterval = 500 * time.Millisecond

	// DialogPollTimeout is how long to poll for startup dialogs before giving up.
	// 8 seconds provides enough time for Claude to render dialogs on slow machines
	// while keeping startup fast when no dialog is present.
	DialogPollTimeout = 8 * time.Second

	// StartupNudgeVerifyDelay is how long to wait after sending a startup nudge
	// before checking if the agent started working. 25s because Claude may
	// still be processing gt prime output and preparing its first response;
	// the c2claude wrapper adds extra latency. 5s was consistently too short,
	// causing false retries that interrupted Claude mid-processing (GH#3031).
	// Configurable via operational.session.startup_nudge_verify_delay.
	StartupNudgeVerifyDelay = 25 * time.Second

	// StartupNudgeMaxRetries is the maximum number of times to retry a startup nudge.
	// With the 25s verify delay, 2 retries = 50s total before deferring to
	// witness zombie patrol. Reduced from 3 to limit interrupt risk (GH#3031).
	// Configurable via operational.session.startup_nudge_max_retries.
	StartupNudgeMaxRetries = 2

	// MinHandoffCooldown is the minimum time between handoffs for the same
	// component. Prevents tight restart loops when a patrol agent (e.g.,
	// witness) completes quickly on idle rigs and immediately hands off.
	// (gt-058d)
	// Configurable via operational.session.min_handoff_cooldown.
	MinHandoffCooldown = 2 * time.Minute

	// GUPPViolationTimeout is how long an agent can have work on hook without
	// progressing before it's considered a GUPP (Gas Town Universal Propulsion
	// Principle) violation. GUPP states: if you have work on your hook, you run it.
	//
	// Single source of truth — referenced by daemon lifecycle patrol,
	// TUI feed stuck detection, and web fetcher worker status.
	// Configurable via operational.session.gupp_violation_timeout.
	GUPPViolationTimeout = 30 * time.Minute

	// HungSessionThreshold is how long a tmux session can be inactive before
	// it's considered hung. Overridable per-role via RoleHealthConfig.
	// Configurable via operational.session.hung_session_threshold.
	HungSessionThreshold = 30 * time.Minute
)

// Directory names within a Gas Town workspace.
const (

===== config/types.go 160-200 =====

		GhCmdTimeout:      "10s",
		TmuxCmdTimeout:    "2s",
		FetchTimeout:      "8s",
		DefaultRunTimeout: "30s",
		MaxRunTimeout:     "120s",
	}
}

// WorkerStatusConfig configures activity-age thresholds for worker status classification.
type WorkerStatusConfig struct {
	// StaleThreshold is the activity age after which a worker is considered "stale".
	// Default: "5m".
	StaleThreshold string `json:"stale_threshold,omitempty"`
	// StuckThreshold is the activity age after which a worker is considered "stuck".
	// Default: "30m".
	StuckThreshold string `json:"stuck_threshold,omitempty"`
	// HeartbeatFreshThreshold is the max age for a Deacon heartbeat to be considered fresh.
	// Default: "5m".
	HeartbeatFreshThreshold string `json:"heartbeat_fresh_threshold,omitempty"`
	// MayorActiveThreshold is the max session inactivity for the Mayor to be considered active.
	// Default: "5m".
	MayorActiveThreshold string `json:"mayor_active_threshold,omitempty"`
}

// DefaultWorkerStatusConfig returns a WorkerStatusConfig with sensible defaults.
func DefaultWorkerStatusConfig() *WorkerStatusConfig {
	return &WorkerStatusConfig{
		StaleThreshold:          "5m",
		StuckThreshold:          "30m",
		HeartbeatFreshThreshold: "5m",
		MayorActiveThreshold:    "5m",
	}
}

// FeedCuratorConfig configures event deduplication and aggregation windows.
type FeedCuratorConfig struct {
	// DoneDedupeWindow is the time window for deduplicating repeated done events.
	// Default: "10s".
	DoneDedupeWindow string `json:"done_dedupe_window,omitempty"`
	// SlingAggregateWindow is the time window for aggregating sling events.
	// Default: "30s".

===== witness/handlers.go 1532-1580 =====

// reason, not the agent's lifecycle state. See gt-tsut.
type ZombieClassification string

const (
	// ZombieStuckInDone: polecat hung in gt done (>60s with done-intent label).
	ZombieStuckInDone ZombieClassification = "stuck-in-done"
	// ZombieAgentDeadInSession: tmux session alive but agent process died.
	ZombieAgentDeadInSession ZombieClassification = "agent-dead-in-session"
	// ZombieBeadClosedStillRunning: agent alive but hooked bead already closed.
	ZombieBeadClosedStillRunning ZombieClassification = "bead-closed-still-running"
	// ZombieDoneIntentDead: session died while executing gt done.
	ZombieDoneIntentDead ZombieClassification = "done-intent-dead"
	// ZombieIdleDirtySandbox: idle polecat with uncommitted changes.
	ZombieIdleDirtySandbox ZombieClassification = "idle-dirty-sandbox"
	// ZombieSessionDeadActive: session dead but agent state indicates active work.
	ZombieSessionDeadActive ZombieClassification = "session-dead-active"
	// ZombieAgentSelfReportedStuck: agent self-reported stuck via heartbeat v2 (gt-3vr5).
	ZombieAgentSelfReportedStuck ZombieClassification = "agent-self-reported-stuck"

	// ZombieNeverHeartbeated: live session with assigned work but no heartbeat file
	// written — agent likely stuck at startup (e.g., auth 401 blocking initialization).
	// Detected once the session exceeds the HeartbeatStartupGrace threshold.
	// Flagged for formula-step review; no auto-action (auth errors don't self-heal). (gt-uk7)
	ZombieNeverHeartbeated ZombieClassification = "never-heartbeated"
	// ZombieSubmittedStillRunning: gt done submitted work cleanly, but the polecat
	// session stayed alive with an open hook and no fresh heartbeat. This catches
	// the post-submit/pre-exit ghost idle gap from GH#3055.
	ZombieSubmittedStillRunning ZombieClassification = "submitted-still-running"
)

// ImpliesActiveWork returns true if this classification indicates the polecat
// had evidence of recent work (active state or hooked bead). Used by
// receiptVerdictForZombie to derive patrol verdicts from the typed classification
// rather than a separately-computed boolean. See gt-tsut.
func (c ZombieClassification) ImpliesActiveWork() bool {
	switch c {
	case ZombieStuckInDone, ZombieAgentDeadInSession, ZombieBeadClosedStillRunning,
		ZombieDoneIntentDead, ZombieSessionDeadActive, ZombieAgentSelfReportedStuck,
		ZombieNeverHeartbeated:
		return true
	default:
		return false
	}
}

// ZombieResult describes a detected zombie polecat and the action taken.
type ZombieResult struct {
	PolecatName    string
	AgentState     string               // Real agent state from DB (e.g., "working", "idle")

===== witness/handlers.go 1726-1800 =====

// stuck done-intent, dead agent process, or closed bead while still running.
//
// gt-dsgp: Uses restart-first policy. Instead of nuking polecats, restarts their
// sessions to preserve worktrees and branches.
func detectZombieLiveSession(bd *BdCli, workDir, townRoot, rigName, polecatName, sessionName string, t *tmux.Tmux, doneIntent *DoneIntent, witCfg *config.WitnessThresholds, snap *agentBeadSnapshot) (ZombieResult, bool) {
	// gt-2gra: Agent state and hook bead are read from the pre-fetched snapshot
	// instead of calling getAgentBeadState multiple times per code path.
	snapState, snapHook := "", ""
	if snap != nil {
		snapState, snapHook = snap.AgentState, snap.HookBead
	}

	// Heartbeat v2 check (gt-3vr5): if the agent reports its own state via heartbeat,
	// trust the agent-reported state instead of inferring from timers.
	// The witness makes exactly ONE inference: is the heartbeat fresh?
	hb := polecat.ReadSessionHeartbeat(townRoot, sessionName)
	if hb != nil && hb.IsV2() {
		stale := time.Since(hb.Timestamp) >= polecat.SessionHeartbeatStaleThreshold
		if !stale {
			switch hb.EffectiveState() {
			case polecat.HeartbeatExiting:
				// Agent self-reports exiting — trust it, no timer-based inference.
				// Replaces done-intent stuck timeout for v2 agents.
				return ZombieResult{}, false

			case polecat.HeartbeatStuck:
				// Agent self-reports stuck — escalate (don't restart, agent is alive).
				zombie := ZombieResult{
					PolecatName:    polecatName,
					AgentState:     snapState,
					Classification: ZombieAgentSelfReportedStuck,
					HookBead:       snapHook,
					WasActive:      true,
					Action:         fmt.Sprintf("escalated (agent self-reported stuck: %s)", hb.Context),
				}
				return zombie, true

			case polecat.HeartbeatWorking, polecat.HeartbeatIdle:
				// Fresh heartbeat, healthy state — not a zombie.
				return ZombieResult{}, false
			}
		}
		// Stale v2 heartbeat — fall through to legacy detection.
		// Agent may have died; let the existing checks determine action.
	}

	// Legacy detection: Check for done-intent stuck too long (polecat hung in gt done).
	// gt-dsgp: Restart instead of nuke — the session is stuck trying to exit,
	// a fresh start will let it retry or pick up its hook cleanly.
	if doneIntent != nil && time.Since(doneIntent.Timestamp) > witCfg.DoneIntentStuckTimeoutD() {
		zombie := ZombieResult{
			PolecatName:    polecatName,
			AgentState:     snapState,
			Classification: ZombieStuckInDone,
			HookBead:       snapHook,
			WasActive:      true,
			Action:         fmt.Sprintf("restarted-stuck-session (done-intent age=%v)", time.Since(doneIntent.Timestamp).Round(time.Second)),
		}
		// TOCTOU guard (gt-0pst): Re-check session liveness before restarting.
		// The session could have exited normally between our initial check and here.
		if alive, _ := t.HasSession(sessionName); !alive {
			return ZombieResult{}, false
		}
		if err := RestartPolecatSession(workDir, rigName, polecatName); err != nil {
			zombie.Error = err
			zombie.Action = fmt.Sprintf("restart-stuck-session-failed: %v", err)
		}
		return zombie, true
	}

	// Tmux alive but agent process dead (gt-kj6r6).
	// gt-dsgp: Restart instead of nuke — preserve worktree and branch.
	if !t.IsAgentAlive(sessionName) {
		zombie := ZombieResult{
			PolecatName:    polecatName,

===== witness/handlers.go 2237-2340 =====

// DetectStalledPolecats checks live polecat sessions for agents stuck at
// startup (e.g., on interactive prompts that block automated sessions).
// Unlike zombie detection which looks for dead sessions/agents, this targets
// alive-but-stuck agents that will never make progress without intervention.
//
// Detection uses structured tmux signals (session creation time + last activity)
// rather than screen-scraping pane content. A session is considered stalled when:
//   - It is older than StartupStallThreshold (90s)
//   - Its last tmux activity is older than StartupActivityGrace (60s)
//
// When a startup stall is detected, DismissStartupDialogsBlind is called to
// send blind key sequences that dismiss known blocking dialogs (workspace trust,
// bypass permissions) without screen-scraping pane content. This avoids coupling
// to third-party TUI strings that can change with any Claude Code update.
func DetectStalledPolecats(workDir, rigName string) *DetectStalledPolecatsResult {
	result := &DetectStalledPolecatsResult{}

	// Find town root for path resolution and session naming
	townRoot, err := workspace.Find(workDir)
	if err != nil || townRoot == "" {
		townRoot = workDir
	}
	initRegistryFromTownRoot(townRoot)

	// Load witness thresholds from config (fallback to compiled-in defaults).
	witCfg := config.LoadOperationalConfig(townRoot).GetWitnessConfig()
	stallThreshold := witCfg.StartupStallThresholdD()
	activityGrace := witCfg.StartupActivityGraceD()

	// List all polecat directories
	polecatsDir := filepath.Join(townRoot, rigName, "polecats")
	entries, err := os.ReadDir(polecatsDir)
	if err != nil {
		return result // No polecats directory
	}

	t := tmux.NewTmux()
	now := time.Now()

	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		polecatName := entry.Name()
		sessionName := session.PolecatSessionName(session.PrefixFor(rigName), polecatName)
		result.Checked++

		// Only check live sessions with alive agents (the opposite of zombie detection)
		sessionAlive, err := t.HasSession(sessionName)
		if err != nil {
			result.Errors = append(result.Errors,
				fmt.Errorf("checking session %s: %w", sessionName, err))
			continue
		}
		if !sessionAlive {
			continue // Dead session — zombie detection handles this
		}
		if !t.IsAgentAlive(sessionName) {
			continue // Dead agent — zombie detection handles this
		}

		// Heartbeat v2 check (gt-3vr5): if the agent has a fresh heartbeat,
		// it's alive and making progress — skip stall detection entirely.
		// This replaces tmux activity scraping for v2 agents.
		if hb := polecat.ReadSessionHeartbeat(townRoot, sessionName); hb != nil && hb.IsV2() {
			if time.Since(hb.Timestamp) < polecat.SessionHeartbeatStaleThreshold {
				continue // Fresh v2 heartbeat — agent is alive, not stalled
			}
		}

		// Legacy: Use structured signals to detect startup stalls:
		// session_created (age) + session_activity (last output).
		createdUnix, err := t.GetSessionCreatedUnix(sessionName)
		if err != nil {
			result.Errors = append(result.Errors,
				fmt.Errorf("getting session created time for %s: %w", sessionName, err))
			continue
		}
		sessionAge := now.Sub(time.Unix(createdUnix, 0))
		if sessionAge < stallThreshold {
			continue // Too young — still in normal startup
		}

		activity, err := t.GetSessionActivity(sessionName)
		if err != nil {
			result.Errors = append(result.Errors,
				fmt.Errorf("getting session activity for %s: %w", sessionName, err))
			continue
		}
		activityAge := now.Sub(activity)
		if activityAge < activityGrace {
			continue // Recent activity — agent is making progress
		}

		// Session is old enough and has no recent activity: startup stall.
		// Send blind key sequences to dismiss any startup dialogs without
		// screen-scraping pane content (avoids coupling to third-party TUI strings).
		stalled := StalledResult{
			PolecatName: polecatName,
			StallType:   "startup-stall",
		}
		if err := t.DismissStartupDialogsBlind(sessionName); err != nil {
			stalled.Action = "escalated"
