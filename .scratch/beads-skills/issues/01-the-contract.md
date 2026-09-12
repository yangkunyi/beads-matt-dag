# 01 — the contract, and the installer that writes it

**What to build:** The store-backed tracker contract as a file this repo owns — the beads twin of
`issue-tracker-local.md` — plus the `setup-matt-pocock-skills` change that offers it and writes it into a
Target as `docs/agents/issue-tracker.md`. That file is the **only** place store commands are described;
every other skill in the set reads it instead of assuming a file shape. Write it from the pack's real
contract — `beads-dag-drain/scripts/store.ts` and `naming.ts`, and `pick.ts` for the gate — and from
§10.5/§10.7 of the consensus doc, never from memory of the store's own documentation.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.5, §10.7)
**Blocked by:** None
**Status:** BLOCKED

- [x] the file declares, in one place, each of these clauses: how the store binary is found (the Target's
      `store:` config key first, then `bd` on PATH); the command vocabulary the pack's contract needs (create
      with a body, read and write metadata, the ready/claim path, status moves, close with a reason, comment,
      dependency edges, labels, history); the boundary rules — only the orchestrator closes and only as
      `merged <branch>`, a failed attempt is an event (a comment, then back to `open`), a body carries no
      `Status:` line and no state at all; the gate label `ready-for-agent` and what pulling it means; the two
      metadata keys `handle` and `slug` and the exact names derived from them (`beads/<feature>/<NN>-<slug>`,
      `worktrees/<feature>-<NN>-<slug>`, `.scratch/<feature>/issues/<NN>-<slug>.md`); the decision issue type
      and the rule that closure never crosses domains; and where a run's artifacts and reports live
- [x] every store command the file names exists: cross-check each one against the store's own CLI help and
      against the pack's own use of it, and quote both in the Comments
- [x] `setup-matt-pocock-skills` offers the beads tracker in its Section A next to the existing choices, and
      when it is chosen the skill writes this file to `docs/agents/issue-tracker.md` — the same path and name
      the other skills already read
- [x] the setup skill's other tracker-touching sentences are re-read and brought to the contract's
      vocabulary, not appended to (Q10)
- [x] running the setup flow against a throwaway `/tmp` git repo with the beads tracker chosen produces that
      file, and the Comments quote its first lines and its `wc -l`
- [x] nothing under `.archon/` changes: this feature writes instructions, never the runtime

## Comments

Implemented on branch `main`. Two paths written: a copy of the machine's
`skills/setup-matt-pocock-skills/` under this repo's `skills/`, then edits to the copies, and this ticket.
Nothing was installed (that is `05`); `/data3/yky/pi-agent-config/skills` and `~/.pi/agent/skills` were read,
not written. `git status` shows no file under `.archon/`.

**What was written**

- `skills/setup-matt-pocock-skills/issue-tracker-beads.md` (247 lines) — the store-backed contract, in one
  place: store resolution, the command vocabulary, the boundary rules, the gate and the brake, the two
  metadata keys and the three derived names, the domain boundary, the artifacts. It is the twin of
  `issue-tracker-local.md`, and its `## When a skill says ...` and `## Wayfinding operations` headings match
  the house skeleton.
- `skills/setup-matt-pocock-skills/SKILL.md` — Section A gains **Beads** (and `.beads/` became an exploration
  signal, so a repo that owns a store proposes beads); step 4's seed list gains `issue-tracker-beads.md`; four
  existing tracker-touching sentences were re-worded in place (intro bullet, `.scratch/` exploration bullet,
  Section A explainer, default-posture paragraph). The diff against the machine copy is quoted at the end.

### Cross-check: every command the contract names

The help quote is from `bd <cmd> --help` on this machine's `bd` 1.2.2 (`/data3/yky/.local/bin/bd`). The pack
line is where the pack builds or relies on that exact call (`store.ts` is
`.archon/workflows/beads-dag/beads-dag-drain/scripts/store.ts`; `target.ts` is
`beads-dag-drain/tests/target.ts`).

