# operator-ui/23 — the operator may delete an issue

**What to build:** ADR-0008. The tagged door grows a `delete` intent that is `bd delete <id> --force`
after the door itself has refused the cases `--force` would otherwise orphan. `--force` is how bd
actually deletes (without it the CLI is a preview); `--cascade` is never passed. Delete is not
`closed`. The body file under `.scratch/` is a git document and stays; the store identity is gone.

A confirm step is required: the POST carries `confirm: true`. A body that names `cascade` or `force`
is refused. `in_progress` is refused (the claim belongs to the run). An issue that anyone still
depends on — any store edge pointing at it — is refused. Abandoned work that should remain in the
record stays `wontfix`.

The canvas Delete key still only talks to edges. Issue nodes are not deleted from React Flow state.

- [ ] `intent: "delete"` with `confirm: true` writes `bd delete <id> --force` and nothing else
- [ ] without `confirm: true`, `in_progress`, unknown id, or a dependent, the store is not written
- [ ] `--cascade` is never passed; a body carrying `cascade` or `force` is 400
- [ ] the detail panel and the palette offer delete behind a confirm dialog (hand-rolled, not a portal)
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
