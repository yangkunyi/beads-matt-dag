# operator-ui/31 — Grill the selection, like Start

**What to build:** the operator can start a **grill run** on the selected seed
issue, the same way Start launches that domain's existing run. Empty selection
and a held Target are refused. Grill does not claim, merge, or stamp `closed`.
The surface then shows the round from operator-ui/30 when the run writes one.

Blocked by operator-ui/30 (nothing to show) and beads-dag/45 (nothing to launch).

- [ ] a Grill control next to Start launches the grill run with the selected id
- [ ] empty selection does not start
- [ ] the page does not itself invent questions
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
