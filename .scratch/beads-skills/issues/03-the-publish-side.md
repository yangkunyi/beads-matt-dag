# 03 — the publish side reads the contract

**What to build:** `to-tickets` publishes into the store the way the contract says, and `implement` takes its
input from the handle plus the body path instead of from a status line. Publishing writes the body file
(frozen, no status in it) and the store row with the `handle` and `slug` metadata, adds the gate label only
when the issue has no blockers, and records one edge per `Blocked by` entry. `implement`'s stale
"leave the `Status:` line unchanged" sentence becomes the hand-run contract: claim the issue first, never
close anything, derive the branch and worktree names from the handle and slug exactly as the drain does.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.5, §10.7)
**Blocked by:** `01`
**Status:** BLOCKED

- [x] `to-tickets` no longer writes, mentions or implies the `Status:` line, the eight-status lifecycle, or
      the `READY`/`BLOCKED` values; the published body is the prose and the handle, nothing else
- [x] publishing writes both metadata keys and the gate label — **unconditionally**, because readiness is the
      store's own derivation and a blocker is an edge, never a label value. The contract's shape:
      `bd create "<title>" --type task --silent --metadata '{"handle":…,"slug":…}' --labels ready-for-agent`,
      then one `bd dep add <blocked-id> <blocker-id>` per `Blocked by` entry. Writing no status at all is the
      point: the local tracker's conditional `READY`/`BLOCKED` must **not** reappear as a conditional label
- [x] each `Blocked by` entry becomes one store edge in the direction the pack expects — the blocker blocks
      the dependent — and that direction is **read back**, not assumed: the Comments show the store's own
      answer (`ready` before, `blocked` after) from a throwaway Target
- [x] a second publish of the same handle refuses and names the existing issue; it never silently duplicates
- [x] `implement` states the hand-run contract (claim first; never close; derive names from handle and slug)
      and says what a drain-launched worker is instead: read-only in the store, enforced by the pack
- [x] both files read the contract for command shapes and invent no commands of their own
- [x] vocabulary unified across both files (Q10), with the spec-path heuristic (`docs/specs/…`) left intact
- [x] nothing under `.archon/` changes

## Comments

Implemented on branch `main`. Four paths written — the two skill folders copied from
`/data3/yky/pi-agent-config/skills/` (their `SKILL.md` then edited, their `agents/openai.yaml` short
description re-worded), and this ticket. The upstream copies are untouched
(`sha256 46bc8343…` for `to-tickets/SKILL.md`, `d8469b54…` for `implement/SKILL.md`, both unchanged on
disk; `diff -rq` between each source folder and its copy was empty when copied), and nothing was
installed into `~/.pi/agent/skills` (that is `05`). `/data3/yky/endo_label` and `/data3/yky/workflow`
were read, never written. Nothing under `.archon/` changed:

```
$ git status --porcelain
?? skills/implement/
?? skills/to-tickets/
$ git status --porcelain -- .archon ; git diff --stat HEAD -- .archon
(no output both times)
```

**What was written**

- `skills/to-tickets/SKILL.md` (85 lines) — the publish side, re-worded in place: the unit is the
  **issue**; the tracker contract (`docs/agents/issue-tracker.md`) owns commands, identities and the
  publish step; drafting assigns a handle (`<feature>/<NN>`) and a slug; step 5 states what publication
  does on any tracker (one issue per slice; both keys with the issue; a handle names one issue; one
  blocking edge per `Blocked by` entry; the gate label unconditionally) and one body template
  (`# <handle> — <title>` + prose + criteria). The eight-status lifecycle, the `Status:` line and the
  `READY`/`BLOCKED` values are gone from the file, as are the two tracker-shaped branches and their two
  templates — the contract's convention owns each tracker's shape now.
- `skills/implement/SKILL.md` (34 lines) — the brief is a handle plus a body path; three sections: where
  the work goes (branch/worktree/body derived from handle + slug, the same derivation the drain makes, so
  the repair can find the merge), state (drain worker read-only; hand-run claims first; closing never
  yours), and the existing work instructions (`/tdd`, typecheck, tests, `/code-review`, commit).
- `skills/{to-tickets,implement}/agents/openai.yaml` — `short_description` only: "…tracer-bullet
  tickets" → "…tracer-bullet issues"; "Build work from a spec or tickets" → "Build work from a spec or
  an issue". Display names unchanged.

### Cross-check: every command the two files name

