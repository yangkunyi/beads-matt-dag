# 08 — the contract names the store's blocked read

**What to build:** `skills/setup-matt-pocock-skills/issue-tracker-beads.md` names the store's ready read
(`bd ready --json --limit 0`) but never the blocked one, so `beads-skills/06`'s walk — following the
installed set alone — guessed `bd blocked --json --limit 0` by analogy and got
`Error: unknown flag: --limit`. The contract owns store commands, so the row belongs there, with the flags
that command actually takes rather than the neighbouring row's.

**Spec:** `.scratch/beads-skills/issues/06-the-set-accepts-itself.md`, finding 2
**Blocked by:** `01`
**Status:** BLOCKED

- [x] the contract's fetch section names the blocked read and what it answers, with the flags its own
      `--help` accepts (do not infer them from the ready row — the walk's error is exactly that inference)
- [x] the ready row is checked in the same pass against `bd ready --help`, and any flag either row names is
      one the store accepts
- [x] the Commands section stays the only place these appear: no other skill gains a store command
- [x] nothing under `.archon/` changes

## Comments

Implemented on `main` — this repo's tickets `01`–`07` landed there, and the change is one row plus this
ticket. Paths written: `skills/setup-matt-pocock-skills/issue-tracker-beads.md`, this ticket.

### The row as written

In `## When a skill says "fetch the relevant ticket"`, between the by-label and Comments bullets:

```
- **Blocked**: `bd blocked --json` — the issues a blocker is holding back, each naming the blockers it
  waits on (`blocked_by`). It takes no `--limit`, so the ready row's `--limit 0` does not carry over.
```

Criterion 1 says the fetch section, so that is where it went; the walk's proposed ticket 08 said
"beside `bd ready`" in "The frontier and the claim", and that section is left untouched (one row and
nothing else). `**Status:** BLOCKED` untouched.

### Both `--help` reads (`bd` 1.2.2, `/data3/yky/.local/bin/bd`)

`bd blocked --help` — this command's own flags, in full:

```
Flags:
  -h, --help            help for blocked
      --parent string   Filter to descendants of this bead/epic
```

`--json` is a global flag (`--json                      Output in JSON format`), accepted by both reads.
There is no `--limit` here — the walk's guess is refused by the parser, quoted below.

`bd ready --help` — the flag the ready row names:

```
  -n, --limit int                    Maximum issues to show (use 0 for unlimited) (default 100)
```

So both rows name only flags the store accepts: `bd ready --json --limit 0` (checked in this same
pass) and `bd blocked --json`.

Two more helps were read because the row's first draft called `--limit` "`bd ready`'s and `bd list`'s
alone": `bd list --help` has `-n, --limit int  Limit results (default 50, use 0 for unlimited)` and
`bd history --help` has `--limit int   Limit number of history entries (0 = all)`. The final row makes
no exclusivity claim; it says only that the ready row's `--limit 0` does not carry over.

### The `/tmp/blocked-read-li8RR0` Target

Throwaway: `mktemp -d`, `git init -b main`, a seed commit, then
`bd init --prefix lab --non-interactive --skip-agents --skip-hooks`. The contract's create shape twice,
then the contract's own edge direction (`bd dep add <dependent> <blocker>`):

```
$ bd create "01 — add hello" --type task --silent \
    --metadata '{"handle":"lab/01","slug":"add-hello"}' --labels ready-for-agent
lab-zn3
$ bd create "02 — add goodbye" --type task --silent \
    --metadata '{"handle":"lab/02","slug":"add-goodbye"}' --labels ready-for-agent
lab-t7d
$ bd dep add lab-t7d lab-zn3
✓ Added dependency: lab-t7d (02 — add goodbye) depends on lab-zn3 (01 — add hello) (blocks)
```

The row's command, with the dependent blocked:

```
$ bd blocked --json
[
  {
    "id": "lab-t7d",
    "title": "02 — add goodbye",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "owner": "yangkunyi@sjtu.edu.cn",
    "created_at": "2026-09-14T04:04:11Z",
    "created_by": "yangkunyi",
    "updated_at": "2026-09-14T04:04:11Z",
    "metadata": {
      "slug": "add-goodbye",
      "handle": "lab/02"
    },
    "labels": [
      "ready-for-agent"
    ],
    "blocked_by_count": 1,
    "blocked_by": [
      "lab-zn3"
    ]
  }
]
```

The inference the row now prevents — the walk's error, still the store's answer:

```
$ bd blocked --json --limit 0
Error: unknown flag: --limit
```

Then the blocker closes; the same read empties, and `bd ready --json --limit 0` shows the dependent
released:

```
$ bd close lab-zn3 --reason "merged beads/lab/01-add-hello"
✓ Closed lab-zn3 — 01 — add hello: merged beads/lab/01-add-hello

$ bd blocked --json
[]

$ bd ready --json --limit 0
[
  {
    "id": "lab-t7d",
    "title": "02 — add goodbye",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "owner": "yangkunyi@sjtu.edu.cn",
    "created_at": "2026-09-14T04:04:11Z",
    "created_by": "yangkunyi",
    "updated_at": "2026-09-14T04:04:11Z",
    "metadata": {
      "slug": "add-goodbye",
      "handle": "lab/02"
    },
    "labels": [
      "ready-for-agent"
    ],
    "dependencies": [
      {
        "issue_id": "lab-t7d",
        "depends_on_id": "lab-zn3",
        "type": "blocks",
        "created_at": "2026-09-14T12:04:11Z",
        "created_by": "yangkunyi",
        "metadata": "{}"
      }
    ],
    "dependency_count": 1,
    "dependent_count": 0,
    "comment_count": 0
  }
]
```

The dependent's status is `open` before, during and after being blocked — blockedness is the edge, not
a status. The lab was removed after the transcript. A side probe: `bd close` refuses a blocked
dependent without `--force` (`cannot close lab-fvo: blocked by open issues [lab-hvq]`); the probe's two
beads were deleted and the store was back to `[lab-t7d]` ready / `[]` blocked.

### The install

`skills/README.md`'s copy and check, from the repo root:

```
$ cp -a skills/setup-matt-pocock-skills ~/.pi/agent/skills/
$ for s in skills/*/; do s=${s#skills/}; s=${s%/}; printf '%-26s' "$s"; diff -rq "skills/$s" "$HOME/.pi/agent/skills/$s" && echo "identical"; done
ask-matt                  identical
drain                     identical
implement                 identical
setup-matt-pocock-skills  identical
to-spec                   identical
to-tickets                identical
triage                    identical

$ diff -rq skills/setup-matt-pocock-skills ~/.pi/agent/skills/setup-matt-pocock-skills
(no output; exit 0)

$ git -C /data3/yky/pi-agent-config status --porcelain -- skills
 M skills/setup-matt-pocock-skills/issue-tracker-beads.md
```

`~/.pi/agent/skills` is a symlink to that repository's `skills/`, so the copy is that one-file change
in its working tree; it is quoted, not committed — that repository is the operator's.

### Criteria

All four ticked. 1: the row above, in the fetch section. 2: both help lines above, the ready row
checked in the same pass. 3: `grep -rn "bd blocked" skills/` hits only the contract line, and
`git status --porcelain` shows only the contract and this ticket. 4: `git status --porcelain --
.archon` is empty (this repo tracks the pack folder, and it is untouched); nothing under `~/.archon`
was read or written. No other skill gained a store command.

### Judgement calls the ticket did not settle

- The criterion says the fetch section; the walk's proposed ticket says "beside `bd ready`". Fetch won.
- `bd blocked` also takes `--parent` (help above), as does `bd ready`; the row names neither, since the
  anti-inference clause only needs the `--limit` difference.
- `--limit` exists on `bd list` and `bd history` too, so the row avoids saying whose flag it is.
- TDD is not applicable: one prose row, no code seam. Verification is the two help reads and the lab.
