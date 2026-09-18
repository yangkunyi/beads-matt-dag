# operator-ui/28 — the list grouped by feature is a working view

**What to build:** humans scan work in the **list**, grouped by feature, not by
staring at the whole DAG. The table remains the issue list (same rows, still
windowed) but rows sit under their feature. The canvas is for dependency, not for
finding a theme.

Blocked by operator-ui/25: without a feature filter there is nothing to group.

- [ ] the issue list groups rows by feature (none for a missing handle)
- [ ] grouping honours the feature filter from 25
- [ ] the list stays `id="issue-list"` with `issue-row` on the issue rows
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
