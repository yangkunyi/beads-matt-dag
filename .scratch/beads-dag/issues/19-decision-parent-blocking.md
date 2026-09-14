# 19 — blocking through a decision parent is refused too

**What to build:** the domain preflight walks `blocks` edges only. An implementation issue **parented under**
a decision issue inherits that decision's blocked-ness (`parent-child`), so closing the decision's own blocker
can release implementation work with no `blocks` edge for the preflight to see — the same cross-domain release
§10.4 forbids, reached by another edge type. Found by the acceptance and recorded only (ticket `09`'s second
residual: "a walk over blocking ancestors would be the fix if that structure ever appears").

Fix: the preflight walks the **blocking ancestry** of every non-decision issue — `blocks` and `parent-child`,
at any depth — and refuses when any ancestor is a decision issue. §7.2 already calls parent-child the wrong
tool for a wayfinder map; this makes the pack refuse it instead of hoping.

**Spec:** §10.4, §7.2; `.scratch/beads-dag/issues/09-brake-and-domains.md` (Residual risks, second bullet)
**Blocked by:** `09`
**Status:** BLOCKED

- [ ] the preflight refuses an implementation issue whose blocking ancestry (either edge type, any depth)
      reaches a decision issue, naming the chain rather than the edge
- [ ] implementation→implementation ancestry stays legal: a two-deep implementation chain is reviewed
      normally, pinned by a repro, so the walk cannot be over-broad
- [ ] the check still runs before any write and still fails with exit 1 and no stdout token
- [ ] `relates-to` and every other edge type stay out of it, and the Comments say how the pack reads edge types
      (`bd list --all --json`'s shape) rather than assuming
- [ ] the README's domain boundary names both edge types
