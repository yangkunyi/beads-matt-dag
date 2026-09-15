SOURCE-URL: https://github.com/issue-orchestrator/issue-orchestrator/blob/49f596b8f92a98d842c26334960e909a5bce56d9/docs/architecture/ADR/0004-centralize-reconciliation.md
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/issue-orchestrator
CLONE-SHA: 49f596b8f92a98d842c26334960e909a5bce56d9

# Files: ADR 0002 write-then-observe (complete), ADR 0004 centralize-reconciliation (complete), ADR 0013 labels-as-crash-safe-truth (complete), ADR 0014 observe-plan-apply-loop (complete)

===== 0002-write-then-observe.md =====

# ADR 0002: Treat writes as untrusted until observed (write → verify loop)

**Status:** Accepted  
**Date:** 2025-12-31

## Context
GitHub exhibits eventual consistency and distributed replication effects. A successful API write (e.g., add label, create PR) does **not** guarantee that an immediate subsequent read (or a different endpoint) will reflect the change.

The orchestrator’s correctness depends on external state (GitHub issues/labels/PRs) being observed reliably. Trusting write responses leads to flakiness, hidden drift, and hard-to-debug reconciliation gaps.

## Decision
Adopt a uniform correctness rule:

> All external writes are considered **tentative** until confirmed by subsequent observation.

For any “write” operation that the orchestrator depends on:
1. Perform the write (POST/PATCH/PUT/DELETE).
2. Poll using **GET** to observe the expected change.
3. Use **conditional GET** (`If-None-Match` / ETags) to keep polling cheap.
4. If observation does not converge within bounded retries/time, mark the issue as requiring reconciliation and pause/fail-closed.

We explicitly do **not** rely on write responses returning ETags or providing read-your-writes semantics.

## Consequences
### Positive
- Predictable correctness under eventual consistency.
- Drift detection becomes systematic instead of ad-hoc.
- E2E tests become more reliable (they can wait for observed states).

### Negative / Costs
- Slightly more API calls in “write paths” (mitigated by ETag polling).
- Need a small shared implementation for write→observe loops (to avoid duplication).

## Alternatives considered
- Trust write success and proceed: rejected due to consistency/race failures.
- Use conditional writes with `If-Match`: rejected as not universally supported/robust for our needs.
- Replace GitHub as the source of truth with a DB: deferred as future enhancement.

## Follow-ups
- Provide a single adapter primitive: `write_then_observe(write_op, observe_get, predicate, budget)`.
- Emit events for “write pending”, “write observed”, and “write stalled”.
- Ensure reconciliation logic can repair/handle stalled writes safely.


===== 0004-centralize-reconciliation.md =====

# ADR 0004: Centralize reconciliation (startup + runtime) behind a single entrypoint

**Status:** Accepted  
**Date:** 2025-12-31

## Context
Failures can occur at any step:
- crash between write steps (labels set but PR not created)
- partial writes (comment posted, label not updated)
- external actors modify issues/labels/PRs
- stale local worktrees/sessions exist

If reconciliation logic is spread across:
- startup routines
- tick loops
- random helper methods
then correctness becomes non-local and brittle.

We also need to distinguish:
- **startup reconciliation** (recover from last run)
- **runtime reconciliation** (guard each apply and detect drift)

## Decision
Provide a single reconciliation entrypoint:

`reconcile(observations, local_state) -> ReconcileResult`

Used in four places:
1. **Startup**: before processing any work (recover / repair / label drift).
2. **Before apply**: confirm preconditions still hold.
3. **After apply**: confirm writes were observed; detect partial completion.
4. **On completion**: when agent/session indicates done (consume completion observation).

The reconcile function:
- identifies drift (violations between expected and observed state)
- performs only **safe** repairs automatically (idempotent, low-risk)
- otherwise marks `needs-reconcile` label and causes the orchestrator to fail-closed/pause

We avoid scattering “special case fixups” throughout control code.

## Consequences
### Positive
- Correctness becomes centralized and reviewable.
- Easier to extend: add drift rules in one place.
- Easier to test: reconciliation rules can be unit-tested and replayed.

### Negative / Costs
- Requires careful definition of “safe repair” vs “pause”.
- Some initial refactoring to route all drift handling through reconcile().

## Alternatives considered
- Ad-hoc fixups in action applier / orchestrator: rejected.
- Only startup reconciliation: rejected (crash recovery matters).
- Only runtime reconciliation: rejected (runtime drift still breaks correctness).

## Follow-ups
- Define a small set of drift categories and consistent handling:
  - `WARN_ONLY`, `SAFE_REPAIR`, `REQUIRES_HUMAN`
- Add tests: startup scenarios (orphan PR, missing label) and runtime scenarios (label changed mid-tick).


===== 0013-labels-as-crash-safe-truth.md =====

# ADR 0013: GitHub labels as crash-safe source of truth

**Status:** Accepted
**Date:** 2024-12-21

## Context

The orchestrator can crash, restart, or lose local state at any time. It needs to recover gracefully and continue processing without human intervention or data loss.