Neither file names a store command any more — that is criterion 6, and it is the point of §10.7's "the
tracker config is the only file that spells out store commands". What the files name are **actions**,
each owned by a contract row, each row admitted by the store's own help and already used by the pack.
The help quotes are from this machine's `bd` 1.2.2 (`/data3/yky/.local/bin/bd`); `store.ts`, `pick.ts`,
`naming.ts`, `reconcile.ts`, `worker-env.ts` are under
`.archon/workflows/beads-dag/beads-dag-drain/scripts/`; `target.ts` is under its `tests/`. The last
column is the command that was actually run in the `/tmp` lab below.

| Action as the file writes it | The contract row that owns the command | The help line that admits it | The pack's own use | Exercised in the lab |
| --- | --- | --- | --- | --- |
| "Look the handle up first, with the contract's by-handle lookup" (`to-tickets` §5) | `bd list --metadata-field handle=<h> --all --json --limit 0` | `--metadata-field stringArray  Filter by metadata field (key=value, repeatable)`; `--all  Show all issues including closed`; `-n, --limit int … (use 0 for unlimited)` | `store.ts:245` (`issueByHandle`) | `bd list --metadata-field handle=lab/01 --all --json --limit 0` → one issue, `lab-wd8` |
| "The two keys go on with the issue … by the contract's creation step" (`to-tickets` §5) | `bd create "<title>" --type task --silent --metadata '{"handle":…,"slug":…}'` | `--metadata string  Set custom metadata (JSON string or @file.json …)`; `-t, --type string  Issue type …`; `--silent  Output only the issue ID (for scripting)` | `target.ts:170-181` (`publishIssue` builds exactly these args) | `bd create … --silent` → `lab-wd8`; `bd show lab-wd8 --json` → `metadata: {"slug":"add-hello","handle":"lab/01"}` |
| "The gate label goes on at publication, unconditionally" (`to-tickets` §5) | `--labels ready-for-agent` on the create; the brake is `bd update <id> --add-label … --remove-label ready-for-agent` | `-l, --labels strings  Labels (comma-separated)`; `--add-label strings` / `--remove-label strings` | `pick.ts:30` (`GATE_LABEL`), read at `pick.ts:57`; `target.ts:34,171-180` | `bd show lab-wd8 --json` → `labels: ["ready-for-agent"]`, blocker or not |
| "Every `Blocked by` entry becomes one blocking edge" (`to-tickets` §5) | `bd dep add <blocked-id> <blocker-id>` | "bd dep add issue-123 issue-456 … both mean 'issue-123 depends on (is blocked by) the specified issue.'"; `-t, --type string  Dependency type (…|blocks|…) (default "blocks")` | `pick-repro.ts:62` (`bd(root, "dep", "add", blocked.id, eligible.id)`) | `bd dep add lab-ov4 lab-wd8` → "lab-ov4 … depends on lab-wd8 … (blocks)", read back below |
| "A hand-run claims first" (`implement` §State) | `bd update <id> -s in_progress` | `-s, --status string  New status` (and `--claim  Atomically claim the issue (sets assignee to you, status to in_progress …)`, which this flow does not use) | `target.ts:205`; the drain's own claim is the same transition through `store.ts:269` (`claimIssues`, `bd batch`) | `bd update lab-ov4 -s in_progress` accepted; `bd ready` then omits it |
| "A drain-launched worker makes no store writes — `BD_READONLY=1` … `worker-env.ts`" (`implement` §State) | the contract's "read-only mode (`BD_READONLY=1`)" sentence | `--readonly  Read-only mode: block write operations (for worker sandboxes)` (global flag; the same switch by env var) | `worker-env.ts:17,25` (`READONLY_ENV = "BD_READONLY"`, added to the runner's environment); `worker-readonly-repro.ts` | `BD_READONLY=1 bd update lab-ov4 -s in_progress` → `Error: operation 'update' is not allowed in read-only mode`, exit 1 |
| "Closing is never yours … by the orchestrator" (`implement` §State) | `bd close <id> --reason "merged <branch>"` | `-r, --reason string  Reason for closing` | `store.ts:306` (`closeIssue`); the reason is built by the settlement | `bd close lab-wd8 --reason "merged beads/lab/01-add-hello"` |
| "Work on the branch the issue's handle and slug name" (`implement` §Where the work goes) | the contract's naming table (`branch beads/<feature>/<NN>-<slug>`, `worktree worktrees/<feature>-<NN>-<slug>`, `body .scratch/<feature>/issues/<NN>-<slug>.md`) — not a command | — | `naming.ts:80-82` (`issueNames` — the one place the three names are spelled); `reconcile.ts:76,82` derives them back for the repair | `issueNames({handle:"lab/01",slug:"add-hello"})` → `beads/lab/01-add-hello`, `worktrees/lab-01-add-hello`, `.scratch/lab/issues/01-add-hello.md` — identical to the contract's table |

