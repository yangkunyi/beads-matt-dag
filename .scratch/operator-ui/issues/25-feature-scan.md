# operator-ui/25 — scan the graph by feature

**What to build:** the operator can restrict the list and the canvas to one or more
**features** (the prefix of a handle, `operator-ui` in `operator-ui/24`). Feature is
already identity; it is not a new store field. An issue with no handle has no feature
and groups as none.

Without this, the only filters are type, status, and label, so a human cannot look at
one theme of work.

- [ ] a Feature filter sits with type / status / label; it is derived from handles
- [ ] the list and the canvas show only issues whose feature is selected
- [ ] unchecking a feature survives a live re-read (same rule as the other filters)
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
