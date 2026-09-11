# beads-matt-dag

Lab repo for building and validating the beads-based issue-tracker flow for the matt-pocock
engineering skills. Design record: `docs/specs/2026-09-11-beads-issue-tracker-consensus.md`.

> This repo's own tracker is the local-markdown convention below, not beads. The flow itself is
designed (`docs/specs/…` §10, `docs/adr/`) but not built: no beads store, no drain, no `.archon/` pack yet.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `docs/CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.
