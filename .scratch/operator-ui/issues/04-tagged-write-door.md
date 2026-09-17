# operator-ui/04 — tagged write door

**What to build:** the operator surface has one write door. A comment still goes through it as today. A request that tries to close, write `reading:`, or send an unknown intent is refused and does not write the store. Close, `reading:`, and domain label acts stay the session's (ADR-0006). `bd human respond` is not used.

- [ ] an operator comment still lands as `bd comment` on the selected issue
- [ ] a request carrying `closed`, `reading:`, or an unknown intent is refused and the store is not written
- [ ] `bd human respond` is not used
- [ ] the tools typecheck stays clean
