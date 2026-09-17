# Research: operator HITL UIs for comments on agent drafts (then into an issue tracker)

**Problem (one line):** beads-dag already stores operator review as beads comments (`bd comment` / `bd comments add`); the missing piece is a first-party-style HTML surface that writes those comments into the existing store without chat-paste or a second source of truth.

**Scope:** primary/owner docs only. Direct evidence is quoted. Search snippets that could not be fetched are not treated as quotes. `source_check` on the LangGraph interrupt/checkpoint claim returned **unclear** (no passage markers); the same claim is supported below by the fetched LangChain interrupts page.

## Product table (products that exist)

| Product | Owner URL | What the human types | Where that text is stored | Agent later consumes it? |
|---|---|---|---|---|
| LangGraph `interrupt` + checkpointer | https://docs.langchain.com/oss/python/langgraph/interrupts | JSON-serializable resume value (`Command(resume=...)`) | Thread checkpoint (checkpointer); payload also on `stream.interrupts` | Yes — resume value **is** `interrupt()`’s return value inside the paused node |
| LangSmith Studio | https://docs.langchain.com/langsmith/studio | Graph input / chat messages; “Interrupt” breakpoints; “Edit node state” | Threads on Agent Server / LangSmith; edits fork checkpoints | Yes — forked/resumed runs continue from edited checkpoint |
| LangChain HITL middleware | https://docs.langchain.com/oss/python/langchain/human-in-the-loop | `approve` / `edit` / `reject` / `respond` decisions | Graph persistence; `respond`/`reject` become `ToolMessage`s | Yes — run resumes with those decisions |
| CrewAI `@human_feedback` | https://docs.crewai.com/en/learn/human-feedback-in-flows | Free-text feedback (optional LLM-collapsed `emit` outcome) | `HumanFeedbackResult`; `human_feedback_history`; async: `HumanFeedbackPending` + SQLiteFlowPersistence | Yes — next `@listen` gets the result; flow `resume()` |
| CrewAI task `human_input` | https://docs.crewai.com/en/learn/human-input-on-execution | Extra context before the task’s final answer | Not specified beyond “prompts the user for input” | Yes — agent uses it to complete the task |
| CrewAI Enterprise HITL | https://docs.crewai.com/en/enterprise/guides/human-in-the-loop | Email-first review replies, or webhooks to Slack/Teams/custom | Platform / webhook payload (page is thin on storage schema) | Yes — HITL is part of the running flow |
| AG2 HITL | https://docs.ag2.ai/docs/user-guide/context/human_in_the_loop/ | Reply to `context.input()` via `hitl_hook` → `HumanMessage` | Conversation/stream (hook returns `HumanMessage`); DIY queue is an example in the hook | Yes — tool continues with the string; failed HITL ends the turn |
| CopilotKit HITL | https://docs.copilotkit.ai/coagents/human-in-the-loop | Custom React UI answer (`respond(...)`) or `interrupt()` resume | LangGraph interrupt **or** frontend tool result | Yes — agent sees tool result / resume |
| assistant-ui LangGraph runtime | https://www.assistant-ui.com/docs/runtimes/langgraph/overview | Chat + interrupt UI | Graph state (`state.values.messages`); checkpoints | Yes — “Graph state is the source of truth” |
| HumanLayer | https://docs.humanlayer.com | Artifact comments, diff comments, prompts, approvals | HumanLayer tasks/sessions/artifacts (not beads) | Yes — owner FAQ: comments/decisions feed agents |
| Label Studio | https://labelstud.io/guide/export.html | Regions/results; comments box in labeling UI; LLM grading uses `<Rating>` | SQLite/Postgres/target storage JSON (`task_id.json`) | Downstream via **export**, not a live agent resume |
| Argilla | https://docs.argilla.io/latest/reference/argilla/records/records/ | `responses` (and suggestions) on a `Record` | Argilla dataset records; `to_dict()` export | Downstream training/eval; owner positions it for LLM feedback |
| Prodigy | https://prodi.gy/docs | Accept/reject (and spans/labels) on a task | Named **dataset** in Prodigy’s DB; `db-out` JSONL | Downstream train/export; not an issue tracker |
| MLflow UI notes | https://mlflow.org/docs/latest/ml/tracking/ | Note text | System tag `mlflow.note.content` on the run | No agent-resume contract; humans/search read the Notes section |
| W&B Experiments | https://docs.wandb.ai/ref/python/init | Run name + a “detailed description … similar to a commit message” | W&B run metadata (UI) | No agent-resume contract in fetched pages |
| Aim UI | https://aimstack.readthedocs.io/en/latest/ui/overview.html | Tags; explorer state | Aim run store | No comment/discussion API in fetched overview |
| TensorBoard | https://www.tensorflow.org/tensorboard/get_started | (none as comments) | Event logs (scalars, graphs, …) | No comment API in fetched get-started |
| Linear (Issues + Agents) | https://linear.app/docs/api-and-webhooks ; https://linear.app/developers/agents | Issue comments (same GraphQL API as Linear’s apps) | Linear entities; webhooks push Issue/Comment objects | Yes — agents are @mentioned; session webhook includes comment/context |
| Beads CLI | https://beads.gascity.com/cli-reference/comments | Comment text | Beads Dolt store via `bd comments add` / `bd comment` | Yes — agents read comments with `bd comments <id>` |
| Beads `bd human` | https://beads.gascity.com/cli-reference/human | `--response` text | Comment on the issue, then close | Yes — “adds comment and closes” |
| Beads community web UIs | https://beads.gascity.com/community-tools | Issue fields / (varies by tool) | **Via `bd` CLI** (owner: do not read `.beads/issues.jsonl`) | Only if they write through `bd`; several are browse-only unless writes enabled |
| Open WebUI | https://docs.openwebui.com/getting-started/quick-start/connect-an-agent/ | Chat messages; Notes attached to a chat | Open WebUI conversation/notes | Chat frontend for OpenAI-compatible agents; not a tracker overlay |

