# 18 — the domain check also runs where the claim happens

**What to build:** ticket `09`'s preflight refuses a cross-domain `blocks` edge at open, before any write. Its
own first residual: **the preflight runs at open and `pick` runs later**, so a wayfinder closing a decision
issue in that window releases a dependent the preflight already passed, and the drain claims implementation
work a decision's closure released — the thing §10.4 forbids. Found by the acceptance and recorded only.

Fix: re-check at the point of claiming, so the window closes without weakening open. Open still refuses before
any write (that is what makes a refused run a no-op); the claim-time check catches what moved in between.

**Spec:** §10.4; `.scratch/beads-dag/issues/09-brake-and-domains.md` (Residual risks, first bullet)
**Blocked by:** `09`
**Status:** BLOCKED

- [ ] a candidate the store offers whose blocking relation crosses domains is refused at claim time: the drain
      fails loudly, names the relation, and claims **nothing** from that cycle
- [ ] the already-recorded case still holds at open: an implementation issue the store released as the
      dependent of a closed decision issue is refused even though no edge remains on the frontier
- [ ] the Target-facing contract says so too: `skills/setup-matt-pocock-skills/issue-tracker-beads.md`
      ("Closure never crosses domains") claims the refusal happens at open, so it must say the check also runs
      where the claim happens — a run can now fail after its open — and the install must be refreshed
      (`cp -a skills/<member> ~/.pi/agent/skills/`, then `diff -rq` empty)
- [ ] the cost is stated in the Comments — one extra store read per `pick` cycle, and why a cheaper place
      cannot close the window
- [ ] a repro pins the **window** (store mutated between open and pick), not the code path, so the test fails
      if the re-check moves back behind `pick`
- [ ] nothing outside the pack changes
