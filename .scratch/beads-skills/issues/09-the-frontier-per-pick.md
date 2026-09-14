# 09 — the frontier is read once per pick, not once per run

**What to build:** the contract's frontier section says "A drain asks the store what can start, once, and
takes the whole answer", which reads as once **per run**. Two readers took it that way — `beads-skills/06`'s
brief and its third criterion — and the walk proved the opposite: the pack asks the store on every `pick`
cycle, so a blocker's closure **inside a run** releases its dependent into that same run (the walk's first
drain started `greet/01` and `greet/02`, then `greet/03` one second after `greet/02` closed, and the second
drain found nothing). `skills/drain/SKILL.md` was corrected during that ticket; the contract sentence is
this ticket.

**Spec:** `.scratch/beads-skills/issues/06-the-set-accepts-itself.md`, finding 3
**Blocked by:** `01`
**Status:** BLOCKED

- [x] the contract says the frontier is read **per pick cycle** and that a drain runs cycles until a read
      comes back empty — so a dependent released by a closure inside the run starts in that run
- [x] it says what holding a dependent back for a later drain actually takes (the brake), because "a blocked
      issue waits for its blocker" alone invites the same misreading
- [x] the sentence matches the pack's own loop, quoted from `pick.ts`/the drain workflow in the Comments
- [x] nothing under `.archon/` changes

## Comments

Implemented on `main`. One file written besides this ticket:
`skills/setup-matt-pocock-skills/issue-tracker-beads.md`, "The frontier and the claim". Nothing under
`.archon/` changed — `git status --porcelain -- .archon` is empty, and the pack was read, not written. The
repo's two gates pass: `./node_modules/.bin/tsc -p tsconfig.pack.json` (exit 0) and
`bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts` (`22/22 repros passed`).

### The sentence as written

