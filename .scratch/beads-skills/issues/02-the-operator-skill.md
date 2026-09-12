# 02 — the operator skill

**What to build:** `skills/drain/SKILL.md`, the operator surface for the whole loop (Q9): from "I have a
spec" through publishing, the gate label, a drain, reading the report, and the incident cases. Two sections
— daily operation, incidents. It names the pack (`~/.archon/workflows/beads-dag`, installed by copy), the
Target's optional config file and its keys, the one-command store backup, and the fact that the operator's
only two actions are running a drain and moving the gate label. Anything about the store's commands belongs
to the contract, not here: this file points at `docs/agents/issue-tracker.md`.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.7)
**Blocked by:** `01`
**Status:** BLOCKED

- [ ] a reader who knows nothing about this repo can run one drain on a Target and then say what happened,
      using only this file plus the contract: the exact commands, where the reports land, and the two failure
      signals (a runner that never started stops the drain loudly; an issue's failed attempt is a comment with
      the issue back to `open`)
- [ ] the daily section covers the whole loop and **points** at `to-tickets` for publishing rather than
      repeating its steps (Q9): the operator's day is publish → gate label → drain → read the report
- [ ] the incident section carries the three tool-level facts: whether a run succeeded is read from the run's
      own status and artifacts and never from a wrapper's exit code; a run with no `attempted-ids.json`
      claimed nothing; a machine that drains has the store binary on PATH
- [ ] the incidents section answers the questions an operator actually hits, each in one line: a drain that
      stopped loudly (what to look at), an issue that failed twice (there is no retry command — `bd ready` is
      the retry channel — and no lever to narrow a frontier, so the brake is per issue), a run that was killed
      (the next open repairs it, and the report says so), and how to back the store up
- [ ] the report section says where a run's reports live and what they cover today, and the Comments note the
      one sentence to revisit when tickets `12`–`14` land (they change what the report covers and add failure
      counts)
- [ ] no invented store commands and no restatement of the contract: every store action is a pointer
