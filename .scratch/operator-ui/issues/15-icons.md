# operator-ui/15 — icons

**What to build:** `lucide-react` for the states and the actions the operator scans for — blocked,
in progress, closed, the domain, comment, start, create.

An icon never carries meaning on its own: the label or an `aria-label` stays beside it.

- [x] the surface uses lucide icons for status, domain, and the write actions
- [x] no icon is the only carrier of its meaning
- [x] only the icons the surface uses reach the client bundle
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
