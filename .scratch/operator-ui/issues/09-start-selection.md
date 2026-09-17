# operator-ui/09 — start selection

**What to build:** the operator selects one or more issues of a single domain and starts that domain's existing run with those ids as the allow-list. Development starts drain, `decision` starts inquiry, `experiment` starts the experiment run. Mixed-domain, empty selection, and a Target already held are refused. The surface does not claim, merge, or stamp `closed`. Issues not selected keep their gates.

- [ ] a same-domain selection starts that domain's existing run with an allow-list of those ids
- [ ] mixed-domain and empty selections do not start a run
- [ ] a start does not claim, merge, or stamp `closed`
- [ ] issues left out of the selection keep their triage
- [ ] the tools typecheck stays clean
