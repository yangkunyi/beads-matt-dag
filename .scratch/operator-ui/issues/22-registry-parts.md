# operator-ui/22 — message, bubble, and the issue list as a data table

**What to build:** the three shadcn registry parts that are not portalled. Comments on the selected
issue render as `Message` / `Bubble` posts (a thread, not `author · timestamp · article.comment`).
The issue list's columns are `@tanstack/react-table`; the rows stay windowed and keep the `issue-row`
class the page tests read.

Dialog stays the hand-rolled kit: a Radix portal would empty the served create form. Command stays
cmdk inside that Dialog.

A human operator's post and an agent's post are visually distinct (`data-from="user"` vs
`data-from="assistant"`). Classification is the author string already on the comment: the door's
actor (and the git/user fallbacks) is the operator; anything else is not. Beads remains the only
comment store.

- [ ] comments render through Message / Bubble, not a bare `<article class="comment">`
- [ ] a human operator's post is `data-from="user"`; any other author is `data-from="assistant"`
- [ ] the issue list is a table of columns (handle, title, status, domain) driven by
      `@tanstack/react-table`, still windowed, still `id="issue-list"` / `issue-row`
- [ ] the served page still carries each comment's text (markdown) and the create form
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
