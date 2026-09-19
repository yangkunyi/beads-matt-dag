# Issue tracker: Beads

Issues for this repo live in a beads store — the repo's own `.beads/` database, driven by the `bd` CLI.
The issue's prose is a markdown file under `.scratch/`, frozen once published; its identity, status,
edges, labels and comments are the store's. One fact, one home: no state is ever written into a
document.

## Start here

One store, three domains. Anything you might open belongs to one of them, and each domain means
something different by *closed*:

| You have | You open | Type | *Closed* means |
|---|---|---|---|
| a question worth knowing the answer to | a **question ticket** — answered by a reading run, `/grill`, or an experiment | `decision` | the answer is written down; the session closes it on the operator's word |
| an idea — "this might be worth doing", no work agreed | an **idea ticket**; its comment thread is its development | `decision` | it graduated into a ticket in another domain (`relates-to`) or was dropped (`wontfix`) — *Ideas* |
| work to do in the code | a **work ticket** carrying the gate label `ready-for-agent` | `task`, `bug`, … | a drain merged it into Main |
| a question no published material can answer | an **experiment ticket** — the plan, and later its record | `experiment` | the result is recorded — *Experiments* |
| a whole direction, still foggy, more than one session holds | a **map** (git document) plus child **decision** issues, from `/grill` | `decision` | each child's question is answered; the map stays until the destination exists — *Maps* |

**The operator decides what to open; the session types it.** Which skill does a piece of work is
`/ask-loom`'s question — this table only decides *where a thing belongs*.

A session opens by looking at three things:

```bash
bd ready                                          # what can start now — a map bead is a container, not work
bd list -t experiment -s closed -l reading:none   # results nobody has read yet
bd list -t decision -s open -l answer:draft       # questions whose reading landed and await my word
```

Nothing blocks across domains, in either direction: a question waiting on an experiment is not *blocked*
by it — it stays open until the result is read and the answer written in. What crosses is a link, never a
gate (*Closure never crosses domains*).

## Finding the store

- The store is the repo's own — the Target the drain runs against: `.beads/` beside that repository,
  never inherited from a parent directory. A repo with no store is initialised in it (`bd init --prefix
  <name>`) before a drain will open; the drain's preflight refuses one that is missing.
- The binary is resolved in one order, by the drain and by any skill that drives the store: the repo's
  `store:` key in `.scratch/beads-dag.yaml` first, then `bd` on `PATH`.

```yaml
store: /home/me/.local/node-v24.19.0-linux-x64/bin/bd   # optional; unset, bd is looked for on PATH
```

A `store:` that names something that is not an executable file fails the run rather than falling back
to `PATH` — an operator who set it meant it to be used.

## Conventions

- One feature per directory: `.scratch/<feature>/`
- The spec is a git document at `docs/specs/<date>-<slug>.md`, and a map is a git document too.
  Documents never live in the store, and are never issues.
- Implementation issues are one **body file** per issue at `.scratch/<feature>/issues/<NN>-<slug>.md`,
  numbered from `01` — never a single combined tickets file. The issue itself is a bead in the store.
- The body carries the handle and the prose, and nothing about state: **no `Status:` line, no blocker
  list, no comment thread**. State moves in the store, not in the file.
- Comments and conversation history append to the issue in the store (`bd comment`), never to the body.

## Operator surface