**Not in table (existence unverified from fetched owner pages):** OpenAI Agents SDK HITL (official URL found; **fetch blocked**), Anthropic interrupt/approval docs (**fetch blocked**), AutoGen 0.2 HITL (**fetch blocked**), DVC Studio comment API (**docs 404**), LangChain Agent Inbox GitHub README (**github.com fetch blocked**).

## Claims

**c1.** LangGraph HITL pauses by saving graph state in the persistence layer until resume. **Source:** https://docs.langchain.com/oss/python/langgraph/interrupts **Support:** direct evidence. **Confidence:** high.

> “When an interrupt is triggered, LangGraph saves the graph state using its persistence layer and waits indefinitely until you resume execution.”

**c2.** The durable object for LangGraph HITL is a **checkpoint** keyed by `thread_id`, not an issue-tracker comment. **Source:** https://docs.langchain.com/oss/python/langgraph/interrupts **Support:** direct evidence. **Confidence:** high.

> “Checkpointing keeps your place: the checkpointer writes the exact graph state so you can resume later”

> “The `thread_id` you choose is effectively your persistent cursor.”

**c3.** The human’s reply is injected with `Command(resume=...)` and becomes the return value of `interrupt()`. **Source:** https://docs.langchain.com/oss/python/langgraph/interrupts **Support:** direct evidence. **Confidence:** high.

> “When you’re ready to continue, you resume execution by re-invoking the graph using `Command`, which then becomes the return value of the `interrupt()` call from inside the node.”

> “The value passed to `Command(resume=...)` becomes the return value of the interrupt call”

**c4.** LangGraph persistence docs name checkpointers as the HITL store (thread-scoped), distinct from long-term Stores. **Source:** https://docs.langchain.com/oss/python/langgraph/persistence **Support:** direct evidence. **Confidence:** high.

> “Checkpointers persist a thread’s graph state as checkpoints. Use them for short-term, thread-scoped memory, including conversation continuity, human-in-the-loop workflows, time travel, and fault tolerance.”

**c5.** LangGraph’s first-party UI for this is **LangSmith Studio** (Agent Server API), including local Agent Server — not a beads dashboard. **Source:** https://docs.langchain.com/langsmith/studio **Support:** direct evidence. **Confidence:** high.

> “Studio is a specialized agent IDE that enables visualization, interaction, and debugging of agentic systems that implement the Agent Server API protocol.”

> “Studio works for graphs that are deployed on LangSmith or for graphs that are running locally via the Agent Server.”

**c6.** Studio’s interrupt UX is breakpoints plus continue, and state edits **fork** a checkpoint. **Source:** https://docs.langchain.com/langsmith/use-studio **Support:** direct evidence. **Confidence:** high.

