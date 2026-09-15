SOURCE-URL: https://github.com/gastownhall/beads/blob/f56632adcfabed7da6ed0aabe4e760066b472c46/docs/workflows/gates.md
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/beads
CLONE-SHA: f56632adcfabed7da6ed0aabe4e760066b472c46

# Files: docs/workflows/gates.md (complete); cmd/bd/gate.go excerpt 580-800 (gate check/escalate); docs/CLI_REFERENCE.md excerpt (merge-slot section head)

---
title: Gates
description: Async wait conditions that park a workflow step until the world catches up — a human decision, a timer, or a GitHub run or PR.
---

Some workflow steps can't proceed on code alone: a release needs CI to go
green, a deploy needs a human sign-off, a cleanup should wait 24 hours. A
**gate** is an issue that represents that wait. It blocks a step the same way
any blocker does — the step leaves the ready frontier until the gate closes —
so agents never need to poll or spin.

## How a gate works

A gate is a bead like any other: created open, it blocks its waiters through
a normal dependency edge, and the step becomes ready the moment the gate
closes. Gates close in one of two ways:

- **Manually** — `bd gate resolve <gate-id>` (human gates always close this
  way).
- **Via `bd gate check`** — evaluates open timer and GitHub gates against
  the real world and closes the ones whose condition is met.

```bash
bd gate list                 # open gates
bd gate list --all           # include closed
bd gate show <gate-id>       # details and waiters
bd gate check                # evaluate open gates, close satisfied ones
bd gate check --dry-run      # report without closing
bd gate resolve <gate-id>    # close a gate manually
```

## Gate types

| Type | Waits for | Closed by |
|------|-----------|-----------|
| `human` | a person's decision | `bd gate resolve` only |
| `timer` | a duration after gate creation | `bd gate check` once the timeout elapses |
| `gh:run` | a GitHub Actions workflow to complete successfully | `bd gate check` (uses `gh run view`) |
| `gh:pr` | a pull request to merge | `bd gate check` (uses `gh pr view`) |
| `bead` | a bead in another rig to close | cannot be checked because multi-rig routing was removed; resolve these gates manually |

Timeouts use Go duration syntax: `30m`, `1h`, `24h` (there is no `d` unit —
write `24h`, not `1d`).

GitHub gates use the current Git repository by default. To evaluate a PR or
workflow run in another repository, set the gate's string `metadata.repo` value
to `OWNER/REPO` or `HOST/OWNER/REPO`. An ad-hoc `gh:run`/`gh:pr` gate created
with `bd gate create` inherits a valid `metadata.repo` value from the issue it
blocks; `human`/`timer`/`bead` gates do not, since `metadata.repo` is
unrelated, ordinary metadata for those types. `bd gate check` rejects
malformed repository values instead of falling back to the current
repository.

## Gates in formulas

A formula step declares a gate with a `[steps.gate]` block. When the formula
is instantiated, bd creates the gate issue and wires it as a blocker of that
step. The schema has five fields: `type`, `id`, `await_id`, `timeout`, and
`repo`.

This is the release gate from beads' own release formula — the step that
waits for the GitHub release workflow:

```toml
[[steps]]
id = "wait-for-ci"
title = "Wait for release workflow"

[steps.gate]
type = "gh:run"
id = "release.yml"       # which workflow to watch
timeout = "30m"          # escalate if it takes longer
```

For a `gh:run` or `gh:pr` gate that watches another repository, set `repo`
the same way a `metadata.repo` value works for an ad-hoc gate — `OWNER/REPO`
or `HOST/OWNER/REPO`. Malformed values are rejected when the gate is checked:

```toml
[[steps]]
id = "wait-for-downstream"
title = "Wait for downstream release"

[steps.gate]
type = "gh:run"
id = "release.yml"
repo = "org/downstream-repo"   # check gh:run against this repo, not the current one
```

`repo` accepts a `{{var}}` placeholder (e.g. `repo = "{{gate_repo}}"`); for a
formula persisted with `bd cook --persist`, the placeholder is substituted
when the proto is later poured with `bd mol pour --var gate_repo=...`, the
same as `title`, `description`, and `await_id`.

