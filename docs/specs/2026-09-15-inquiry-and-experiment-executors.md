# The inquiry and experiment executors

*Assembled 2026-09-15 from the operator's answers to the executor round (1–6, below) on top of
`docs/specs/2026-09-15-experiment-domain.md` and the tracker contract. Status: **designed, nothing
built yet.** The development half has had an executor since the beginning; these are the other two.*

The flow has three domains and one worker. `beads-dag-drain` starts what the store says can start, runs
each development issue in its own worktree, merges it into Main and records the outcome — and that is
the whole of the automation. A question is read by hand: a session launches an agent, the agent leaves
receipts and a note, the session commits them and writes the answer. An experiment is not run at all:
its rules are paper, and this machine has no DVC.

This spec is the other two executors. Both are new workflow folders in the same pack — **one pack, three
domains, three executors** — and both are shaped the way the drain is: ask the store what is on the
frontier, do one ticket, record it, loop.

## Problem Statement

The operator's research does not batch, and his experiments do not run.

- **A reading costs a session.** Today the AFK leg is a subagent a session launches by hand, and the
  session that launched it must come back to write the answer and close the ticket. Three questions
  sitting in the store on a Friday night are not read by Monday; they are read when he sits down,
  one at a time, driving each leg himself.
- **Nothing is checked.** The rules for a reading (the quote must re-anchor, the note's claims cite
  sources, a reading answers with facts and not decisions) are enforced by the tools only if the
  session remembers to use them. The rules for an experiment are enforced by nothing at all: the
  `reading:none` label, the record's closing lines and the closure itself are prose a human has to
  honour.
- **The experiment half is unverifiable as it stands.** Its closure is "the result is recorded", which
  is a completeness check — the one closure in the flow that does not need a person — and yet there is
  no machine that makes the check. A design whose central promise is a check nobody performs is the
  "only paper" problem the operator named.

## Solution

Two Archon workflows in the existing pack, run from a Target like the drain is:

- **`beads-dag-inquiry`** reads questions. It picks the reading frontier out of the store, claims each
  ticket, runs one reading turn, lands the receipts and the note as documents, commits them to Main,
  and leaves a **draft answer** as a comment on the ticket with an `answer:draft` label. The ticket
  stays `open`: the last word — the final answer, and the close — is the session's, on the operator's
  word. That is one word less of work per question, and it is the only word a machine may not write.
- **`beads-dag-experiment`** runs experiments. It picks the experiment frontier, claims a ticket by
  assignment in the same act as it registers the run's identity, runs the experiment through a thin
  target-side script, and closes the ticket itself once the record holds the lines the closure is
  defined by. This is the one unattended closure in the flow (ADR-0006), and this executor is what
  makes it true rather than intended.
- **Both leave a report** in the run's artifacts: what was read or run, where the documents are, what
  failed, what is still on the frontier — the drain-end report's counterpart for a run that merges
  nothing.

A batch of questions opened at once is one run: the frontier is a query, so a ticket that does not exist
yet costs nothing, and a ticket added tomorrow is picked up by tomorrow's run without anything being
reconfigured. Nothing blocks across domains, so a question waiting on an experiment is handled the only
way it can be: **that ticket is not opened** until its input exists (operator, 2026-09-15).

## User Stories

1. As the operator, I want to open several question tickets and run them together, so that a batch of
   readings happens without me sitting through them one at a time.
2. As the operator, I want the reading to end with a draft answer on the ticket, so that my part is
   appending and correcting rather than producing from nothing.
3. As the operator, I want the draft answer to be the reader's own words, so that the comment thread on
   the ticket reads as the answer's development — the same shape an idea's thread already has.
4. As the operator, I want a question ticket to stay open after the reading landed, so that closure
   stays where the flow put it: a session, on my word.
5. As the operator, I want one query that lists the questions whose reading landed, so that "what is
   waiting on me" is a list I run rather than a state somebody maintains.
