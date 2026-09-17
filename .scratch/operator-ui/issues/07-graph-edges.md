# operator-ui/07 — graph edges

**What to build:** the operator can add and remove intra-domain `blocks`, and add and remove crossing `relates-to` and `discovered-from`. Cross-domain `blocks` and any `parent-child` are refused. A canvas connect in the same domain proposes `blocks`; across domains the operator must pick `relates-to` or `discovered-from`. A successful write reloads from the store; a refusal leaves the view unchanged. React state is not the graph (ADR-0007).

- [ ] same-domain `blocks` can be added and removed in the store
- [ ] cross-domain `blocks` and `parent-child` are refused with no write
- [ ] `relates-to` and `discovered-from` can cross domains and do not block
- [ ] a refused connect does not remain on the canvas as if it landed
- [ ] the tools typecheck stays clean
