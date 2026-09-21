# Machine source (was a sandbox clone)

This checkout is the current machine source of loom: `~/.loom/bin/loom` execs
`tools/flow.ts` here, `~/.archon/workflows/beads-dag` links at this pack, and
`loom install` copies `skills/` to `~/.agents/skills/`.

The live lab remains `/data3/yky/beads-matt-dag` (git remote `lab`). It still
owns the live beads store. Do not `loom init` this clone; do not drain it as a
Target — its `.beads` is not an independent Dolt database.

- Refresh the machine from here: `loom install` (or `bun tools/flow.ts install`).
- Live lab `postMerge` is empty so a drain merge there cannot retarget the pack.
- Drive attention as `loom attention --json --dir <Target>`.
- Human face: `bun tools/attention-ui/serve.ts --dir <Target>` (inbox and graph on one page, default 8770).
- This machine already uses 8765–8768 (AutoSCI / LITHE). The inbox binds 127.0.0.1, skips a taken default, and prints the URL it actually got. `--port N` is sticky and fails if N is busy.
