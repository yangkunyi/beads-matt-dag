# operator-ui/10 — forum-style comments

**What to build:** the selected issue's comments read as a forum thread, not a dump of author · timestamp · pre. Each comment is a post with a visible speaker (the human operator vs an agent vs another named author the store already has), stacked like replies on a thread. Beads remains the only comment store; the write is still `bd comment`. Close, `reading:`, and domain label acts stay off this page.

- [ ] comments on the selected issue look like a thread of posts, not a log dump
- [ ] a human operator's post is visually distinct from an agent's
- [ ] the store command is still `bd comment`; no second comment store
- [ ] the tools typecheck stays clean