> “Click **Interrupt**. Select a node and whether to pause before or after that node has executed. Click **Continue** in the thread log to resume execution.”

> “Edit the node’s output as desired and click **Fork** to confirm. This will create a new forked run from the checkpoint of the selected node.”

**c7.** The LangGraph **server API** HITL path is still interrupt payload → `Command(resume=...)`. **Source:** https://docs.langchain.com/langsmith/add-human-in-the-loop **Support:** direct evidence. **Confidence:** high.

> “When the graph hits the interrupt, it returns an interrupt object with the payload and metadata.”

> “The graph is resumed with a `Command(resume=...)`, injecting the human’s input and continuing execution.”

**c8.** LangChain HITL middleware stores the pause in LangGraph persistence; human decisions are typed (`approve`/`edit`/`reject`/`respond`), and `respond` is a synthetic tool result. **Source:** https://docs.langchain.com/oss/python/langchain/human-in-the-loop **Support:** direct evidence. **Confidence:** high.

> “If intervention is needed, the middleware issues an interrupt that halts execution. The graph state is saved using LangGraph’s persistence layer, so execution can pause safely and resume later.”

> “Use `respond` for “ask user” style tools where the tool’s real implementation is the human’s reply. The `message` content is returned directly as the tool result”

**c9.** LangChain’s blog (first-party) states the persistence layer is “a scratchpad for human/agent collaboration,” and `interrupt` writes the prompt into that layer. **Source:** https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt **Support:** direct evidence. **Confidence:** high.

> “In some ways, you can think of this persistence layer as a scratchpad for human/agent collaboration.”

> “When you do this, it will pause execution of the graph, mark the thread you are running as `interrupted`, and put whatever you passed as an input to `interrupt` into the persistence layer.”

**c10.** CrewAI `@human_feedback` collects typed `HumanFeedbackResult` objects on the Flow (`last_human_feedback`, `human_feedback_history`). **Source:** https://docs.crewai.com/en/learn/human-feedback-in-flows **Support:** direct evidence. **Confidence:** high.

> “The `@human_feedback` decorator enables human-in-the-loop (HITL) workflows directly within CrewAI Flows. It allows you to pause flow execution, present output to a human for review, collect their feedback”

> “`human_feedback_history` — A list of all `HumanFeedbackResult` objects collected during the flow”

**c11.** Default CrewAI feedback UI is **blocking console input**; production uses a `provider` and `HumanFeedbackPending` with persistence. **Source:** https://docs.crewai.com/en/learn/human-feedback-in-flows **Support:** direct evidence. **Confidence:** high.

> “By default, `@human_feedback` blocks execution waiting for console input.”

> “When using an async provider, `kickoff()` returns a `HumanFeedbackPending` object”

> “Automatic persistence: State is automatically saved when `HumanFeedbackPending` is raised and uses `SQLiteFlowPersistence` by default”

**c12.** CrewAI task-level HITL is a `human_input` flag that “prompts the user for input before delivering its final answer.” **Source:** https://docs.crewai.com/en/learn/human-input-on-execution **Support:** direct evidence. **Confidence:** high.

> “To integrate human input into agent execution, set the `human_input` flag in the task definition. When enabled, the agent prompts the user for input before delivering its final answer.”

**c13.** CrewAI Enterprise first-party UI for Flow HITL is **email-first** (plus webhook integrations), not an issue-tracker comment box. **Source:** https://docs.crewai.com/en/enterprise/guides/human-in-the-loop **Support:** direct evidence. **Confidence:** high.

> “When using the `@human_feedback` decorator in your Flows, CrewAI Enterprise provides an **email-first HITL system** that enables anyone with an email address to respond to review requests”

**c14.** AG2 stores the human reply as a `HumanMessage` returned from a registered `hitl_hook`; there is no first-party dashboard in that page — the example is `input()` or `get_input_from_ui()`. **Source:** https://docs.ag2.ai/docs/user-guide/context/human_in_the_loop/ **Support:** direct evidence. **Confidence:** high.

> “A **HITL** hook is a callback function that consumes a `HumanInputRequest` event and returns a `HumanMessage`.”

> “Collect input from the user (e.g., via standard input) `user_input = input("Your answer: ")` `return HumanMessage(content=user_input)`”

