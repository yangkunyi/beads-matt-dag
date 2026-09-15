SOURCE-URL: https://github.com/gastownhall/gastown/blob/649b832b7672bc7a2dbef26f5983aba6198b819b/internal/refinery/work_bead_close.go
FETCHED: 2026-09-14 (local shallow clone, research agent 04)
CLONE: /tmp/steal-research/gastown
CLONE-SHA: 649b832b7672bc7a2dbef26f5983aba6198b819b

# Files: internal/refinery/work_bead_close.go (complete); internal/refinery/safety_stop.go (complete); internal/scheduler/capacity/pipeline.go excerpt (CircuitBreakerPolicy/FilterCircuitBroken 180-215); internal/refinery/terminal_mr.go (complete)

package refinery

import (
	"fmt"
	"io"
	"strings"

	"github.com/steveyegge/gastown/internal/beads"
)

type mergedWorkBeadCloseRequest struct {
	MRID        string
	Branch      string
	Target      string
	SourceIssue string
	AgentBead   string
	MergeCommit string
}

type mergedWorkBeadCloseResult struct {
	WorkBeadID string
	Closed     bool
	NotFound   bool
}

type workBeadCloser interface {
	Show(id string) (*beads.Issue, error)
	ForceCloseWithReason(reason string, ids ...string) error
}

type issueReader interface {
	Show(id string) (*beads.Issue, error)
}

func closeMergedWorkBead(work workBeadCloser, agent issueReader, out io.Writer, req mergedWorkBeadCloseRequest) mergedWorkBeadCloseResult {
	logf := func(format string, args ...interface{}) {
		if out != nil {
			_, _ = fmt.Fprintf(out, format, args...)
		}
	}

	workBeadID := resolveMergedWorkBead(agent, req)
	result := mergedWorkBeadCloseResult{WorkBeadID: workBeadID}
	if workBeadID == "" {
		logf("[Refinery] Note: merged MR %s has no resolvable work bead to close\n", req.MRID)
		result.NotFound = true
		return result
	}
	if work == nil {
		logf("[Refinery] Warning: no beads client available to close work bead %s\n", workBeadID)
		result.NotFound = true
		return result
	}

	issue, err := work.Show(workBeadID)
	if err != nil || issue == nil {
		logf("[Refinery] Warning: failed to fetch work bead %s: %v\n", workBeadID, err)
		result.NotFound = true
		return result
	}
	if reason := beads.ConcreteWorkIssueRejectReason(issue); reason != "" {
		logf("[Refinery] Warning: refusing to close non-concrete work bead %s (%s)\n", workBeadID, reason)
		result.NotFound = true
		return result
	}
	if beads.IssueStatus(strings.TrimSpace(issue.Status)).IsTerminal() {
		logf("[Refinery] Work bead already closed: %s\n", workBeadID)
		result.Closed = true
		return result
	}
	if reason := refineryMergedWorkBeadCloseBlockReason(issue); reason != "" {
		logf("[Refinery] Warning: refusing to close non-mergeable work bead %s (%s)\n", workBeadID, reason)
		result.NotFound = true
		return result
	}

	closeReason := fmt.Sprintf("Merged in %s", req.MRID)
	if req.MergeCommit != "" {
		closeReason = fmt.Sprintf("%s\ntarget_branch: %s\ncommit_sha: %s", closeReason, req.Target, req.MergeCommit)
	}

	if err := work.ForceCloseWithReason(closeReason, workBeadID); err != nil {
		if issue, showErr := work.Show(workBeadID); showErr == nil && issue != nil &&
			beads.ConcreteWorkIssueRejectReason(issue) == "" &&
			beads.IssueStatus(strings.TrimSpace(issue.Status)).IsTerminal() {
			logf("[Refinery] Work bead already closed: %s\n", workBeadID)
			result.Closed = true
			return result
		}
		logf("[Refinery] Warning: failed to close work bead %s: %v\n", workBeadID, err)
		result.NotFound = true
		return result
	}

	logf("[Refinery] Closed work bead: %s\n", workBeadID)
	result.Closed = true
	return result
}

func resolveMergedWorkBead(agent issueReader, req mergedWorkBeadCloseRequest) string {
	if sourceIssue := cleanWorkBeadID(req.SourceIssue); sourceIssue != "" {
		return sourceIssue
	}
	if agent == nil || cleanWorkBeadID(req.AgentBead) == "" || cleanWorkBeadID(req.MRID) == "" {
		return ""
	}

	agentIssue, err := agent.Show(req.AgentBead)
	if err != nil || !beads.IsAgentBead(agentIssue) {
		return ""
	}
	fields := beads.ParseAgentFields(agentIssue.Description)
	if fields == nil {
		return ""
	}
	if fields.ActiveMR != req.MRID && fields.MRID != req.MRID {
		return ""
	}
	agentBranch := strings.TrimSpace(fields.Branch)
	requestBranch := strings.TrimSpace(req.Branch)
	if agentBranch == "" || strings.EqualFold(agentBranch, "null") {
		return ""
	}
	if requestBranch == "" || strings.EqualFold(requestBranch, "null") || agentBranch != requestBranch {
		return ""
	}
	return cleanWorkBeadID(fields.LastSourceIssue)
}

