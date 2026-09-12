# 02 — the operator skill

**What to build:** `skills/drain/SKILL.md`, the operator surface for the whole loop (Q9): from "I have a
spec" through publishing, the gate label, a drain, reading the report, and the incident cases. Two sections
— daily operation, incidents. It names the pack (`~/.archon/workflows/beads-dag`, installed by copy), the
Target's optional config file and its keys, the one-command store backup, and the fact that the operator's
only two actions are running a drain and moving the gate label. Anything about the store's commands belongs
to the contract, not here: this file points at `docs/agents/issue-tracker.md`.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.7)
**Blocked by:** `01`
**Status:** BLOCKED

- [x] a reader who knows nothing about this repo can run one drain on a Target and then say what happened,
      using only this file plus the contract: the exact commands, where the reports land, and the two failure
      signals (a runner that never started stops the drain loudly; an issue's failed attempt is a comment with
      the issue back to `open`)
- [x] the daily section covers the whole loop and **points** at `to-tickets` for publishing rather than
      repeating its steps (Q9): the operator's day is publish → gate label → drain → read the report
- [x] the incident section carries the three tool-level facts: whether a run succeeded is read from the run's
      own status and artifacts and never from a wrapper's exit code; a run with no `attempted-ids.json`
      claimed nothing; a machine that drains has the store binary on PATH
- [x] the incidents section answers the questions an operator actually hits, each in one line: a drain that
      stopped loudly (what to look at), an issue that failed twice (there is no retry command — `bd ready` is
      the retry channel — and no lever to narrow a frontier, so the brake is per issue), a run that was killed
      (the next open repairs it, and the report says so), and how to back the store up
- [x] the report section says where a run's reports live and what they cover today, and the Comments note the
      one sentence to revisit when tickets `12`–`14` land (they change what the report covers and add failure
      counts)
- [x] no invented store commands and no restatement of the contract: every store action is a pointer

## Comments

Implemented on branch `main` from `b5fab5e`. One file written: `skills/drain/SKILL.md` — 129 lines,
6621 bytes — frontmatter plus two H2 sections, **Daily operation** (publish → gate label → drain → read
the report) and **Incidents**. Nothing under `.archon/` changed; nothing was installed into a skills
directory (that is ticket `05`); no file outside this repo and `/tmp` was written.

### Cross-check: every command the file names

