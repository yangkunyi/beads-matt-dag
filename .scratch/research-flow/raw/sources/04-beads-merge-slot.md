SOURCE-URL: https://github.com/gastownhall/beads/blob/f56632adcfabed7da6ed0aabe4e760066b472c46/internal/storage/merge_slot.go
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/beads
CLONE-SHA: f56632adcfabed7da6ed0aabe4e760066b472c46

# Files: cmd/bd/merge_slot.go (complete); internal/storage/merge_slot.go (complete); internal/storage/embeddeddolt/merge_slot.go (complete); docs/multi-agent/coordination.md excerpt (merge slot)

package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/steveyegge/beads/internal/metrics"
	"github.com/steveyegge/beads/internal/storage"
	"github.com/steveyegge/beads/internal/ui"
)

// mergeSlotCmd is the parent command for merge-slot operations
var mergeSlotCmd = &cobra.Command{
	Use:     "merge-slot",
	GroupID: "issues",
	Short:   "Manage merge-slot gates for serialized conflict resolution",
	Long: `Merge-slot gates serialize conflict resolution in the merge queue.

A merge slot is an exclusive access primitive: only one agent can hold it at a time.
This prevents "monkey knife fights" where multiple polecats race to resolve conflicts
and create cascading conflicts.

Each rig has one merge slot bead: <prefix>-merge-slot (labeled gt:slot).
The slot uses:
  - status=open: slot is available
  - status=in_progress: slot is held
  - metadata.holder: who currently holds the slot
  - metadata.waiters: priority-ordered queue of waiters

Examples:
  bd merge-slot create              # Create merge slot for current rig
  bd merge-slot check               # Check if slot is available
  bd merge-slot acquire             # Try to acquire the slot
  bd merge-slot release             # Release the slot`,
}

var mergeSlotCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a merge slot bead for the current rig",
	Long: `Create a merge slot bead for serialized conflict resolution.

The slot ID is automatically generated based on the beads prefix (e.g., gt-merge-slot).
The slot is created with status=open (available).`,
	Args:          cobra.NoArgs,
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE:          runMergeSlotCreate,
}

var mergeSlotCheckCmd = &cobra.Command{
	Use:   "check",
	Short: "Check merge slot availability",
	Long: `Check if the merge slot is available or held.

Returns:
  - available: slot can be acquired
  - held by <holder>: slot is currently held
  - not found: no merge slot exists for this rig`,
	Args:          cobra.NoArgs,
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE:          runMergeSlotCheck,
}

var mergeSlotAcquireCmd = &cobra.Command{
	Use:   "acquire",
	Short: "Acquire the merge slot",
	Long: `Attempt to acquire the merge slot for exclusive access.

If the slot is available (status=open), it will be acquired:
  - status set to in_progress
  - holder set to the requester

If the slot is held (status=in_progress), the command fails unless
--wait is passed, which adds the requester to the waiters queue.

Use --holder to specify who is acquiring (default: BEADS_ACTOR env var).`,
	Args:          cobra.NoArgs,
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE:          runMergeSlotAcquire,
}

var mergeSlotReleaseCmd = &cobra.Command{
	Use:   "release",
	Short: "Release the merge slot",
	Long: `Release the merge slot after conflict resolution is complete.

Sets status back to open and clears the holder field.
If there are waiters, the highest-priority waiter should then acquire.`,
	Args:          cobra.NoArgs,
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE:          runMergeSlotRelease,
}

var (
	mergeSlotHolder    string
	mergeSlotAddWaiter bool
)

func init() {
	mergeSlotAcquireCmd.Flags().StringVar(&mergeSlotHolder, "holder", "", "Who is acquiring the slot (default: BEADS_ACTOR)")
	mergeSlotAcquireCmd.Flags().BoolVar(&mergeSlotAddWaiter, "wait", false, "Add to waiters list if slot is held")
	mergeSlotReleaseCmd.Flags().StringVar(&mergeSlotHolder, "holder", "", "Who is releasing the slot (for verification)")

	mergeSlotCmd.AddCommand(mergeSlotCreateCmd)
	mergeSlotCmd.AddCommand(mergeSlotCheckCmd)
	mergeSlotCmd.AddCommand(mergeSlotAcquireCmd)
	mergeSlotCmd.AddCommand(mergeSlotReleaseCmd)
	rootCmd.AddCommand(mergeSlotCmd)
}