func cleanWorkBeadID(id string) string {
	id = strings.TrimSpace(id)
	if strings.EqualFold(id, "null") {
		return ""
	}
	return id
}

func refineryMergedWorkBeadCloseBlockReason(issue *beads.Issue) string {
	if fields := beads.ParseAttachmentFields(issue); fields != nil {
		switch {
		case fields.NoMerge:
			return "no_merge"
		case fields.ReviewOnly:
			return "review_only"
		case strings.EqualFold(strings.TrimSpace(fields.MergeStrategy), "local"):
			return "merge_strategy:local"
		}
	}
	return ""
}

===== safety_stop.go =====

package refinery

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/steveyegge/gastown/internal/beads"
)

const safetyStopLabelPrefix = "safety_stop:"

// ErrSafetyStopped is returned when the refinery agent bead carries an active
// safety-stop label. The label is the durable operator-cleared guard.
var ErrSafetyStopped = errors.New("refinery safety-stopped")

// SafetyStop describes the active refinery safety-stop label.
type SafetyStop struct {
	AgentID string
	Label   string
	StopID  string
}

func (s *SafetyStop) Reason() string {
	if s == nil {
		return "refinery safety-stopped"
	}
	if s.StopID != "" {
		return fmt.Sprintf("refinery safety-stopped by %s", s.StopID)
	}
	return fmt.Sprintf("refinery safety-stopped by %s", s.Label)
}

// SafetyStopError wraps ErrSafetyStopped with the label that blocked startup.
type SafetyStopError struct {
	Stop *SafetyStop
}

func (e *SafetyStopError) Error() string {
	if e == nil || e.Stop == nil {
		return ErrSafetyStopped.Error()
	}
	return fmt.Sprintf("%s (label %s on %s)", e.Stop.Reason(), e.Stop.Label, e.Stop.AgentID)
}

func (e *SafetyStopError) Unwrap() error {
	return ErrSafetyStopped
}

// NewSafetyStoppedError returns a typed startup-blocking safety-stop error.
func NewSafetyStoppedError(stop *SafetyStop) error {
	return &SafetyStopError{Stop: stop}
}

// ActiveSafetyStop returns the active safety stop for a rig's refinery, if any.
// The refinery agent bead's safety_stop:* label is the single durable source of
// truth; the referenced ID is provenance, not an implicit clear condition.
func ActiveSafetyStop(townRoot, rigName string) (*SafetyStop, error) {
	townRoot = strings.TrimSpace(townRoot)
	rigName = strings.TrimSpace(rigName)
	if townRoot == "" || rigName == "" {
		return nil, nil
	}

	prefix := beads.GetPrefixForRig(townRoot, rigName)
	agentID := beads.RefineryBeadIDWithPrefix(prefix, rigName)
	rigPath := filepath.Join(townRoot, rigName)
	b := beads.NewWithBeadsDir(rigPath, filepath.Join(townRoot, ".beads")).ForAgentBead()

	issue, _, err := b.GetAgentBead(agentID)
	if err != nil {
		return nil, err
	}
	if issue == nil {
		return nil, nil
	}
	return safetyStopFromIssue(agentID, issue), nil
}

func safetyStopFromIssue(agentID string, issue *beads.Issue) *SafetyStop {
	if issue == nil {
		return nil
	}
	if agentID == "" {
		agentID = issue.ID
	}
	for _, label := range issue.Labels {
		if !strings.HasPrefix(label, safetyStopLabelPrefix) {
			continue
		}
		return &SafetyStop{
			AgentID: agentID,
			Label:   label,
			StopID:  strings.TrimPrefix(label, safetyStopLabelPrefix),
		}
	}
	return nil
}

===== pipeline.go 180-215 =====


// NoRetryPolicy returns a FailurePolicy that always quarantines on first failure.
func NoRetryPolicy() FailurePolicy {
	return func(failures int) FailureAction {
		return FailureQuarantine
	}
}

// CircuitBreakerPolicy returns a FailurePolicy that retries up to maxFailures
// times, then quarantines.
func CircuitBreakerPolicy(maxFailures int) FailurePolicy {
	return func(failures int) FailureAction {
		if failures >= maxFailures {
			return FailureQuarantine
		}
		return FailureRetry
	}
}