**c15.** AG2’s own example of a durable pending-approval object is **application-owned** (`my_approval_queue.ask`), not a product inbox. **Source:** https://docs.ag2.ai/docs/user-guide/context/human_in_the_loop/ **Support:** direct evidence. **Confidence:** high.

> “`return await my_approval_queue.ask(event.content)`”

**c16.** Label Studio’s comments UI exists as a “Comments box” in the labeling interface. **Source:** https://labelstud.io/guide/labeling/ **Support:** direct evidence (figure caption; no storage schema on that page). **Confidence:** medium.

> “Figure 13: Comments box”

**c17.** Label Studio’s exportable system of record is **task JSON** (regions/results/annotations), stored in SQLite/Postgres/target storage — not an issue comment stream. **Source:** https://labelstud.io/guide/export.html **Support:** direct evidence. **Confidence:** high.

> “Label Studio stores your annotations in a raw JSON format in the SQLite database backend, PostgreSQL database backend, or whichever cloud or database storage you specify as target storage. Cloud storage buckets contain one file per labeled task named `task_id.json`.”

**c18.** Label Studio is explicitly used for **LLM-output review** via an official “LLM Response Grading” template (rating, not free-text comment-on-draft). **Source:** https://labelstud.io/templates/llm_response_grading **Support:** direct evidence. **Confidence:** high.

> “Sometimes it is useful to assign a grade to the LLM response based on the quality of the generated text.”

> “In this example, you are grading an LLM’s ability to summarize a document.”

**c19.** Argilla’s unit is a `Record` that “receives feedback in the form of responses and suggestions”; export is `to_dict()` with `fields`/`responses`/`suggestions`. **Source:** https://docs.argilla.io/latest/reference/argilla/records/records/ **Support:** direct evidence. **Confidence:** high.

> “A `Record` is a single sample in a dataset. Records receives feedback in the form of responses and suggestions.”

> “Converts a Record object to a dictionary for export. … `{"fields": {"prompt": "...", "response": "..."}, "responses": {"rating": "..."}`”

**c20.** Argilla 1.x Feedback datasets were built for LLM-style prompt/output review, including a free-text `TextQuestion` “corrections or explanations.” **Source:** https://docs.v1.argilla.io/en/v1.10.0/guides/llms/practical_guides/create_dataset.html **Support:** direct evidence. **Confidence:** high.

> “This can be, for example, a prompt and output pair in the case of instruction datasets.”

> “`TextQuestion`: These questions offer annotators a free-text area where they can enter any text. This type is useful for collecting natural language data, such as corrections or explanations.”

**c21.** Argilla’s current product page states it is for “NLP … LLMs (RAG, preference tuning, etc.).” **Source:** https://docs.argilla.io/latest/ **Support:** direct evidence. **Confidence:** high.

> “Argilla can be used for collecting human feedback for a wide variety of AI projects like traditional NLP (text classification, NER, etc.), LLMs (RAG, preference tuning, etc.), or multimodal models”

**c22.** Prodigy’s store is a named **dataset** in Prodigy’s database; humans accept/reject tasks; export is `db-out` JSONL. **Source:** https://prodi.gy/docs **Support:** direct evidence. **Confidence:** high.

> “**dataset** A named collection of annotated tasks. A new dataset is usually created for each project or experiment. The data can be exported or used to train a model later on.”

> “The `db-out` command takes the name of a dataset and lets you export its contents to a file.”

**c23.** MLflow’s human “reading” on a run is the system tag `mlflow.note.content`, shown in a Notes section — a single note tag, not a comment thread. **Source:** https://mlflow.org/docs/latest/ml/tracking/ **Support:** direct evidence. **Confidence:** high.

> “A system tag `mlflow.note.content` can be used to add descriptive note about this run. … The content will be displayed on the run's page under the Notes section.”

**c24.** MLflow documents that tag as the way to “document experiment insights, hypotheses, or results directly in the MLflow UI.” **Source:** https://mlflow.org/docs/latest/ml/tracking/tracking-api/ **Support:** direct evidence. **Confidence:** high.

> “Use `mlflow.note.content` to document experiment insights, hypotheses, or results directly in the MLflow UI. This tag appears in a dedicated Notes section on the run page.”

