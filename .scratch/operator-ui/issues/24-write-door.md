# operator-ui/24 — one write door, not a file per intent

**What to build:** the operator surface's tagged write is one module. A form posts one
shape of JSON; the door writes the store or refuses. A new intent is implementation
behind that seam, not another client file, parse file, and switch branch.

Today each intent is a shallow trio (stringify+fetch, parse+argv, a branch in the
door). The client files fail the deletion test: deleting them just moves a dozen
lines. The door's interface is already small — tagged JSON in, write or refuse out.
Deepen that; do not add a plugin registry, and do not split the view into more files.

The view still posts without pulling `bd`. Closed, `reading:`, and non-triage labels
stay refused. Comment author stays the door's, not the body's. Delete stays confirm
plus `bd delete --force`, never cascade (ADR-0008). Starting work still launches the
domain's existing run (ADR-0007).

Tests assert through the door and through the one client post. They do not import a
per-intent client module. `bd` argv is the fake runner's observation of the door, not
a second contract.

- [ ] one client post for every tagged write; the per-intent client modules are gone
- [ ] parse and store writes live behind the existing door (`applyOperatorAction`);
      a new intent does not add a sibling module
- [ ] every current intent still behaves: comment, create, start, add-edge,
      remove-edge, triage, delete — same refusals
- [ ] the view is not file-split (no new IssueList / CreateForm modules)
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