`bd gate discover` (auto-discovery of a `gh:run` gate's run ID) requires a
workflow name hint (`await_id`/`id`, not left blank) for a gate targeting
another repository — without one, the local commit/branch heuristics that
narrow a same-repo match don't apply across repos, so nothing but the
workflow name can identify the right run. A cross-repo gate discovery also
ignores the local checkout's branch unless `--branch` is passed explicitly;
an auto-detected local branch has no relationship to the target repo's
branches.

A human sign-off gate:

```toml
[[steps]]
id = "approve-deploy"
title = "Human approves the deploy"

[steps.gate]
type = "human"
```

And a cooling-off timer:

```toml
[[steps]]
id = "wait-24h"
title = "Let the release bake"

[steps.gate]
type = "timer"
timeout = "24h"
```

Verify what the parser actually understood before pouring — unknown keys in
TOML are dropped silently:

```bash
bd formula show <formula> --json   # inspect the parsed gate blocks
```

## Creating gates outside formulas

`bd gate create` attaches a gate to existing work:

```bash
# Block bd-abc until a PR merges
bd gate create --type=gh:pr --blocks bd-abc --await-id=42

# Block bd-abc until a human resolves the gate
bd gate create --type=human --blocks bd-abc --reason "Design sign-off"

# Add another waiter to an existing gate
bd gate add-waiter <gate-id> <issue-id>
```

## Fan-in: waiting on other steps

Waiting on *other steps* is not a gate — it's a dependency. Use `needs` to
fan in on named steps, and `waits_for` when a step must wait for
dynamically-created children:

```toml
[[steps]]
id = "merge-results"
title = "Merge results"
needs = ["test-a", "test-b"]     # fan-in on named steps

[[steps]]
id = "summarize"
title = "Summarize all spawned work"
waits_for = "all-children"       # or "any-children", or "children-of(step-id)"
```

## Working with gated molecules

```bash
bd ready --gated        # molecules where a gate just closed (ready to resume)
bd blocked              # what's waiting, and on which gates
```

Automation patterns: run `bd gate check` on a schedule (cron, CI, or an
orchestrator loop) so timer and GitHub gates close without a human in the
loop; keep `human` gates for the decisions that should never auto-close.

===== cmd/bd/gate.go 580-800 =====

// `bd gate resolve` prints identically on both.
func renderGateResolved(gateID, reason string) {
	fmt.Printf("%s Gate resolved: %s\n", ui.RenderPass("✓"), gateID)
	if reason != "" {
		fmt.Printf("  Reason: %s\n", reason)
	}
}

// gateCheckCmd evaluates gates and closes those that are resolved
var gateCheckCmd = &cobra.Command{
	Use:   "check",
	Short: "Evaluate gates and close resolved ones",
	Long: `Evaluate gate conditions and automatically close resolved gates.

By default, checks all open gates. Use --type to filter by gate type.

Gate types:
  gh       - Check all GitHub gates (gh:run and gh:pr)
  gh:run   - Check GitHub Actions workflow runs
  gh:pr    - Check pull request merge status
  timer    - Check timer gates (auto-expire based on timeout)
  bead     - Check cross-rig bead gates
  all      - Check all gate types

GitHub gates use the 'gh' CLI to query status:
  - gh:run checks 'gh run view <id> --json status,conclusion'
  - gh:pr checks 'gh pr view <id> --json state,title'

A gate is resolved when:
  - gh:run: status=completed AND conclusion=success
  - gh:pr: state=MERGED
  - timer: current time > created_at + timeout
  - bead: target bead status=closed

A gate is escalated when:
  - gh:run: status=completed AND conclusion in (failure, canceled)
  - gh:pr: state=CLOSED

Examples:
  bd gate check              # Check all gates
  bd gate check --type=gh    # Check only GitHub gates
  bd gate check --type=gh:run # Check only workflow run gates
  bd gate check --type=timer # Check only timer gates
  bd gate check --type=bead  # Check only cross-rig bead gates
  bd gate check --dry-run    # Show what would happen without changes
  bd gate check --escalate   # Escalate expired/failed gates`,
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		if usesProxiedServer() {
			return runGateCheckProxiedServer(cmd, rootCtx)
		}
		CheckReadonly("gate check")

		evt := metrics.NewCommandEvent("gate-check")
		defer func() {
			if c := metrics.Global(); c != nil {
				c.CloseEventAndAdd(evt)
			}
		}()

		gateTypeFilter, _ := cmd.Flags().GetString("type")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		escalateFlag, _ := cmd.Flags().GetBool("escalate")
		limit, _ := cmd.Flags().GetInt("limit")

		gateType := types.IssueType("gate")
		filter := types.IssueFilter{
			IssueType:     &gateType,
			ExcludeStatus: []types.Status{types.StatusClosed},
			Limit:         limit,
		}

		ctx := rootCtx

		gates, err := store.SearchIssues(ctx, "", filter)
		if err != nil {
			return HandleErrorRespectJSON("%v", err)
		}

		filteredGates := filterCheckableGates(gates, gateTypeFilter)
		if len(filteredGates) == 0 {
			printNoOpenGates(gateTypeFilter)
			return nil
		}

		var persistAwaitID func(gateID, runID string) error
		if !dryRun {
			persistAwaitID = func(gateID, runID string) error {
				return updateGateAwaitIDFunc(nil, gateID, runID)
			}
		}

		results := evaluateGates(ctx, filteredGates, time.Now(), routedBeadGateGetter{localStore: store}, persistAwaitID)

		resolvedCount, escalatedCount, errorCount := applyGateCheckResults(
			results, dryRun, escalateFlag,
			func(gate *types.Issue, reason string) error {
				return closeGate(ctx, gate.ID, reason)
			},
		)

		return printGateCheckSummary(len(results), resolvedCount, escalatedCount, errorCount, dryRun)
	},
}

