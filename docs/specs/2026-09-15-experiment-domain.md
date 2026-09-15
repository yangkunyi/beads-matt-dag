# The experiment domain

*Assembled 2026-09-15 from the `lab-zfl` wayfinder map (tickets `.1`–`.7`; the tickets are the argument,
this is the result). Status: **designed, and implemented only where marked**. No experiment has been run
under it yet — this machine has no DVC — so what follows is a design that has survived scrutiny, not one
that has survived contact.*

The domain holds one promise: **`closed` means the result is recorded.** That is bookkeeping, not a
judgement. The record is complete when it says what was measured, whether it met the reference frozen
before the run, and what the run covered — and until then the ticket is open. Nothing else closes on it,
and nothing in the store may write that closure for us.

## The ticket

An experiment ticket is a **plan for producing a fact**, and the plan is what makes it runnable.

- Type `experiment` (a type the store must know: `bd config set types.custom experiment`; `bd` refuses a
  type it has never heard of), label `experiment` so `bd list -l experiment` is the one filter, and never
  the gate label `ready-for-agent` — nothing about an experiment ticket is a drain's work.
- Body at the handle path, `.scratch/<effort>/issues/<NN>-<slug>.md`, carrying:
  - **the deciding metric, and where it is read from** — one number, from a named source (a metrics file,
    a field of a run store's record). Other numbers may be recorded; the reference is compared against
    this one, and only this one;
  - **the reference**, written before anything runs: a prediction with a threshold, a baseline value, or
    the literal word *exploratory*. Freezing it is what turns "did it work?" into a reading of the numbers
    instead of a story told afterwards;
  - **the pin**: the data and the code commit the run is meant to happen on.
- Optional: a hypothesis (why it should come out that way) and a budget. A ticket missing the metric, the
  reference or the pin is not runnable as an experiment yet.
- **Changing the deciding metric opens a new ticket.** The old one closes with `wontfix`, a comment naming
  its successor, and a `relates-to` link — never an in-place amendment and never a `supersedes` edge
  (which renders as a gate while gating nothing). Changing what counts as success changes the question,
  and the old numbers stay comparable to the question they were run for.
- **Claim = assignment, before any work**: `bd update <id> -s in_progress --assignee <who>`, in the same
  act as registering the run's identity. Two sessions must not run the same experiment.

## The run, and who may work it

Writing the script, running it, collecting the numbers and writing the record may all run **AFK**. The
operator appears twice: agreeing the plan, and — later, optionally — saying what the result means. The
store's writes stay with the session; the git documents are the AFK leg's.

A **thin target-side script** does the two things that cannot be reconstructed afterwards:

- **registration before the run** — it reserves the run's identity (`dvc exp run -n <name>`) and copies
  the parameters, so a run cannot happen without a name the record already knows;
- **collection after it** — `dvc exp show --json`, the declared metric files, and `dvc.lock`.

The script is copied in like `tools/inquiry/` (the flow's retrieval tooling): not a pack node, not
installed, no package. **Where it lives is the one question this design leaves open** (see the end).

## DVC's seat

DVC owns **what went in and what the bytes are**:

- data and artifacts, versioned by hash — the pointer is the `.dvc` file or the lock's `outs` entry (path
  plus hash), the payload in cache or a remote;
- pipeline state in `dvc.yaml` (stages, and the artifacts, metrics, params and plots each declares);
- the machine-written record of a run: `dvc.lock` restates the stages, hashes every dependency and all
  outputs including metrics and plots, and records full param key and value. Committing the lock is
  documented good practice, though DVC never commits it;
- experiments as versioned iterations — custom git refs under `.git/refs/exps`, based on HEAD, hidden from
  push/pull/clone, persistent only once restored (`dvc exp branch` / `dvc exp apply`) and committed with
  plain git;
- metrics as key/values in declared structured files, with no meaning DVC ascribes to them.

The flow owns what DVC cannot hold: **which ticket, which attempt, which reference, and the reading**.
DVC's own documentation defines no work-item concept at all — no ticket, no status, no owner, no dispatch —
which is why the record is a git document that *points at* DVC rather than a file inside it.

### The socket a run store plugs into

A run store owns something different again: what happened *while* a run was running — live status, curves,
artifact lineage, a shareable URL, a cross-machine index.

- **required**: `get(run) -> {metrics, params, artifacts: [{name, uri, hash}]}`;
- **optional**: `set-tag` (write the ticket's number back into the store);
- **declined**: `search(issue) -> [run ids]` — the flow owns which issue, which attempt and which reading;
  a vendor is never asked to remember that for us.

**v1 reads DVC alone and leaves the socket empty**: the record's run pointer stays blank. Because two
sources can hold the same truth, **the record states for every field which source it was read from** — and
where a field has no source yet, it is visibly empty rather than guessed.

## The record

One document per ticket at `.scratch/<effort>/results/<NN>-<slug>.md`, with **a comment appended on every
change** (a document holds the picture, comments hold the history).

An attempts table — one row per run — and, per run, the fields:

| field | read from |
| --- | --- |
| the deciding metric's value | the source the ticket named |
| parameters | the run's registration, or the lock |
| budget spent — recorded, never enforced | wherever it is known |
| code commit | git |
| `dvc.lock` hash | DVC |
| artifact pointers (path + hash) | DVC |
| run pointer, `<store>:<id>` | **empty in v1** — the socket |

Closed by these lines:

- what was measured, and which source it was read from;
- whether it met the frozen reference — or what was observed, when the ticket said *exploratory*;
- what the run covered: one seed, one dataset, one config. This is the line that stops a reader
  over-reading the result;
- `reading: none yet` — a visible marker that nobody has interpreted it yet.

**The ticket closes when the record holds all of that — no signature.** The operator's judgement is
deliberately not a field of the record: it leaves the ticket as an idea or a work ticket, linked back
(`discovered-from`). That is what makes this the one closure in the flow that is a completeness check
rather than a person's word (ADR-0006).

## The reading, and the review surface

A recorded result nobody has read blocks nothing — no chain waits on it, and the ticket it might justify
does not exist until the operator wants it — so nothing acts on it. It is made *visible*, and the fact
lives in one place, the store:

- the marker is the record's `reading:` line **plus a `reading:none` label stamped in the same act as the
  close** — the rule an idea's state label already follows. That turns a document line into a query:

  ```bash
  bd list -t experiment -s closed -l reading:none
  ```

  which a session runs at the start of its work, beside the frontier. No map, report or file repeats the
  list: a second copy is a second thing that can be wrong.

**Clearing it is one act**: the `reading:` line takes the operator's words and names whatever the result
spawned; the label comes off (`bd label remove <id> reading:none`); a comment is appended. **Unread is not
a debt** — a result the operator decides not to read is written down as such (`reading: declined — <why>`)
and clears exactly the same way. There is no timer and nothing is ever overdue.

The reading is also where the handoff happens: if the result justifies work, the operator says so, the
session creates the ticket in the other domain, adds `discovered-from` from the new ticket to the
experiment, writes the `fed:` line into the record, and the new ticket's body names where it came from.

## Crossing the boundary

- **No blocking relation crosses a domain** — neither `blocks` nor `parent-child`, at any depth, in either
  direction. A recorded result never releases implementation work, and an experiment is never gated by it.
- **Two links cross, and they carry information rather than a gate**: `relates-to` (a loose see-also) and
  `discovered-from` (the handoff a result makes). The store allows one edge per pair, so the two are
  mutually exclusive; the kinds that render as `DEPENDS ON` / `BLOCKS` while gating nothing (`supersedes`,
  `validates`, `caused-by`, `tracks`, `until`) are never used for a crossing link.
- **Inside the domain, blocking is normal** — a pilot before a full sweep — which is the mechanism a result
  spawning the next run uses.
- **A dependency running backwards is recorded, not gated**: an experiment that needed code says so in its
  record's version pointers.
- **Both ends carry the handoff**: the record's `fed: <handle>` line, and the work ticket's body naming the
  experiment it came from.

## What is already enforced in code

The beads-dag drain knows two non-work types, spelled once in `scripts/domains.ts` as
`NON_WORK_TYPES = {decision, experiment}`: `pick` excludes them, `reconcile` leaves their status alone,
and the cross-domain preflight refuses the run while any implementation issue's blocking ancestry reaches
one. The pack's repro suite covers all three (23/23) and both typecheck gates are green. Registering the
type in a Target (`bd config set types.custom experiment`) is the one act a Target does itself.

## What this spec does not do

- **No runner, no scheduler, no cluster** — the destination stops at the interface.
- **No run store is chosen.** W&B and MLflow both fit the socket; the record stays neutral by leaving it
  empty and naming sources per field.
- **The experiment half's code has no home yet.** `.2` settled that there *is* a thin script (registration
  before, collection after, copied in); which directory it sits in is implementation rather than this design,
  so the map ruled it out of scope (2026-09-15) — it is settled the day the first experiment is really run.
- **The drain gains nothing to do with this domain.** The development half's report stays the development
  half's.
