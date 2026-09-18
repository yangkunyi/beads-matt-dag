# beads-dag/42 — the Pi session passes the SDK's tool list

**What to build:** `createAgentSession` already accepts `tools` and `excludeTools`. The pack mounts
one custom bash tool so the store's read-only mode is in every shell the agent spawns, and then
leaves the SDK's default bash enabled too — that default bash has no spawn hook.

Pass `excludeTools: ["bash"]` so the hooked bash is the only bash. Keep `read` / `edit` / `write`
(the SDK's remaining defaults). Custom tools stay enabled; that is the SDK's own rule.

`RetrySettings` and `thinkingBudgets` live on `SettingsManager`, not on `createAgentSession`. This
ticket does not construct a second settings store beside `~/.pi/agent`. The role's wall clock stays
`armSessionAbort`.

- [ ] `runPackPi` passes `excludeTools: ["bash"]` into `createAgentSession`
- [ ] the custom bash tool with the spawn hook is still the mounted bash
- [ ] the fake SDK in the runner repro records `excludeTools` so the pass is visible
- [ ] `tsc -p tsconfig.pack.json` clean and the runner repro still passes
