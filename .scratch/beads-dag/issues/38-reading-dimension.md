# beads-dag/38 — `reading:` becomes a store state dimension

**What to build:** the store already has the primitive we hand-maintain. Verified on the pinned
`bd` (1.2.2) in a throwaway store:

```
bd set-state <id> reading=some/path --reason "…"   # -> labels: ['reading:some/path']
bd state <id> reading                              # -> some/path
```

`set-state` writes an **event bead as the source of truth**, removes the dimension's previous label,
and adds the new `<dimension>:<value>` label as a lookup cache; `state` reads the value back. So the
"one value per dimension, replaced rather than accumulated" rule is the store's, not ours, and the
actor and the optional reason come with it.

Our `reading:` marker is already `dimension:value`-shaped and is written and cleared as a bare label
(`store.ts` and its `clearUnreadMarker`; the prompt's `reading: none yet`). Make the dimension the
store's own: one write per reading, an event trail of who re-read what and when, and no second
spelling of the family.

- [ ] writing the unread marker goes through `bd set-state <id> reading=<value> --reason <…>`
- [ ] clearing it goes through the same verb (the "unread" value, or whatever the store offers for an
      empty dimension) rather than a label edit
- [ ] reading it goes through `bd state <id> reading`, so no caller parses the label itself
- [ ] the actor is the session's own, and the reason says what act produced the reading
- [ ] ADR-0005 still holds: the event bead and the label are both *in the store*, so no non-store copy
      of a fact appears — say so in the diff's message
- [ ] policy is unchanged: writing `reading:` stays a session act (ADR-0006), and the operator surface
      still refuses it
- [ ] `bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts` green
- [ ] `./node_modules/.bin/tsc -p tsconfig.pack.json` clean
- [ ] if `tools/operator-ui/` reads the label anywhere, `overview-test.ts` ok and
      `./node_modules/.bin/tsc -p tsconfig.tools.json` clean

**Not in scope, and this is deliberate:** the five triage labels. They are bare words
(`needs-triage`, not `triage:needs-triage`), and dimensionising them renames the vocabulary
`docs/agents/triage-labels.md` documents and other tooling reads. Leave them as they are.