Replacing "A drain asks the store what can start, once, and takes the whole answer:" — the opening line and
the paragraph under the ready row (the nested fence is the section's own bash row, unchanged):

````
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
````

The frontier row keeps `bd ready --json --limit 0` as the section's only command, byte-identical to the line
`08` left, and the blocked read stays in the fetch section where `08` put it. Below the new paragraph, the
three rules, the `concurrency` truncation and the `bd batch` claim are untouched.

### The pack's own loop, quoted

The `drain` node's only loop is a `loop_group` whose body holds `pick`, so the store is asked once per cycle
and the loop ends on an empty answer:

```
$ nl -ba .archon/workflows/beads-dag/beads-dag-drain/beads-dag-drain.yaml | sed -n '20,31p'
    20	  - id: drain
    21	    depends_on: [open]
    22	    loop_group:
    23	      max_iterations: 500
    24	      until_bash: test $pick.output = "[]"
    25	      nodes:
    26	        - id: pick
    27	          script: pick
    28	          runtime: bun
    29	          with:
    30	            config: $INPUTS.config
    31	        - id: execute
```

`pick` reads the store and composes the frontier inside that node's per-cycle body; `composeFrontier` is a
pure filter over that one read — no cache, no run-scoped frontier:

```
$ nl -ba .archon/workflows/beads-dag/beads-dag-drain/scripts/pick.ts | sed -n '62,75p;100,113p'
    62	/** The store's answer with this step's three rules applied. */
    63	function composeFrontier(
    64	  issues: StoreIssue[],
    65	  attempted: Set<string>,
    66	): { candidates: StoreIssue[]; excluded: ExcludedIssue[] } {
    67	  const candidates: StoreIssue[] = [];
    68	  const excluded: ExcludedIssue[] = [];
    69	  for (const issue of issues) {
    70	    const rule = exclusionRule(issue, attempted);
    71	    if (rule === undefined) candidates.push(issue);
    72	    else excluded.push({ id: issue.id, handle: issue.handle, rule });
    73	  }
    74	  return { candidates, excluded };
    75	}
   100	    run: ({ target, artifactsDir, config }) => {
   101	      const store = preflightStore(target, config);
   102	      const attempted = readAttempted(artifactsDir);
   103	      const { candidates, excluded } = composeFrontier(readyIssues(store, target), attempted);
   104	      const picked = candidates
   105	        .slice(0, config.concurrency)
   106	        .map((issue) => ({ id: issue.id, handle: handleOf(issue) }));
   107	      const ids = picked.map((issue) => issue.id);
   108	
   109	      claimIssues(store, target, ids);
   110	      addAttempted(artifactsDir, ids);
   111	      writeExclusionReport(artifactsDir, { picked, excluded });
   112	      return nodeLine(JSON.stringify(picked.map((issue) => issue.handle)));
   113	    },
```

The `[]` the sentence names as the loop's end is what line 112 prints when `picked` is empty, tested by
`until_bash` at workflow line 24; the read the sentence describes is `readyIssues(...)` at pick.ts line 103,
fresh on every cycle.

### The store's own answer

Throwaway Target `/tmp/frontier-per-pick-iEpcsY` (`bd` 1.2.2): `mktemp -d`, `git init -b main`, a seed
commit, then `bd init --prefix lab --non-interactive --skip-agents --skip-hooks`; two issues published with
the contract's create shape, then `bd dep add lab-0uk lab-k01`. With the blocker open, the dependent is
absent from the read — only `lab-k01` is offered:

```
$ bd ready --json --limit 0
[
  {
    "id": "lab-k01",
    "title": "01 — add hello",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "owner": "yangkunyi@sjtu.edu.cn",
    "created_at": "2026-09-14T04:08:24Z",
    "created_by": "yangkunyi",
    "updated_at": "2026-09-14T04:08:24Z",
    "metadata": {
      "slug": "add-hello",
      "handle": "lab/01"
    },
    "labels": [
      "ready-for-agent"
    ],
    "dependency_count": 0,
    "dependent_count": 1,
    "comment_count": 0
  }
]
```

Then the blocker closes and the same read offers the dependent, with its status still `open` and the edge
still recorded on it:

```
$ bd close lab-k01 --reason "merged beads/lab/01-add-hello"
✓ Closed lab-k01 — 01 — add hello: merged beads/lab/01-add-hello

$ bd ready --json --limit 0
[
  {
    "id": "lab-0uk",
    "title": "02 — add goodbye",
    "status": "open",
    "priority": 2,
    "issue_type": "task",
    "owner": "yangkunyi@sjtu.edu.cn",
    "created_at": "2026-09-14T04:08:24Z",
    "created_by": "yangkunyi",
    "updated_at": "2026-09-14T04:08:24Z",
    "metadata": {
      "slug": "add-goodbye",
      "handle": "lab/02"
    },
    "labels": [
      "ready-for-agent"
    ],
    "dependencies": [
      {
        "issue_id": "lab-0uk",
        "depends_on_id": "lab-k01",
        "type": "blocks",
        "created_at": "2026-09-14T12:08:32Z",
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

The Target was removed after the transcript. The two reads are what the sentence describes: the edge holds
the dependent out of one read and not out of the next, with no status write between them.

### Agreement with `skills/drain/SKILL.md`

The drain skill's sentence is untouched (ticket `06`'s correction): "…it ends when `pick` finds nothing
eligible. A blocker's closure inside the run releases its dependent into the same run — `pick` asks the
store again on every cycle — so holding a dependent for a later drain takes the brake, not the edge." The
two files agree clause for clause, and the split is deliberate: the **contract owns the mechanic** — a
frontier is a fresh read per cycle, a `blocks` edge withholds only while a blocker is not `closed`, and
after the closure the hold is the gate label, cross-referenced to "Labels: the gate and the brake" instead
of re-explained; the **drain skill owns the operator surface** — the same facts as reasons, addressed to
whoever runs a drain, and no store command (`grep 'bd [a-z]' skills/drain/SKILL.md` still empty):

```
$ grep 'bd [a-z]' skills/drain/SKILL.md
(no output; exit 1)
```

The pairs: "releases its dependent into the same run" ↔ "releases the dependent into that run's next `pick`
cycle"; "holding a dependent for a later drain takes the brake, not the edge" ↔ "Holding a dependent back
for a later drain takes the brake … the edge withholds nothing once the blocker is closed"; "ends when
`pick` finds nothing eligible" ↔ "until a cycle comes back empty (`[]`)". Neither contradicts the other.

### The install

`skills/README.md`'s copy and check, run from the repo root:

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
```

`~/.pi/agent/skills` is a symlink to `/data3/yky/pi-agent-config/skills`, so the copy is that repository's
working tree; quoted, not committed:

```
$ git -C /data3/yky/pi-agent-config status --porcelain -- skills
 M skills/setup-matt-pocock-skills/issue-tracker-beads.md
```

The same `M` was already present from ticket `08`'s install, which was left uncommitted there too; the
file's diff against that repository's HEAD now carries both tickets' edits.

### Criteria

Ticked 1–4.

1. The opening line says per `pick` cycle and the loop's end is an empty cycle; the paragraph says a
   closure inside the run releases the dependent into that run's next cycle, claimable by the same run.
2. "Holding a dependent back for a later drain takes the brake — the gate label off the issue ("Labels: the
   gate and the brake") — because the edge withholds nothing once the blocker is closed." The brake's
   command keeps its single home in its own section. The criterion's quoted phrase "a blocked issue waits
   for its blocker" is the drain skill's line 33, not a contract line; it is operator-side, still true, and
   the contract's new mechanic does not contradict it.
3. Quoted above from `beads-dag-drain.yaml:20-31` and `pick.ts:62-75,100-113`, plus the store's two reads.
4. `git status --porcelain -- .archon` empty; the pack's repros stayed green (22/22).

### Left open

- The artifact table's `pick-exclusions.json` row still reads "every issue the store offered and the
  frontier left out" without saying the file holds only the last cycle (walk `06`'s observation, never
  ticketed) — untouched, outside this ticket.
  **Closed after landing** by the reviewer (`skills: two contract rows catch up with the pack`): the row now
  says "in the run's **last** `pick` cycle". The same commit corrected the neighbouring `review-base` row,
  which ticket `13` had made stale — it still claimed "Main's tip when the run opened" although the base is
  now the recorded position (`refs/beads-dag/reviewed`), Main's tip only for a Target that has none.
- TDD does not apply: prose only, no code seam. The evidence is the store lab, the two code quotes and the
  install check.
- The install's `M` in `/data3/yky/pi-agent-config` stays uncommitted by instruction; that repository is the
  operator's.
