# 04 — the rest read the contract

**What to build:** `to-spec`, `triage` and `ask-matt` brought to the contract. `to-spec`'s publish step
defers to the contract instead of asserting a label for itself: a spec is a git document, and the gate label
belongs to the issues a spec produces (applied by `to-tickets` at publication, never by `to-spec`). `triage`
maps its five roles onto the contract:
a role is a label, a triage move is one label replacing another, nothing here is a status, and a brief
written after publishing cannot enter a frozen body, so it becomes a store comment. `ask-matt` describes the
store-backed Target's shape (issues with handles, blocking edges as store edges) and points at the contract.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.5, §10.7)
**Blocked by:** `01`
**Status:** BLOCKED

- [ ] no sentence in these three files would make a reader write state into a document, duplicate a fact the
      store owns, or assume a file shape the store-backed Target does not have
- [ ] `triage`'s role vocabulary is unchanged (the five roles keep their names) and only its tracker
      mechanics follow the contract
- [ ] `to-spec`'s publish step defers to the Target's contract: for a store-backed Target the spec is a git
      document at the contract's spec path, **no spec container exists in the store** (decision #8: no
      container tier), and the gate label is `to-tickets`' job at publication; for the local tracker it keeps
      whatever that tracker's own contract asks (its convention records the role in the file itself)
- [ ] `to-spec`'s spec-path heuristic is intact
- [ ] `ask-matt`'s flow description matches what a store-backed Target actually does, including that the
      brake is the gate label and that a decision issue is a type rather than a folder
- [ ] vocabulary unified across all three (Q10)
- [ ] each file's diff is quoted by section in the Comments, so a reviewer can see what was re-worded rather
      than re-typed
- [ ] nothing under `.archon/` changes
