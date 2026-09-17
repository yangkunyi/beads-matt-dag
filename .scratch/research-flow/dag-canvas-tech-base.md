# Research: DAG canvas / comment tech base for the operator surface

**Problem (one line):** the operator surface must *show* an issue DAG, let a human draw non-blocking cross-domain `relates-to` (and intra-domain `blocks`), and append comments — without becoming a second graph store or a workflow engine.

**Scope:** owner docs and this repo. GitHub HTML was blocked from this host (`198.18.0.0/15`); claims below that need a GitHub README are marked **unfetched**.

## What this Target already has

| Piece | Where | Store |
|---|---|---|
| Issue DAG view | `tools/operator-ui/` — vanilla HTML + **inline SVG** (`page.ts` `#graph`) | `bd list` / `bd show`, never jsonl |
| Comments | `tools/operator-ui/comment.ts` + `serve.ts` POST | `bd comment` |
| Live overlay | `overlay.ts` | run-lock, Archon status, artefacts, attempted |

The page is **not** React. Introducing `@xyflow/react` is a new UI runtime, not a drop-in on the current SVG.

## Crossing edges (name)

`docs/CONTEXT.md` / ADR-0006: two **non-blocking** links may join domains:

- **`relates-to`** — loose see-also
- **`discovered-from`** — the handoff a result makes (experiment → work)

Not `related-to`. Blocking (`blocks`, `parent-child`) still must not cross.

## Canvas libraries (primary)

### React Flow (`@xyflow/react`) — xyflow

- **Owner:** https://reactflow.dev/learn
- **Install (owner):** `npm install @xyflow/react`
- **What it is:** a React component that renders **nodes + edges**, pan/zoom, and connection handlers. The quick start keeps graph state in **React `useState`** (`nodes`, `edges`, `onConnect` → `addEdge`). That state is **UI state**. Nothing in the fetched quick start writes an issue tracker.
- **Fit:** good if we **accept React** as the operator-ui runtime and treat every `onConnect` as “propose a `bd dep add`”, never as the graph of record.
- **Mismatch:** n8n-shaped demos; easy to let React state become a second DAG.

### Cytoscape.js

- **Owner:** https://js.cytoscape.org/
- **Owner sentence:** graph analysis and **visualisation**, not a workflow editor.
- **Mutation:** `cy.add()` / `cy.remove()` on the **view** graph.
- **Editing extensions (owner catalog):** `edgehandles` (draw edges), undo-redo, node-resize.
- **License (core, owner):** MIT.
- **Fit:** DAG **drawing** on top of vanilla JS (no React required). Still not a store.

### elkjs (Eclipse Layout Kernel, JS)

- **Owner npm:** https://www.npmjs.com/package/elkjs (layout only; Sugiyama / layered).
- **Fit:** compute x/y for a DAG the store already defined. Pair with SVG **or** React Flow **or** Cytoscape. Does not edit, comment, or persist.

### Not a base

- **n8n canvas:** an executable workflow editor. Product identity here forbids using it as the model (Q1). Its implementation is not this repo’s store.
- **Beads:** comments API is `bd comment` / `bd comments` (already used). Community web UIs are instructed to go through `bd`, not jsonl (see `.scratch/research-flow/operator-hitl-ui.md`).

## Recommendation (research, not a product decision)

1. **Comments:** keep `bd comment`. No comment SaaS, no second thread.
2. **Graph of record:** beads only. Canvas libraries hold **positions and gestures**.
3. **Canvas:** if staying in `tools/operator-ui` as bun + HTML, **Cytoscape.js + elkjs** (or keep SVG + elkjs) avoids a React rewrite. If the surface is allowed to become a React app, **React Flow + elkjs**, with `onConnect` mapped to `bd dep add` (`blocks` inside a domain, `relates-to` across).
4. **Do not** pick a library because it has “executor nodes”. That fights Q13.

## Sources

- https://reactflow.dev/learn — React Flow quick start, `@xyflow/react`, `addEdge` / React state
- https://js.cytoscape.org/ — Cytoscape.js purpose, add/remove, MIT, editor extensions
- https://www.npmjs.com/package/elkjs — elkjs layout package
- `docs/CONTEXT.md` — `relates-to`, `discovered-from`
- `tools/operator-ui/serve.ts`, `page.ts` — existing SVG view + `bd comment`
