# operator-ui/19 — `bd --actor` at the comment door

**What to build:** an operator reply is still `bd comment <id> --stdin`. The author is the door's, not
the body's. Pass the store's global `--actor` on that one write so a human's name lands on the comment
instead of whoever the git user happens to be.

Identity is not a second product: no session, no token, no `author` field on the POST. The served
process names the actor (`--actor` on `serve.ts`, else `BEADS_ACTOR`, else `git config user.name`,
else `$USER`) and the write prepends `--actor <name>` before `comment`. A body that carries `author`
or `actor` is refused and does not write.

A caller that does not name an actor (the tests that drive `addComment` / `applyOperatorAction`
directly) still writes `bd comment` with no flag, and the store's own fallback applies.

- [ ] `addComment` with an actor writes `["--actor", <name>, "comment", <id>, "--stdin"]`
- [ ] `addComment` without an actor still writes `["comment", <id>, "--stdin"]`
- [ ] a POST body carrying `author` or `actor` is 400 and does not write
- [ ] `serve.ts --actor` (else `BEADS_ACTOR`, else git user.name, else `$USER`) is what the live
      door passes; the body cannot override it
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