**c25.** W&B `wandb.init()` accepts a “detailed description of the run, similar to a commit message in Git” (parameter name stripped in the fetched HTML). **Source:** https://docs.wandb.ai/ref/python/init **Support:** direct evidence (description text); **inference:** this is W&B’s run-notes field, commonly called `notes` in older community posts — **not confirmed by the fetched param name**. **Confidence:** medium.

> “A detailed description of the run, similar to a commit message in Git. Use this argument to capture any context or details that may help you recall the purpose or setup of this run in the future.”

**c26.** Aim UI documents tagging, archive/delete, and explorers — not a run discussion/comment API. **Source:** https://aimstack.readthedocs.io/en/latest/ui/overview.html **Support:** direct evidence (absence of a comment API on the overview). **Confidence:** medium.

> “Besides these, Aim UI also allows to tag the runs, delete/archive them and save Explorers state to share with the team.”

**c27.** TensorBoard’s documented job is metrics/graphs/embeddings, not attaching interpretation comments. **Source:** https://www.tensorflow.org/tensorboard/get_started **Support:** direct evidence. **Confidence:** high.

> “It enables tracking experiment metrics like loss and accuracy, visualizing the model graph, projecting embeddings to a lower dimensional space, and much more.”

**c28.** Beads has **no first-party web UI** in the introduction; comments are a CLI on the Dolt store. **Source:** https://beads.gascity.com/ ; https://beads.gascity.com/cli-reference/comments **Support:** direct evidence. **Confidence:** high.

> “Beads (`bd`) is a Dolt-powered issue tracker designed for AI-supervised coding workflows.”

> “Add a comment” / `bd comments add bd-123 “This is a comment”`

**c29.** Beads owner docs tell UI authors to use the `bd` CLI, not `.beads/issues.jsonl`. **Source:** https://beads.gascity.com/community-tools **Support:** direct evidence. **Confidence:** high.

> “Beads uses a Dolt SQL database for storage. Tools should use the `bd` CLI (`bd list --json`, etc.) to access data. Tools that read the old `.beads/issues.jsonl` format directly are not compatible with current versions.”

**c30.** Official Beads “Web UIs” are **community** tools; `bd-board` “writes disabled unless explicitly enabled.” **Source:** https://beads.gascity.com/community-tools **Support:** direct evidence. **Confidence:** high.

> “A curated list of community-built UIs, extensions, and integrations for Beads.”

> “**bd-board** — Local-first web dashboard … Uses the `bd` CLI for Dolt compatibility, with writes disabled unless explicitly enabled.”

**c31.** Beads first-party human-reply command writes a **comment** then closes: `bd human respond`. **Source:** https://beads.gascity.com/cli-reference/human **Support:** direct evidence. **Confidence:** high.

> “Respond to a human-needed bead by adding a comment and closing it. The response is added as a comment and the issue is closed with reason “Responded”.”

**c32.** Beads distinguishes **comments** from **notes**: `bd note` appends the issue notes field (`bd update --append-notes`). **Source:** https://beads.gascity.com/cli-reference/comment ; https://beads.gascity.com/cli-reference/note **Support:** direct evidence. **Confidence:** high.

> “Add a comment to an issue. Shorthand for ‘bd comments add <id> “text”’.”

> “Append a note to an issue’s notes field. Shorthand for ‘bd update <id> —append-notes “text”’.”

**c33.** Beads **human gates** wait for `bd gate resolve` (not a comment box). **Source:** https://beads.gascity.com/workflows/gates **Support:** direct evidence. **Confidence:** high.

> “`human` — a person’s decision — `bd gate resolve` only”

> “keep `human` gates for the decisions that should never auto-close.”

**c34.** Linear’s public GraphQL API is the **same API Linear’s own apps use**; mutations are observed in real time; webhooks include Comments. **Source:** https://linear.app/docs/api-and-webhooks **Support:** direct evidence. **Confidence:** high.

> “Linear’s public API is built using GraphQL. It’s the same API we use internally for developing our applications.”

> “Any mutations you make via the API are observed in real-time by all clients.”

> “Our webhooks support data change events for Issues, Comments, …”

**c35.** Linear’s agent model: agents “create and reply to comments”; a delegated Agent Session webhook contains “the relevant issue, comment, and context.” **Source:** https://linear.app/developers/agents **Support:** direct evidence. **Confidence:** high.