Nothing in either file names `bd`, `gh`, `glab`, `npm` or `bun`: the backticked tokens across both are
`<feature>/<NN>`, `handle`, `slug`, `ready-for-agent`, `Blocked by`, `closed`, `01`, `auth/02`,
`docs/agents/issue-tracker.md`, `BD_READONLY=1`, `worker-env.ts` and `/setup-matt-pocock-skills` — one
path, one environment variable, one pack filename, the rest vocabulary. Both frontmatter blocks parse
under bun's YAML parser (`name` matches the folder, `disable-model-invocation: true`, descriptions 199
and 99 characters).

### The edge direction, read back from the store

A throwaway Target at `/tmp/publish-side-khC9Pj` (`git init -b main`, a seed commit,
`bd init --prefix lab --non-interactive --skip-agents --skip-hooks`), then the contract's create shape
twice — `lab/01` (the blocker) and `lab/02` (the dependent) — and the store's own answers around one
`bd dep add`. Verbatim, abridged only where marked `…` (JSON objects shown by their load-bearing
fields):

```
$ bd ready --json --limit 0                     # before any edge
[ {id: lab-ov4, handle: lab/02, status: open}, {id: lab-wd8, handle: lab/01, status: open} ]
$ bd blocked --json
[]

$ bd dep add lab-ov4 lab-wd8                    # the documented direction: dependent, blocker
✓ Added dependency: lab-ov4 (02 — add goodbye) depends on lab-wd8 (01 — add hello) (blocks)

$ bd ready --json --limit 0                     # after: the dependent is gone from the frontier
[ {id: lab-wd8, handle: lab/01, … dependent_count: 1} ]
$ bd blocked --json
[ {id: lab-ov4, handle: lab/02, status: open, blocked_by_count: 1, blocked_by: ["lab-wd8"]} ]

$ bd close lab-wd8 --reason "merged beads/lab/01-add-hello"
✓ Closed lab-wd8 — 01 — add hello: merged beads/lab/01-add-hello
$ bd ready --json --limit 0                     # the closure released it; no status was written on it
[ {id: lab-ov4, status: open, dependencies: [{depends_on_id: "lab-wd8", type: "blocks"}]} ]
```

The dependent's `status` is `open` throughout — before, during and after being blocked — which is the
"no status at all" half of criterion 2: blockedness is the edge, and closing the blocker changes the
derived flag, never the dependent's status.

The reverse direction was run too, because a read-back only counts if it discriminates. Same store,
`lab/03` and `lab/04`, the edge first put the wrong way round (`bd dep add lab-hfv lab-64h` — 03
"waits" on 04), then reversed:

```
$ bd dep add lab-hfv lab-64h
$ bd blocked                                    # the intended blocker is the one listed
🚫 Blocked issues (1):
[● P2] lab-hfv: 03 — touch readme
  Blocked by 1 open dependencies: [lab-64h]
$ bd ready
○ lab-64h ● P2 04 — bump deps
○ lab-ov4 ● P2 02 — add goodbye

$ bd dep remove lab-hfv lab-64h
$ bd dep add lab-64h lab-hfv
$ bd blocked
🚫 Blocked issues (1):
[● P2] lab-64h: 04 — bump deps
  Blocked by 1 open dependencies: [lab-hfv]
$ bd ready
○ lab-hfv ● P2 03 — touch readme
○ lab-ov4 ● P2 02 — add goodbye
```

### The second publish of a handle

The skill's guard is a lookup before the creation, and the guard is load-bearing: the store itself has
no uniqueness on metadata, so it *would* silently duplicate. Both halves were run in the same lab.

```
$ bd list --metadata-field handle=lab/01 --all --json --limit 0
[ {id: lab-wd8, handle: lab/01, slug: add-hello, status: closed, close_reason: "merged beads/lab/01-add-hello"} ]
```

That answer is what `to-tickets` §5 tells its reader to stop on and name — one issue, `lab-wd8`. What
happens without the guard:

```
$ bd create "01 — add hello (republished)" --type task --silent --metadata '{"handle":"lab/01","slug":"add-hello"}' --labels ready-for-agent
lab-e6k
$ bd list --metadata-field handle=lab/01 --all --json --limit 0 | grep -E '"id"|handle'
    "id": "lab-e6k",
      "handle": "lab/01"
    "id": "lab-wd8",
      "handle": "lab/01"
```