Options considered:
1. Local database as source of truth - fast but loses state on crash
2. GitHub labels as source of truth - survives crashes, single source
3. Hybrid with sync - complex reconciliation logic

## Decision

**GitHub labels are the authoritative source of truth for issue/PR state.**

### How It Works

1. **State encoded in labels**: `in-progress`, `needs-code-review`, `needs-rework`, etc.
2. **On startup**: Orchestrator reads labels to reconstruct state
3. **On crash**: No local state to recover - just re-read labels
4. **State transitions**: Apply label changes, verify via observation (ADR-0002)

### Label Semantics

| Label | Meaning |
|-------|---------|
| `in-progress` | Agent session active |
| `needs-code-review` | PR awaiting review |
| `code-reviewed` | Review passed, awaiting tech lead |
| `needs-rework` | Review requested changes |
| `needs-human` | Escalated, human intervention required |
| `tech-lead-needs-human` | Provenance marker for a `needs-human` escalation owned by the tech lead launch workflow; informational, not independently blocking |
| `blocked` | Dependencies not met |

The tech lead launch workflow writes `tech-lead-needs-human` before `needs-human`.
It only creates that ownership marker when both labels are absent, so it never
adopts a pre-existing human/session-owned `needs-human` transition. A targeted
marker-label read on every unpaused reconciliation tick recovers a marker-only
crash by restoring the blocking `needs-human` label, even when the in-memory
tech lead queue was lost.
When a running or restored investigation supersedes that escalation, the
orchestrator removes `needs-human` first and then its marker. A bare
`needs-human` label has no orchestrator-owned provenance and is never removed by
this reconciliation. This discovery and ordering make partial writes and
removals safe to retry from labels alone after a crash.

### Recovery Flow

```
Orchestrator starts
    │
    ▼
Fetch all issues with orchestrator labels
    │
    ▼
For each issue:
  - Read labels → determine state
  - Check for active session (tmux/iTerm2)
  - Resume or clean up as appropriate
    │
    ▼
Enter normal loop
```

## Consequences

### Positive
- **Crash-safe**: No local state to lose
- **Observable**: Humans can see state in GitHub UI
- **Recoverable**: Restart = automatic recovery
- **Single source**: No sync conflicts

### Negative
- API calls on every state check (mitigated by caching, ADR-0006)
- Label changes must be verified (ADR-0002, ADR-0007)
- Limited expressiveness (labels are flat strings)

## Related

- ADR-0002: Write-then-observe
- ADR-0006: Caching with ETags
- ADR-0007: External state reconciliation


===== 0014-observe-plan-apply-loop.md =====

# ADR 0014: Observer → Planner → ActionApplier loop pattern

**Status:** Accepted
**Date:** 2024-12-21

## Context

The orchestrator's main loop must:
- Gather facts about current state (GitHub, sessions, completions)
- Decide what actions to take
- Execute those actions
- Handle failures gracefully

Mixing these concerns leads to:
- Untestable code (side effects interleaved with logic)
- Race conditions (state changes during decision-making)
- Unclear responsibility (who decides vs who executes?)

## Decision

**Strict three-phase loop: Observe → Plan → Apply**

### Phase 1: Observe (gather facts)

```python
# FactGatherer creates immutable snapshot
snapshot = fact_gatherer.create_snapshot()
# Contains: issues, PRs, labels, sessions, completions
# NO decisions, NO side effects
```

- `FactGatherer` gathers facts about system state
- Creates immutable `Snapshot` object
- Detects session completions, PR events, reviews to queue
- **Never** mutates state or calls adapters for writes

### Phase 2: Plan (decide actions)

```python
# Planner produces action list from snapshot
actions = planner.plan(snapshot)
# Returns: [AddLabelAction, LaunchSessionAction, ...]
# NO execution, NO side effects
```

- `Planner` receives snapshot (facts only)
- Generates `Action` objects describing what should happen
- Pure logic - can be unit tested with fake snapshots
- **Never** executes actions or calls adapters

### Phase 3: Apply (execute actions)

```python
# ActionApplier executes via ports
results = action_applier.apply_all(actions)
# Calls adapters, emits events
```

- `ActionApplier` takes action list from Planner
- Executes each action via appropriate port/adapter
- Records results, emits trace events
- **Never** makes policy decisions

## Consequences

### Positive
- **Testable**: Each phase tested in isolation
- **Auditable**: Actions logged before execution
- **Predictable**: Snapshot is frozen during planning
- **Debuggable**: Can inspect snapshot + actions without executing

### Negative
- More ceremony than direct calls
- Snapshot may be stale by apply time (mitigated by ADR-0007)
- Action types must be defined upfront

## Anti-Patterns (DON'T DO THIS)

```python
# WRONG - Direct call in completion handler
def on_session_completed(self, ...):
    self.repository_host.add_label(issue, "pr-pending")  # ❌

# WRONG - Decision in observer
def observe(self):
    if should_launch:  # ❌ Decision in observer
        self.launch_session()  # ❌ Execution in observer
```

## Related

- ADR-0007: Verify state before mutation (stale snapshot mitigation)
- `control/planner.py`, `control/action_applier.py`, `control/fact_gatherer.py`