> “Agents behave similar to other users in a workspace. They can be @mentioned, delegated issues through assignment, create and reply to comments, collaborate on projects and documents, etc.”

> “This triggers a `created` AgentSessionEvent webhook containing an `agentSession` object with the relevant issue, comment, and context.”

**c36.** CopilotKit HITL is either a **frontend tool result** (`useHumanInTheLoop` → `respond`) or a **LangGraph interrupt** (`useInterrupt`). **Source:** https://docs.copilotkit.ai/coagents/human-in-the-loop **Support:** direct evidence. **Confidence:** high.

> “`useHumanInTheLoop` — The **LLM**, by calling a registered client-side tool — A frontend-only tool description”

> “`useInterrupt` — The **graph**, by calling `interrupt(...)` during a node — A server-side `interrupt()` call in your LangGraph agent”

**c37.** assistant-ui’s LangGraph runtime treats **graph state** as source of truth and supports interrupts. **Source:** https://www.assistant-ui.com/docs/runtimes/langgraph/overview **Support:** direct evidence. **Confidence:** high.

> “Graph state is the source of truth; the runtime renders messages from `state.values.messages` and submits user input back to the graph.”

> “exposing the full LangGraph Cloud feature set in assistant-ui: streaming, subgraph events, UI messages, message metadata, interrupts, and end-to-end cancellation.”

**c38.** Open WebUI’s agent integration is an **OpenAI-compatible chat frontend**; architecture is message → agent API → streamed reply. **Source:** https://docs.openwebui.com/getting-started/quick-start/connect-an-agent/ **Support:** direct evidence. **Confidence:** high.

> “Use Open WebUI as the chat frontend for autonomous AI agents.”

> “1. You type a message in Open WebUI 2. Open WebUI sends it to the agent's API server (just like it would to OpenAI)”

**c39.** Open WebUI Notes attach to **chats**, and models may update notes — a second store from beads comments. **Source:** https://docs.openwebui.com/features/ **Support:** direct evidence. **Confidence:** high.

> “attach notes to any chat for precise context injection”

> “Models can search, read, and update notes autonomously”

**c40.** HumanLayer is a first-party multiplayer coding-agent product; owner FAQ says comments/decisions feed agents (not a beads overlay). **Source:** https://www.humanlayer.dev/ **Support:** direct evidence. **Confidence:** high.

> “In HumanLayer, comments and decisions feed directly back to the agents, so your design docs live in the IDE, directly integrated with the implementation.”

**c41.** HumanLayer docs describe artifact comments, collaborative diff review, and multiplayer interrupt/approvals. **Source:** https://docs.humanlayer.com/release-notes **Support:** direct evidence. **Confidence:** high.

> “Comment cards in artifact review now show consistent jump-to-anchor and resolve controls.”

> “Share a running session with teammates for a set time so they can prompt, interrupt, and resolve approvals”

**c42.** Pattern (a) — UI writes the tracker API directly — is what Linear states (“same API we use internally”) and what Beads tells community UIs (`bd` CLI). **Sources:** https://linear.app/docs/api-and-webhooks ; https://beads.gascity.com/community-tools **Support:** direct evidence. **Confidence:** high.

**c43.** Pattern (b) — UI writes a queue/export the agent (or training loop) drains — is Label Studio/Argilla/Prodigy export, CrewAI `HumanFeedbackPending`, and AG2’s `my_approval_queue` example. **Sources:** https://labelstud.io/guide/export.html ; https://docs.argilla.io/latest/reference/argilla/records/records/ ; https://prodi.gy/docs ; https://docs.crewai.com/en/learn/human-feedback-in-flows ; https://docs.ag2.ai/docs/user-guide/context/human_in_the_loop/ **Support:** interpretation of those owner models together. **Confidence:** high for each product’s store; medium that they form one named “pattern.”

**c44.** Pattern (c) — UI is a HITL interrupt inside a live run — is LangGraph/LangChain/Studio/CopilotKit/assistant-ui/CrewAI `@human_feedback`/AG2 `context.input()`. **Sources:** c1–c15, c36–c37. **Support:** interpretation. **Confidence:** high.

## What this is not

