# 04 — One issue, one worktree, one brief

**What to build:** Given a claimed issue, the executor derives everything it needs from the issue's two
metadata keys — the body's path, the branch name, the worktree name — creates the worktree from Main,
brings Main into it, and hands the implementer the body's **path** as its whole brief. The role protocol
says which role is running, what it may do and how long it may run; a node names its role and nothing
else. The implementer cannot write issue state: the environment it runs under is read-only against the
store.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `03`
**Status:** BLOCKED

- [ ] the worktree and its branch are named from the issue, and nothing globs a directory to find them
- [ ] the implementer receives the body's path and can read the whole issue from it
- [ ] the brief cannot change once published: no node in the pack writes the body
- [ ] the role protocol is the single declaration of each role's arguments, persona and wall clock
- [ ] a worker that attempts to write the store is refused
- [ ] the worktree ends holding the implementer's commits, on a branch off Main
