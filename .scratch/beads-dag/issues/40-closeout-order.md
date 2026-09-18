# beads-dag/40 — the experiment close-out's two writes, in the order that fails safely

**The finding (high, from the drain's review of beads-dag/38):** marking an experiment's result unread and
closing its ticket stopped being one store write when `reading:` became a state dimension. The close went
first, so a store that refused the marker left the ticket `closed` with **no** `reading:none` label — and
the session's sweep is `bd list -t experiment -s closed -l reading:none`, which cannot see it. The result
was lost with nobody told. The ticket was also briefly `closed`, which is briefly released for anything
blocked on it (ADR-0004).

**On Main as c9edede.**

- [x] the marker is written first and the close second, both inside one handler. Either failure hands the
  claim back (`giveBackTheClaim`), records the reason on the ticket as a failed attempt, and returns
  `FAILED`, so the next run retries. Both writes are idempotent, so a retry costs one turn and nothing.
- [x] `experiment-record-repro.ts` gained a case that drives a store whose `set-state` refuses: the node
  fails, the ticket is **not** closed, the sweep is empty, and the ticket carries
  `attempt 1 failed: the record could not be closed out`.
- [x] the case is a real regression test, not a description: it was run red against the previous order
  before being kept (`{"ok":false,"error":"... this store refuses set-state"}`).
- [x] the refusing store is arranged in the Target config's `store:` line, not on `PATH` — the store is
  named by absolute path there, so a `PATH` shim intercepts nothing (learned by trying it).
- [x] `.archon/workflows/beads-dag/README.md`'s close-out paragraph said the close, the marker and the
  comment were one act; it now names the order and the reason for it.
- [x] 45/45 pack repros, `tsc -p tsconfig.pack.json` clean.