- **Not “review in chat, then ask an AI to `bd comment`.”** Every owner that has a first-party HITL path either (c) resumes a paused run with the typed value, or (a) writes the product’s own API. None of the fetched owner docs describe pasting a review into an LLM chat as the comment ingestion path.
- **Not a second source of truth.** LangGraph: checkpoint is the run’s store. Linear: GraphQL comments **are** Linear. Beads owner: Dolt via `bd`, not jsonl overlays. Label Studio/Argilla/Prodigy: **their** dataset is the SoR for labels — using them beside beads **would** be a second store unless an exporter wrote `bd comments`.
- **Not experiment-tracker discussion threads as a substitute for beads comments.** MLflow documents one `mlflow.note.content` tag; Aim documents tags; TensorBoard documents scalars/graphs; W&B documents a git-commit-like run description. None of the fetched experiment-UI pages describe a comment thread an agent drains into an issue tracker.
- **Not DVC Studio comments** — owner doc URLs 404’d; no claim.
- **Not OpenAI Agents SDK / Anthropic interrupt internals** — owner pages could not be fetched (see Failed fetches).

## Contradictions

- **HumanLayer product shape vs older HITL-API reputation.** Current owner site/docs present a **coding-agent IDE/cloud** with artifact comments (c40–c41). Third-party Product Hunt/HN blurbs still describe an “API and SDK that lets AI agents contact humans” — those are **not** used as evidence here. No contradiction inside first-party pages fetched.
- **Beads notes vs comments.** Owner CLI splits them (`bd note` vs `bd comment`) (c32). A dashboard that wrote notes instead of comments would miss beads-dag’s “comments hold history” rule. Not a vendor contradiction; an operator-fit trap.
- **CrewAI HITL UX.** Task docs: prompt before final answer (c12). Flow docs: decorator + console or async provider (c11). Enterprise: email-first (c13). Same product, three surfaces.
- **source_check vs fetch.** Automated `source_check` on LangGraph interrupt/checkpoint/`Command(resume=...)` returned **unclear**; the fetched interrupts page quotes the same facts (c1–c3). Treat the fetch quotes as evidence, not the checker.

## Missing evidence

- OpenAI Agents SDK: how interruptions/`approval_item` are stored (checkpoint vs in-memory run vs chat). URL exists; **body not fetched**.
- Anthropic interrupt/approval storage. **Fetch blocked.**
- AutoGen 0.2 HITL storage. **Fetch blocked.**
- GitHub Issues comments as SoR vs overlay (REST/GraphQL docs.github.com **blocked**). Linear’s “same API as our apps” is **not** a GitHub quote.
- DVC Studio / DVC VS Code: whether a human can attach a reading/interpretation comment. Studio doc URLs **404**.
- Label Studio: whether the comments box is included in JSON export (export page’s JSON property list did not mention `comment` in the extracted matches).
- W&B: Python parameter name for the commit-message-like description; discussion/comment threads on runs.
- Aim: comment API beyond tags.
- langchain-ai/agent-inbox README (github.com **blocked**). Search hit the repo; no quoted model.
- Whether any Beads **official** web UI ships in `bd` itself beyond `bd human` CLI.

## Failed fetches

Tried proxy `http://127.0.0.1:23379` where noted. Failures:

| URL | Error |
|---|---|
| https://openai.github.io/openai-agents-python/human_in_the_loop/ | Blocked internal address 198.18.1.142 (with and without proxy) |
| https://openai.github.io/openai-agents-python/ | Same SSRF block |
| https://openai.github.io/openai-agents-js/guides/human-in-the-loop/ | Same SSRF block |
| https://developers.openai.com/api/docs/guides/agents | Blocked 198.18.0.12 |
| https://platform.openai.com/docs/guides/agents | Blocked 198.18.0.124 |
| https://microsoft.github.io/autogen/0.2/docs/tutorial/human-in-the-loop/ | Blocked 198.18.1.30 |
| https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview | Blocked 198.18.0.198 |
| https://docs.anthropic.com/en/docs/build-with-claude/tool-use | Blocked 198.18.0.198 |
| https://code.claude.com/docs/en/agent-sdk/agent-loop | Blocked 198.18.0.240 |
| https://docs.github.com/en/rest/issues/comments | Blocked 198.18.1.1 |
| https://github.com/humanlayer/humanlayer | Blocked 198.18.0.7 |
| https://docs.ag2.ai/latest/docs/user-guide/advanced-concepts/human-in-the-loop/ | HTTP 404 (working page: `/docs/user-guide/context/human_in_the_loop/`) |
| https://docs.ag2.ai/docs/user-guide/advanced-concepts/human-in-the-loop | HTTP 404 |
| https://labelstud.io/guide/comments.html | HTTP 404 |
| https://dvc.org/doc/studio | HTTP 404 |
| https://dvc.org/doc/user-guide/experiment-management/visualize-experiments | HTTP 404 |
| https://docs.iterative.ai/studio | HTTP 404 |
| https://studio.iterative.ai/docs | HTTP 404 |
| https://docs.langchain.com/langsmith/agent-chat-ui | HTTP 404 |
| https://mlflow.org/docs/latest/tracking/tracking-api.html | Readable extract failed (content later fetched at `/docs/latest/ml/tracking/`) |