Archon 0.10.1 has no per-subcommand help. `archon workflow run --help`, `get --help`, `status --help` and
`list --help` all print the one global help table (captured under `/tmp/drain-skill-evidence/help-*`),
so the line that admits a subcommand is its row in that table. The last two columns show it accepted for
real: the six `archon` calls in the lab, the backup script against the same lab's store, and the one
store command the file names, cross-checked against the contract (ticket `01`'s row) and `bd ready
--help`.

| Command as the file writes it | The help line that admits it | Exercised |
| --- | --- | --- |
| `archon workflow list` | `workflow list              List available workflows in current directory` | listed `beads-dag-drain` and `beads-dag-execute` in the lab |
| `archon workflow run beads-dag-drain --detach` | `workflow run <name> [msg]  Run a workflow with optional message`; `--detach  Run 'workflow run'/… in a detached background child (returns immediately)` | run `4028be9bdbcaae775b1360beaa6780e4`, completed |
| `archon workflow runs` | `workflow runs              List recent runs (all statuses) for this project` | showed the run `running`, then as the project's one run |
| `archon workflow status` | `workflow status            Show status of running/paused workflows` | showed `4028be9b…`, `Status: running`, while live |
| `archon workflow wait <run-id>` | `workflow wait <run-id>     Block until the run ends or needs a human decision` | returned `"result": "attention"`, `"status": "completed"` |
| `archon workflow get <run-id>` | `workflow get <run-id>      Show detail for a single run (any status)` | read in human, `--json`, and `--verbose --json` form |
| `bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts` | no `--help` — it is a script, the pack's own operator command | printed `store pushed to its Dolt remote` |
| `bd ready` (the one store command named; the contract owns it) | `bd ready --help`: "Show ready work (open issues with no active blockers)."; the contract's row is `bd ready --json --limit 0` (`-n, --limit int … (use 0 for unlimited) (default 100)`), ticket `01`'s cross-check | offered `lab/03` and `lab/01` before the drain, `[]` after |

Nothing else in the file is a command: `ready-for-agent`, `needs-info`, `handle`, `slug`, `store:`,
`.scratch/beads-dag.yaml`, `review-base..Main`, `merged <branch>` are vocabulary, a config key, or an
artifact name. `bd ready` is the only store command written out, and only because the retry fact is
stated in the store's own word; its flags stay in the contract, as does every other store action.

### The lab: one whole drain, for real

A throwaway Target at `/tmp/drain-skill-lab`: `git init -b main`, a seed commit, `bd init --prefix lab
--non-interactive --skip-agents --skip-hooks`, then three issues published by hand (`bd create` with
`--metadata '{"handle":"lab/0N","slug":"…"}'` and `--labels ready-for-agent`) and `bd dep add lab-0am
lab-r8t` so `lab/02` waits on `lab/01`. Prompts below are verbatim, abridged only where marked.

```
$ bd ready --json --limit 0               # offered lab/03 and lab/01; lab/02 still blocked
$ archon workflow list
  beads-dag-drain
    Drain implementation issues on this Target: ask the store what can start, run one issue per worktree,

$ archon workflow run beads-dag-drain --detach
Started 'beads-dag-drain' in the background.
Run id: 4028be9bdbcaae775b1360beaa6780e4
Track it with: archon workflow get 4028be9bdbcaae775b1360beaa6780e4

$ archon workflow status
  ID:     4028be9bdbcaae775b1360beaa6780e4
  Name:   beads-dag-drain
  Status: running

$ archon workflow wait 4028be9bdbcaae775b1360beaa6780e4 --json
{
  "ok": true,
  "action": "wait",
  "runId": "4028be9bdbcaae775b1360beaa6780e4",
  "result": "attention",
  "attention": {
    "kind": "terminal",
    "runId": "4028be9bdbcaae775b1360beaa6780e4",
    "status": "completed",
    "at": "2026-09-12T12:25:06.000Z"
  }
}

$ archon workflow get 4028be9bdbcaae775b1360beaa6780e4
  Status: completed
  Leave-behind:
    Worktree: /tmp/drain-skill-lab (live)
    Artifacts (200 files under $ARTIFACTS_DIR): …

$ archon workflow get 4028be9bdbcaae775b1360beaa6780e4 --json     # output_root
/data3/yky/.archon/workspaces/_local/drain-skill-lab
```

The node tokens, from the run's log
(`~/.archon/workspaces/_local/drain-skill-lab/logs/4028be9b….jsonl`): `open` → `opened`; `pick` →
`["lab/03","lab/01"]`; `pick` → `["lab/02"]` (offered once `lab/01` closed); `pick` → `[]`; `review` →
`reported`; `summary` → `reported`. `get --verbose --json` shows the same per node — `open completed`,
six `execute` instances `merged`, `review`/`summary` `completed` `reported`.

The artifact paths the file sends an operator to, under
`artifacts/runs/4028be9bdbcaae775b1360beaa6780e4/`:

```
$ ls
attempted-ids.json
pick-exclusions.json
review-base
review.md
sessions
summary.md
workflow-source
$ cat attempted-ids.json      → ["lab-0am","lab-ie5","lab-r8t"]
$ cat review-base             → a34a9286dd909c4df25b275f32cb5b810cd9be4b
$ head -1 summary.md          → ## Drain summary — `a34a928...4630518`
$ cat pick-exclusions.json    → {"picked": [], "excluded": []}     # the final cycle's report, rewritten each cycle
```

The store's own answers after the run (all from the contract's commands): `bd list --all` — `lab-r8t`,
`lab-0am`, `lab-ie5` all `closed` with `close_reason merged beads/lab/01-add-hello`, `…/02-add-goodbye`,
`…/03-touch-readme`; `bd ready` = `[]`; `git log --oneline --merges` = the three
`beads-dag: merge beads/lab/0N-…` plus the integration merge `578c191 Merge branch 'main' into
beads/lab/01-add-hello`; `git status --porcelain` empty; `git worktree list` = the Target alone. Every
merge the run made is in the report's range `a34a928..4630518`, and the range's first commit is the
pack's own `05d94ad chore(beads-dag): ignore runtime paths` — reviewers did spend three sessions and a
summary on it, which is the case ticket `14` is about.

The loud-refusal path, against a second `/tmp` lab that is a git repo with no store:

```
$ archon workflow run beads-dag-drain
[open] Failed: Script node 'open' failed [exit 1]: no store in the Target: /tmp/drain-skill-nostore/.beads does not exist; a Target owns its own store, initialise it in the Target (/data3/yky/.local/bin/bd init), it is never inherited from a parent directory
❌ DAG workflow 'beads-dag-drain' failed: node open failed. 3 downstream nodes were skipped.
```

And that failed run's `wait` — the tool-level fact the file states about wrapper exit codes:

```
$ archon workflow wait 38c16c7c-22a4-4e06-9e1c-9a32c92c40dd
Run 38c16c7c-22a4-4e06-9e1c-9a32c92c40dd failed.
$ echo $?
0
```

The one-command backup, against the same lab (the remote added with `bd dolt remote add origin
file:///tmp/drain-skill-lab-backup`):

```
$ bun ~/.archon/workflows/beads-dag/beads-dag-drain/backup.ts
store pushed to its Dolt remote
```

Both `/tmp` labs are removed. The run's artifacts stay under `~/.archon` — the runner's own record, the
same way the pack's acceptance left its own — and no other Target was touched.

### The frontmatter: user-invoked, deliberately

`disable-model-invocation: true`, with a human-facing one-line description. The doc sentence behind it
is pi's own skills reference
(`/data3/yky/.local/node-v24.19.0-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md`,
Frontmatter): "`disable-model-invocation` | No | When `true`, skill is hidden from system prompt. Users
must use `/skill:name`." The house rule is `SKILL-MECHANICS.md`: "Pick model-invocation only when the
agent must reach the skill on its own, or another skill must. If it only ever fires by hand, make it
user-invoked and pay no context load."

This one fires by hand. A drain mutates the Target's Main and its store, and no other skill reaches it:
publishing ends at `/to-tickets`, the brake is the operator's, and nothing in `triage`/`ask-matt`/the
rest launches a drain. Model-invocation would buy permanent context load for a description an agent
could then fire on its own — writing to Main on an ambiguous prompt. The invocation is `/skill:drain`.
The frontmatter parses under pi's bundled YAML parser: `name: drain` matches its directory, the
description is 133 characters, and `disable-model-invocation` is the known boolean field.

### The sentence to revisit when tickets `12`–`14` land

The report section's today-sentence is:

> A report covers the diff **this run** merged (`review-base..Main`): … Today the report carries no
> failure counts and no repair — a failed attempt is a comment on its issue, and a repair this run
> performed at `open` prints on the run's own output.

It changes in three ways: `12` adds the failed attempts and how many times each issue has burned (read
from the store's history); `13` makes the range start at the last reviewed position — so a merge no
report has covered is covered next time — and names a repair at `open` in the report; `14` adds a skip
for a range holding only the pack's own bookkeeping. The incident **A run was killed** carries the same
"does not replay it" clause and moves with `13`.

### What the ticket did not settle

- **"the report says so" for a killed run.** Criterion 4 asks that the repair be visible; today's pack
  prints it on the next run's `open` output (so it is in the run log and `get`, but not in
  `review.md`/`summary.md`), and `.scratch/beads-dag/issues/13` is where it reaches the report ("today it
  reaches stderr only"). The file states today's truth; the revisit sentence above names the change.
- **Which path the pointer names.** The ticket says the file points at `docs/agents/issue-tracker.md` —
  the Target's installed copy, which `setup-matt-pocock-skills` writes from
  `skills/setup-matt-pocock-skills/issue-tracker-beads.md` (ticket `01`). The file points at the Target's
  path, the convention the rest of the set already uses; the source twin is not named in the prose,
  because an installed skill does not live in this repo.
- **`bd ready` by name.** It is the one store command written out, because the retry fact is the store's
  own word (§10.3) and the criterion names it; no syntax is restated.
- **`get --json`'s artifact list.** It listed exactly 200 files (the directory holds 204) and a real
  run's own `workflow-source/` copy fills it, with `summary.md`/`review.md` falling off. The file
  therefore gives the artifacts path as `<output_root>/artifacts/runs/<run-id>/` (the `output_root` the
  JSON does report) rather than telling an operator to fish the report out of that list.
- **The lab's report is in Chinese.** The lab's runner, with no `model` in the Target config, wrote the
  review axes and the summary in Chinese; the skill says nothing about language because the pack pins
  none. Observed, not fixed here — it belongs to whoever owns the report's persona.
- **A backup side effect.** `bd dolt remote add` committed `.beads/config.yaml` on Main as
  `549ec89 bd: update sync.remote` — the store's own setup writing to the Target's git, which the
  contract's backup section does not mention. Recorded, not adopted; the skill names only the pack's one
  backup command.

### Gates

This ticket writes prose; the pack is untouched, so the pack's gates are a check that nothing here
moved the runtime. Both ran from this repo:

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(exit 0, no output)
```

The repro suite, first invocation (prepending the node-module bin directory to PATH, the shape the
pack's acceptance used — this machine's `$PATH` already carries `bd` at `/data3/yky/.local/bin/bd`, and
that directory appears in it several times):

```
$ env -u BEADS_BIN timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
…
FAIL store-backup-repro.ts  {"ok":false,"error":"an unresolvable binary prints nothing on stdout: got \"store pushed to its Dolt remote\\n\", want \"\""}
17/18 repros passed
```

A finding, quoted rather than papered over: `store-backup-repro.ts` makes "the binary cannot be
resolved" by deleting `dirname(storeBinary())` from PATH (`envWithoutStore`), so it assumes the store
binary lives in exactly one PATH directory. Prepending the second install's directory made
`storeBinary()` resolve there, leaving `/data3/yky/.local/bin` — a second directory that also holds
`bd` — in the child's PATH; the backup really could resolve the store, so the repro's premise broke.
With the PATH exactly as this machine already has it (one directory reachable as `bd`), the same file
passes and the suite is green:

```
$ env -u BEADS_BIN timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   brief-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   reconcile-repro.ts  {"ok":true}
ok   report-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   runner-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
18/18 repros passed
```

The failure is the pack suite's environment assumption, not a regression from this ticket (no code was
touched); it wants a pack-side ticket if a double install is to be supported.