type gateCheckResult struct {
	gate      *types.Issue
	resolved  bool
	escalated bool
	reason    string
	err       error
}

func filterCheckableGates(gates []*types.Issue, typeFilter string) []*types.Issue {
	var out []*types.Issue
	for _, gate := range gates {
		if shouldCheckGate(gate, typeFilter) {
			out = append(out, gate)
		}
	}
	return out
}

func printNoOpenGates(typeFilter string) {
	if typeFilter != "" {
		fmt.Printf("No open gates of type '%s' found.\n", typeFilter)
	} else {
		fmt.Println("No open gates found.")
	}
}

func evaluateGates(ctx context.Context, gates []*types.Issue, now time.Time, getter issueGetter, persistAwaitID func(gateID, runID string) error) []gateCheckResult {
	results := make([]gateCheckResult, 0, len(gates))
	for _, gate := range gates {
		r := gateCheckResult{gate: gate}
		switch {
		case strings.HasPrefix(gate.AwaitType, "gh:run"):
			r.resolved, r.escalated, r.reason, r.err = checkGHRun(gate, persistAwaitID)
		case strings.HasPrefix(gate.AwaitType, "gh:pr"):
			r.resolved, r.escalated, r.reason, r.err = checkGHPR(gate)
		case gate.AwaitType == "timer":
			r.resolved, r.escalated, r.reason, r.err = checkTimer(gate, now)
		case gate.AwaitType == "bead":
			r.resolved, r.reason = checkBeadGate(ctx, getter, gate.AwaitID)
		default:
			continue
		}
		results = append(results, r)
	}
	return results
}

func applyGateCheckResults(results []gateCheckResult, dryRun, escalate bool, closeResolved func(gate *types.Issue, reason string) error) (resolvedCount, escalatedCount, errorCount int) {
	for _, r := range results {
		if r.err != nil {
			errorCount++
			fmt.Fprintf(os.Stderr, "%s %s: error checking - %v\n",
				ui.RenderFail("✗"), r.gate.ID, r.err)
			continue
		}

		switch {
		case r.resolved:
			resolvedCount++
			if dryRun {
				fmt.Printf("%s %s: would resolve - %s\n",
					ui.RenderPass("✓"), r.gate.ID, r.reason)
				continue
			}
			if closeErr := closeResolved(r.gate, r.reason); closeErr != nil {
				fmt.Fprintf(os.Stderr, "%s %s: error closing - %v\n",
					ui.RenderFail("✗"), r.gate.ID, closeErr)
				errorCount++
			} else {
				fmt.Printf("%s %s: resolved - %s\n",
					ui.RenderPass("✓"), r.gate.ID, r.reason)
			}
		case r.escalated:
			escalatedCount++
			if dryRun {
				fmt.Printf("%s %s: would escalate - %s\n",
					ui.RenderWarn("⚠"), r.gate.ID, r.reason)
				continue
			}
			fmt.Printf("%s %s: ESCALATE - %s\n",
				ui.RenderWarn("⚠"), r.gate.ID, r.reason)
			if escalate {
				escalateGate(r.gate, r.reason)
			}
		default:
			fmt.Printf("%s %s: pending - %s\n",
				ui.RenderAccent("○"), r.gate.ID, r.reason)
		}
	}
	return resolvedCount, escalatedCount, errorCount
}

func printGateCheckSummary(checked, resolvedCount, escalatedCount, errorCount int, dryRun bool) error {
	fmt.Println()
	fmt.Printf("Checked %d gates: %d resolved, %d escalated, %d errors\n",
		checked, resolvedCount, escalatedCount, errorCount)

	if jsonOutput {
		return outputJSON(map[string]interface{}{
			"checked":   checked,
			"resolved":  resolvedCount,
			"escalated": escalatedCount,
			"errors":    errorCount,
			"dry_run":   dryRun,
		})
	}
	return nil
}

// shouldCheckGate returns true if the gate matches the type filter
func shouldCheckGate(gate *types.Issue, typeFilter string) bool {
	if typeFilter == "" || typeFilter == "all" {
		return true
	}
	if typeFilter == "gh" {
