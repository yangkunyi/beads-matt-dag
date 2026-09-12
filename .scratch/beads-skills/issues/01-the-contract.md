# 01 — the contract, and the installer that writes it

**What to build:** The store-backed tracker contract as a file this repo owns — the beads twin of
`issue-tracker-local.md` — plus the `setup-matt-pocock-skills` change that offers it and writes it into a
Target as `docs/agents/issue-tracker.md`. That file is the **only** place store commands are described;
every other skill in the set reads it instead of assuming a file shape. Write it from the pack's real
contract — `beads-dag-drain/scripts/store.ts` and `naming.ts`, and `pick.ts` for the gate — and from
§10.5/§10.7 of the consensus doc, never from memory of the store's own documentation.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.5, §10.7)
**Blocked by:** None
**Status:** BLOCKED

- [ ] the file declares, in one place, each of these clauses: how the store binary is found (the Target's
      `store:` config key first, then `bd` on PATH); the command vocabulary the pack's contract needs (create
      with a body, read and write metadata, the ready/claim path, status moves, close with a reason, comment,
      dependency edges, labels, history); the boundary rules — only the orchestrator closes and only as
      `merged <branch>`, a failed attempt is an event (a comment, then back to `open`), a body carries no
      `Status:` line and no state at all; the gate label `ready-for-agent` and what pulling it means; the two
      metadata keys `handle` and `slug` and the exact names derived from them (`beads/<feature>/<NN>-<slug>`,
      `worktrees/<feature>-<NN>-<slug>`, `.scratch/<feature>/issues/<NN>-<slug>.md`); the decision issue type
      and the rule that closure never crosses domains; and where a run's artifacts and reports live
- [ ] every store command the file names exists: cross-check each one against the store's own CLI help and
      against the pack's own use of it, and quote both in the Comments
- [ ] `setup-matt-pocock-skills` offers the beads tracker in its Section A next to the existing choices, and
      when it is chosen the skill writes this file to `docs/agents/issue-tracker.md` — the same path and name
      the other skills already read
- [ ] the setup skill's other tracker-touching sentences are re-read and brought to the contract's
      vocabulary, not appended to (Q10)
- [ ] running the setup flow against a throwaway `/tmp` git repo with the beads tracker chosen produces that
      file, and the Comments quote its first lines and its `wc -l`
- [ ] nothing under `.archon/` changes: this feature writes instructions, never the runtime
