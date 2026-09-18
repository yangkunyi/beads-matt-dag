# beads-dag/43 — one machine copy, not one copy per Target

**What to build:** pack and skills live once on the machine. A Target repo keeps identity only
(store, yaml knobs, AGENTS.md pointers). The CLI is `loom` (`beads-dag` is an alias).

- `loom install` / `check` — copy `skills/` into `~/.agents/skills`, point
  `~/.archon/workflows/beads-dag` at this checkout
- `loom init` — in a git repo: `bd init` if needed, `experiment` type, yaml without `postMerge`,
  AGENTS.md pointers at the installed `ask-loom/` contract. No copy of the tracker into the repo
- `./install.sh` on a new machine fetches pinned bun / bd / Archon into `~/.loom`, then install

This checkout stays the source. Product Targets do not carry the pack.

- [ ] `loom` and `beads-dag` on PATH via this package's bin
- [ ] `init` on a throwaway git dir leaves no copy of the tracker contract
- [ ] AGENTS.md pointers name `ask-loom/issue-tracker.md`, not a repo copy
- [ ] `tsc -p tsconfig.tools.json` clean and `tools/flow-test.ts` ok