6. As the operator, I want a reading to be impossible to fake, so that a ticket that says `answer:draft`
   always has a note whose claims re-anchor against receipts.
7. As the operator, I want the receipts and the note committed to Main, so that a reading nobody has
   read yet is still in the record rather than in an untracked working tree.
8. As the operator, I want a run to say what it did and what it left, so that a batch run is one report
   I read instead of an archaeology exercise in the store.
9. As the operator, I want a reading that turns up nothing to say so out loud, so that a dead end is an
   answer and not a silence.
10. As the operator, I want an unread question's ticket to be re-readable later (a better question, a
    second source, a challenge), so that the label is about the frontier and not a verdict.
11. As the operator, I want the reader to run with the store read-only, so that a reading cannot claim,
    comment or close anything — the store's writes stay with the run that holds the ticket.
12. As the operator, I want an experiment ticket to be claimed by assignment in the same act as the run's
    identity is registered, so that two sessions can never run the same experiment.
13. As the operator, I want the run's identity reserved before the experiment starts, so that a run
    cannot exist without a name the record already knows.
14. As the operator, I want the numbers collected automatically after the run, so that the record's table
    is a reading and not a memory.
15. As the operator, I want the record's closing lines to be checkable, so that `closed` on an experiment
    ticket means the record is complete — mechanically, not by prose.
16. As the operator, I want an incomplete record to keep the ticket open with a comment naming what is
    missing, so that the closure cannot be claimed by an agent's summary.
17. As the operator, I want `reading:none` stamped in the same act as the close, so that the sweep for
    results nobody has read is a query over the store and nowhere else.
18. As the operator, I want the finding that came out of an experiment to reach me as a ticket I can read
    — not as a field the machine filled in — so that the judgement stays mine.
19. As the operator, I want a killed run to be repairable, so that a claim left by a dead process does
    not silently hide a ticket from the frontier.
20. As the operator, I want only one run at a time per Target, so that a drain and a reading cannot write
    Main at the same moment.
21. As the operator, I want a run's document commit to name its paths, so that a commit never sweeps
    another session's work into the flow's history.
22. As the operator, I want the two executors to refuse loudly when their premise is missing — no store,
    no `tools/inquiry/`, no `dvc` — so that "nothing happened" is distinguishable from "the run could not
    start".
23. As the operator, I want the experiment executor to be honest about the machine it runs on, so that
    building it before DVC exists is a known deferred acceptance and not a silent claim.
24. As a session holding a map, I want the reading leg to be a workflow I start, so that the map's next
    ticket is read without me holding a session open for an hour.
25. As a session closing a question ticket, I want the draft answer to be a comment I can append to, so
    that the final answer is one comment with the operator's words in it.
26. As a session, I want the clashing labels to be impossible to hold at once, so that a ticket cannot be
    both "being read" and "read".
27. As the flow's maintainer, I want the two new workflows to ride the existing seams — the node protocol,
    the role table, the agent seam, the test harness — so that the pack grows three executors without
    three ways of doing anything.
28. As the flow's maintainer, I want the new repros inside the pack's one suite, so that the gate stays
    one command.
29. As the flow's maintainer, I want the thin experiment script to be testable without DVC installed, so
    that its verbs are pinned before the machine that needs them exists.
30. As the flow's maintainer, I want the drain's readers to see a reading's commits in their range, so
    that documents landing on Main are normal commits and not a special case the reviewers must know
    about.

## Implementation Decisions

### The pack grows two folders

```
.archon/workflows/beads-dag/
  beads-dag-drain/        the drain (unchanged, except the shared modules below)
  beads-dag-execute/      one issue, start to finish (unchanged)
  beads-dag-inquiry/      NEW: open, the pick/read loop, report
  beads-dag-experiment/   NEW: open, the pick/run loop, report
```

Both new folders follow the pack's existing shape: their own YAML, their own `scripts/` (one module per
node), and no `tests/` of their own — the pack's one suite lives in `beads-dag-drain/tests/` and its
repros cover all four workflows.

