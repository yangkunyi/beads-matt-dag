SOURCE-URL: file:///data3/yky/beads-matt-dag/AGENTS.md
FETCHED: 2026-09-15T03:59:03.080Z
HTTP: 200
SOURCE-ID: file:/data3/yky/beads-matt-dag/AGENTS.md
TITLE: AGENTS.md
EXTRACT: verbatim
SHA256: 747eb1c3bdb7131bd3f143c9440123f2495b17f75aced50a6f8772386452d33d

# beads-matt-dag

Lab repo for building and validating the beads-based issue-tracker flow for the matt-pocock
engineering skills. Design record: `docs/specs/2026-09-11-beads-issue-tracker-consensus.md`.

> This repo's own tracker is the local-markdown convention below, not beads. The flow itself is
designed (`docs/specs/…`, `docs/adr/`) and is being built ticket by ticket in
`.scratch/beads-dag/issues/`; so far that means the pack at `.archon/workflows/beads-dag/`, whose README
installs it, documents it and names its gates.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `docs/CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

### The drain pack's gates

The pack is copied to `~/.archon/workflows/beads-dag`. Its two local gates run from this repository and
live in it, never in the pack: the repro suite
(`bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts`) and the typecheck
(`./node_modules/.bin/tsc -p tsconfig.pack.json`).

The inquiry domain's tooling under `tools/` is not the pack and nothing else checks it, so it carries its own
one-line gate: `./node_modules/.bin/tsc -p tsconfig.tools.json`.