Two issues now answer to one handle — and the drain's own lookup refuses exactly that, which is the
sentence the file gives as the reason:

```
$ bun /tmp/publish-side-drain-lookup.ts        # store.ts issueByHandle against the same Target
refused: handle lab/01 names 2 issues (lab-e6k, lab-wd8): a handle is an issue's identity in git, so it names exactly one
```

### `implement`'s hand-run path, against the flow's real behaviour

Every clause in the new `implement` was checked against the pack rather than assumed:

- **read-only, pack-enforced.** `worker-env.ts:17,25` sets `BD_READONLY=1` in the environment the drain
  hands a runner (`workerEnv`), and the lab showed the refusal from the store itself: `BD_READONLY=1 bd
  update lab-ov4 -s in_progress` → `Error: operation 'update' is not allowed in read-only mode` (exit 1),
  while the same update without the variable was accepted. The repo's own `worker-readonly-repro.ts`
  passes with `{"ok":true}`.
- **claim first.** `bd update <id> -s in_progress` is the contract's hand-run row (and `target.ts:205`
  does the same); after it the issue left `bd ready`, which is what "out of every drain's frontier"
  means.
- **never close.** The contract's "Closing, and failure" is the only closure path, and the pack's
  `store.ts:306` `closeIssue` is called from the settlement after the merge — never by a worker, which
  cannot write at all.
- **names from handle and slug.** `naming.ts:80-82` is the single derivation; run against the lab's
  published keys it returns exactly the contract's three names (quoted in the table above), and
  `reconcile.ts:76,82` re-derives the branch from the same two keys to decide whether a stopped attempt
  landed — which is why the skill says a branch named anything else is invisible to the repair.

### Gates

The change is prose; the pack is untouched. Baseline before the edits and after them, from this repo:

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(exit 0, no output both times)
$ timeout 300 bun .archon/workflows/beads-dag/beads-dag-drain/tests/worker-readonly-repro.ts   # before
feat/03: the worker tried to write the store
{"ok":true}
$ timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts               # after
ok   brief-repro.ts … ok yaml-contract-repro.ts
18/18 repros passed
```

The lab `/tmp/publish-side-khC9Pj` and every scratch script under `/tmp` were removed; `git worktree
list` in this repo is unchanged.

### Judgement calls, and what the ticket did not settle

1. **The ticket's own "What to build" paragraph is stale against its criterion.** The paragraph says
   "adds the gate label only when the issue has no blockers"; the criterion below it and the task's
   instruction say **unconditionally**. The unconditional reading is the one implemented — matching
   §10.4 ("publication applies it automatically") and the contract — and the paragraph wants a one-line
   fix in a docs commit, not here.
2. **The local-markdown tracker keeps its own shape.** `to-tickets` no longer names the `Status:` line
   for any tracker, and no longer branches per tracker at all: the contract's convention owns the body's
   header. A local-markdown Target's `issue-tracker.md` still says `/to-tickets` writes the initial
   `READY`/`BLOCKED`, so that behaviour survives through the contract, where it belongs; a beads Target's
   contract writes no status, and the skill is silent for both. If the set were ever intended to remove
   the local lifecycle outright, that is an edit to `issue-tracker-local.md`, which no ticket owns.
3. **§9's pre-existing bug is re-worded, not fixed.** Step 3's "Scan existing `.scratch/*/issues/*.md …
   Same-Feature edges may use `NN` alone" hardcoded the local tracker; it now defers ("Look up the issues
   that already exist … the contract says how"). §9 says that fix needs its own approval; ticket `03` is
   the file's owner, so it is done here in the smallest form that removes the shape assumption, and the
   same-Feature `NN` shorthand is left to the local contract that defined it. A GitHub/GitLab Target's
   draft-id display (`<feature>/<NN>`) is still the pre-existing gap §9 names — deliberately not widened.
4. **The spec-path heuristic.** Neither source file ever named `docs/specs/…`; what was preserved is the
   ability to be handed a spec path — `to-tickets` step 1 still takes "a spec path, an issue's handle,
   number or URL", and `implement` keeps a spec clause ("a spec is not an issue: it has no handle, no
   claim and no branch of its own"). Read the criterion as "the heuristic still holds", per §10.7's note
   about `code-review`.
5. **The two templates became one.** `<local-ticket-template>` and `<issue-template>` were both shape
   assumptions; one `<issue-body-template>` (`# <handle> — <title>` + prose + criteria) remains, with one
   sentence saying the contract adds whatever header its tracker's convention defines. This is the
   largest single deletion in the diff and the one most worth a reviewer's eye.
