# Full spectrum: where the flow still hand-rolls something already solved

Two independent researchers (`full-spectrum-grok.md`, `full-spectrum-deepseek.md`), one brief, no
repo changes. This note is the parent's synthesis: what they agreed on, where they disagreed, and —
separately marked — what was verified here by running the thing rather than trusting a README.

The brief was scoped by the frozen constraints (ADR-0001/0004/0006/0007/0008): beads stays the
graph and the frontier, three executors stay one per domain, the operator surface stays a view, and
`tools/` stays out of the pack. Whatever a Target copies in must run under bun with nothing the
runtime cannot install.

## 1. Where they agree

| Layer | Both verdicts | Why |
|---|---|---|
| Store / graph / frontier | leave it | `bd ready`, derived blocked-ness, atomic `--claim`, hash ids. Our additions are *policy* the store cannot hold. |
| Executor / DAG runner | leave Archon | Every runner in the catalogue is either the wrong primitive (task scheduler: Airflow, Argo, Prefect, Dagster, Kestra, Windmill, n8n, Dify, Flowise, Step Functions) or a service we would install on every Target (Temporal, Inngest, Restate, LangGraph's checkpointer). |
| Merge before stamp | leave it, nobody sells it | No runner, tracker, or worktree tool expresses "closed means in Main, and a run killed mid-flight is repaired from git". |
| Comments | one store, `bd comment` | Remark42/Isso/Cusdis/giscus/Liveblocks all bring a database: a second store, forbidden. |
| Multiplayer | adopt later, with a written trigger | Beads' own answer is server mode (`bd init --server`, `dolt sql-server`). Do it when a second human writes, not before. |
| Sandboxing | adopt later, and it is the one real gap | Today a run is a git worktree on the same filesystem as `~/.ssh`. |
| Layout positions | must not enter the store | ADR-0007; and nobody should pull a CRDT in to hold 40 x/y pairs. |
| tldraw as the canvas | never | License forbids Production Environments without a commercial key. Both found this independently. |
| Docs / ADRs / skills | leave it | Eight ADRs carrying rejected alternatives are worth more than MADR's template. |

Both also independently rejected the tempting neighbour: **Gas Town** (beads' own sibling,
`steveyegge/gastown`) already contains a Bors-style merge-queue Refinery, a capacity Scheduler, and
worktree hooks — but adopting it means adopting a whole second flow, which the constraints forbid.
Deepseek's framing is the useful one: **no as a dependency, yes as a design source** — the bisecting
merge queue is the idea to steal if `concurrency > 1` merges ever start colliding.

## 2. Where they disagree

### 2a. The shadcn registry — "adopt now, it closes seven tickets" vs "leave kit.tsx"

Deepseek: the registry ships Command, Toast, Dialog, Data Table, Sidebar, Message, Bubble as code you
copy in, so `ui/kit.tsx` is a re-implementation of a to-do list.

Grok: pulling Radix would fight the served page — a portalled component renders nothing until it is
open, and the page tests read the served HTML.

**Verified here, and it splits the registry rather than the question.** Fetched the registry items
and read their dependencies:

| registry item | dependencies | adoptable? |
|---|---|---|
| `message` | `cn` | **yes** — plain markup, no Radix |
| `bubble` | `cn`, `radix-ui` | **yes** — Radix `Slot` for `asChild` renders inline, not portalled |
| `data-table` | `cn` + `@tanstack/react-table` | **yes** — a table, no portal |
| `dialog` | `cn`, `radix-ui` | **no** — portal, and `pageCreateStaysInDomWhileClosed` exists because of it |
| `command` | `cn`, `cmdk`, registryDependency `dialog` | **partly** — ship pairs it with the Radix dialog; we already use plain `Command` inside our own non-portal Dialog |

So the honest answer is neither report's: **the registry is adoptable for the parts that are plain
markup and links.** For the portal primitives, our hand-rolled Dialog is not laziness — it is the only
shape that keeps the create form in the served HTML, which the page contract asserts. Deepseek's
"seven tickets" is also wrong on the count: of operator-ui/11–16, the list, palette, toast, icons,
markdown, and dialog tickets are all already closed and merged.

### 2b. `worktrunk` — "spike it this week" vs "no"

Deepseek: `wt switch/list/merge/hook` is precisely worktrees-as-branches for parallel agents, MIT OR
Apache-2.0, Rust single binary, and it would replace `worktree.ts`'s allocation/resume half while our
merge contract stays ours.

Grok: it is checkout UX, not settle.

**Verified against our own constraint, which decides it: no.** A Target that must install
`worktrunk` violates "nothing the runtime cannot install", and the value is bounded — the pack's
worktree code is 131 lines, and deepseek itself lists the parts `wt` cannot take (merge-before-stamp,
`refs/beads-dag/reviewed`, the conflict turn inside the same execution, repair-from-git). Replacing
an afternoon-sized module with a required binary to save it is a bad trade. Grok's verdict stands,
for a reason neither stated: the constraint, not the tool's quality.

### 2c. Layout persistence — "adopt now, positions die on reload" vs "leave it"

Deepseek: client-local positions that vanish on reload is solved by `zustand/middleware persist` or
`idb-keyval` in about twenty lines.

Grok: leave it; a collaborative layout is a second graph.

**Deepseek is right about the facts and neither is wrong about the design.** The reload path does lose
drags: `Graph.tsx` keeps them in a `dragged` ref that survives a react-query refetch but not a page
load. Persisting them *per browser* puts nothing in the store, so ADR-0007 is untouched — "positions
stay in the view" is not "positions must be forgotten". This is a small, honest gap, not a second
graph. Worth a ticket, low priority.

## 3. What was verified here by running it

These are the findings that neither report could have reached by reading, and two of them change the
ranking.

### 3a. `bd 1.2.2` — the installed binary — already ships `worktree`, `gate`, `merge-slot`, `swarm`

Not a newer version, not a fork: the pinned binary. Deepseek's table listed them as "upstream's
neighbours"; grok missed them entirely. Running them:

- `bd worktree create/list/remove/info` — "Worktrees automatically share the same beads database as
  the main repository via git common directory discovery — no redirect file needed". `bd worktree
  create <name> [--branch=<branch>]` creates at `./<name>` and gitignores it.
- `bd merge-slot create/check/acquire/release` — an exclusive primitive in the *store*:
  `status=open|in_progress`, `metadata.holder`, priority-ordered `metadata.waiters`. Its own help
  text calls it a fix for "monkey knife fights" between parallel conflict resolvers.
- `bd gate create/list/check/resolve/add-waiter` — async wait conditions of type `human`, `timer`,
  `gh:run`, `gh:pr`, `bead`.
- `bd swarm create/list/status/validate` — "a swarm is a structured body of work defined by an epic
  and its children, with dependencies forming a DAG".

**Verdict: still leave them, but now for the right reasons, and with one of them refuted on evidence.**

- `bd merge-slot` is the closest neighbour to our Target run lock, and it is **strictly worse for our
  case**: its holder is a name in issue metadata, not a pid (`scripts/lock.ts`: "file in the Target's
  git directory, created exclusively and holding the holder's pid, so every process draining that
  Target agrees on where it is; a pid that is no longer alive is a killed run's leftover"). A crashed
  holder leaves a merge slot wedged with nothing to steal. That is not a preference — it is a
  difference we have exercised twice in this session alone, both times by stealing a dead run's lock.
- `bd worktree` cannot name a worktree from the issue's handle/slug, which is the contract the pack's
  tests assert, and its naming is ours to fail a node on.
- `bd gate` means "park a step until the world catches up" (human, timer, GitHub). Our gate is a
  *label* meaning "an operator put this in the frontier". Different concepts wearing one word.
- `bd swarm validate` is a human's report over an epic; the drain asks `bd ready` per cycle and
  rebuilds the frontier live, which is fresher by construction.

Also verified and worth taking for free: the global `--readonly` ("block write operations (for worker
sandboxes)") and `--sandbox` ("disables Dolt auto-push") flags exist, next to the `BD_READONLY` the
pack already sets.

### 3b. `bd comment --actor` already makes a human the author

Both reports said the author is "a bd-stamped string" and left identity as an open gap. Verified in a
throwaway store (`bd init` in `/tmp`), comments read back by `bd show --json --include-comments`:

```
'alice' | 'body from alice'        # bd comment <id> --stdin --actor alice
'bob'   | 'body from bob'          # --actor bob
'carol' | 'body from env'          # BEADS_ACTOR=carol
```

`--actor` is a *global* flag and it is the comment author. So the cheapest finding of the round:
**`operator-ui/10` (forum comments, `flow-sgw`) is blocked on a decision we were about to over-engineer**
— no Identity product, no session, no second store. The surface asks for a name at the door and passes
`--actor`. Threading is genuinely absent in 1.2.2 (`bd comment` takes only `--file`/`--stdin`, no
parent), so a thread is a *view* over a flat list — which is what deepseek said, and grok's
`--thread` belongs to beads' separate *message* issue type, not to comments.

### 3c. The client bundle was shipping React's development build

Not in either report, and it is the largest single lever measured this round. `react-dom`'s exports
map resolves `react-dom-client.development.js` unless the build defines `NODE_ENV`; the metafile showed
it as **35% of all source bytes**. Measured, same code, one `define`:

| | raw | gzip |
|---|---|---|
| before | 1,103,517 | 335,971 |
| after `NODE_ENV=production` | **840,710** | **263,095** |

−24% raw, −22% gzip, and React's dev-only warning machinery is gone (`Each child in a list`: 1 → 0).
Fixed in `e69044f`.

The rest of deepseek's bundle list still stands on top of that: the asset goes out with no
`Content-Encoding` (node:http does not compress — gzip alone is −69% on the wire), the URL is not
content-hashed so it revalidates instead of being `immutable`, and everything shares one bundle so
first paint pays for React Flow, d3-dag, and react-markdown together. `Bun.build { splitting: true }`
plus a lazy detail panel is the split; `Bun.serve` would replace our hand-written node:http request
parsing, but that is a swap of a working thing and is the weakest of the four.

### 3d. Grok's own caveat, reproduced: `.scratch/research-flow/` was not in the child's tree

Both children reported GitHub unreachable (`198.18.0.0/15` fake-IP, blocked by the fetch guard) and
worked from jsDelivr mirrors and vendor docs, with the proxy available as a fallback. Grok additionally
reported `.scratch/research-flow/` as ENOENT, so the prior surveys in this directory were not re-read
by either child. Treat their "community tool" sections as fresh research, not as a delta against the
earlier notes (`bottom-layer-assembly.md`, `assembly-grok.md`, `assembly-deepseek.md`).

## 4. The ranked list (verified, before anything is ticketed)

| # | Thing | Cost | Why now |
|---|---|---|---|
| 1 | `bd comment --actor` at the operator door | hours | Verified; unblocks `operator-ui/10` without a store, a session, or an identity product |
| 2 | gzip the two assets, hash the paths | hours | −69% on the wire, then `immutable` kills the revalidate round trip |
| 3 | Split the client, lazy the detail panel | a day | First paint stops paying for React Flow, d3-dag, react-markdown |
| 4 | Registry parts: `message`, `bubble`, `data-table` | hours | Plain markup, no portal, so the SSR contract survives; keep our Dialog |
| 5 | Persist layout per browser (`idb-keyval`) | hours | Positions die on reload today; the store is not involved, so ADR-0007 holds |
| 6 | `skills-ref` in `tools/flow.ts check` | minutes | Catches a skill that installs fine and violates the spec; the byte-compare cannot |
| 7 | An ADR: *when* the flow goes multi-writer | minutes | Server mode + `better-auth` + SSE-first, so the next session does not rediscover it |
| 8 | One JSONL run-event stream, and the run id on every stderr line | a day | Both reports want it; grok says now, deepseek says when a second consumer exists |
| 9 | `srt` (npm, TS library) around the worker's bash tool | an afternoon | The one layer where a mainstream tool does something we never started; needs bubblewrap |
| 10 | Parked until pain | — | Restate (only if lost work on a killed turn becomes the top complaint), Mastra, container-use, microsandbox, Yjs, OTel collector, Gas Town's merge queue, any generic scheduler, `worktrunk` |

Items 1–3 are the direct continuation of the client work already on Main. Items 4–7 are cheap and
independent. Items 8–9 want a trigger written down rather than code.

## 5. Reinvention adjudicated: what our own dependencies already ship

§1–§4 judge the *candidates*. This section judges **us**: places where the pack or the operator surface
reimplements something a dependency we already install provides. The method that found them is not
reading READMEs — it is running `bd help`, `bd <cmd> --help`, `archon --help` and the commands
themselves. That is why neither research report contains this section: both children read documentation,
and documentation does not list a binary's subcommands.

### 5a. The rows, with the verdict that survived being run

| We hand-roll | The dependency already has | Verdict | Evidence |
|---|---|---|---|
| `config.ts`'s YAML subset reader (`parseConfigText`, `stripComment`, `parseScalar` — ~90 lines and five documented refusals) | **`Bun.YAML.parse`**, in the runtime the pack already requires | **adopt** — beads-dag/37 | `Bun.YAML.parse` on `.scratch/beads-dag.yaml` returns exactly the four keys our reader returns |
| `reading:` written and cleared as a bare label (`store.ts` ↔ `clearUnreadMarker`) | **`bd set-state <id> dim=value --reason`** / **`bd state <id> dim`** | **adopt** — beads-dag/38 | Ran on this pin (1.2.2): `set-state … reading=some/path` → `labels: ['reading:some/path']`, an event bead as source of truth, and `bd state … reading` → `some/path` |
| The five triage labels, one replacing the rest (hand-written in `triage-labels.ts` / `actions.ts`) | `bd set-state` again | **no** | They are bare words (`needs-triage`, not `triage:needs-triage`). Dimensionising them renames the vocabulary `docs/agents/triage-labels.md` documents and `bd ready`-shaped tooling reads |
| `lock.ts` + `run-lock.ts` (159 + 180 lines) | **`bd merge-slot`** | **no, and this is the one we got right** | `bd merge-slot --help`: holder is `metadata.holder`, a *name*. No pid, so a crashed holder wedges the slot with nothing to steal. Our file lock is `pid`-first by design (`lock.ts`, "a pid that is no longer alive is a killed run's leftover") — and that path has been exercised twice in one session |
| The gate label (an operator put this in the frontier) | **`bd gate`** | **no** | `bd gate --help`: types are `human`, `timer`, `gh:run`, `gh:pr`, `bead` — "park a step until the world catches up". A different concept wearing the same word |
| `naming.ts` + `worktree.ts` (98 + 131 lines) | **`bd worktree create/list/remove/info`** | **no** | It creates at `./<name>`; it cannot derive a name from the issue's `handle`/`slug`, which is the contract the pack's tests assert |
| `filterOverview` / `matchesFilter` | **`bd query 'labels=… AND status=…'`** | **no** | The filter runs over an in-memory snapshot the canvas, the list and the detail pane all share; `bd query` would be a second round trip for the same data |
| `graph-view.ts`'s layering (d3-dag) | **`bd graph --box/--compact/--dot/--html`** | **no for rendering** | It *does* compute the same layering ("Layer 0 / leftmost = no dependencies"), but the canvas needs coordinates in TS for React Flow; `bd graph` renders elsewhere |
| `worker-env.ts`: the `BD_READONLY` rule | `bd --readonly` / `bd --sandbox` | **refuted — nothing to adopt** | `--readonly` is the CLI spelling of the env var already set (verified: a write under it answers `operation 'create' is not allowed in read-only mode`), and `--sandbox` only stops Dolt auto-push, which is off by default |
| Worktree and branch teardown | **`archon isolation list/cleanup/complete`** | **refuted — unavailable to us** | In a scratch repo `archon complete <branch>` answered `Not found: <branch> (no active isolation environment)` and did nothing; Archon's registry is empty for this Target because the pack sets `worktree.enabled: false`. The removal also already exists in the pack: `main-writes.ts` runs `git worktree prune` then `worktree remove --force` as the merge's other half |
| One place the overlay learns a run exists | **`archon workflow get <run-id>`** | **no** | The overlay's other sources are *pack-written* facts (`run-lock.json`, `attempted-ids.json`, the reports), which no Archon command knows about. `workflow status --json` — already used — is the process list |
| Repairing a killed run from git | **`archon workflow resume <run-id>`** | **no, but recorded as a choice** | "resume reuses its recorded working path/worktree" is real. Our drain is deliberately *re-runnable*, not *resumable*: the unit is small and Main is the truth. If it is ever worth trying, it is a spike around one role, not the loop |

### 5b. What the exercise actually cost

Three of the rows above are refutations of claims made in conversation before they were checked
(worker flags, worktree teardown, the overlay's use of `workflow get`). Every refutation has the same
shape: the command exists and is named plausibly, and the *semantics* do not match what we need — a
gate that parks on an external fact, a slot with no pid, a completion that only knows branches Archon
made itself. A name match is not a wheel match.

The counterweight is 5a's first two rows, which are genuine: a hand-rolled YAML reader under a runtime
that parses YAML, and a hand-maintained label family where the store ships the dimension primitive
including the actor and reason trail.

Where hand-rolling remains correct is unchanged from §4 and from §C of the two reports:
merge-before-stamp and repair-from-git, the three closure meanings, the frontier policy the store
cannot hold, the conflict turn inside one execution with the gate re-run afterwards, and the pack as
bun scripts with no service, no database and no queue.

The one process lesson worth keeping: this flow has an unusually low wheel count for its size, and the
reason is not foresight — it is that nobody had read `bd help` and `archon --help` as an interface
until now. Two subagents reading documentation could not have closed that gap.