// FilterCircuitBroken removes beads that have exceeded the maximum dispatch
// failures threshold. Returns the filtered list and the count of removed beads.
func FilterCircuitBroken(beads []PendingBead, maxFailures int) ([]PendingBead, int) {
	var result []PendingBead
	removed := 0
	for _, b := range beads {
		if b.Context != nil && b.Context.DispatchFailures >= maxFailures {
			removed++
			continue
		}
		result = append(result, b)
	}
	return result, removed
}

// DispatchParams captures what the scheduler needs to tell the dispatcher.
// Mirrors the relevant fields from cmd.SlingParams but is scheduler-owned.

===== terminal_mr.go =====

package refinery

import (
	"errors"
	"fmt"
	"strings"

	"github.com/steveyegge/gastown/internal/beads"
)

type terminalMRCloseOptions struct {
	Reason        string
	MergeCommit   string
	AgentBeadHint string
	MissingOK     bool
	ExpectedMR    *MergeRequest
}

type terminalMRCloseResult struct {
	MRID                  string
	SourceIssue           string
	AgentBead             string
	Closed                bool
	AlreadyTerminal       bool
	AgentActiveMRCleared  bool
	AgentActiveMRClearErr error
}

func closeTerminalMR(b *beads.Beads, mrID string, opts terminalMRCloseOptions) (*terminalMRCloseResult, error) {
	mrID = strings.TrimSpace(mrID)
	result := &terminalMRCloseResult{MRID: mrID}
	if b == nil || mrID == "" {
		return result, nil
	}

	issue, err := b.Show(mrID)
	if err != nil {
		if errors.Is(err, beads.ErrNotFound) && opts.MissingOK {
			return result, nil
		}
		return result, fmt.Errorf("fetch MR for close: %w", err)
	}
	if issue == nil {
		return result, nil
	}

	fields := beads.ParseMRFields(issue)
	if fields == nil {
		fields = &beads.MRFields{}
	}
	result.SourceIssue = strings.TrimSpace(fields.SourceIssue)
	result.AgentBead = firstNonEmpty(opts.AgentBeadHint, fields.AgentBead)
	if err := validateTerminalMRCloseSnapshot(mrID, fields, opts.ExpectedMR); err != nil {
		return result, err
	}

	status := beads.IssueStatus(strings.TrimSpace(issue.Status))
	switch {
	case status == beads.StatusOpen:
		if opts.MergeCommit != "" {
			fields.MergeCommit = opts.MergeCommit
		}
		if closeReason := normalizedMRCloseReason(opts.Reason); closeReason != "" {
			fields.CloseReason = closeReason
		}
		if result.AgentBead != "" && strings.TrimSpace(fields.AgentBead) == "" {
			fields.AgentBead = result.AgentBead
		}

		newDesc := beads.SetMRFields(issue, fields)
		if err := b.Update(mrID, beads.UpdateOptions{Description: &newDesc}); err != nil {
			return result, fmt.Errorf("record MR close metadata: %w", err)
		}
		if err := b.CloseWithReason(opts.Reason, mrID); err != nil {
			return result, fmt.Errorf("close MR: %w", err)
		}
		result.Closed = true
	case status.IsTerminal():
		result.AlreadyTerminal = true
	default:
		return result, nil
	}

	if result.AgentBead != "" {
		cleared, clearErr := b.ForAgentBead().ClearAgentActiveMRIfMatches(result.AgentBead, mrID)
		result.AgentActiveMRCleared = cleared
		result.AgentActiveMRClearErr = clearErr
	}
	return result, nil
}

func validateTerminalMRCloseSnapshot(mrID string, fields *beads.MRFields, expected *MergeRequest) error {
	if expected == nil || fields == nil {
		return nil
	}
	checks := []struct {
		name string
		got  string
		want string
	}{
		{name: "branch", got: fields.Branch, want: expected.Branch},
		{name: "source_issue", got: fields.SourceIssue, want: expected.IssueID},
		{name: "commit_sha", got: fields.CommitSHA, want: expected.CommitSHA},
	}
	if strings.TrimSpace(expected.TargetBranch) != "" {
		checks = append(checks, struct {
			name string
			got  string
			want string
		}{name: "target", got: fields.Target, want: expected.TargetBranch})
	}
	for _, check := range checks {
		got := strings.TrimSpace(check.got)
		want := strings.TrimSpace(check.want)
		if want != "" && got != want {
			return fmt.Errorf("MR %s changed after merge proof: %s=%q, verified %q", mrID, check.name, got, want)
		}
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
