# 01 — Walking skeleton: a no-op drain runs end to end

**What to build:** The new pack lives in this repository and can be installed where the runner looks for
workflows. Pointed at a Target that has nothing to do, the drain walks its whole graph — opening step,
pick, the per-issue executor, review, summary — and finishes reporting that there was nothing to start.
Every node answers through the one protocol the runner uses: inputs in the environment, exactly one
token on stdout, and a work outcome that exits clean rather than as an error.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** None — can start immediately
**Status:** READY

- [x] the pack installs by copy, and the runner can list and start the drain workflow
- [x] a drain against an empty Target completes: opening step, pick (nothing eligible), no executor
      instances, review, summary
- [x] every node speaks the protocol: inputs from the environment, exactly one stdout token, exit 0 for a
      work outcome and non-zero for a thrown error
- [x] the workflow-and-script contract test fails naming what moved if a node references a script that
      does not exist, an input the node protocol does not read, or a node in another file
- [x] the fixture builds a temp Target with real git and removes it afterwards
- [x] no node in this ticket writes to a store — the store arrives in `02`

## Comments

Built. The pack is `.archon/workflows/beads-dag/`; its README documents installing it and the three gates,
and `AGENTS.md` points at them.

- repros `3/3` (`bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts`), typecheck at zero
  errors (`./node_modules/.bin/tsc -p tsconfig.pack.json`).
- Acceptance: a throwaway git repo under `/tmp` holding no issues, `archon workflow run beads-dag-drain` →
  `open`, `pick`, no `execute` instance, `review`, `summary`, "Workflow completed successfully" (run
  `410b8f76-9f3d-4398-96a2-604f0db43d7b`). The Target came out untouched: no new commit, no `.scratch/`, no
  `.archon/`.
- The contract test's failure modes were proven by mutation in a copy of the pack: a node whose body lives
  in the other folder, a `with:` key the node protocol does not read, a `depends_on` naming an undeclared
  node, and a renamed script each fail with the fact that moved named in the message.
- One criterion was wrong and is corrected above: the fixture builds a temp Target with real git, and the
  worktree helper arrives with the worktree work instead of here.
- The node bodies are stubs by design. `pick` prints the empty frontier, the two readers report nothing,
  and `execute` reports `failed` with a reason on stderr — the honest outcome for an issue whose work is not
  in Main is that it did not happen, and it keeps the "no close without a merge commit" invariant true even
  in a skeleton.
- This repository gained a `package.json` and `node_modules` for the dev-only typecheck gate
  (`typescript`, `@types/node`), with `node_modules/` ignored. The pack itself still carries nothing the
  runtime cannot use.
