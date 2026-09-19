# beads-dag/46 — a session's shell is the custom bash, and nothing may exclude the name

## What went wrong

`beads-dag/42` added `excludeTools: ["bash"]` to the session options in `scripts/pi-session.ts`, reading it as
"drop the SDK's default bash so the pack's hooked one is the only bash". Pi's exclusion is not scoped that
way: a tool is allowed when `!allowedToolNames?.has(name) && !excludedToolNames?.has(name)`, and that same
predicate is applied to the built-in definitions **and** to `customTools`, and again to the initial
active-tool list (`sdk.js`: `initialActiveToolNames = (...).filter((name) => !excludedToolNameSet?.has(name))`).
Excluding `"bash"` therefore removed the pack's own hooked bash as well, and the session came up with no
shell at all. The custom definition was never needed to be "made the only one": it is registered after the
built-ins and takes the name.

## What it cost

Every session in every drain since `d231952` had no shell — verified, not inferred: zero `bash` tool calls
across runs `8e15a783`, `3a88033c` and `126d9b5e`, and a worker's own words ("no shell tool is available in
my toolset … There's no bash"). Consequences:

- A worker could edit files but never run its gate or `git commit`. The pack does not commit for it: the
  checkpoint commit lives inside `gate()`, which returns immediately when the Target configured no `verify`
  command, and this Target configures none. So the branch carried no commit and settle recorded
  "nothing to merge" on tickets whose work was complete.
- Workers spent their wall clock hunting for a way to run a command — `subagent` with the `run-ci` named
  workflow (25 used it 6 times, 29 twice), children with a `gate:` argument that included `git add` (26), and
  plain guesses (a worker tried `npm run typecheck`, which this repo does not define). Those that found a
  workaround landed; those that did not timed out and left their work uncommitted.
- Delegation was not an escape: Pi applies the exclusion by name to custom and extension tools too, so every
  `delegate`/`worker`/`scout`/`reviewer` child inherited the same absence. One child spent 20 minutes asking
  a supervisor that a detached run never answers, and died on the wall clock.
- The drain's own review was blind for the same reason: it could not run `git log`, `git diff` or `git show`,
  so the pack's review of the range degraded to reading the working tree and the briefs.

## The fix

`scripts/pi-session.ts` passes no `excludeTools`; the mounted custom bash wins the name. The fake SDK in
`beads-dag-drain/tests/target.ts` now applies Pi's own rule when it records what a session came up with
(`activeTools`), and `runner-repro.ts` asserts both that nothing is excluded and that the turn really has a
shell — the old assertion pinned the bug (`expectEqual(..., ["bash"])`) and could never have caught it,
because it only checked what was handed to the SDK, never what the session ended up with.

Red-green: with `excludeTools: ["bash"]` restored, `runner-repro.ts` fails on the new assertion; with the fix
it passes.

## Not part of this ticket

The four review findings that are not this bug, and the two format decisions for the grill round, are
separate tickets.