| Command as the contract spells it | The help line that admits it | The pack file:line that relies on it |
| --- | --- | --- |
| `bd init --prefix <name>` | "Initialize bd in the current directory by creating a .beads/ directory"; `-p, --prefix string  Issue prefix` | `tests/target.ts:139` (`initStore` builds `init --prefix … --non-interactive --skip-agents --skip-hooks`); `store.ts:88` names `bd init` in the preflight refusal |
| `bd create "<title>" --type task --silent --metadata '…' --labels …` | `--metadata string  Set custom metadata (JSON string or @file.json …)`; `-l, --labels strings  Labels (comma-separated)`; `--silent  Output only the issue ID (for scripting)`; `-t, --type string  Issue type (…|decision)` | `tests/target.ts:171-180` (`publishIssue` builds exactly these args) |
| `bd list --metadata-field handle=<h> --all --json --limit 0` | `--metadata-field stringArray  Filter by metadata field (key=value, repeatable)`; `--all  Show all issues including closed`; `-n, --limit int  … (use 0 for unlimited)`; `--json` (global) | `store.ts:246` (`issueByHandle`) |
| `bd show <id> --json` | `--json  Output in JSON format` (global) | `tests/target.ts:231` |
| `bd ready --json --limit 0` | `-n, --limit int  Maximum issues to show (use 0 for unlimited) (default 100)` | `store.ts:183` (`READY_ARGS`), used by `pick.ts:99` |
| `printf 'update <id> status=in_progress\n' \| bd batch` | `update <id> <key>=<value> …`; "Supported 'update' keys: status, priority, title, assignee"; "on any error the whole batch is rolled back" | `store.ts:268-272` (`claimIssues`) |
| `bd update <id> -s in_progress` | `-s, --status string  New status` | `tests/target.ts:205`; the same transition, written back, at `store.ts:348` |
| `bd comment <id> "<text>"` | "Add a comment to an issue. Shorthand for 'bd comments add <id> \"text\"'." | `store.ts:347` |
| `bd comments <id> --json` | "bd comments bd-123 --json  # List comments in JSON format" | `store.ts:319` |
| `bd update <id> -s open` | `-s, --status string  New status` | `store.ts:348` |
| `bd close <id> --reason "merged <branch>"` | `-r, --reason string  Reason for closing` | `store.ts:307`; the reason is built at `settle.ts:67` |
| `bd dep add <blocked-id> <blocker-id>` | "…both mean 'issue-123 depends on (is blocked by) the specified issue.'"; `-t, --type string  … (default "blocks")` | `tests/pick-repro.ts:62`; `tests/domain-repro.ts:187` |
| `bd dep remove <dependent> <blocker>` | "Remove a dependency"; `bd dep remove [issue-id] [depends-on-id]` | `domains.ts:39` (the refusal tells the operator this is the fix) |
| `bd update <id> --add-label … --remove-label …` | `--add-label strings  Add labels (repeatable)`; `--remove-label strings  Remove labels (repeatable)` | `tests/target.ts:221` (`moveToTriage`); the gate label the drain reads is `pick.ts:44,50` |
| `bd history <id>` | "Show the complete version history of an issue, including all commits where the issue was modified." | **none — Findings 2**. The design record's home for transitions (§10.1, §10.5); the pack's README points at "the store's own history" (`README.md:72`), and pack ticket `12` is where the report starts reading it |
| `bd update <id> --assignee <dev>` | `-a, --assignee string  Assignee` | **none — Findings 3**. Used only in `## Wayfinding operations`; `store.ts:264-267` says "no step of this flow reads it", and the reliance is wayfinder's own contract (`wayfinder/SKILL.md:67`) plus §8's mapping |
| `bd recompute-blocked` | "Recompute the denormalized is_blocked flag for every issue and wisp." | `store.ts:286`, called at `open.ts:32` |
| `bd dolt push` | "Push local Dolt commits to the configured remote." | `store.ts:295`, called at `backup.ts:19` |
| `bd dolt remote add <name> <url>` | `add <name> <url>   Add a new remote` | `backup.ts:5` (the command it tells the operator to run) |

The one non-command in the file is the environment variable `BD_READONLY=1` (`worker-env.ts:17,25`; `bd --help` shows the same switch as `--readonly`). No command in the file lacks a help line, and the two rows without a pack call are the two findings below — not silent choices.

### The `/tmp` exercise

A throwaway git repo that already owns a store, the Section A choice for beads, then the write the skill
describes (the seed template copied to `docs/agents/issue-tracker.md`):

```
$ LAB=$(mktemp -d /tmp/beads-setup-final-XXXX); cd "$LAB"
$ git init -b main -q; git commit …            # one seed commit
$ bd init --prefix lab --non-interactive --skip-agents --skip-hooks
$ ls -a                                        # exploration now finds the store
.  ..  .beads  .git  .gitignore  README.md
$ git remote -v                                # no remote
$ mkdir -p docs/agents
$ cp …/skills/setup-matt-pocock-skills/issue-tracker-beads.md docs/agents/issue-tracker.md
$ ls -l docs/agents
-rw-rw-r-- 1 yky yky 11650 … issue-tracker.md
$ head -4 docs/agents/issue-tracker.md
# Issue tracker: Beads

Issues for this repo live in a beads store — the repo's own `.beads/` database, driven by the `bd` CLI.
The issue's prose is a markdown file under `.scratch/`, frozen once published; its identity, status,
$ wc -l -c docs/agents/issue-tracker.md
  247 11650 docs/agents/issue-tracker.md
$ diff -q docs/agents/issue-tracker.md …/issue-tracker-beads.md && echo IDENTICAL
IDENTICAL
```

