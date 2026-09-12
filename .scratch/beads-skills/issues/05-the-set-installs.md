# 05 — the set installs, and the install is written down

**What to build:** The install rule and its execution. `skills/README.md` states that this repo is the
source, that installing is an explicit copy of one folder per skill into the machine's skills directory
(`~/.pi/agent/skills`, a symlink to the pi-agent-config repo), the one-line copy command, and the check that
proves the install (`diff -rq` between source and installed, expected empty). Then perform it and record the
result. This is the step that makes the set live, so it is its own ticket rather than a footnote.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.7)
**Blocked by:** `01`, `02`, `03`, `04`
**Status:** BLOCKED

- [ ] `skills/README.md` names the source, the destination, the copy command, the byte-identical check, and
      why the names are unchanged (pi keeps the first skill found on a name collision, and
      `~/.pi/agent/skills` is searched before project directories, so a second copy under a new name would be
      shadowed or would shadow)
- [ ] the copy is performed, one folder per member, and the check is quoted in the Comments with its output
      (empty diff) and the installed file list
- [ ] the installed set is exactly the members §10.7 decides: the tracker contract beside the existing
      templates, `drain`, and the edited `to-tickets`, `implement`, `to-spec`, `triage`,
      `setup-matt-pocock-skills` and `ask-matt`
- [ ] a re-install is one command, and running it twice changes nothing (show both)
- [ ] the file says what a *stale* install looks like (a copy older than the source) and how a reader notices
- [ ] nothing under `.archon/` changes
