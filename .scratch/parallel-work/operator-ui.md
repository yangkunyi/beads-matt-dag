# operator UI

## Tickets

- Local HTML inbox that lists tickets awaiting the operator (`answer:draft` questions, `reading:none` experiments) and shows the draft comment or experiment record to read — files: `tools/operator-ui/` — socket: none
- Comment box on that page writes a pending operator reply; a session applies it as `bd comment` (and the existing close / `reading:` / label acts for that domain) — files: `tools/operator-ui/`, `docs/agents/issue-tracker.md` — socket: needs

## Seam

An operator-reply inbox: other legs can publish “awaiting the operator” from store facts that already exist, the human types in a page instead of chat, and a session drains that text into the beads store. The UI is an editor, not a second source of truth — no parallel comment store, no LangGraph checkpoint, no annotation dataset. Do not use `bd human respond` (it closes with reason Responded). Inquiry close and experiment `reading:` stay the session’s act on the operator’s word (ADR-0006).