The same commands in the contract's table were then run against a second throwaway store (`bd init`, create
with metadata + labels, `bd dep add`, `ready`, the `bd batch` claim, `bd comment`, `comments --json`,
`bd history`, the label move, `--assignee`, `close --reason`, `dep remove`, `recompute-blocked`,
`dolt remote add`): all accepted, all produced the state the contract says they do. Both labs are removed.
Neither `/data3/yky/endo_label` nor `/data3/yky/workflow` was touched.

### Findings — where the pack and the design record disagree

1. **`--spec-id`: the record says a bead points at its document with it; the pack never reads it.**
   Decision #10, §5.8 and §8's mapping all say `bd create … --spec-id docs/specs/…` links a bead to its
   document. `grep -rn 'spec_id\|spec-id' .archon/` returns nothing, and `naming.ts:76-82` derives the body
   path from `handle` + `slug`; §10.5 itself says "The body file and the bead are joined only by the handle,
   and they share no field". The contract follows the pack — the path is derived, `--spec-id` is not named.
   §8's row and decision #10's sentence are stale against §10.5 and want a docs fix, not a pack change.
2. **`bd history`: the record's only transition home, not yet read by this build's pack.** The contract keeps
   it (the ticket requires a history clause; the store accepts it), and the table row says the pack does not
   call it yet. Pack ticket `12-report-failures` is where the drain starts reading it, so this is a
   sequencing gap, not a contradiction — flagged rather than dropped.
3. **`assignee`: the record makes it the wayfinder claim; the pack says no drain step reads it.** Both are
   true of different domains. Decision issues never enter a drain (excluded by type), so the drain never needs
   the assignee; the contract names `bd update --assignee` only in `## Wayfinding operations`, the one reader.
4. **The frontier query: the record's sketch is filtered, the pack's is not.** §10.4's sketch is
   `bd ready --exclude-type decision -l ready-for-agent`; the implemented departure — already recorded in
   §10.4 — is the unfiltered `ready` plus the pack's own three exclusions, so the exclusion report can name
   the rule per issue. The contract states the implemented one, with that reason.

### Judgement calls the ticket did not settle

- The gate's application point is stated as publication (§10.4: "publication applies it automatically"); the
  exact blocker predicate ticket `03` mentions is left to `03`.
- Wayfinding mechanics are written from §10.2/§8 (map = label `wayfinder:map`, child = type `decision` +
  label `wayfinder:<type>`) plus wayfinder's own prose, because §10.7 keeps `wayfinder` unedited and the
  tracker doc is where its operations live.
- The artifacts location is the run's `ARTIFACTS_DIR`, with the `~/.archon/workspaces/_local/…` shape this
  machine's acceptance runs actually used (`beads-lab-11/artifacts/runs/eda997…/`).
- Specs are given as `docs/specs/<date>-<slug>.md` per §10.5 (this repo's own tracker doc already says so);
  the upstream local template has no such line, so it is one place the twins differ by design.

### SKILL.md, against the machine copy

```
- **Issue tracker** — where issues live (GitHub by default; local markdown is also supported out of the box)
+ **Issue tracker** — where issues live (GitHub by default; local markdown and a beads store are also supported out of the box)
- `.scratch/` — sign that a local-markdown issue tracker convention is already in use
+ `.scratch/` and `.beads/` — signs that a local-markdown issue convention or a beads store is already in use
- …whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe.
+ …whether to call `gh issue create`, write a markdown file under `.scratch/`, drive a beads store with `bd`, or follow some other workflow you describe.
- …If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise…
+ …If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. If the repo already owns a `.beads/` store, propose beads. Otherwise…
+ - **Beads** — issues live in the repo's own `.beads/` store, driven with the `bd` CLI; the prose stays as markdown under `.scratch/<feature>/issues/` and the store holds identity, status, edges and comments (uses the `store:` key in `.scratch/beads-dag.yaml`, then `bd` on `PATH`)
+ - [issue-tracker-beads.md](./issue-tracker-beads.md) — beads store issue tracker
```

