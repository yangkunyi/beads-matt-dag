# 20 — one drain at a time per Target

**What to build:** nothing stops a second drain against a Target that is already draining. Ticket `07`'s
residual, still standing after `09`: two drains can each see the other's `in_progress` claims — and the damage
is worse than duplicated work. The second run's opening repair reads the first run's **live** claim as a
leftover, and its `pick` can offer an issue the first is implementing right now. `lock.ts` serialises the
writes that move Main; it does nothing about two runs.

Fix: **mutual exclusion at open.** The drain takes a Target-level run lock before it does anything, and a
second drain refuses to start — one loud line, no claim, no write, no stdout token — while another live run
holds it. A dead holder's lock is stolen, the way `lock.ts` already steals one.

**Spec:** `.scratch/beads-dag/issues/07-reconcile-leftovers.md`'s residual,
`.scratch/beads-dag/issues/09-brake-and-domains.md` (Residual risks, last bullet)
**Blocked by:** `07`
**Status:** BLOCKED

- [ ] a second drain against a held Target refuses at open: exit 1, no stdout token, nothing claimed, nothing
      written, the message naming the holder (run id, or the pid it recorded)
- [ ] the lock is released when a run ends normally **and** after a kill: the next drain starts normally,
      stealing a dead holder's lock
- [ ] the ticket says what the lock is, where it lives, and why it is not a store field (drain bookkeeping
      does not enter the store — the `attempted-ids.json` precedent)
- [ ] a repro proves the refusal and the release; a real lab shows a second `archon workflow run` refused while
      the first is running, quoted with both runs' ids
- [ ] the run's own artifacts say the lock was taken (one line), so an operator can explain a refusal without
      reading the pack