func runMergeSlotCreate(cmd *cobra.Command, args []string) error {
	if usesProxiedServer() {
		return HandleErrorRespectJSON("merge-slot create is not supported in proxied-server mode")
	}
	CheckReadonly("merge-slot create")

	evt := metrics.NewCommandEvent("merge-slot-create")
	defer func() {
		if c := metrics.Global(); c != nil {
			c.CloseEventAndAdd(evt)
		}
	}()

	issue, err := store.MergeSlotCreate(rootCtx, actor)
	if err != nil {
		return HandleErrorRespectJSON("%v", err)
	}

	commandDidWrite.Store(true)

	if jsonOutput {
		result := map[string]interface{}{
			"id":     issue.ID,
			"status": string(issue.Status),
		}
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(result)
	}

	fmt.Printf("%s Created merge slot: %s\n", ui.RenderPass("✓"), issue.ID)
	return nil
}

func runMergeSlotCheck(cmd *cobra.Command, args []string) error {
	if usesProxiedServer() {
		return HandleErrorRespectJSON("merge-slot check is not supported in proxied-server mode")
	}
	evt := metrics.NewCommandEvent("merge-slot-check")
	defer func() {
		if c := metrics.Global(); c != nil {
			c.CloseEventAndAdd(evt)
		}
	}()

	status, err := store.MergeSlotCheck(rootCtx)
	if err != nil {
		if isNotFoundErr(err) {
			slotID := storage.MergeSlotID(rootCtx, store)
			if jsonOutput {
				result := map[string]interface{}{
					"id":        slotID,
					"available": false,
					"error":     "not found",
				}
				encoder := json.NewEncoder(os.Stdout)
				encoder.SetIndent("", "  ")
				return encoder.Encode(result)
			}
			fmt.Printf("Merge slot not found: %s\n", slotID)
			fmt.Printf("Run 'bd merge-slot create' to create one.\n")
			return nil
		}
		return HandleErrorRespectJSON("%v", err)
	}

	if jsonOutput {
		result := map[string]interface{}{
			"id":        status.SlotID,
			"available": status.Available,
			"holder":    nilIfEmpty(status.Holder),
			"waiters":   status.Waiters,
		}
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(result)
	}

	if status.Available {
		fmt.Printf("%s Merge slot available: %s\n", ui.RenderPass("✓"), status.SlotID)
	} else {
		fmt.Printf("%s Merge slot held: %s\n", ui.RenderAccent("○"), status.SlotID)
		fmt.Printf("  Holder: %s\n", status.Holder)
		if len(status.Waiters) > 0 {
			fmt.Printf("  Waiters: %d\n", len(status.Waiters))
			for i, w := range status.Waiters {
				fmt.Printf("    %d. %s\n", i+1, w)
			}
		}
	}

	return nil
}