The operator UI is a view of the Target's beads graph, not an executor and not a local editor
(ADR-0007). Beads remains the only graph and the only comment store. After a write the view reads the
store again and keeps layout positions. The operator may, without a session: create an issue (type is
the domain; that domain's identity labels go on at create; default triage is `needs-triage`); add or
remove intra-domain `blocks`; add crossing `relates-to` and `discovered-from`; write `bd comment`;
move the five triage labels (gate, brake, `wontfix`); delete an issue that is not `in_progress` and
has no dependents, after confirm (ADR-0008); answer the current grill round on a selected issue
(a tagged write that lands as a store comment). The round is data — numbered questions, choices, a
recommended answer — not markdown; an issue with no round has no round form. Close, `reading:`, and other domain label acts
stay the session's or the orchestrator's (ADR-0006). `bd human respond` is not used: it closes with reason
Responded.

Starting work from the surface starts the domain's existing run, optionally with an allow-list of
issue ids for that run. Beside it a grill control starts `beads-dag-grill` on one selected seed: the
run writes the next round onto that issue as a comment and stops for answers, so the page shows the
round a run wrote and never invents questions of its own. One seed and no more — the surface does not
silently pick one out of a larger selection, and an empty selection or a held Target starts nothing.
Neither launch claims, merges, or stamps `closed`.

## Identity: the two metadata keys

A bead's hash id is its identity in the store; its human-readable identity is metadata:

| Key | Value |
| --- | --- |
| `handle` | `<feature>/<NN>`, e.g. `auth/02` |
| `slug` | the one path segment the names end with |

Every git name is derived from those two keys, by the drain and by a hand-run alike:

```
branch    beads/<feature>/<NN>-<slug>
worktree  worktrees/<feature>-<NN>-<slug>
body      .scratch/<feature>/issues/<NN>-<slug>.md
```

A name is computed, never discovered: nothing scans `worktrees/` for a candidate, and the bead's id
never appears in git. An issue missing either key cannot be named in git, and the drain fails that issue
rather than starting work somewhere unnamable.

## Statuses

Three, all the store's own — one value at a time:

| Status | Who writes it | Meaning |
| --- | --- | --- |
| `open` | `/to-tickets` at publication, or the orchestrator recording a failed attempt | waiting; blocked-ness is a separate, derived fact |
| `in_progress` | the claim | running; out of every frontier until it is released or closed |
| `closed` | the orchestrator, only as `merged <branch>` | the work is in Main |

`BLOCKED` and `READY` are **derived** by the store (blocked is "a blocker is not closed"; ready is
`open` and not blocked) — nothing writes them. `MERGING`, `CONFLICT`, `RESOLVING` and `FAILED` do not
exist: merging and conflict resolution are steps inside a running issue, and a failure is an event, not
a status (below).

## When a skill says "publish to the issue tracker"

Write the body and create the bead:

1. Write the body file at `.scratch/<feature>/issues/<NN>-<slug>.md` — the handle and the prose, no
   state of any kind.
2. Create the bead with both metadata keys and the gate label:

```bash
bd create "<title>" --type task --silent \
  --metadata '{"handle":"<feature>/<NN>","slug":"<slug>"}' \
  --labels ready-for-agent
```

3. One store edge per `Blocked by` entry, with the blocker blocking the dependent:

```bash
bd dep add <blocked-id> <blocker-id>        # default type: blocks
```

Publication writes no initial status: `bd create` opens the issue, and a blocker is an edge rather than
a value, so the store derives readiness by itself. Metadata is written here, at publication, and read
back with `bd show <id> --json` or `bd list --metadata-field handle=<handle> --all --json --limit 0`.

## The frontier and the claim

A drain asks the store what can start **once per `pick` cycle** and takes each cycle's answer whole; the
run loops `pick` until a cycle comes back empty (`[]`):

```bash
bd ready --json --limit 0      # --limit 0 is everything; the store's default cap is 100
```

`bd ready` is the store's own answer — `open`, unblocked, not deferred, not pinned, not hooked — and the
store re-derives it on every read. A `blocks` edge withholds its dependent only while a blocker is not
`closed`, so a blocker closed inside the run releases the dependent into that run's next `pick` cycle,
where the same run can claim it. Holding a dependent back for a later drain takes the brake — the gate
label off the issue ("Labels: the gate and the brake") — because the edge withholds nothing once the
blocker is closed.

On top of that answer a drain applies the three rules the store cannot hold — and applies them itself,
so its exclusion report can name the rule per issue:

- **the non-work types**: an issue of type `decision` (alias `adr` — a question, an idea) or of type
  `experiment` (a plan and its run record) is never work, and never enters a drain;
- **the gate**: an issue without `ready-for-agent` is not the drain's work;
- **this run's attempts**: an issue this run already tried is kept out by the run's own
  `attempted-ids.json`, bookkeeping that lives beside the run and never in the store.

What is left is truncated to the run's `concurrency` and claimed in a single transaction:

```bash
printf 'update <id> status=in_progress\n' | bd batch
```

`bd batch` is all-or-nothing: a claim that fails part-way leaves nothing claimed. The claim is the
status — `in_progress` is what takes an issue out of every other drain's ready answer — and a hand-run
implementer writes the same thing first:

```bash
bd update <id> -s in_progress
```

A drain-launched worker runs with the store in its read-only mode (`BD_READONLY=1`): the store refuses
every write for its whole process tree, a claim included, while reads keep working. Issue state is the
orchestrator's to write.

## Labels: the gate and the brake

The five triage roles are label strings, one role at a time. `ready-for-agent` is the gate: only a
gated issue enters a drain's frontier, and publication applies it. Moving an issue to another role
replaces the gate label:

```bash
bd update <id> --add-label needs-info --remove-label ready-for-agent
```

That move — the **brake** — pulls the issue out of the frontier from every side: fresh work, a retry,
an issue that was eligible before. It is store state, so no drain has to remember it, and `needs-info`
means exactly "waiting on a human answer". `wontfix` is a label, never a closure: the issue stays
`open`, and whatever waits on it stays blocked.

## Closing, and failure

Only the orchestrator closes an implementation issue, and only to mean the work is in Main:

```bash
bd close <id> --reason "merged <branch>"    # only after that branch's merge landed
```

The merge into Main happens first and the `closed` second (**merge before stamp**), so a closure always
has its merge commit behind it, and a reader can check the reason against git. Closing releases
whatever waits on the issue, which is why nothing else may close it and no other reason may be used.

A **failed attempt is an event, not a status**: nothing closes, the reason becomes a comment, and the
issue returns to `open`:

```bash
bd comment <id> "attempt N failed: <reason>"
bd update  <id> -s open
```

Its dependents stay blocked exactly where they were (nothing merged), and the retry channel is the
store's own ready answer: the next drain finds the issue like fresh work. There is no retry command and
no `failed` status. `attempt N` is the ordinal — one plus the failures already on the issue — so the
comments read as a history. A run killed between the merge and the record leaves the issue
`in_progress`; the next open repairs it from **git**, never from the store, writing the same close or
the same failure event.

A comment is also where anything written after publication goes — a triage brief, a later question, an
answer. The body is frozen; the conversation is the store's.

## Closure never crosses domains

Implementation issues and non-work issues are two domains — the inquiry domain's `decision`, the
experiment domain's `experiment` — and a blocking relation between them would let another domain's closure
release implementation work that was never built. So an implementation issue may only wait on another
implementation issue; a non-work issue is reached by changing an issue, not by a blocking relation.
Blocking is not only the `blocks` edge: the `parent-child` relation is blocking too — a child inherits its
parent's blocked-ness — so the drain refuses while an implementation issue's **blocking ancestry**, through
either relation and at any depth, reaches a non-work issue. It names the chain, from the implementation
issue to the non-work issue and naming that issue's own type — at `open`, before anything is claimed or
repaired, **and again at each claim** (`pick`), because a question can be answered — or a result recorded —
while the drain is running, and that close releases its dependent into the very next cycle. So a run can
fail **after** its open: the cycle that reads the chain claims nothing and exits non-zero with no token,
the run stops there, and what its earlier cycles merged stays merged. Removing the crossing edge is the
operator's act, never the drain's — `bd dep remove` removes either relation, and `bd update <id> --parent
""` unparents a child:

```bash
bd dep remove <dependent> <blocker>
```

**Two domains is not the rule — the closure is.** Every issue's `closed` means whatever its own domain
says it means, and a blocking edge between two domains would let one domain's completion release work in
another: a question answered is not built work, and a recorded result is neither. A Target that records
runs adds a third domain — a run's issue closes when its result is recorded — and the rule travels with
it: domains never share a blocking edge, whatever their types are called.

**A type is a domain.** `decision` is the inquiry domain's — every question, idea and wayfinding ticket;
`experiment` is the experiment domain's; everything else is development. Both non-work types are spelled
once, in the pack, so the frontier's exclusion, the repair's skip and the preflight's walk read the same
set and cannot drift. Adding a domain the flow already knows is therefore **one act** for a Target: its
type has to exist in the store, because `bd` refuses a type it does not know at `create` —
`bd config set types.custom experiment` (the setup skill does this beside `bd init`).

A Target that invents a **fourth** domain has two acts, not one: its type exists in the store, **and** the
pack is taught to refuse chains that reach it. Until it is, an issue of the new type blocks like any
other — which means the new type must not enter a blocking chain from either side.

**A link may cross; a gate never does.** What joins two domains carries information, and the flow names
exactly two kinds for it, both non-blocking:

- `bd dep relate <a> <b>` — `relates-to`, a bidirectional see-also, for anything looser than a handoff;
- `bd dep add <derived> <source> --type discovered-from` — the handoff: a work ticket created because a
  result justified it points back at the experiment, and `bd dep list <experiment> --direction=up` then
  answers what came out of it.

One edge per pair: bd refuses a second relation of a different type between the same two issues, so a
handoff is `discovered-from` and a see-also is `relates-to`, never both.

Do not reach for the store's other named kinds. On bd 1.2.2, `validates`, `caused-by`, `tracks`,
`supersedes` and `until` all render in `bd show` as **DEPENDS ON** / **BLOCKS** while holding nothing
back — `bd ready` releases the dependent with the edge standing. A gate that displays as a gate and does
not gate is worse than no edge at all, so the flow uses none of them. Only `blocks` gates; `parent-child`
does not gate by itself, but a child waits on what its parent waits on (also measured), which is why the
drain walks both.

**Inside a domain, blocking is normal.** One experiment waiting on another — a pilot before a full sweep
— is the same closure meaning on both ends, and it is the mechanism a result spawning the next run uses.
Across the boundary, sequence it by hand: the result is read, and the ticket it justifies is created on
the other side afterwards.

**A dependency running backwards is recorded, not gated.** An experiment that needed code says so in its
record's version pointers — the commit it ran against, the lock's hash, the artifact pointers — never
with a `blocks` edge pointing at a work ticket. Nothing in the store blocks an experiment on work: the ban
is absolute in both directions. The reverse case is worth stating because it looks harmless (code in Main
releasing a run) and it is still one domain's closure releasing another domain's issue.

**Both ends carry the handoff.** The experiment's record gains a line under its verdict naming what it fed
(`fed: <handle>`, or nothing yet), and the work ticket's body names the experiment it came from, so
neither reader has to leave the ticket they are on. A handoff found later is a change like any other: a
comment for the history, and the document updated to the current picture.

**Who creates the ticket on the other side.** The operator decides, and the session types it in the same
act, on the operator's word — the rule an idea graduates under (see *Ideas*). The judgement is the
operator's; the keystrokes belong to whoever holds the session. An AFK leg running read-only may not
create one, only nominate it.

## When a skill says "fetch the relevant ticket"

The user normally passes the handle (`auth/02`) or the bead's id; read the body from its derived path,
and read state — status, labels, comments — from the store:

- **By handle**: `bd list --metadata-field handle=<handle> --all --json --limit 0` — a handle names
  exactly one issue, and `--all` finds it at any age.
- **By id**: `bd show <id> --json`.
- **By label**: `bd list --label <role> --status open --json --limit 0` — the open issues carrying a
  triage role label; `bd list --no-labels --status open --json --limit 0` is the untriaged read, the
  open ones carrying none. `--status open` is pinned rather than left to the store's default, which
  hides only `closed` — claimed work is not a triage queue either. `/triage` discovers its buckets
  with these; the drain's frontier is not one of them — `pick` asks for the unfiltered `bd ready` and
  applies the gate rule itself ("The frontier and the claim").
- **Blocked**: `bd blocked --json` — the issues a blocker is holding back, each naming the blockers it
  waits on (`blocked_by`). It takes no `--limit`, so the ready row's `--limit 0` does not carry over.
- **Comments**: `bd comment <id> "<text>"` writes one; `bd comments <id> --json` reads them back.
- **Transitions**: `bd history <id>` is the store's record of every status change. Git carries the
  merge commits and nothing else about state; there is no copy of the transitions in git, so the store's
  backup is not optional.

## Backing the store up

```bash
bd dolt remote add <name> <url>     # once per repo
bd dolt push                        # the pack's one-command backup, run from the repo
```

After a restore or a pull, recompute the store's derived blocked-ness (`bd recompute-blocked`); `bd
ready` trusts the stored flag, and a stale flag silently hides or surfaces work.

### What travels in git, and what does not

`bd init` commits the store's scaffolding — `config.yaml`, `metadata.json`, `interactions.jsonl` (the
field-change audit trail: who claimed, closed or reassigned what) — and bd's own `.beads/.gitignore` keeps
the Dolt database and runtime state out of git. The store's **content** — issues, edges, comments — is
not in git by default, and comments are where the process lives: an idea's development, an experiment's
event stream, a failed attempt's reason. A Target whose record has to survive a clone therefore keeps the
export in git:

```bash
bd config set export.auto true         # refresh .beads/issues.jsonl after writes
bd export -o .beads/issues.jsonl       # and explicitly, before committing
```

Track `.beads/issues.jsonl` (one JSON object per issue, comments and edges included) and leave
`export.git-add` alone: something staged silently is something nobody read. A Dolt remote (`bd dolt
push`, above) is still the full backup; the export is the part a human can diff.

## Where a run's artifacts live

A drain writes views, never state: everything it produces lives in the run's `ARTIFACTS_DIR` (Archon's
per-run directory, e.g. `~/.archon/workspaces/_local/<repo>/artifacts/runs/<run-id>/`), and no node
consults one as the truth.

| Artifact | Holds |
| --- | --- |
| `review-base` | the base of the range it reports on: the position the last review reached (the Target's `refs/beads-dag/reviewed`), or Main's tip when it has none |
| `review.md` | the reviewers' findings for that range |
| `summary.md` | the one report a human reads first |
| `pick-exclusions.json` | the issues the store offered in the run's **last** `pick` cycle and the frontier left out, with the rule that excluded each |
| `attempted-ids.json` | the ids this run claimed — run bookkeeping, never store state |

The store is not committed and neither are the artifacts; the bodies under
`.scratch/<feature>/issues/` are. Nothing in a run's artifacts is ever copied into the store or into
git as a record.

## Experiments: the ticket, the run, and the record

An experiment ticket is a plan for producing a fact, and the plan is what makes it runnable. Its body
carries the **deciding metric and where it will be read from** — one number, read from a named source (a
metrics file, a field of the run store's record); other numbers may be recorded, but the reference is
compared against this one — the **reference** the result will be read against, and the **pin** it is meant
to run on (the data, the code commit). A hypothesis — why it should
come out that way — and a budget are optional; a ticket missing the metric, the reference or the pin is not
an experiment yet.

The reference is a prediction with a threshold, a baseline value, or the explicit word *exploratory* — and
it is written before anything runs, because it is what turns "did it work?" into a reading of the numbers
instead of a story told afterwards. Freezing it is what the claim buys.

**Who does what.** Writing the script, running it, collecting the numbers and writing the record may all
run AFK. The operator appears twice: agreeing the plan, and — later, optionally — saying what the result
means. The executor writes the store for this domain: the close, then `bd set-state <id> reading=none`
for the unread marker — the event bead is the source of truth and `reading:none` is the lookup cache
(ADR-0005: both in the store, so no non-store copy of the fact appears). Git documents are the AFK leg's.

**The record** is one document per ticket at `.scratch/<effort>/results/<NN>-<slug>.md`, holding an
attempts table — one row per run — and closed by these four labelled lines (the document's shape and the
executor's completeness check are the same rule):

- `measured:` what was measured, and which source it was read from;
- `reference:` whether it met the frozen reference — or what was observed, when the ticket said
  *exploratory*;
- `covered:` what the run covered: one seed, one dataset, one config. This is the line that stops a reader
  over-reading the result;
- `reading:` `none yet` — a visible marker that nobody has interpreted the result.

Every change appends a comment (a document holds the picture, comments hold the history), a thin
target-side script registers the run's identity before it starts and collects afterwards, and **the ticket
closes when the record holds all of that — no signature**: `closed` here means the result is recorded,
which is bookkeeping, not a judgement. The operator's judgement is deliberately not a field of the record;
it leaves the ticket as an idea or a work ticket, linked back with `discovered-from` (*Closure never crosses
domains*, above) — and when he speaks later, the session writes the `reading` dimension and the `reading:`
line changes.

**The review surface.** A recorded result nobody has read blocks nothing — no chain waits on it, and the
ticket it might justify does not exist until the operator wants it — so nothing acts on it. It is made
*visible* instead, and the fact lives in **one place**, the store:

- **The marker is the record's own `reading:` line**, plus the store's `reading` dimension stamped with
  the completeness close — `bd set-state <id> reading=none --reason "record closed"`. The event bead is
  the source of truth and `reading:none` is the lookup cache (ADR-0005: both in the store). Read the
  value with `bd state <id> reading`, never by parsing the label. That makes the sweep one query, run at
  the start of a working session beside the frontier:

  ```bash
  bd list -t experiment -s closed -l reading:none
  ```

- **No second copy, anywhere.** A map does not list unread results: one fact lives in one place, and
  whoever wants the list runs the query. A page repeating it is a second thing that can be wrong.

Writing the reading is what clears it, in one act: the `reading:` line takes the operator's words and
names whatever it spawned (`discovered-from`), and the same verb replaces the dimension
(`bd set-state <id> reading=<value> --reason "<the act>"`). The store has no empty dimension, so a clear
is another value, not a label edit. The actor is the session's own. **Unread is not a debt**: a result
the operator decides not to read is written down as such — `reading: declined — <why>` — and clears
exactly the same way.

**One act looks like an amendment and is not**: changing the deciding metric opens a *new* ticket — the old
one closes with `wontfix`, a comment naming its successor and a `relates-to` link — because changing what
counts as success changes the question, and the old numbers stay comparable to the question they were run
for.

**The budget is recorded and never enforced**: nothing refuses to start and nothing kills a run.

**The kind.** An experiment ticket is an issue of type `experiment` — the store has to know the type, and
the drain refuses any blocking chain reaching one, which is what keeps a recorded result from releasing
implementation work. It carries an `experiment` label so the tickets are one filter (`bd list -l
experiment`), and never the gate label: nothing about an experiment ticket is a drain's work.

## Maps

There is no separate wayfinder skill. `/grill` produces the child questions; the **map** is a git
document; the **child issues** are beads of type `decision`.

A **grill run** (`beads-dag-grill`) is the same interview as a run, not a session: it takes one seed
issue id, writes the next round onto that issue as a comment, and stops for answers. A later turn that
sees answers writes the next round or records `Done` (the frontier is empty). Glossary and ADRs land in
git as terms crystallise. Follow-up issues still wait for `/to-tickets` after Done — the run does not
publish development tickets, and it is not an Archon approval gate. The operator surface remains a view;
this run is the griller.

- **Map**: one issue of type `decision` labelled `wayfinder:map`, its Notes / Decisions-so-far / Fog in
  a git document.
- **Child issue**: a bead of type `decision`, labelled `wayfinder:<research|prototype|grilling|task>`,
  with the question as its body file at the handle path — the same body convention as an
  implementation issue. A decision issue never enters a drain.
- **Blocking**: the same `blocks` edges (`bd dep add`); an issue is unblocked when every issue blocking
  it is closed.
- **Frontier**: the `decision`-typed issues in the store's ready answer, minus the claimed ones and minus
  the map itself — the map carries `wayfinder:map` and is a container, not a ticket, so a query that only
  filters the type hands it back. The first by handle (`01` before `02`) is the one to take.
- **Claim**: `bd update <id> -s in_progress`, and record the driving dev with the store's assignee
  field (`bd update <id> --assignee <dev>`) — for a decision issue that assignee is the claim a
  concurrent session reads.
- **Resolve**: `bd comment <id> "<answer>"`, then `bd close <id>`, then a context pointer (gist + link)
  in the map's Decisions-so-far. A decision issue's `closed` means its question is answered, which is
  legitimate only because the two domains never share an edge. When the reading leg was run as a workflow,
  the answer being written is the session's act on the operator's word: the comment he appends or corrects
  the executor's `draft` with is the final answer, and the `answer:draft` label comes off in the same act
  as the close — one action, both jobs, so the label and the record cannot disagree (the reading section
  below names the one command that is both).

**A question needs no source to exist, and no source to be answered.** It can come out of the operator's
head, a discussion, or a reading, and the answer may come from a discussion (*grilling*), from a rough
artifact somebody reacts to (*prototype*), or from **an experiment** — the experiment domain exists for the
question that no published material answers, and manufacturing that fact is what it is for. A reading that
turns up nothing says so out loud, and that is an answer too (*Reading, and the corpus*, below). Because
nothing blocks across domains, a question waiting on an experiment is not *blocked* by it: it stays open
until the result is read and the answer written in — which is what the review surface exists to make
visible.

### Reading, and the corpus

A `research` ticket is the AFK leg: an agent reads, and what it leaves behind is a **document**, never a
store write. It runs with the store in its read-only mode (`BD_READONLY=1`, the mode a drain's worker runs
under), so it cannot comment, close or create: the session that holds the map is the one that records the
answer. The tooling that fetches and writes the documents is a target-side script — not part of the pack,
and `bd` is not involved in it. It is not installed either: it lives in the repo this flow is designed in,
`tools/inquiry/`, and `bun` and `curl` are all it needs — a Target that wants it copies the directory in.
No package, on purpose: copying is the whole distribution story until copying hurts.

Under the effort's own directory (`.scratch/<effort>/`):

| Path | Holds |
| --- | --- |
| `sources/<slug>.md` | one **receipt** per source: line 1 the URL that was fetched, then the id, a title, any aliases, how the text was extracted, a sha256 of the text, and the text itself (a page that sent the fetch elsewhere records both URLs) |
| `notes/<slug>.md` | one **note** per question: the claims the reading supports, each citing a source, a locator and a quote; the file name is the reader's slug, chosen rather than derived |

- **A reading answers with facts, not decisions.** A research ticket asks what a source or a tool
  *holds*; which of those facts the flow keeps is a choice, and that choice is a grilling ticket's job. A
  reading that turns into "and so we should keep X" has drifted into a decision nobody asked it to make —
  the answer it owes is what is true out there, quotable, and what a tool does *not* hold is as much an
  answer as what it does.
- **The executor drafts the answer; the operator owns it.** The reading leg is a workflow, and a session
  starts it from the Target: `archon workflow run beads-dag-inquiry` (the pack's README has the rest of
  the invocation). When it runs, the executor leaves the reader's own last words on the ticket as a
  comment whose first line is marked `draft` and names the note's path and the commit that carries it, and
  stamps the `answer:draft` label in the same act as the status going back to `open`. That draft is the
  reader's, not the answer: the operator appends or corrects it on the ticket, and the session writes the
  final answer and closes. The close and the label are **one store command** —
  `bd update <id> -s closed --remove-label answer:draft` — because bd has no other one that does both jobs:
  `bd close` takes no label flag (`unknown flag: --remove-label`) and `bd batch`'s grammar has no label
  key, so a close followed by a label removal is two acts, and a ticket that keeps `answer:draft` past its
  close has a label stating a fact that is no longer true. The executor never closes the ticket — a
  question's `closed` means the answer is written, which is a session's act on the operator's word — so
  the label is what marks the reading as landed and awaiting him, and the query above is the whole list.
  A run's report names those handles as it ends (`report.md`, the one document a reading run leaves to be
  read), read out of that same query and kept nowhere else.
- **A quote must re-anchor.** A claim enters a note only when its quote is found again in the source that
owns it — the same text, whitespace aside. With a live fetch behind it, re-anchoring fetches again and the
hash is what moves. A claim whose quote cannot be found is refused, and the reader says so out loud rather
than writing it down: a claim nobody can re-find is a claim nobody can check. Copy the quote out of the
receipt — one typed from memory is exactly what this catches.
- **A challenge is a reference, not a verdict.** A claim may name the claim it challenges; the note shows
both — `⚠ challenged by c4` beside the challenged claim, `Challenges c1.` on the challenger — and decides
nothing. Two readers disagreeing is information for the operator, who is the one who weighs it.
- **An id is not a URL.** It is the stable key a claim cites — a DOI, an OpenAlex id, an arxiv id — and the
  receipt carries it whole even where the file name cannot (a DOI's slashes, an arxiv id's colon). An arxiv
  id is an *alias* on a source whose copy was fetched from somewhere else, because arxiv answers only
  through a proxy (next bullet).
- **Two sources answer differently, and the network is part of the reading.** OpenAlex is queried directly
  and needs no key. **arxiv answers only through the operator's own proxy**, handed to the tool as
  `INQUIRY_PROXY` (it also reads `https_proxy`, `http_proxy`, `all_proxy`), and the value that works on this
  machine is `socks5h://127.0.0.1:23379` — `socks5h` worth naming rather than `http`, which measured ~0.4s
  against ~8.6s for the same fetch. **A reading run inherits the variable from the environment that
  started the workflow**, so a session that starts an unattended reading exports it first; a run with none
  set answers from OpenAlex and plain URLs alone, and says which sources it could not fetch, because the
  arxiv path refuses with its own sentence instead of waiting out a timeout — and `export.arxiv.org`'s API
  is not the way around it: it answers 429 even with a User-Agent. Since that proxy is the operator's own
  Clash client, **it answers only while that runs** — which is where an unattended reading dies: loudly,
  at this step, with the note half written.
- **These documents land on Main like any other document**, so a drain running later reports them in its
range section as commits the run did not make. That is the boundary working, not the drain being
polluted.

### Ideas

An idea is a question too — "is this worth doing?" — so it is a `decision` issue, exactly like every other
inquiry object. No new type and no store configuration: the type already means *content is a question, not
work*, the drain excludes it structurally, and the preflight already refuses blocking chains that reach it.

**Its comment thread is its development record.** Append a comment each time the idea moves: what was added,
what was dropped, what was argued down, and on whose saying. Long material stays a git file linked from the
comment — comments record the process, documents record the conclusions. `bd comment` stamps author and time
itself and the CLI appends only (no edit, no delete), which is why the thread is worth keeping there.

**Its state is read off the record, never typed in.**

| State | The fact that makes it true |
| --- | --- |
| `bare` | a sentence and nothing else |
| `argued` | a comment is discussing it |
| `evidenced` | something is linked to it — a receipt, a note, an experiment result |
| `proposed` | a written proposal: "if we did this it would look like…" |
| `settled` | closed — graduated (with a link to the issue it became) or dropped (`wontfix`) |

Every step names a checkable fact, which is what keeps the ladder from drifting: a state somebody has to
remember to move is the only kind that falls behind. A session *may* stamp the matching `idea:<state>` label
so the ladder is filterable (`bd list -l idea:evidenced`), but only in the same act as the comment that makes
it true — one action, both jobs, and no second channel for the label and the record to disagree.

**The AFK leg nominates; the session creates.** A `research` ticket's agent is read-only in the store, so it
leaves "this looks like an idea" in its note and nothing else. The idea is created in a session with the
operator present, and graduating it — into a question, an experiment issue or a development issue, linked
back with `relates-to` — is the session's act on the operator's word. No provenance is recorded on any of
it.
