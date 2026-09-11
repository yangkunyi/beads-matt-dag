# 01 — Walking skeleton: a no-op drain runs end to end

**What to build:** The new pack lives in this repository and can be installed where the runner looks for
workflows. Pointed at a Target that has nothing to do, the drain walks its whole graph — opening step,
pick, the per-issue executor, review, summary — and finishes reporting that there was nothing to start.
Every node answers through the one protocol the runner uses: inputs in the environment, exactly one
token on stdout, and a work outcome that exits clean rather than as an error.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** None — can start immediately
**Status:** READY

- [ ] the pack installs by copy, and the runner can list and start the drain workflow
- [ ] a drain against an empty Target completes: opening step, pick (nothing eligible), no executor
      instances, review, summary
- [ ] every node speaks the protocol: inputs from the environment, exactly one stdout token, exit 0 for a
      work outcome and non-zero for a thrown error
- [ ] the workflow-and-script contract test fails naming what moved if a node references a script that
      does not exist, an input the node protocol does not read, or a node in another file
- [ ] the fixture builds a temp Target with real git and real worktrees, and removes it afterwards
- [ ] no node in this ticket writes to a store — the store arrives in `02`
