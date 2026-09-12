# 15 — a run says which configuration it used

**What to build:** The opening node prints one line naming the effective configuration and where each value
came from — the Target's config file, or the built-in default. Today `loadConfig` silently returns the
defaults when `.scratch/beads-dag.yaml` is absent and nothing anywhere records what was in effect, so "the
Target has no config file" is indistinguishable from "a file said so". A Target needs no config file at all:
every key has a usable default, and with the store binary on PATH none of them has to be written.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.7) and
`.archon/workflows/beads-dag/beads-dag-drain/scripts/config.ts`
**Blocked by:** `02`
**Status:** BLOCKED

- [ ] the opening node writes one line naming runner, model, thinkingLevel, concurrency and store, each with
      its source: the config file, or the default
- [ ] a Target with no config file runs exactly as today — defaults, no error — and the line says so
- [ ] a value that came from the config file is reported as such, and a malformed file still fails loudly,
      unchanged
- [ ] the line reaches a run's record the way the pack's other diagnostics do, with no new artifact unless
      the Comments argue for one
- [ ] no resolved value changes
