# 08 — the contract names the store's blocked read

**What to build:** `skills/setup-matt-pocock-skills/issue-tracker-beads.md` names the store's ready read
(`bd ready --json --limit 0`) but never the blocked one, so `beads-skills/06`'s walk — following the
installed set alone — guessed `bd blocked --json --limit 0` by analogy and got
`Error: unknown flag: --limit`. The contract owns store commands, so the row belongs there, with the flags
that command actually takes rather than the neighbouring row's.

**Spec:** `.scratch/beads-skills/issues/06-the-set-accepts-itself.md`, finding 2
**Blocked by:** `01`
**Status:** BLOCKED

- [ ] the contract's fetch section names the blocked read and what it answers, with the flags its own
      `--help` accepts (do not infer them from the ready row — the walk's error is exactly that inference)
- [ ] the ready row is checked in the same pass against `bd ready --help`, and any flag either row names is
      one the store accepts
- [ ] the Commands section stays the only place these appear: no other skill gains a store command
- [ ] nothing under `.archon/` changes