Search provider failures (not page fetches): Exa 429; SearXNG base URL missing; DuckDuckGo fetch failed; Jina key missing.

## Sources

**Kept**

- Interrupts — LangChain (https://docs.langchain.com/oss/python/langgraph/interrupts) — HITL storage + resume
- Persistence — LangChain (https://docs.langchain.com/oss/python/langgraph/persistence) — checkpointer vs store
- LangSmith Studio (https://docs.langchain.com/langsmith/studio) — first-party UI
- How to use Studio (https://docs.langchain.com/langsmith/use-studio) — interrupt/fork UX
- HITL server API (https://docs.langchain.com/langsmith/add-human-in-the-loop)
- LangChain HITL middleware (https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- LangChain interrupt blog (https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt)
- Deep Agents HITL (https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)
- CrewAI human feedback in flows (https://docs.crewai.com/en/learn/human-feedback-in-flows)
- CrewAI human input on execution (https://docs.crewai.com/en/learn/human-input-on-execution)
- CrewAI Enterprise HITL (https://docs.crewai.com/en/enterprise/guides/human-in-the-loop)
- AG2 HITL (https://docs.ag2.ai/docs/user-guide/context/human_in_the_loop/)
- Label Studio labeling / export / LLM grading
- Argilla Record + v1 Feedback dataset + Argilla home
- Prodigy docs (https://prodi.gy/docs)
- MLflow tracking + tracking API
- W&B init (https://docs.wandb.ai/ref/python/init)
- Aim UI overview
- TensorBoard get started
- Beads intro, community-tools, comments, comment, human, note, gates
- Linear API and webhooks; Linear Agents
- CopilotKit HITL
- assistant-ui LangGraph runtime
- Open WebUI connect-an-agent + features
- HumanLayer marketing FAQ + docs hub + release notes

**Rejected/deprioritized**

- Medium/DEV/Reddit HITL explainers — not owners
- Pushary / Team400 OpenAI HITL guides — not OpenAI
- Stack Overflow MLflow notes — superseded by MLflow docs
- W&B community “Description field” thread — not ref docs
- Product Hunt / HN HumanLayer API blurbs — not current owner docs
- beads-ui / beads-dashboard GitHub READMEs — github.com fetch blocked; listed only via Beads community-tools
- AutoGen 0.2 tutorial — fetch blocked
- OpenAI Agents SDK HITL page — fetch blocked

## Next steps

1. Fetch OpenAI Agents SDK HITL + GitHub issue-comments + Anthropic agent-loop after SSRF/`198.18` allowlisting (those three close the remaining Q1/Q4 holes).
2. If the operator UI must not be a live graph interrupt, the only **owner-stated** “UI is just a better editor of an existing store” pattern in this set is Linear’s GraphQL (same API as the apps) and Beads’ `bd` CLI (including `bd human respond` and `bd comments add`).
3. Do not treat Label Studio/Argilla/Prodigy as the beads comment surface without an exporter — their SoR is the annotation dataset.

## Synthesis (not a source claim)

If the store already exists (`bd comments`) and the UI must not become a second SoR, owner docs that match are **pattern (a)**: a small HTML editor that calls `bd comments add` / `bd human respond` (Beads community UIs are instructed to use `bd`; Linear does the analogue with GraphQL). Pattern (c) (LangGraph/CopilotKit/Studio) stores the human text in a **run checkpoint**, which would be a second SoR unless a node then writes `bd comment`. Pattern (b) (Label Studio/Argilla/Prodigy/CrewAI pending) is a review queue, also a second SoR unless drained into beads.