func runMergeSlotAcquire(cmd *cobra.Command, args []string) error {
	if usesProxiedServer() {
		return HandleErrorRespectJSON("merge-slot acquire is not supported in proxied-server mode")
	}
	CheckReadonly("merge-slot acquire")

	evt := metrics.NewCommandEvent("merge-slot-acquire")
	defer func() {
		if c := metrics.Global(); c != nil {
			c.CloseEventAndAdd(evt)
		}
	}()

	holder := mergeSlotHolder
	if holder == "" {
		holder = actor
	}
	if holder == "" {
		return HandleError("no holder specified; use --holder or set BEADS_ACTOR env var")
	}

	result, err := store.MergeSlotAcquire(rootCtx, holder, actor, mergeSlotAddWaiter)
	if err != nil {
		return HandleErrorRespectJSON("%v", err)
	}

	if !result.Acquired && !result.Waiting {
		if jsonOutput {
			out := map[string]interface{}{
				"id":       result.SlotID,
				"acquired": false,
				"holder":   result.Holder,
			}
			encoder := json.NewEncoder(os.Stdout)
			encoder.SetIndent("", "  ")
			if eerr := encoder.Encode(out); eerr != nil {
				return eerr
			}
			return SilentExit()
		}
		return HandleErrorWithHint(
			fmt.Sprintf("slot held by: %s", result.Holder),
			"Use --wait to add yourself to the waiters queue.")
	}

	if result.Waiting {
		if jsonOutput {
			out := map[string]interface{}{
				"id":       result.SlotID,
				"acquired": false,
				"waiting":  true,
				"holder":   result.Holder,
				"position": result.Position,
			}
			encoder := json.NewEncoder(os.Stdout)
			encoder.SetIndent("", "  ")
			if eerr := encoder.Encode(out); eerr != nil {
				return eerr
			}
			return SilentExit()
		}
		fmt.Printf("%s Slot held by %s, added to waiters queue (position %d)\n",
			ui.RenderAccent("○"), result.Holder, result.Position)
		return SilentExit()
	}

	// Successfully acquired.
	commandDidWrite.Store(true)

	if jsonOutput {
		out := map[string]interface{}{
			"id":       result.SlotID,
			"acquired": true,
			"holder":   holder,
		}
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(out)
	}

	fmt.Printf("%s Acquired merge slot: %s\n", ui.RenderPass("✓"), result.SlotID)
	fmt.Printf("  Holder: %s\n", holder)
	return nil
}

func runMergeSlotRelease(cmd *cobra.Command, args []string) error {
	if usesProxiedServer() {
		return HandleErrorRespectJSON("merge-slot release is not supported in proxied-server mode")
	}
	CheckReadonly("merge-slot release")

	evt := metrics.NewCommandEvent("merge-slot-release")
	defer func() {
		if c := metrics.Global(); c != nil {
			c.CloseEventAndAdd(evt)
		}
	}()

	if err := store.MergeSlotRelease(rootCtx, mergeSlotHolder, actor); err != nil {
		return HandleErrorRespectJSON("%v", err)
	}

	commandDidWrite.Store(true)

	if jsonOutput {
		slotID := storage.MergeSlotID(rootCtx, store)
		out := map[string]interface{}{
			"id":       slotID,
			"released": true,
		}
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(out)
	}

	slotID := storage.MergeSlotID(rootCtx, store)
	fmt.Printf("%s Released merge slot: %s\n", ui.RenderPass("✓"), slotID)
	return nil
}

// nilIfEmpty returns nil if s is empty, otherwise returns s.
// Used for JSON output where empty strings should be null.
func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

===== internal/storage/merge_slot.go =====

// Package storage — merge slot helpers shared across DoltStore and
// EmbeddedDoltStore.  Both stores satisfy Storage, so all logic can be
// expressed in terms of the interface methods.
package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/steveyegge/beads/internal/types"
)

// mergeSlotLabel is the label attached to every merge slot bead so that
// tooling can find it without knowing the exact ID.
const mergeSlotLabel = "gt:slot"

// slotMeta holds the merge slot state stored in the issue Metadata field.
type slotMeta struct {
	Holder  string   `json:"holder,omitempty"`
	Waiters []string `json:"waiters,omitempty"`
}

// MergeSlotID returns the canonical merge slot bead ID for the store,
// derived from the issue_prefix config key (e.g. "gt" → "gt-merge-slot").
// Falls back to "bd-merge-slot" when the prefix is not configured.
func MergeSlotID(ctx context.Context, s Storage) string {
	prefix := "bd"
	if p, err := s.GetConfig(ctx, "issue_prefix"); err == nil && p != "" {
		prefix = strings.TrimSuffix(p, "-")
	}
	return prefix + "-merge-slot"
}

