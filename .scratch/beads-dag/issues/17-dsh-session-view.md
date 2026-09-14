# 17 — a dsh run's session lands in the run's artifacts too

**What to build:** ticket `06`'s criterion — a runner's session file is reported on the result and lands under
the run's artifacts — holds for Pi (the pack writes `sessions/<key>/<role>.jsonl` into `ARTIFACTS_DIR` itself)
and not for dsh, whose harness keeps its session log under `DSH_HOME` (its config root, because `--profile`
boots `$DSH_HOME/profiles`); the pack reports that real path and nothing else (README, "the runners"). So a
dsh run leaves its transcripts outside the run that produced them, and the acceptance's artifacts are complete
for one runner and not the other. Found by the pack acceptance and recorded only.

The fix is a **read-only view, not a move**: after a dsh turn, copy the harness's session file into the run's
artifacts and report the copy. ADR-0005 bars a *maintained mirror of state*, not an artifact a run leaves
behind, and the harness's file stays where its harness keeps it.

**Spec:** `.archon/workflows/beads-dag/README.md` ("the runners"), ticket `06`'s third criterion
**Blocked by:** None
**Status:** BLOCKED

- [ ] after a dsh turn the harness's session file is copied into the run's artifacts and the **copy's** path is
      what the result reports (`PackAgentResult.sessionFile`)
- [ ] the copy is a view: nothing keeps it in sync, the harness's own file is neither moved nor rewritten, and
      a missing or unreadable harness file degrades **loudly** (a stderr line) instead of failing a turn whose
      work already landed
- [ ] Pi's behaviour is unchanged — it already writes inside the artifacts
- [ ] a repro drives the seam with the stub dsh and asserts the artifact copy exists; a live dsh turn is quoted
      if this machine can produce one, and if it cannot the Comments say so rather than implying it was run
- [ ] no Target's git state changes, and no new artifact is written for the Pi runner
