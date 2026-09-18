# Interactive grill: can the operator surface host a round?

2026-09-18. Question: a human creates a seed issue, an agent grills, follow-up
issues grow; grill questions become clickable choices. Is that a real shape, and
which wheels already do it?

Sources are first-party unless noted.

## 1. The structure is already there

`skills/grill/SKILL.md` is not free chat. A round is:

- the **frontier**: every decision whose prerequisites are settled
- each item: title, body **including choices**, a recommended answer
- **wait** for the whole round
- recompute the frontier
- facts are the agent's; decisions are the user's
- write `docs/CONTEXT.md` / an ADR in the same turn a term or choice crystallises
- stop when the frontier is empty **and** the user confirms a shared understanding
- then `/to-tickets` (or `/to-spec`) — grill does not publish issues itself

That is already a form. The markdown (`❓ Q1` / `➡️ recommended`) is a rendering
of one JSON object: `{ questions: [{ id, title, body, choices, recommended }] }`.
Extracting it does not mean NLP over a transcript; it means making that object
the round's interface and treating the markdown as the session fallback.

## 2. What other systems actually pause for

| Wheel | Pause grain | What the human returns | Fit here |
|---|---|---|---|
| Claude Code `AskUserQuestion` | one tool call, N questions, each with `options` / `multiSelect` / `header` ([SDK user-input](https://code.claude.com/docs/en/agent-sdk/user-input)) | chosen option(s) via `canUseTool` | Same *question* shape as a grill round. Lives in a **session**, not on a graph. |
| n8n Wait **On Form Submitted** ([Wait node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait)) | one workflow execution | form fields (dropdown, multiple choice, text, textarea) | Closest *product* analog: pause, render a form, resume with answers. We do not want n8n as runtime. |
| n8n Wait **On Webhook Call** (same page) | one execution, unique `$execution.resumeUrl` | arbitrary HTTP body | Resume token, not a question UI. |
| LangGraph `interrupt()` ([Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)) | any JSON-serializable payload; resume with `Command(resume=…)` | anything JSON | The *mechanism* (payload in, answer back, checkpointer). We already refused LangGraph as a runner. |
| Archon `approval` ([Approval Nodes](https://archon.diy/guides/approval-nodes/)) | one gate: approve / reject, optional comment, optional `on_reject` | binary + text | **Wrong grain.** A grill round is N questions with recommended choices, not ship/don't-ship. |

Do not reuse Archon approval as grill. It cannot ask Q1–Q4 with a recommended
answer each, and a reject cancels or reworks the *run*, not the design tree.

## 3. What this repo already forbids

- ADR-0007: the operator surface is a **view**, not an executor. Starting work
  starts the domain's existing run (drain / inquiry / experiment). Grill is
  today a **session skill**, not a pack workflow.
- ADR-0001: beads remains the graph. A round that exists only in React state is
  a second graph.
- The body is the agent's brief (operator-ui/26). Human speech already has a
  home: `bd comment`.
- `/to-tickets` publishes follow-up issues. Grill must not mint development
  tickets while the frontier is still open.

So: the surface can **show** a round and **write answers**. It must not *be*
the griller.

## 4. A shape that fits

Three facts, three homes:

1. **Seed issue** — the node the human created (`decision` or work). Stays.
2. **Current round** — JSON on that issue (a comment with a typed payload, or a
   store dimension if we later want one). The surface renders choices, highlights
   the recommended answer, posts the human's picks through the write door.
3. **The griller** — a session, or a small pack node that is *not* drain. It
   reads the seed + answers, writes glossary/ADR, posts the next round or
   declares Done. After Done, a human or `/to-tickets` grows children
   (`relates-to` / same-domain `blocks`).

"Start grill" on a selected node is the same *kind* of act as Start: it launches
the griller against that id. It is not a new domain. Inquiry's reading run is
the wrong executor (it answers a `decision` from literature; it does not
interview the operator).

Interactive choices are the round's `choices[]`. Free text stays for questions
that are not enumerations (grill already allows a body beyond choices). A round
is one submit, not one click per question — that matches "ask the whole frontier
then wait."

## 5. What not to do

- Do not scrape a chat transcript into a form. Emit the round as data.
- Do not put the design tree in canvas layout.
- Do not vendor n8n Wait or LangGraph interrupt.
- Do not use Archon `approval` for a multi-question round.
- Do not auto-publish follow-up issues from a half-finished grill.

## 6. Verdict

Yes: grill is structured enough to extract, and clickable choices are the
natural rendering of a round. The missing piece is not a better interviewer
prompt; it is (a) a round schema, (b) the surface as the form, (c) answers
written to the store, (d) a griller that is a session/run, not the view.

Closest wheels to copy **as patterns**, not dependencies: Claude
`AskUserQuestion` for the question object; n8n Wait-on-form for pause/resume;
our own Start for "launch against this id."