// MergeSlotCreateImpl is the shared implementation of Storage.MergeSlotCreate.
func MergeSlotCreateImpl(ctx context.Context, s Storage, actor string) (*types.Issue, error) {
	slotID := MergeSlotID(ctx, s)

	// Idempotent: return existing slot without error.
	if existing, err := s.GetIssue(ctx, slotID); err == nil && existing != nil {
		return existing, nil
	}

	issue := &types.Issue{
		ID:          slotID,
		Title:       "Merge Slot",
		Description: "Exclusive access slot for serialized conflict resolution in the merge queue.",
		IssueType:   types.TypeTask,
		Status:      types.StatusOpen,
		Priority:    0,
	}
	if err := s.CreateIssue(ctx, issue, actor); err != nil {
		return nil, fmt.Errorf("merge-slot create: %w", err)
	}
	if err := s.AddLabel(ctx, slotID, mergeSlotLabel, actor); err != nil {
		// Non-fatal: label is cosmetic.
		_ = err
	}
	return s.GetIssue(ctx, slotID)
}

// MergeSlotCheckImpl is the shared implementation of Storage.MergeSlotCheck.
func MergeSlotCheckImpl(ctx context.Context, s Storage) (*MergeSlotStatus, error) {
	slotID := MergeSlotID(ctx, s)
	slot, err := s.GetIssue(ctx, slotID)
	if err != nil || slot == nil {
		return nil, fmt.Errorf("merge slot not found: %s (run 'bd merge-slot create' first): %w",
			slotID, ErrNotFound)
	}
	meta := parseSlotMeta(slot)
	return &MergeSlotStatus{
		SlotID:    slotID,
		Available: slot.Status == types.StatusOpen,
		Holder:    meta.Holder,
		Waiters:   meta.Waiters,
	}, nil
}