**Shared modules stay where they are** (the drain's `scripts/`, the pack's library): `store.ts`,
`naming.ts`, `config.ts`, `node-entry.ts`, `node-outcomes.ts`, `git.ts`, `lock.ts`, `run-lock.ts`,
`attempted.ts`, `roles.ts`, `prompt.ts`, `agent.ts`, `pi-session.ts`, `dsh-agent.ts`, `dsh-runtime.ts`,
`worker-env.ts`. The README's module table is amended: what is the drain's alone is a module whose
reason to exist is that a run **merges an issue's work** into Main (`main-writes.ts`, `settle.ts`,
`worktree.ts`, `reconcile.ts`, `review-position.ts`, `run-record.ts`, `failures.ts`, `report-node.ts`,
`report-artifacts.ts`) — not, as it says today, "writes Main", because both new executors commit
documents to Main and neither may merge an issue.

**One new shared module**: `doc-commit.ts` — commit the run's own documents into the Target's current
branch, under the Main lock (`lock.ts`), named per path:

- the commit names its paths (`git commit -- <paths>`, never `-a`, never the index), so a session's
  staged work is never swept in — the accident that already happened once in this repository;
- one commit per ticket, subject `read: <handle> <slug>` (inquiry) or `record: <handle> <slug>`
  (experiment);
- a path the run did not write is not committed, and a path the run wrote that the flow does not name is
  left uncommitted and named in the run's report.

**The run lock is shared.** All three executors take the same Target-level run lock at `open` and refuse
when another holds it: one run at a time per Target, whatever kind of run it is. Two runs is one run too
many here because both of them write Main.

### The inquiry executor

