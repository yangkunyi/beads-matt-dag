# operator-ui/06 — create issue

**What to build:** from the operator surface, a human creates an issue without a session. Type is required and is the domain. That domain's identity labels go on at create (experiments: `experiment`). Default triage is `needs-triage`; the gate is not applied. The operator supplies the feature; the surface allocates the next number and a slug. The bead carries `handle` and `slug`. The body is handle and prose, no status.

- [ ] create requires a type that is the domain
- [ ] a new issue is `needs-triage` and does not carry `ready-for-agent`
- [ ] an experiment created here carries the `experiment` identity label
- [ ] the new issue has handle, slug, and a body of prose with no status
- [ ] the tools typecheck stays clean
