# The neighbours of ours we do not adopt

Things that look like solved wheels, and are not. Each is refused for a reason, so the next session
does not rediscover it and a future reader can tell a considered refusal from an oversight. They were
found by running `bd help`, `bd <cmd> --help` and `archon --help` as an interface, not by reading
documentation — which is why two research passes over the same question did not surface them, and why
three of the candidates below were believed to be adoptable until they were run.

| Candidate | Why refused |
|---|---|
| `bd merge-slot` | Its holder is `metadata.holder`, a *name*. No pid, so a crashed holder wedges the slot with nothing to steal. Our file lock is pid-first, and that path has been exercised twice in one session |
| `bd gate` | Its gate parks a step until the world catches up (`human`, `timer`, `gh:run`, `gh:pr`, `bead`). Ours is a label meaning an operator put the issue in the frontier. Same word, different concept |
| `bd worktree` | It creates at `./<name>`; it cannot derive a name from the issue's handle and slug, which the pack's tests assert |
| `bd query` | Our filters run over an in-memory snapshot the canvas, list and detail pane share; the verb would buy a second round trip for the same data |
| `bd graph` | It does compute the same layering, but the canvas needs TS coordinates for React Flow |
| `bd set-state` for the five triage labels | They are bare words; dimensionising them renames a documented vocabulary. (It *is* adopted for `reading:` — beads-dag/38) |
| `bd --readonly` / `--sandbox` | Nothing to adopt: `--readonly` is the CLI spelling of the `BD_READONLY` the pack sets, and `--sandbox` only stops Dolt auto-push, which is off by default |
| `archon isolation cleanup` / `archon complete` | **Unavailable to us.** `archon complete <branch>` answers `no active isolation environment`, because the pack sets `worktree.enabled: false` and Archon's registry therefore holds none of ours. The removal already exists in `main-writes.ts` (`git worktree prune`, then `worktree remove --force`) |
| `archon workflow get` for the overlay | The overlay's other sources are pack-written facts (`run-lock.json`, `attempted-ids.json`, the reports), which no Archon command knows about. `workflow status --json`, already used, is the process list |
| `archon workflow resume` | Recorded as a **choice**, not an omission: the drain is re-runnable, not resumable, because the unit is small and Main is the truth. If it is ever tried, it is a spike around one role, not the loop |
| `tldraw` | Its licence requires agreeing not to use it in a Production Environment without a commercial key |
| `worktrunk` | A required binary a Target must install, to replace a 131-line module whose contract (merge-before-stamp, `refs/beads-dag/reviewed`, the conflict turn) it cannot take over anyway |
| Liveblocks / Yjs for layout | Positions stay in the view (ADR-0007). Per-browser persistence puts nothing in the store and is a separate, small question |

An ADR that only refuses reads as obstruction. These stay hand-rolled on purpose: merge-before-stamp
and repair-from-git; the three meanings of `closed`, one per domain; the frontier policy the store
cannot hold (the gate label, the non-work types, this run's attempts, the allow-list); the conflict
turn inside the same execution with the gate re-run after it; and the pack as bun scripts with no
service, no database and no queue — the one constraint that disqualifies most of the orchestrator
catalogue.
