# 10 — Drain-end review and summary report the merged range

**What to build:** After the loop, review and summary read the range the drain actually merged — its base
recorded when the drain opened, before any merge — and report on it. A drain that merged nothing is a
clean no-op that still reports.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `05`
**Status:** BLOCKED

- [ ] the review base is recorded at the start of the run, before any merge
- [ ] review and summary cover exactly the merges this run landed, and nothing another run landed
- [ ] a run that merged nothing completes cleanly and says so
- [ ] the drain-end readers keep their read-only contract
