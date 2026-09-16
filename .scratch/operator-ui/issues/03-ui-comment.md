# operator-ui/03 — bd comment from the UI

**What to build:** on a selected node, the operator leaves a reply and the UI writes it as `bd comment`. Beads remains the only comment store. Do not use `bd human respond` (it closes with reason Responded). Inquiry close and experiment `reading:` stay the session's act on the operator's word, along with that domain's existing label acts (ADR-0006). The tracker contract records this.

- [ ] the UI writes an operator reply as `bd comment` on the selected issue
- [ ] `bd human respond` is not used
- [ ] close, `reading:`, and the domain's label acts remain the session's, not the UI's
- [ ] the tracker contract states that split
- [ ] the tools typecheck stays clean