// MergeSlotAcquireImpl is the shared implementation of Storage.MergeSlotAcquire.
// It uses RunInTransaction to ensure atomic check-and-set, preventing two
// agents from simultaneously acquiring the slot.
func MergeSlotAcquireImpl(ctx context.Context, s Storage, holder, actor string, wait bool) (*MergeSlotResult, error) {
	if holder == "" {
		return nil, fmt.Errorf("merge-slot acquire: holder must not be empty")
	}

	slotID := MergeSlotID(ctx, s)
	var result MergeSlotResult
	result.SlotID = slotID

	err := s.RunInTransaction(ctx,
		fmt.Sprintf("bd: acquire merge slot %s for %s", slotID, holder),
		func(tx Transaction) error {
			slot, err := tx.GetIssue(ctx, slotID)
			if err != nil || slot == nil {
				return fmt.Errorf("merge slot not found: %s (run 'bd merge-slot create' first)", slotID)
			}

			meta := parseSlotMeta(slot)
			result.Holder = meta.Holder

			if slot.Status != types.StatusOpen {
				// Slot is held.
				if wait {
					alreadyWaiting := false
					for _, w := range meta.Waiters {
						if w == holder {
							alreadyWaiting = true
							break
						}
					}
					if !alreadyWaiting {
						meta.Waiters = append(meta.Waiters, holder)
					}
					metaStr, err := encodeSlotMeta(meta)
					if err != nil {
						return fmt.Errorf("failed to encode slot metadata: %w", err)
					}
					if err := tx.UpdateIssue(ctx, slot.ID, map[string]interface{}{"metadata": metaStr}, actor); err != nil {
						return fmt.Errorf("failed to add to waiters: %w", err)
					}
					result.Waiting = true
					result.Position = len(meta.Waiters)
				}
				return nil
			}

			// Slot is available — acquire it atomically.
			newMeta := slotMeta{Holder: holder, Waiters: meta.Waiters}
			metaStr, err := encodeSlotMeta(newMeta)
			if err != nil {
				return fmt.Errorf("failed to encode slot metadata: %w", err)
			}
			if err := tx.UpdateIssue(ctx, slot.ID, map[string]interface{}{
				"status":   types.StatusInProgress,
				"metadata": metaStr,
			}, actor); err != nil {
				return fmt.Errorf("failed to acquire slot: %w", err)
			}
			result.Acquired = true
			result.Holder = holder
			return nil
		},
	)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// MergeSlotReleaseImpl is the shared implementation of Storage.MergeSlotRelease.
func MergeSlotReleaseImpl(ctx context.Context, s Storage, holder, actor string) error {
	slotID := MergeSlotID(ctx, s)

	return s.RunInTransaction(ctx,
		fmt.Sprintf("bd: release merge slot %s", slotID),
		func(tx Transaction) error {
			slot, err := tx.GetIssue(ctx, slotID)
			if err != nil || slot == nil {
				return fmt.Errorf("merge slot not found: %s", slotID)
			}

			meta := parseSlotMeta(slot)

			if holder != "" && meta.Holder != holder {
				return fmt.Errorf("slot held by %s, not %s", meta.Holder, holder)
			}

			if slot.Status == types.StatusOpen {
				// Already released; idempotent.
				return nil
			}

			newMeta := slotMeta{Waiters: meta.Waiters}
			metaStr, err := encodeSlotMeta(newMeta)
			if err != nil {
				return fmt.Errorf("failed to encode slot metadata: %w", err)
			}
			return tx.UpdateIssue(ctx, slot.ID, map[string]interface{}{
				"status":   types.StatusOpen,
				"metadata": metaStr,
			}, actor)
		},
	)
}

// parseSlotMeta extracts the holder and waiters from an issue's Metadata field.
func parseSlotMeta(issue *types.Issue) slotMeta {
	var meta slotMeta
	if len(issue.Metadata) > 0 {
		_ = json.Unmarshal(issue.Metadata, &meta)
	}
	return meta
}

// encodeSlotMeta serializes slot metadata to a JSON string for storage via UpdateIssue.
func encodeSlotMeta(meta slotMeta) (string, error) {
	b, err := json.Marshal(meta)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

===== internal/storage/embeddeddolt/merge_slot.go =====

//go:build cgo

package embeddeddolt

import (
	"context"

	"github.com/steveyegge/beads/internal/storage"
	"github.com/steveyegge/beads/internal/types"
)

// MergeSlotCreate creates the merge slot bead for the current rig.
// Idempotent: returns the existing slot if one already exists.
func (s *EmbeddedDoltStore) MergeSlotCreate(ctx context.Context, actor string) (*types.Issue, error) {
	return storage.MergeSlotCreateImpl(ctx, s, actor)
}

// MergeSlotCheck returns the current status of the merge slot.
func (s *EmbeddedDoltStore) MergeSlotCheck(ctx context.Context) (*storage.MergeSlotStatus, error) {
	return storage.MergeSlotCheckImpl(ctx, s)
}

// MergeSlotAcquire attempts to acquire the merge slot atomically.
// When wait is true and the slot is held, the caller is added to the waiters queue.
func (s *EmbeddedDoltStore) MergeSlotAcquire(ctx context.Context, holder, actor string, wait bool) (*storage.MergeSlotResult, error) {
	return storage.MergeSlotAcquireImpl(ctx, s, holder, actor, wait)
}

// MergeSlotRelease releases the merge slot, clearing the holder.
// If holder is non-empty it is verified against the current holder before releasing.
func (s *EmbeddedDoltStore) MergeSlotRelease(ctx context.Context, holder, actor string) error {
	return storage.MergeSlotReleaseImpl(ctx, s, holder, actor)
}

===== docs/multi-agent/coordination.md 110-160 =====


## Conflict Prevention

### Atomic Claims

`--claim` is atomic: when multiple agents pull from the same ready queue,
the first claim wins, and repeating a claim you already hold is idempotent.
Prefer claiming over assigning when agents self-select work:

```bash
bd ready --claim --json
```

### Merge Slots

Serialize conflict-prone work (such as merge-queue conflict resolution) with
a merge slot — an exclusive-access primitive only one agent can hold at a
time. Each project has one merge slot bead, named from the issue prefix
(e.g. `bd-merge-slot`):

```bash
# Create the merge slot for this project
bd merge-slot create

# Check availability
bd merge-slot check

# Acquire before starting; release when done
bd merge-slot acquire
bd merge-slot release
```

## Communication Patterns

### Via Comments

```bash
# Agent A leaves note
bd comment bd-42 "Completed API, needs frontend integration"

# Agent B reads
bd comments bd-42
```

### Via Labels

```bash
# Mark for review
bd update bd-42 --add-label "needs-review"

# Agent B filters
