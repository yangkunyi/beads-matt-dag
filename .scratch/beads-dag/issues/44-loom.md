# beads-dag/44 — loom: the name, a landing skill, a closed set

The machine-global CLI is **loom** (`beads-dag` stays an alias). Pack path
`~/.archon/workflows/beads-dag` is unchanged.

The skill set is **closed**: whatever `skills/*/SKILL.md` holds, copied by `loom install`.
There is no second family and no Matt dependency. Contract files live in `skills/ask-loom/`
(`issue-tracker.md`, `flow-context.md`, `triage-labels.md`, `domain.md`).
`/ask-loom` is the landing skill and router. `/grill` writes `docs/CONTEXT.md` and ADRs as
terms settle.

- [ ] `package.json` bin `loom` (+ alias `beads-dag`)
- [ ] `skills/ask-loom/` — intro + router (three domains, init, drain, operator vs session)
- [ ] to-tickets / triage / implement / drain / to-spec point at the installed `ask-loom` contract
- [ ] `loom install` copies the closed set; retired `ask-matt` and `setup-matt-pocock-skills` dest folders are pruned
