# 04 — the rest read the contract

**What to build:** `to-spec`, `triage` and `ask-matt` brought to the contract. `to-spec`'s publish step
defers to the contract instead of asserting a label for itself: a spec is a git document, and the gate label
belongs to the issues a spec produces (applied by `to-tickets` at publication, never by `to-spec`). `triage`
maps its five roles onto the contract:
a role is a label, a triage move is one label replacing another, nothing here is a status, and a brief
written after publishing cannot enter a frozen body, so it becomes a store comment. `ask-matt` describes the
store-backed Target's shape (issues with handles, blocking edges as store edges) and points at the contract.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.5, §10.7)
**Blocked by:** `01`
**Status:** BLOCKED

- [x] no sentence in these three files would make a reader write state into a document, duplicate a fact the
      store owns, or assume a file shape the store-backed Target does not have
- [x] `triage`'s role vocabulary is unchanged (the five roles keep their names) and only its tracker
      mechanics follow the contract
- [x] `to-spec`'s publish step defers to the Target's contract: for a store-backed Target the spec is a git
      document at the contract's spec path, **no spec container exists in the store** (decision #8: no
      container tier), and the gate label is `to-tickets`' job at publication; for the local tracker it keeps
      whatever that tracker's own contract asks (its convention records the role in the file itself)
- [x] `to-spec`'s spec-path heuristic is intact
- [x] `ask-matt`'s flow description matches what a store-backed Target actually does, including that the
      brake is the gate label and that a decision issue is a type rather than a folder
- [x] vocabulary unified across all three (Q10)
- [x] each file's diff is quoted by section in the Comments, so a reviewer can see what was re-worded rather
      than re-typed
- [x] nothing under `.archon/` changes

## Comments

Implemented on branch `main`. Seven paths written: the three skill folders copied from
`/data3/yky/pi-agent-config/skills/` (three `SKILL.md`s re-worded; triage's two reference docs
re-worded where they asserted a tracker mechanic), **one amendment to ticket `01`'s contract** (named
and justified below), and this ticket. The upstream copies are untouched (`sha256 5d264795…`,
`91e2817e…`, `3d389105…` for the three `SKILL.md`s, unchanged on disk), nothing was installed into
`~/.pi/agent/skills` (that is `05`), `/data3/yky/endo_label` and `/data3/yky/workflow` were not touched,
and nothing under `.archon/` changed:

```
$ git status --porcelain -- .archon ; git diff --stat HEAD -- .archon
(no output both times)
```

**What was written**

- `skills/to-spec/SKILL.md` (75 lines) — the publish step is gone: the spec is a git document at the
  contract's spec path, there is no spec issue and no container tier, and the gate label is
  `/to-tickets`' job at publication. The description no longer says "publish it to the project issue
  tracker". The spec template and the seams step are untouched.
- `skills/triage/SKILL.md` (116 lines) — the five role names, the two categories and the state machine
  are unchanged. New: the contract owns every mechanic; a role is a label, one at a time, and a move
  replaces the last (publication applies the gate, pulling it is the brake); no role is a status; the
  buckets come from the contract's by-label read; a brief or notes written after publication are the
  contract's comment, because the body is frozen; `wontfix` is a label, never a closure. Every "close"
  the skill used to instruct is gone or deferred.
