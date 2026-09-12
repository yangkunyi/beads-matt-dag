# 06 — the set accepts itself

**What to build:** The acceptance §10.7 asks for: a fresh agent, in a fresh `/tmp` Target, given only the
**installed** skill files — no access to this repo's docs and no memory of the session that wrote them —
walks the loop from nothing. The Target starts at `bd init` (Q12): no fixture, no pre-made store, no
pre-written issue. The walk is: choose the tracker through the setup skill, write a spec, publish three
issues with one blocking edge, run a drain, run a second drain, read both reports.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.6, §10.7)
**Blocked by:** `05`, `07`
**Status:** BLOCKED

- [ ] the walk happens with only the installed skills: the agent is told the Target and nothing else — no
      repo paths, no pack internals, no hints — and every command it runs is quoted verbatim in the Comments
- [ ] the fresh Target's `bd init` is part of the walk, so the store's own first-run state (its setup commit,
      `.beads/interactions.jsonl`, the ignore rules) is exercised rather than assumed
- [ ] the first drain starts exactly the eligible issue and the second drain starts the one its blocker
      released; both end with an empty ready set, a clean `git status`, and a report a human can read
- [ ] the report names, for every place the agent had to guess, re-read a file, or got it wrong on the first
      try, the file and the sentence responsible — a guess is a finding, not a footnote
- [ ] every finding is either fixed in the file that caused it (and the fix quoted) or promoted to a new
      ticket; the Comments carry the run ids, the artifact paths and the store's own answers
- [ ] the observations are added to §10.6's acceptance list, since §10.7 says the set is accepted there and
      not by folding it into the pack's acceptance
- [ ] the pack is untouched: a finding that needs the runtime is a ticket, never an edit here
