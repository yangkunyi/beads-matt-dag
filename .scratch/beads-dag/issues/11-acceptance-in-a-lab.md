# 11 — Acceptance: a real run in a lab

**What to build:** A real run of the drain against a throwaway lab Target, with a real runner, completes
and satisfies the four properties the design rests on — not only under the node-level tests but through
the whole workflow. The lab is created under the temporary directory and torn down afterwards, and no
other Target is touched.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `06`, `07`, `08`, `09`, `10`
**Status:** BLOCKED

- [ ] a real run over a lab holding eligible, blocked, decision, unlabelled and failed issues starts
      exactly the eligible ones
- [ ] decision issues and issues without the gate label never start; a failure is retried by the next
      run and never by the one that failed it; closure never crosses domains; and a kill between the
      merge and the record is repaired by the next open — all four observed in the real run
- [ ] running again against the same lab does the right thing the second time: nothing eligible, and a
      clean no-op report
- [ ] the lab lives under the temporary directory and is removed; no other Target is written to, and the
      drain that is currently live elsewhere is left alone