- `skills/triage/AGENT-BRIEF.md`, `skills/triage/OUT-OF-SCOPE.md` — the two docs the skill points at,
  re-worded only where they asserted a tracker mechanic: the brief is a comment (not "a GitHub issue or
  PR"); the out-of-scope flow applies the `wontfix` **role** instead of closing. The sample briefs
  inside them (quoted examples for hypothetical projects) are left alone.
- `skills/ask-matt/SKILL.md` (90 lines) — the main-flow branch describes the store-backed Target's
  shape instead of the local-markdown one: issues with handles, blocking edges as the store's own
  edges, the gate label as what a drain picks up and the brake as pulling it; the wayfinder on-ramp
  says a decision issue is the store's `decision` type, a type rather than a folder. "Ticket" is gone
  as a noun (§10.2).
- `skills/setup-matt-pocock-skills/issue-tracker-beads.md` — **the amendment**: one bullet, in the
  fetch section.

### The amendment to ticket 01's contract

Ticket `01` landed the contract; this ticket edits it once, deliberately, on the supervisor's decision
that a real mechanic with no row is a hole rather than a freeze to respect. `triage`'s discovery step is
that mechanic — bucket the untriaged, the `needs-triage` and the `needs-info` issues — and the contract
had no by-label read: its only listing command was by handle. The four conditions on the amendment were
kept: both flags verified against the store's own help rather than assumed; the statuses the row returns
stated (`--status open` pinned, not the store's default); the drain's frontier cross-referenced and left
untouched; and the amendment named here and in the commit, never edited silently.

The store's own help (`bd` 1.2.2, `/data3/yky/.local/bin/bd`):

```
$ bd list --help | grep -E '(-l, --label|--no-labels|-s, --status|-n, --limit|--all)'
      --all                          Show all issues including closed (overrides default filter)
  -l, --label strings                Filter by labels (AND: must have ALL). Can combine with --label-any
  -n, --limit int                    Limit results (default 50, use 0 for unlimited) (default 50)
      --no-labels                    Filter issues with no labels
  -s, --status string                Filter by stored status (open, in_progress, blocked, deferred, closed). …
```

Both flags then run in the lab (same Target as below). `--status open` is pinned because the store's
default listing hides only `closed` — it still shows claimed work, which is not a triage queue:

```
$ bd list --label needs-info --status open --json --limit 0
[{"id":"lab-dr7","status":"open","labels":["needs-info"]}]
$ bd list --label needs-triage --status open --json --limit 0
[]
$ bd list --no-labels --status open --json --limit 0
[{"id":"lab-e2n","status":"open"}]
$ bd list --label ready-for-agent --status open --json --limit 0   # lab-m4a is in_progress: out
[]
$ bd list --no-labels --json --limit 0                             # the default hides closed lab-nri
[{"id":"lab-e2n","status":"open"}]
$ bd list --no-labels --all --json --limit 0                       # --all shows it
[{"id":"lab-e2n","status":"open"},{"id":"lab-nri","status":"closed"}]
```

The added bullet, verbatim:

```
- **By label**: `bd list --label <role> --status open --json --limit 0` — the open issues carrying a
  triage role label; `bd list --no-labels --status open --json --limit 0` is the untriaged read, the
  open ones carrying none. `--status open` is pinned rather than left to the store's default, which
  hides only `closed` — claimed work is not a triage queue either. `/triage` discovers its buckets
  with these; the drain's frontier is not one of them — `pick` asks for the unfiltered `bd ready` and
  applies the gate rule itself ("The frontier and the claim").
```

No other contract sentence changed.

### Every tracker mechanic named resolves to a contract row

No command appears in any of the three files — the backticked tokens are vocabulary (`handle`, `slug`,
`ready-for-agent`, `wontfix`, `decision`, `Target`, `drain`), paths (`docs/agents/issue-tracker.md`,
`docs/agents/triage-labels.md`, `docs/specs/<date>-<slug>.md`) and skill names. What the files name are
mechanics; each resolves to a contract row, and the row names the store command (`bd` 1.2.2 help
quotes). The last column is where this ticket exercised it.

| Mechanic as the file writes it | Contract row that owns it | Store command the row names — the help line that admits it | Exercised |
| --- | --- | --- | --- |
| `to-spec`: "the spec is a git document at the contract's spec path (`docs/specs/<date>-<slug>.md`)" | `## Conventions` — "The spec is a git document at `docs/specs/<date>-<slug>.md` … Documents never live in the store, and are never issues." | — (a document, not a store row) | the lab's published body `.scratch/lab/issues/01-add-hello.md`, hash unchanged by the comment run below |
| `to-spec`: "there is no spec issue and no container tier" | `## Conventions` + decision #8 (§10.5) | — (a rule about the store's shape) | — |
| `to-spec`: "the `ready-for-agent` gate label is `/to-tickets`' job at publication" | `## When a skill says "publish to the issue tracker"` step 2 | `bd create "<title>" --type task --silent --metadata '…' --labels ready-for-agent` — `-l, --labels strings  Labels (comma-separated)`; `--metadata string  Set custom metadata (JSON string or @file.json to read from file)`; `--silent  Output only the issue ID (for scripting)`; `-t, --type string  Issue type (bug|feature|task|epic|chore|decision)… (default "task")` | `bd create … --labels ready-for-agent` → `lab-dr7`, labels `["ready-for-agent"]` |
| `triage`: "how an issue is found, read" | `## When a skill says "fetch the relevant ticket"` | `bd show <id> --json`; `bd comments <id> --json`; `bd list --metadata-field handle=<handle> --all --json --limit 0` — `--metadata-field stringArray  Filter by metadata field (key=value, repeatable)`; `--all  Show all issues including closed`; `-n, --limit int … (use 0 for unlimited)` | `bd list --metadata-field handle=lab/01 --all --json --limit 0` → one issue, `lab-dr7` |
| `triage`: "a role is a **label**: one role at a time, and applying one replaces the last" | `## Labels: the gate and the brake` | `bd update <id> --add-label needs-info --remove-label ready-for-agent` — `--add-label strings  Add labels (repeatable)`; `--remove-label strings  Remove labels (repeatable)` | the brake transcript below: `labels: ["needs-info"]` |
| `triage`: "publication applies the `ready-for-agent` gate, and moving it off an issue is the operator's **brake**" | same row; the gate rule the drain applies is `pick.ts:30,57` (§10.4) | the same label move | the pick transcript below: picked → excluded `missing-gate-label` |
| `triage`: "No role is a status; the contract's statuses are the tracker's own" | `## Statuses` (three built-ins; roles are labels, a set) | — (a rule) | the brake wrote no status: `status: open` throughout |
| `triage`: "That mapping is `docs/agents/triage-labels.md`" | setup's Section B | — | — |
| `triage`: "the buckets … on a store-backed Target its by-label read answers all three" | **the amended** `**By label**` row | `bd list --label <role> --status open --json --limit 0`; `bd list --no-labels --status open --json --limit 0` — `-l, --label strings  Filter by labels (AND: must have ALL)…`; `--no-labels  Filter issues with no labels`; `-s, --status string  Filter by stored status (open, in_progress, blocked, deferred, closed)…` | the amendment transcript above |
| `triage`: "Read the full issue or PR the way the contract's fetch step says" | fetch row | `bd show <id> --json` + `bd comments <id> --json` | `bd show lab-dr7 --json` (below) |
| `triage`: "the brief or the notes are the contract's comment — once an issue is published its body is frozen" | `## Closing, and failure` ("A comment is also where anything written after publication goes") + fetch row | `bd comment <id> "<text>"` — "Add a comment to an issue. Shorthand for 'bd comments add <id> \"text\"'." | the comment transcript below |
| `triage`: "`wontfix` is a label and never a closure — the issue stays `open`, and whatever waits on it stays blocked" | `## Labels: the gate and the brake` | the label move | — |
| `triage`: "apply the role directly" (quick override) | labels row | the label move | — |
| `triage`: "read the comments the way the contract's fetch step says" (resuming) | fetch row | `bd comments <id> --json` | below |
| `triage`: "If the contract names a request surface for external pull requests" | the PR-flag section of the GitHub/GitLab templates; the beads contract names none | — (the branch never fires on a store-backed Target) | — |
| `ask-matt`: "each issue is a bead carrying a `handle`" | `## Identity: the two metadata keys` | `--metadata '{"handle":…,"slug":…}'` on the create; read back by `bd list --metadata-field handle=<handle> --all --json --limit 0` | `bd create … --metadata '{"handle":"lab/01","slug":"add-hello"}'`; `bd show` reads both back |
| `ask-matt`: "its blocking edges are the store's own edges" | publish step 3 | `bd dep add <blocked-id> <blocker-id>` — "…both mean 'issue-123 depends on (is blocked by) the specified issue.'"; `-t, --type string  Dependency type (…|blocks|…) (default "blocks")` | `bd dep add lab-i7b lab-7e3` → the dependent left `bd ready`, its status still `open` |
| `ask-matt`: "the gate label `ready-for-agent` is what a drain picks up, and pulling that label off an issue is the **brake**" | labels row + `## The frontier and the claim` | the label move; `bd ready --json --limit 0` — `-n, --limit int  Maximum issues to show (use 0 for unlimited) (default 100)` | the pick transcript below |
| `ask-matt`: "a decision issue is the store's `decision` type, a type rather than a folder" | `## Wayfinding operations` ("a bead of type `decision`") | `bd create --type decision` — `-t, --type string  Issue type (…|decision)… dec/adr→decision` | `pick.ts:56` excludes by type (`decision-type`); `pick-repro.ts` covers a brand-new flavour |
| `ask-matt`: "it writes the tracker contract (`docs/agents/issue-tracker.md`) and the label vocabulary beside it" | setup's Sections A and B | — | ticket `01`'s lab (`docs/agents/issue-tracker.md` written, 247 lines) |
| `ask-matt`: "a drain works it unattended" | the `drain` skill (ticket `02`), not a store command | — | — |

### A role move really moves the frontier

Throwaway Target `/tmp/rest-contract-lab-A3bi` (`git init -b main`, one seed commit,
`bd init --prefix lab --non-interactive --skip-agents --skip-hooks`), one issue published with the
gate label by the contract's create shape. The frontier is the pack's own `pick` node run against that
Target — the store's answer plus `pick`'s rules, not a paraphrase:

```
$ bd show lab-dr7 --json                     # published with the gate
{"id":"lab-dr7","status":"open","labels":["ready-for-agent"],"metadata":{"slug":"add-hello","handle":"lab/01"}}
$ bd ready -l ready-for-agent --json --limit 0     # the gated query the design sketch names
[{"id":"lab-dr7","labels":["ready-for-agent"],"status":"open"}]
$ bd ready --json --limit 0                        # the store unfiltered: the gate is not the store's rule
[{"id":"lab-dr7","labels":["ready-for-agent"],"status":"open"}]

$ ARTIFACTS_DIR=…/art1 bun …/scripts/pick.ts       # the drain's frontier claims it
["lab/01"]
$ cat art1/pick-exclusions.json
{"picked": [{"id": "lab-dr7", "handle": "lab/01"}], "excluded": []}

$ bd update lab-dr7 -s open                        # release the claim (an attempt's release, not a triage move)
$ bd update lab-dr7 --add-label needs-info --remove-label ready-for-agent    # the contract's brake
✓ Updated issue: lab-dr7 — 01 — add hello
$ bd show lab-dr7 --json
{"id":"lab-dr7","status":"open","labels":["needs-info"],"metadata":{"slug":"add-hello","handle":"lab/01"}}
$ bd ready -l ready-for-agent --json --limit 0     # the gated query: dropped
[]
$ bd ready --json --limit 0                        # the store still offers it — the gate is the pack's rule
[{"id":"lab-dr7","labels":["needs-info"],"status":"open"}]

$ ARTIFACTS_DIR=…/art2 bun …/scripts/pick.ts       # the real frontier after the brake
[]
$ cat art2/pick-exclusions.json
{"picked": [], "excluded": [{"id": "lab-dr7", "handle": "lab/01", "rule": "missing-gate-label"}]}
```

Two readings worth naming. **The store's unfiltered `bd ready` does not drop the issue** — deliberately:
per §10.4's implemented departure the gate is `pick`'s own rule (`pick.ts:30,57`), so the check the task
sketched ("show `bd ready` dropping it") holds for the gated query and for the pack's frontier and
*not* for the unfiltered query the pack actually reads. The transcript shows both rather than asserting
the wrong one. **The brake writes no status**: the issue is `open` before, during and after the move;
the only status write in the transcript is the lab releasing the claim.

### A brief written after publication is a comment

The body is a file that never changes after publication, so the brief has to go to the store's comment —
which the contract's comment row accepts:

```
$ bd comment --help | head -3
Add a comment to an issue.

Shorthand for 'bd comments add <id> "text"'.

$ sha256sum .scratch/lab/issues/01-add-hello.md         # the body, before
2dc8f6ecd30083f33444ba84e32c318ddc222129e00421a33204065bb3c42e05  .scratch/lab/issues/01-add-hello.md
$ bd comment lab-dr7 "Agent brief (written after publication): reproduce from the reporter's steps; the fix belongs at the greeting seam."
✓ Comment added to lab-dr7 — 01 — add hello
$ bd comments lab-dr7 --json
[{"author":"yangkunyi","text":"Agent brief (written after publication): reproduce from the reporter's steps; the fix belongs at the greeting seam."}]
$ sha256sum .scratch/lab/issues/01-add-hello.md         # the body, after: byte-identical
2dc8f6ecd30083f33444ba84e32c318ddc222129e00421a33204065bb3c42e05  .scratch/lab/issues/01-add-hello.md
```

### The diffs, quoted by section

Against the upstream copies in `/data3/yky/pi-agent-config/skills/`.

**`to-spec/SKILL.md`** — *description, intro pointer, process step 3* (the draft, seams and template are
untouched):

```
-description: Turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
+description: Turn the current conversation into a spec — no interview, just synthesis of what you've already discussed.
-The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.
+The tracker's contract is `docs/agents/issue-tracker.md`; run `/setup-matt-pocock-skills` if it is missing. The contract owns where a spec lives and how the issues it produces reach the tracker.
-3. Write the spec using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label - no need for additional triage.
+3. Write the spec using the template below, and place it where the contract's spec convention puts it. On a store-backed Target the spec is a git document at the contract's spec path (`docs/specs/<date>-<slug>.md`) — there is no spec issue and no container tier — and the `ready-for-agent` gate label is `/to-tickets`' job at publication: it goes on the issues a spec produces, and this skill applies no triage role of its own.
```

**`triage/SKILL.md`** — *intro*, *Roles*, *Invocation*, *Show what needs attention*, *Gather context*,
*Apply the outcome*, *Quick state override*, *Resuming*. The five role names, the two category names and
the transition sentence are byte-identical:

```
-Move issues on the project issue tracker through a small state machine of triage roles.
+Move issues through a small state machine of triage roles. Every tracker mechanic is the tracker contract's — `docs/agents/issue-tracker.md`, with the label vocabulary beside it; run `/setup-matt-pocock-skills` if either is missing. That file owns how an issue is found, read, labelled and commented on; this skill names no commands of its own.
-If this repo treats external pull requests as a request surface (see the issue-tracker config), triage covers them too: **a PR is an issue with attached code** — same roles, same states, same machine, with a few deltas marked "for a PR" below. Resolve a bare `#42` to an issue or PR per the tracker config.
+If the contract names a request surface for external pull requests, triage covers it too: **a PR is an issue with attached code** — same roles, same machine, with a few deltas marked "for a PR" below. Resolve a bare reference — an id, or a handle — to an issue or PR the way the contract's fetch step says.
-Every comment or issue posted to the issue tracker during triage **must** start with this disclaimer:
+Every comment or issue posted to the tracker during triage **must** start with this disclaimer:
+The contract owns how a role is applied. On a store-backed Target a role is a **label**: one role at a time, and applying one replaces the last — publication applies the `ready-for-agent` gate, and moving it off an issue is the operator's **brake**. No role is a status; the contract's statuses are the tracker's own.
-For a PR, the same states read against the attached code: …
+For a PR, the same roles read against the attached code: …
-These are canonical role names — the actual label strings used in the issue tracker may differ. The mapping should have been provided to you - run `/setup-matt-pocock-skills` if not.
+These are canonical role names — the label strings the target's own mapping gives them may differ. That mapping is `docs/agents/triage-labels.md`.
-- "Let's look at #42" (issue or PR)
+- "Let's look at #42" (an issue or PR, by whatever reference the contract takes)
-Query the issue tracker and present three buckets, oldest first:
+Read the buckets off the tracker, oldest first — the contract's fetch step owns how; on a store-backed Target its by-label read answers all three:
-… (the tracker config defines who counts as external) …
+… (the contract defines who counts as external) …
-1. **Gather context.** Read the full issue or PR (body, comments, labels, author, dates; for a PR, the diff too). …
+1. **Gather context.** Read the full issue or PR the way the contract's fetch step says (body, comments, labels, author, dates; for a PR, the diff too). …
-5. **Apply the outcome:**
+5. **Apply the outcome.** The role is the contract's move, and the brief or the notes are the contract's comment — once an issue is published its body is frozen, so the conversation is the store's:
-   - `wontfix` — close, with the comment depending on *why*:
+   - `wontfix` — apply the role, with the comment depending on *why*:
-     - **Rejected (bug)** — polite explanation, then close.
-     - **Rejected (enhancement)** — write to `.out-of-scope/`, link to it from a comment, then close ([OUT-OF-SCOPE.md](OUT-OF-SCOPE.md)).
+     - **Rejected (bug)** — polite explanation, then the role.
+     - **Rejected (enhancement)** — write to `.out-of-scope/`, link to it from a comment, then the role ([OUT-OF-SCOPE.md](OUT-OF-SCOPE.md)).
+   A role move is the tracker's; on a store-backed Target `wontfix` is a label and never a closure — the issue stays `open`, and whatever waits on it stays blocked.
-… Confirm what you're about to do (role changes, comment, close), then act. …
+… Confirm what you're about to do (the role move, and any comment), then act. …
-If prior triage notes exist on the issue or PR, read them, check whether…
+If prior triage notes exist on the issue or PR, read the comments the way the contract's fetch step says, check whether…
```

**`triage/AGENT-BRIEF.md`** (first line and one example criterion) and
**`triage/OUT-OF-SCOPE.md`** (the KB's purpose, the confirm bullet, the already-implemented rule, flow
step 6):

```
-An agent brief is a structured comment posted on a GitHub issue or PR when it moves to `ready-for-agent`.
+An agent brief is a structured comment posted on the issue or PR when it moves to `ready-for-agent`.
-- **Good:** "Running `gh issue list --label needs-triage` returns issues that have been through initial classification"
+- **Good:** "The tracker's `needs-triage` listing returns issues that have been through initial classification"
-1. **Institutional memory** — why a feature was rejected, so the reasoning isn't lost when the issue is closed
+1. **Institutional memory** — why a feature was rejected, so the reasoning isn't lost once the request is turned down
-- **Confirm** — the new issue gets added to the existing file's "Prior requests" list, then closed
+- **Confirm** — the new issue gets added to the existing file's "Prior requests" list, then given the `wontfix` role
-Do **not** write here when something is closed as `wontfix` because it's **already implemented**. … Instead, the closing comment points to where the feature already lives.
+Do **not** write here when something is given `wontfix` because it's **already implemented**. … Instead, the comment points to where the feature already lives.
-6. Close the issue with the `wontfix` label
+6. Apply the `wontfix` role — the tracker's own move, not a status: on a store-backed Target the issue stays `open`, because a closure there means the work is in Main
```

**`ask-matt/SKILL.md`** — *main-flow step 3*, *context hygiene*, *triage on-ramp*, *wayfinder on-ramp*,
*Precondition*:

```
-   - **Yes** → **`/to-spec`** (turn the thread into a spec), then **`/to-tickets`** to split it into tracer-bullet tickets, each declaring its **blocking edges**. On a local tracker that's one file per ticket under `.scratch/<feature>/issues/`, worked blockers-first by hand; on a real tracker the edges become native blocking links, so any ticket whose blockers are done can be grabbed — kick off **`/implement`** per ticket, **`/clear`ing context between each one**. Each ticket is self-contained, so the last one's context is disposable.
+   - **Yes** → **`/to-spec`** (turn the thread into a spec document), then **`/to-tickets`** to split it into tracer-bullet issues, each declaring its **blocking edges**. The tracker's contract — `docs/agents/issue-tracker.md` — owns the shape they take there: on a store-backed Target each issue is a bead carrying a `handle`, its blocking edges are the store's own edges, the gate label `ready-for-agent` is what a drain picks up, and pulling that label off an issue is the **brake**. Any issue whose blockers are done can be grabbed: a drain works it unattended, or kick off **`/implement`** per issue, **`/clear`ing context between each one**. Each issue is self-contained, so the last one's context is disposable.
-… so the grilling, spec, and tickets all build on the same thinking. Each `/implement` then starts fresh, working from the ticket.
+… so the grilling, spec, and issues all build on the same thinking. Each `/implement` then starts fresh, working from the issue.
-  Triage is only for issues **you didn't create** … Tickets that `/to-tickets` produced are already agent-ready, so **don't triage them**.
+  Triage is only for issues **you didn't create** … Issues that `/to-tickets` produced are already agent-ready, so **don't triage them**.
-it charts a **shared map** of **decision tickets** on the issue tracker and resolves them one at a time — producing **decisions, not deliverables** — until the fog is pushed back and the way is clear.
+it charts a **shared map** of **decision issues** on the tracker — on a store-backed Target those are the store's `decision` type, a type rather than a folder — and resolves them one at a time, producing **decisions, not deliverables**, until the fog is pushed back and the way is clear.
-**`/setup-matt-pocock-skills`** — run before your first engineering flow to configure the issue tracker, triage labels, and doc layout the other skills assume. Custom issue trackers also work.
+**`/setup-matt-pocock-skills`** — run before your first engineering flow to configure the issue tracker, triage labels, and doc layout the other skills assume; it writes the tracker contract (`docs/agents/issue-tracker.md`) and the label vocabulary beside it. Custom issue trackers also work.
```

### Gates

The change is prose; the pack is untouched. From this repo:

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(exit 0, no output)
$ timeout 1800 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
… ok yaml-contract-repro.ts  {"ok":true}
18/18 repros passed
```

All three frontmatter blocks parse under bun's YAML parser (`Bun.YAML.parse`): `name` equals the folder,
`disable-model-invocation: true`, descriptions 106 / 137 / 83 characters. No `bd`, `gh`, `glab`, `npm` or
`bun` command is named anywhere in the three folders. The lab `/tmp/rest-contract-lab-A3bi` and every
scratch script under `/tmp` were removed; `git worktree list` in this repo is unchanged.

### Judgement calls, and what the ticket did not settle

1. **The contract amendment.** Above, with the supervisor's four conditions. The ticket's own text ("the
   rest read the contract") did not anticipate it; leaving the gap would have made `triage` improvise a
   command, which is the failure it exists to prevent.
2. **Triage's supporting docs were edited although the ticket names the three skills.** `AGENT-BRIEF.md`
   and `OUT-OF-SCOPE.md` are reached from `triage/SKILL.md`, and both instructed a GitHub-shaped
   mechanic (`gh`, and closing an issue as `wontfix`). Same precedent as ticket `03` editing the
   `agents/openai.yaml` files: the folder is the skill, and a copy that keeps a contradiction is worse
   than a named small edit. The quoted sample briefs inside them are left as samples.
3. **`--no-labels` returns every open unlabeled issue, which is a superset of "never triaged".** On a
   store-backed Target, publication always applies the gate label, so the bucket is normally empty;
   hand-made beads that never went through `/to-tickets` also land in it. The skill presents the bucket
   and the maintainer picks, exactly as upstream — noted here rather than papered over.
4. **The local tracker keeps its own shape.** `triage` says the contract owns the move and names the
   store-backed fact (a role is a label); the local template's own `Status:`-line convention is
   untouched, and a local Target's behaviour still comes from its own `docs/agents/issue-tracker.md`.
   Ticket `03` made the same call for `to-tickets`.
5. **Discovery wording.** The upstream skill's "Query the issue tracker and present three buckets" is
   now "Read the buckets off the tracker … on a store-backed Target its by-label read answers all
   three", so the sentence resolves to the amended row instead of implying a mechanic no contract owns.
6. **`ask-matt`'s `PHASE-BOUNDARIES.md` and the three `agents/openai.yaml` files needed no edit**: no
   tracker mechanics in them, and the short descriptions ("Turn a conversation into a spec", "Move
   issues through triage roles", "Find the right skill or workflow") are already tracker-neutral.
