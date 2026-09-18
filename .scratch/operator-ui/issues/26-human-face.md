# operator-ui/26 — a human reading surface; the body stays for the agent

**What to build:** the selected issue has a part a human can actually read, and it is
**not** the body. The body (and the other git documents) stay the agent's brief: do
not restyle, reflow, or "make the markdown nicer." They remain available, secondary.

The human face is facts the store already has: handle, title, domain, status, labels,
neighbours (what blocks it, what it blocks, crossing links), and the comment thread.
A human should understand where the issue sits without opening the body.

- [ ] the detail pane's default reading is the human face, not the documents
- [ ] documents remain reachable and unoptimized (machine body / record / note)
- [ ] neighbours are visible as issues, not only as raw ids
- [ ] comments stay the conversation, not a second document
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
