# operator-ui/13 — a toast per write

**What to build:** every write says what happened. Today a success is silence and a refusal is a
small muted line at the bottom of a panel. `sonner` carries the outcome of the write next to the act.

The refusal's text is the store's own reason — the door already returns it.

- [x] a successful write raises a toast naming the act
- [x] a refused write raises a toast carrying the door's reason
- [x] the inline status line stays, so a refusal is still readable after the toast is gone
- [x] the toaster is client-only: the server-rendered page must not depend on it
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