| Node | Script | Does |
| --- | --- | --- |
| `open` | `open.ts` | opens the store, takes the run lock, prints the configuration line, refuses when `tools/inquiry/` or `<effort>/` is missing, repairs leftovers |
| `pick` | `pick.ts` | the frontier, one JSON array of handles (the same token the drain's `pick` prints) |
| `read` | `read.ts` | one ticket: the reading turn, the documents, the draft answer, the label |
| `report` | `report.ts` | the run's report and the artifacts |

The loop is the drain's: `pick` until it answers `[]`, `read` fanned out over `pick`'s items, truncated to
`config.concurrency`, `join: all_success`.

**The frontier** is the store's own ready answer minus what only the flow knows:

```
ready − not labelled wayfinder:research − the map (wayfinder:map) − labelled answer:draft
      − attempted by this run → ordered by handle (feature, then NN, then slug) → truncated to concurrency
```

- `wayfinder:research` is the gate for this executor, the role `ready-for-agent` plays for the drain: a
  question nobody has labelled for reading is not the reading executor's work. It is the flow's existing
  word for the leg (`wayfinder:<research|prototype|grilling|task>`), so no new vocabulary.
- the map is excluded by its own label even though requiring the leg's label already excludes it;
- `answer:draft` is what makes a batch run safe: a ticket whose reading landed is no longer in the
  frontier, and a ticket without it is read again — including one a killed run left half-read.
- the ordering is by handle, so a batch of questions opened in an order is read in that order, and the
  order is the one already visible in the branch and body names.
- every excluded issue and its rule goes into `pick-exclusions.json`, the drain's convention.

**The claim** is `bd batch` (`status=in_progress`), all-or-nothing, and it is the whole claim: no
assignee. The store's derived readiness is what keeps a claimed ticket out of a session's frontier, and
the run lock is what keeps two runs apart.

**The reading turn** is one agent turn under the role `read`:

- its persona says what the domain's rules are: a reading answers with facts, not decisions; a quote must
  re-anchor against the receipt that owns it and is copied out of the receipt, never typed from memory; a
  claim whose quote cannot be found is refused and said out loud; two readers disagreeing is information
  and the note shows both; the note is the product and its file name is the ticket's slug;
- its brief is the ticket's body path — the same shape every issue role already has — plus the one thing
  the role's arguments add: the corpus directory and the note path the run will commit.
- the tools are the Target's own copy, invoked the way their headers document them
  (`bun tools/inquiry/fetch.ts --query … --sources … --corpus .scratch/<effort>`, then
  `bun tools/inquiry/note.ts --corpus … --question … --claims … --slug <slug>`), and `INQUIRY_PROXY` is
  the operator's, read from the environment as the tool already reads it. No proxy configured means the
  arxiv half refuses with its own sentence and the reading says so — the run does not invent a second
  route.
- its answer — the last assistant text — **is the draft answer** the node comments on the ticket. The
  brief demands it: three to ten lines, what the sources hold, what they do not, and where the note is.
- it runs with the store read-only (`worker-env.ts`, `BD_READONLY=1`), like every worker: the reader
  cannot claim, comment or close. The store's writes in this executor are the node's.
- wall clock 1 h (`READ_WALL_MS`), read against the `read` node's timeout.

**What lands, and in what order** (`read.ts`, one ticket):

1. the reading turn;
2. the note file is checked for existence — the note is the record of a reading, and a turn that wrote no
   note failed whatever it said;
3. the documents are committed (`.scratch/<effort>/sources/` and the note) under the Main lock, one
   commit;
4. a comment on the ticket: the draft answer, its first line marked `draft` and naming the note's path
   and the commit;
5. the `answer:draft` label is added **in the same act** — the same rule an idea's state label follows —
   and the status goes back to `open`, because nobody is reading it any more;
6. the handle leaves the cycle and the ticket is out of every later frontier.

Any step failing before 4 puts the ticket back to `open` with `attempt N failed: <reason>` as a comment —
the drain's failure convention, its ordinal included — and the run goes on. A failure after 4 is not a
failure: the reading landed, and the ticket is left with the draft answer, labelled.

**The executor never closes a decision issue.** A question's `closed` means the answer is written, which
is a session's act on the operator's word (ADR-0006). What the session does when it closes is: append the
final answer as a comment, take the `answer:draft` label off, close. The label coming off in the same act
as the close is the rule the whole flow uses — a label states a fact that is true.

**The sweep** joins the session's opening checks beside the frontier and the unread results:

```bash
bd list -t decision -s open -l answer:draft     # questions whose reading landed and await my word
```

One place, one query. No map lists it, and nothing acts on it.

**Leftovers** are repaired from the store, not from git — the one place this executor differs from the
drain, and the difference is that the reading's landing is a store fact:

- `in_progress` with `answer:draft` set: the reading landed and only the status is stale — set `open`,
  comment that the claim from run `<id>` was released after the reading landed;
- `in_progress` without it: the reading did not land — set `open`, comment
  `attempt N failed: leftover in progress and no draft answer on the issue`, which is exactly the ordinal
  and the shape a failed attempt already has, so the retry channel is the frontier itself.

The residual: a run killed between the comment and the label is repaired as "did not land", and the next
run reads the question a second time. That costs one turn and leaves two drafts on the ticket, which is
visible and honest; the alternative is a second state to maintain.

### The experiment executor

| Node | Script | Does |
| --- | --- | --- |
| `open` | `open.ts` | opens the store, takes the run lock, prints the configuration line, refuses when `dvc` or `tools/experiments/` is missing, repairs leftovers |
| `pick` | `pick.ts` | the frontier: **one** handle per cycle |
| `run` | `run.ts` | one ticket: claim and registration in one act, the run turn, the record, the completeness check, the close |
| `report` | `report.ts` | the run's report and the artifacts |

**The frontier** is the store's ready answer minus: not type `experiment`, not labelled `experiment`,
already attempted by this run. Experiment tickets never carry the gate label, and by type they never
enter a drain — this is the one frontier that selects *by* the non-work type instead of excluding it. It
takes **one ticket per cycle**, whatever `concurrency` says: an experiment is a machine-wide resource,
DVC's cache and refs are shared, and a second experiment started by the same run is a decision the
operator makes by starting a second run, not one a fan-out makes for him.

**Claim = assignment, before any work**, in the same act as the registration, exactly as the domain spec
fixed it:

```bash
bd update <id> -s in_progress --assignee <who>
```

with `<who>` the run's own identity (`beads-dag-experiment/<run-id>`), so a session looking at the ticket
sees a run and not a person.

**The registration** is the thin script's first verb, and it is a real gate: the run's identity is
reserved before anything executes, so an experiment cannot exist without a name the record knows. The
node records the same line in the run's artifacts.

**The run turn** is one agent turn under the role `experiment`, wall clock 4 h:

- the brief is the body's path, plus the ticket's own plan fields as the run's arguments;
- the persona says what the record is: what was measured and from where, whether it met the frozen
  reference or what was observed (when the ticket said *exploratory*), what the run covered (one seed,
  one dataset, one config), and the `reading:` marker; and that the record is the closure, so its lines
  are the point of the turn;
- it runs the experiment through the Target's own `tools/experiments/` and writes the record at
  `.scratch/<effort>/results/<NN>-<slug>.md`, appending the change as a comment (a document holds the
  picture, comments hold the history);
- it does **not** write the experiment's stage or its code: those are in Main before the ticket is
  runnable, and a change to them is a development ticket (`discovered-from`/`relates-to` carry the
  handoff). The executor's own writes are documents.

**The completeness check is code** (`run.ts`), and this is the part that makes ADR-0006's promise real.
After the turn, the record must:

1. exist at the handle's own path;
2. hold an attempts-table row (one row per run);
3. hold the four closing lines, each identified by its literal label — `measured:`, `reference:`,
   `covered:`, `reading:` — so the check is a check and not a reading of prose.

Missing anything → the ticket stays `open` with `attempt N failed: record incomplete — <what is missing>`
and nothing else happens. Only a complete record closes the ticket, and with it the `reading:none` label
stamped **in the same act**, plus the comment that is the event stream. The three store writes are one
act; the commit of the record (and the paths the collection named — the declared metric files, `dvc.lock`)
is the fourth, under the Main lock.

**Why the closing lines get literal labels**: the experiment-domain spec wrote them as prose. A closure
whose whole justification is "the record is complete" cannot rest on prose a machine cannot read, so the
record's shape gains four labels and the experiment-domain spec is amended to say so. This is a document
shape rule, not a new state.

**The run store socket stays empty.** v1 reads DVC alone; the record's run pointer is blank and every
field names the source it was read from.

### The thin experiment script

`tools/experiments/`, next to `tools/inquiry/` and distributed the same way (copied into a Target, no
package, no install):

| Verb | Does | Writes |
| --- | --- | --- |
| `register` | reserves the run's identity and snapshots what cannot be reconstructed afterwards: the name, the parameters, the code commit the run starts from | a JSON line on stdout, and the run's registration in `ARTIFACTS_DIR` |
| `collect` | `dvc exp show --json`, the ticket's declared metric files, `dvc.lock` | a JSON blob on stdout: the metric's value and source, the parameters, the three version pointers, the artifact pointers |

It trains nothing, schedules nothing and knows no cluster. It shells out to `dvc` — resolved on `PATH`,
with `DVC_BIN` as the escape hatch — so a repro can pin both verbs against a stub `dvc` on `PATH` and this
machine's lack of DVC stops being an excuse for an untested script.

### The two reports

Each run writes one artifact a human reads first (`report.md`), from the run's own record and the store:

- the tickets it worked, each with what landed and where (note path, record path, commit, label);
- the tickets it attempted and failed, with the reason and the attempt number the store holds;
- the frontier it left behind — the handles still eligible, so a run that did nothing says so;
- for a reading, the one line that matters at 9am: *draft answers awaiting the operator*, as handles.

The report is written by the node, never by a model, and it is never consulted as state (ADR-0005).

### What the flow's own documents say afterwards

- the tracker contract gains the **draft answer** rule where it now says the session records an answer:
  the reading leg's executor writes a draft as a comment, the operator appends or corrects it, the session
  writes the final answer and closes; and `answer:draft` joins the sweep list with its own one-line query.
- the tracker contract's Experiments section gains the literal labels of the four closing lines, so the
  document's shape and the executor's check are the same rule.
- the pack README gains the two folders, the amended module-sharing line, and the fact that all three
  executors share one run lock.
- the setup skill and `tools/flow.ts` are **not** changed: `tools/inquiry/` and `tools/experiments/` are
  still copies a Target makes, and the `bootstrap <repo>` verb that would make that one command is out of
  scope here (it is the known gap in `tools/flow.ts`'s check).

### The build order

1. the tracked-document updates (contract, README) and `doc-commit.ts`;
2. `beads-dag-inquiry`, its repros, and the first live acceptance against this repository (a real
   question, a real reading — the design repo is a Target now);
3. `tools/experiments/` with its stub-DVC repros;
4. `beads-dag-experiment` against a real `dvc` on a real experiment, whenever the machine has one — its
   tickets can be built and tested before that, and their acceptance is recorded as deferred.

## Testing Decisions

**What a good test is here.** The pack's tests drive real scripts against a throwaway Target — a temp git
repository with a real store — and assert on what an observer outside the pack can see: the store's own
answer (`bd show`, `bd ready`), git (commits, branches, the working tree), the files the flow names, and
the node's one stdout token. Nothing asserts on a pack function's internals, and no test uses a fake
store: a store that cannot be found fails the suite loudly. Live model turns are the one thing the suite
must not spend, and the pack already has the seam for it — a fake Pi SDK loaded through `PI_SDK_PATH`,
whose session writes into the session file the pack trusts and returns something else from `prompt`.

**The modules under test, and the seam each one rides**

| Under test | Rides | Prior art |
| --- | --- | --- |
| `pick` (both executors): frontier rules, exclusions report, ordering | the node's process spawn (`bun scripts/pick.ts` with the run's env) | `pick-repro.ts`, `domain-repro.ts` |
| `read.ts`, end to end: claim → reading turn → documents committed → draft comment → label → `open` | `read.ts`'s exported per-ticket entry called with a stub `runAgent` (the `executeIssue` seam) | `runner-repro.ts`, `brief-repro.ts` |
| `run.ts`, end to end: assignment+registration, complete record closes, incomplete record does not | the same per-ticket entry with a stub runner | `settle-repro.ts`, `reconcile-repro.ts` |
| the reading turn's own behaviour (writes a note; writes none; answers nothing) | `fakePiSdk`, with two new modes: `read` (writes a receipt and a note under `.scratch/<effort>/` and answers a draft) and `read-silent` (answers nothing) | `runner-repro.ts`'s mode table |
| the experiment turn's record (complete/incomplete) | `fakePiSdk` mode `record-complete` / `record-incomplete` | the same |
| `doc-commit.ts`: path-scoped commits, the lock, another session's staged work untouched | a Target with a staged file the run must not commit | `lock-repro.ts`, `worktree-repro.ts` |
| the run lock shared by three executors (a second run refuses, a dead holder is stolen) | `run-lock-repro.ts` extended | `run-lock-repro.ts` |
| leftovers: a killed claim repaired in both directions | `open.ts` driven directly | `reconcile-repro.ts` |
| `tools/experiments/`'s two verbs, without DVC | a stub `dvc` on `PATH` that answers `dvc exp show --json` and writes a `dvc.lock` | the store's own `BEADS_BIN` override pattern |
| all four YAMLs: node/script agreement, node timeouts outlasting their roles' wall clocks | `yaml-contract-repro.ts` extended to every folder | `yaml-contract-repro.ts` |
| the reports | the artifacts a run leaves, read as files | `report-repro.ts` |

**The suite stays one command** (`bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts`, the
folder the pack's tests live in), and both typechecks stay clean — `tsconfig.pack.json` covers the new
`scripts/` by its existing globs, `tsconfig.tools.json` covers `tools/experiments/`.

**The third gate is the acceptance**, and it is honest about which half can have one now: a real
`archon workflow run beads-dag-inquiry` against this repository, with a question the operator actually
wants answered — the reading is the acceptance. The experiment executor's acceptance needs DVC on the
machine and a real experiment ticket, so it is deferred; until then its tickets say so, and no ticket
claims an experiment was ever run.

## Out of Scope

- **DVC, and a real experiment.** Installing DVC, choosing a dataset, running a training job — the
  experiment executor's acceptance waits for the machine to have DVC. Nothing here chooses a run store.
- **The experiment's own code.** A stage, a training script or a data pipeline that has to be written is a
  development ticket; this executor does not write code, and its record says which commit it ran on.
- **A scheduler, a queue, GPU allocation, multi-machine runs.** One run at a time per Target, as today.
- **`bootstrap <repo>` in `tools/flow.ts`**, and copying `tools/` into a Target by command. The two
  tool directories stay copies.
- **Any change to the drain's own behaviour** beyond sharing `doc-commit.ts` and the run lock, and the
  README's module line. In particular the pre-merge verification gate is another ticket (`flow-c2e`).
- **Per-executor configuration files.** All three read the same `.scratch/beads-dag.yaml`.
- **Making a reading leg richer than one turn** — a second reader per question, a challenge round, a
  voting scheme. One question, one reading, one note.
- **A store schema change.** No new type, no new field: the whole spec is executed with the store's
  existing labels, statuses and edges.

## Further Notes

**The one sentence this spec decides rather than inherits.** The experiment-domain spec says "writing the
script, running it, collecting the numbers and writing the record may all run AFK". Read against that
spec's own next paragraph — the thin target-side script is what "the script" is — the sentence is
satisfied here: the thin script is written (by us, in this repository), and the run, the collection and
the record are AFK. But it can also be read as "the experiment's stage may be written AFK", and this spec
does not do that: code changes land through the drain, and the experiment's record names the commit it ran
on. If the operator wants the wider reading, it is one role plus one commit path list — and it makes an
experiment ticket a place where code lands, which is precisely the closure-meaning confusion ADR-0006
exists to prevent. Flagged, not hidden.

**The seams.** The design rides the pack's existing seams and adds two things: one shared module
(`doc-commit.ts`, the only new pack code outside the two folders) and one target-side tool directory
(`tools/experiments/`, the peer of `tools/inquiry/`). The node protocol, the role table, the agent seam
with its two runners, the worker's read-only environment, the run lock and the repro suite are all
existing, and both executors are built out of them.

**Residual risks, named.**

- **The reading dies on the network.** The arxiv path needs the operator's own proxy, so an unattended
  reading that needs arxiv dies at that step with the note half written. The failure is loud and the
  ticket goes back to `open`; the fix is the operator's, and the alternatives were measured and rejected
  in the tracker contract.
- **Concurrent readers share the effort's corpus.** Two reading turns on the same effort write into one
  `sources/` directory. The same source twice produces identical bytes, so the race is a same-content
  write, but it is a race: `concurrency` above 1 is for the operator who accepts it. The default is 4
  because the drain's is; the acceptance runs at 1.
- **A killed run between the draft comment and the label** costs one repeated reading, as above.
- **An experiment's wall clock is a runner's kill, not a budget.** Four hours bounds a turn; the flow
  records budgets and never enforces them, and a run longer than the clock is a failed attempt with the
  reason on the ticket.
- **The experiment executor is built before it can be used.** Its repros pin its behaviour against a stub
  `dvc`, which is not the same as having run an experiment. The first real run is the day it becomes
  trustworthy, and no ticket before that day may claim more.
