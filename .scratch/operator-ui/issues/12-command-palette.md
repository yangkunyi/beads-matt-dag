# operator-ui/12 — the command palette

**What to build:** a ⌘K palette over the same store and the same tagged door. Jump to an issue by
handle or title; reach create, triage, and start without hunting for the panel.

Every act the palette offers goes through the door the panels already use. It adds a way in, not a
new way to write.

- [x] `Cmd/Ctrl+K` opens and closes the palette
- [x] typing filters issues by handle and by title
- [x] choosing an issue selects it and the detail pane follows
- [x] create, triage, and start are reachable and post to the same tagged intents
- [x] `close` and `reading:` are not offered
- [x] the palette is server-renderable: the served page still renders without it being open
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
