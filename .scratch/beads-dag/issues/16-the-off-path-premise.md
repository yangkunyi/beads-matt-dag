# 16 — the off-PATH premise removes every path that resolves the binary

**What to build:** `envWithoutStore()` in `beads-dag-drain/tests/target.ts` removes only
`dirname(storeBinary())` from PATH, so a PATH holding a *second* directory with an executable `bd` leaves the
binary findable and breaks the premise the suite builds on ("a Target that cannot find the store").
Found by ticket `beads-skills/02`'s author: with a second `bd` directory prepended, `store-backup-repro.ts`
failed once — 17/18 — for exactly this reason, while the machine's own PATH gives 18/18. The fix is to remove
every PATH entry under which an executable `bd` resolves, so the premise holds by construction rather than by
luck about which directory `storeBinary()` happened to pick.

**Spec:** `.archon/workflows/beads-dag/README.md` (Gates) and `beads-dag-drain/tests/target.ts`
**Blocked by:** None
**Status:** BLOCKED

- [ ] `envWithoutStore()` drops every PATH entry under which an executable `bd` resolves, not only the one
      `storeBinary()` picked
- [ ] with a second `bd` directory prepended to PATH, the suite is green again (21 repros as of ticket
      `14`), and the premise is *shown*: the same environment prints nothing for `command -v bd`
- [ ] nothing else about the tests' environment changes: the suite still passes on the machine's own PATH
