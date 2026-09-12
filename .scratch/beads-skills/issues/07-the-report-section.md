# 07 — the operator skill reads the report the pack now writes

**What to build:** `skills/drain/SKILL.md`'s report section — and the incident prose that touches it —
brought up to what tickets `12`–`15` now make a drain write, so an operator reads a run's end as it is
rather than as it was when the skill was written. §13 step 2 deferred this section until those tickets
landed; they have.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§13 steps 1–2, §10.6)
**Blocked by:** `02`, `12`, `13`, `14`, `15`
**Status:** BLOCKED

- [x] the section says what a drain's end now holds and what each part is for: the failures block (the issues
      this run attempted and left failing, with the count the store records and the latest reason), the range
      the run covered and what it says about merges this run did not make, the repairs made at open (the ones
      that closed included), and both existing skips — an empty diff, and a range holding nothing but the
      pack's own bookkeeping
- [x] it says where each part comes from — `summary.md` for the human-facing blocks, `review.md` for the
      review, the run's stderr for the configuration line — and that the numbers are the store's own answers,
      computed by the node, never a model's
- [x] it says what a report does **not** carry: what failed is a reading of one range (the failures block is
      one run long), a merge repaired at open is named by the run that repaired it, and it is the recorded
      reviewed position — not the report — that decides the next run's range
- [x] the language of a report is stated: it follows the runner's model, so a Target that wants one fixed
      language pins it through its own configuration; the pack pins nothing
- [x] the incident section gains the configuration line: a run's stderr names the effective runner, model,
      thinking level, concurrency and store with each value's source, so "what actually ran" is read rather
      than guessed
- [x] it still points at the contract for store commands and at `to-tickets` for publishing, and names no
      store command of its own
- [x] the installed copy is refreshed and byte-identical (`skills/README.md`'s rule), and the global copy's
      diff is quoted
- [x] nothing under `.archon/` changes

## Comments

Built on branch `main` from `0d9b7bd`. One file changed for the work: `skills/drain/SKILL.md` — the
**Read the report** section rewritten (129 → 182 lines) and the three incident paragraphs that carry
report facts brought up to it. Nothing under `.archon/` changed (`git status --porcelain .archon`
empty), `/data3/yky/endo_label` and `/data3/yky/workflow` were not touched, and this ticket built no lab:
every sentence in the new prose is read from the pack source at `.archon/workflows/beads-dag/`
(byte-identical to the installed `~/.archon/workflows/beads-dag`, `diff -rq` clean) or from the labs
tickets `12`–`15` recorded, quoted below. The new prose keeps the operator's side of the line: it names
no module, no predicate and no run-record file — the pack's own README remains the place those are
explained.

### The section, before and after

**Before** — the three bullets and the closing paragraph as ticket `02` left them (the
artifact-location paragraph above them is unchanged):

```
- `summary.md` — open this first: the reviewers' findings, ranked and merged.
- `review.md` — the findings behind it, one section per review axis.
- `pick-exclusions.json` — why the last `pick` cycle left each issue it offered out, with the rule.

A report covers the diff **this run** merged (`review-base..Main`): bugs and incorrect assumptions in
the diff, missing tests for changed behavior, cross-file breakage. An empty range is a skip line, not an
agent. Today the report carries no failure counts and no repair — a failed attempt is a comment on its
issue, and a repair this run performed at `open` prints on the run's own output.
```

**After** — the new text of the whole section, verbatim:

```
### Read the report

A run's views live under its artifacts directory: `artifacts/runs/<run-id>/` beneath the run's
`output_root`, which `archon workflow get <run-id> --json` reports. A local Target's is
`~/.archon/workspaces/_local/<repo>/artifacts/runs/<run-id>/`.

- `summary.md` — open this first: the summary turn's report on the range, then the run's own blocks
  under it — `## Range`, `## Commits this run did not make`, `## Repairs at open`, `## Failed attempts`
  in that order, the middle two only when they are non-empty.
- `review.md` — the review that summary is built from, one section per axis; a `skip:` line or a
  `review error:` line where no review ran, and either of those leaves the recorded position where the
  run opened it, so the next run covers the same range again.
- `pick-exclusions.json` — why the last `pick` cycle left each issue it offered out, with the rule.

The range is `review-base..Main`: what no review has covered yet, which is why it can hold an earlier
run's work. `## Range` names its two ends, how many commits Main itself gained in it (its first-parent
line, so a branch's commits arrive inside the merge that brought them) and how many of those were this
run's; `## Commits this run did not make` names the rest — an earlier run's merge, your own commit, a
previous run's bookkeeping — one short SHA and subject per line. They are inside this range, so this
review is where they were read.

`## Repairs at open` names what the opening step did to the leftovers it found: `closed` (its merge had
already landed), `reopened` (Main carries no merge for it, or the issue cannot be named in git), or
`left alone` (a decision issue, which no drain claims), each with its reason. Nothing is owed for a
repair, and a repair is named by the run that performed it: a later run carries only its merge, as a
commit it did not make.

`## Failed attempts` is the brake list: the issues this run attempted and left failing, each with the
number of failures the store records for it — cumulative across drains, so an issue that has burned in
three of them reads 3 — and the latest reason. An issue an opening repair reopened is named too, whether
or not this run retried it. A run with nothing to report writes the one line `none this run` under the
heading.

The numbers are the node's readings, never a model's: the failure count is the store's own answer (the
`attempt N failed:` comments it holds for the issue), the range's counts are git's — both read and
written into the artifact by the node. The summary turn is handed the range and the review and never an
id, a count or a row, and the node appends the blocks after the turn's answer, so a turn that failed or
died leaves them in place.
A run with failures to report and no review to merge keeps its skip line and writes the failures block
under it. The line naming the configuration a run used is in no artifact: `open` prints it on the run's
stderr.

What the report does not carry:

- the failures block names this run's own attempts. An issue that failed in an earlier run and was not
  touched here is not in it; the store holds each issue's own history.
- the range is set by the Target's recorded reviewed position (`refs/beads-dag/reviewed`), never by a
  report: the review node advances that position as soon as it has findings, with no human step in
  between. So a report skimmed, unread, or never written changes nothing about what the next run
  reviews — and a merge no review has covered yet, a killed run's most of all, is inside the next range
  and reviewed there.

Two skips stand in for a review, written by the node and not by a model: `skip: empty diff
<base>...main, skipped` where the range holds no commits, and `skip: only the pack's own bookkeeping
<base>...main, skipped` where it holds nothing the pack did not write itself. Neither spends a session,
and the summary carries the same reason on its own line, behind `skip: review.md:`.

The prose of both artifacts is the model's, language included: the pack's prompts and its config name no
language, so a report comes back in whatever language the runner's model answers in, and a Target that
wants one fixed language pins it in its own configuration — the `model:` it names, and the runner's
settings for it.
```

### The incidents

All three paragraphs, exactly as they now stand (the changed sentences are the configuration one in the
first, the count pointer in the second, and the last three in the third):

```
**A drain stopped loudly.** Read the run's own record: `archon workflow get <run-id>`, `--verbose
--json` for each node's state and output, and the run's log at
`~/.archon/workspaces/_local/<repo>/logs/<run-id>.jsonl` for what a node printed. `open` writes one line
naming the configuration the run is using — `beads-dag: config: runner=…, model=…, thinkingLevel=…,
concurrency=…, store=…`, each value followed by its source: `(default)`, the Target's resolved config
file, or `PATH` for a store found there — so what actually ran is read rather than guessed. An `open`
refusal (no store in the Target, no store binary, a `blocks` edge across the domains) names the fix and
claimed nothing; a runner that cannot start fails the whole drain rather than recording an attempt on an
issue no session ever saw, and the claim it left is repaired by the next drain's `open`.

**An issue failed twice.** The reason is a comment on the issue and the issue is `open` again, so the
store's own ready answer — `bd ready` — is the whole retry channel, and the next drain works it like
fresh work. There is no retry command, and no lever that narrows a drain to one issue: a drain starts
every eligible issue. To stop one burning worker slots, brake it, fix what is wrong, then let it back
in; how often it has burned is the count in `## Failed attempts`, read from the store's comments.

**A run was killed.** The next drain's `open` repairs every issue the killed run left `in_progress`,
from git: Main carries the merge, so the issue is closed with the same `merged <branch>` reason a live
run writes; Main does not, so it goes back to `open` with the reason as a comment. That repair is named
in the repairing run's `## Repairs at open`, and the killed run's merge is inside the same run's range —
no review moved the recorded position — so the range section names it as a commit that run did not make
and the review reads it. A repair reaches only the report of the run that performed it; after that, the
merge is what stays visible.
```

The paragraphs replaced, for the record: *"The repair is named on the next run's `open` output; the next
run's report does not replay it."* and *"how often it has burned is in its comments and the store's
history."*

### The facts behind every claim

Numbered by the sentence group in the new prose. Paths are under
`.archon/workflows/beads-dag/beads-dag-drain/`; lab quotes are from the Comments of tickets `12`–`15`,
whose runs were real (or protocol-driven) and whose artifacts are quoted there verbatim.

1. **The four blocks and their order.** `summary.ts` writes the artifact as
   `` `${text.trimEnd()}\n\n${section(range)}\n\n${block}` `` — the summary turn's prose, then the range
   section, then the failures block. `run-record.ts` emits `"## Range"`, then `if (foreign.length > 0)`
   `"## Commits this run did not make"`, then `if (facts.repairs.length > 0)` `"## Repairs at open"`;
   `failures.ts` owns `"## Failed attempts"` last (`FAILURES_HEADING`).
2. **The two middle sections are conditional** — the two `if`s above; `## Range` is not (ticket `13` lab
   4's artifact has it with `0 not made by this run` and no middle sections).
3. **The range and its base.** `report-artifacts.ts`'s `writeReviewBase` returns
   `positionToOpenOn(target)`; `review-position.ts`: `export const REVIEWED_REF =
   "refs/beads-dag/reviewed";` and `positionToOpenOn` records Main's tip when the ref is absent. Ticket
   `13` lab 4: `$ git rev-parse refs/beads-dag/reviewed before any run: exit 128 (absence is not an
   error)`, `run 1's review-base 5b2094389bc1e7e4a279c5702855141549639a3c == Main's tip at open: true`.
4. **The counts, and the first-parent line.** `run-record.ts`:
   ``git(facts.target, ["log", "--first-parent", "--format=%H%x00%s", `${facts.base}..${facts.head}`])``,
   rendered as `` `${commits.length} commit(s) on Main, ${made.length} made by this run, ${foreign.length}
   not made by this run` ``. The case that makes the first-parent wording load-bearing is ticket `14` run
   2: `git log` over the range lists three commits (the merge, the branch commit it carried, the
   housekeeping commit) while the report says `2 commits on Main, 1 made by this run, 1 not made by this
   run`.
5. **"an earlier run's merge, your own commit, a previous run's bookkeeping"** — ticket `13` lab 3's
   `## Commits this run did not make`: `- 5ccdc619847a the operator's own commit`,
   `- 61acd9b99c94 beads-dag: merge beads/lab/03-the-earlier-issue`,
   `- 51d2660fd649 chore(beads-dag): ignore runtime paths`; ticket `14` run 2 names run 1's housekeeping
   commit as one this run did not make.
6. **The repairs rows.** `run-record.ts`'s `repairLine`: `- <label> — closed: merge <short sha> had
   already landed` / `- <label> — reopened: <reason>` / `- <label> — left alone: <reason>`, from the
   `Repair[]` `reconcile.ts` returns (`merged` / `failed` / `left-alone`). Ticket `13` lab 1's summary
   carries `- lab/01 [lab-e8g] — closed: merge 23b9b3eea108 had already landed`; that close is the half
   ticket `12` could not name, because its close reason is byte-identical to a settlement's.
7. **A repair is named by the run that performed it.** The range section reads `readRepairs(artifactsDir)`
   — this run's `repairs.json` only. Ticket `13`'s "did not settle": *"The record-to-report path is one
   run long. A killed repair run's `repairs.json` is not consulted by the next run; only its merges
   remain visible (as commits this run did not make)."*
8. **The failures rows: count, cumulative, latest reason, scope, no zero-filled rows.** `failures.ts`'s
   `rowLine`: `` const count = `${row.failures.length} recorded failure(s), open`; const scope =
   row.attempted ? "attempted by this run" : "not attempted by this run"; return `- ${label} — ${count};
   ${scope}; ${record}` ``. The count is `store.ts`'s `recordedFailures` over `bd comments <id> --json`,
   filtered by the `attempt N failed: ` record shape, and the roster skips any issue not `open` and any
   with no failure comment. Ticket `12`'s lab runs 1 → 2: `- lab/01 [lab-4p6] — 1 recorded failure, open;
   attempted by this run; latest: attempt 1 failed: nothing to merge: …` then `2 recorded failures` — the
   store held both comments, and nothing was written down to make the count cumulative.
9. **The reopened row.** `failures.ts` admits `reopenedAtOpen` issues this run did not attempt
   (`if (!attempted.has(issue.id) && !reopenedAtOpen) continue;`) and renders `not attempted by this run;
   reopened by an opening repair: <reason>`. Ticket `12` run 6: `- lab/03 [lab-8yj] — 1 recorded failure,
   open; not attempted by this run; reopened by an opening repair: leftover in progress and main carries
   no merge commit of beads/lab/03-braked-leftover`.
10. **`none this run`.** `failures.ts`: `const body = rows.length === 0 ? NO_FAILURES_LINE : …` with
    `const NO_FAILURES_LINE = "none this run"`. Ticket `12` run 4's artifact tail is
    `## Failed attempts` / blank / `none this run`.
11. **The numbers are the node's, never a model's.** `failures.ts`'s header: *"The block is written by
    the node, never by a model: the numbers a reader sees are exactly the store's answers."* `roles.ts`'s
    summary arguments are `{ base: string; head: string; log: string; reviewMd: string }` — no id, no
    count, no row — and `summary.ts` appends the blocks after `range.ask(...)` returns. Ticket `12`'s
    `failures-repro.ts` pins that the brief carries no failed id and no number, and that a turn which
    died or threw still leaves the block; its artifacts show the block under a skip line (runs 2 and 6)
    and under a report (runs 1 and 4).
12. **Failures with nothing to merge.** `summary.ts`'s skip path:
    ``rows.length === 0 ? { stop: line } : { report: async () => `${line}\n${block}` }`` — ticket `12` run
    2's artifact is exactly `skip: review.md: …` then the failures block.
13. **The configuration line is in no artifact.** `open.ts` calls `console.error(configLine(config,
    configProvenance, store))` — `configLine`'s only call site in the pack.
14. **The failures roster is one run long.** The `attempted.has(issue.id)` guard above, plus ticket
    `12`'s recorded limit: *"An earlier run's failure that this run simply did not reach is not named;
    the store still holds it."*
15. **The position, not the report, decides the next range.** `review.ts`'s after-step:
    `if (reviewWroteFindings(body)) advanceReviewed(range.target, range.head);`, with its comment *"a
    skip and a failed review leave the position where the run opened it, so the next run reports the same
    range again"*; `review-position.ts`'s header: *"so a run killed between its merge and its review
    does not drop that merge out of every later report."* Ticket `13` lab 2 shows a failed review
    (`review error: all 3 review axes failed: the pi runner could not start: unknown model nope/nope`)
    with `run 1 review-base == run 2 review-base: true`; lab 1 shows the killed run's merge inside the
    next run's range and named there.
16. **The two skips.** `review.ts`: ``skipLine(`empty diff ${base}...${main}, skipped`)`` and
    ``skipLine(`only the pack's own bookkeeping ${base}...${main}, skipped`)``, both returned as
    `{ stop: … }` before any agent is asked. Ticket `14` run 1: both artifacts carry
    `skip: only the pack's own bookkeeping d8ed4da60eefca6dc0e9fe7f67b3ec1ad5292056...main, skipped`,
    `test -e run-1/reader-record.json -> absent`, and `refs/beads-dag/reviewed` unmoved; run 0 shows the
    empty-diff variant in both artifacts. The summary's line is `summary.ts`'s
    ``skipLine(`review.md: ${reason}`)``.
17. **The language.** `prompt.ts`'s `reviewPersona` ends `Markdown. Under 800 words.` and
    `summaryPersona` ends `Markdown. Under 600 words.` — no language; `config.ts`'s `CONFIG_KEYS` are
    `runner`, `model`, `thinkingLevel`, `concurrency`, `store`. Ticket `02` observed the live case and
    recorded the decision the sentence states: *"The lab's report is in Chinese. The lab's runner, with
    no `model` in the Target config, wrote the review axes and the summary in Chinese; the skill says
    nothing about language because the pack pins none."*
18. **The configuration line's shape.** `config.ts`'s `configLine` returns
    `` `beads-dag: config: ${CONFIG_KEYS.map((key) => `${key}=${values[key]} (${sources[key]})`).join(", ")}` ``,
    where a key's source is the file that set it or `default`, and the store's is `"PATH"` when
    `store.source === "environment"`, else the file. Ticket `15`'s verbatim stderr, both real runs:

```
beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), concurrency=4 (default), store=/data3/yky/.local/bin/bd (PATH)
beads-dag: config: runner=pi (/tmp/beads-lab-15/.scratch/beads-dag.yaml), model=the runner's default (default), thinkingLevel=low (/tmp/beads-lab-15/.scratch/beads-dag.yaml), concurrency=1 (/tmp/beads-lab-15/.scratch/beads-dag.yaml), store=/data3/yky/.local/bin/bd (PATH)
```

19. **`how often it has burned`** is the same reading as 8: the number of `attempt N failed:` comments the
    store holds; ticket `12`'s lab shows 1 → 2 → 3 across three drains of one issue.
20. **The killed-run paragraph.** Ticket `13` lab 1: run 1 was SIGKILLed between its merge and its record,
    run 2's `open` printed `lab/01: repaired: 23b9b3eea108e4aaf97021ac81483c033635f90b had already landed,
    so the issue is closed`, run 2's `review-base` was run 1's recorded position, and run 2's summary
    named the merge under `## Commits this run did not make` and the close under `## Repairs at open`.

### One whole artifact, and one skip-with-failures

Ticket `13` lab 1's run-2 `summary.md`, in full — the end a drain now leaves:

```
the session's answer

## Range

`33addb42288c9e8aa6c1fdb2ee324847e9b9e3d6..23b9b3eea108e4aaf97021ac81483c033635f90b` — 2 commits on Main, 0 made by this run, 2 not made by this run

## Commits this run did not make

- 23b9b3eea108 beads-dag: merge beads/lab/01-merged-then-killed
- 134c99644eba chore(beads-dag): ignore runtime paths

## Repairs at open

- lab/01 [lab-e8g] — closed: merge 23b9b3eea108 had already landed

## Failed attempts

none this run
```

Ticket `12` run 2's `summary.md`, in full — the skip line kept and the block written under it:

```
skip: review.md: skip: empty diff cd3260a694c174808ffd24604b1ad53d9ae4800f...main, skipped

## Failed attempts

- lab/01 [lab-4p6] — 2 recorded failures, open; attempted by this run; latest: attempt 2 failed: nothing to merge: beads/lab/01-nothing-to-commit carries no commit main does not have
```

### The install

From this repo's root, `skills/README.md`'s rule — the whole set copied, then the check:

```
$ mkdir -p ~/.pi/agent/skills && cp -a skills/{setup-matt-pocock-skills,drain,to-tickets,implement,to-spec,triage,ask-matt} ~/.pi/agent/skills/
(no output, exit 0)

$ for m in setup-matt-pocock-skills drain to-tickets implement to-spec triage ask-matt; do printf '%-26s' "$m"; diff -rq "skills/$m" "$HOME/.pi/agent/skills/$m" && echo "identical"; done
setup-matt-pocock-skills  identical
drain                     identical
to-tickets                identical
implement                 identical
to-spec                   identical
triage                    identical
ask-matt                  identical

$ diff -rq skills/drain ~/.pi/agent/skills/drain
(empty)

$ sha256sum skills/drain/SKILL.md ~/.pi/agent/skills/drain/SKILL.md
a241894cb38d84ef4f2ef1821d74cdee3bc402cbff34f0d025b4e7cc24352472  skills/drain/SKILL.md
a241894cb38d84ef4f2ef1821d74cdee3bc402cbff34f0d025b4e7cc24352472  /data3/yky/.pi/agent/skills/drain/SKILL.md

$ git -C /data3/yky/pi-agent-config status --porcelain -- skills
 M skills/drain/SKILL.md
```

The one modified path is this ticket's `drain/SKILL.md`; the other six members are byte-identical and
unchanged in the config repository's working tree. The config repository is committed there, not here.

### Gates

The pack is untouched, so its two gates only show the ground the new prose describes still holds:

```
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)

$ timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   bookkeeping-repro.ts  {"ok":true}
ok   brief-repro.ts  {"ok":true}
ok   config-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   failures-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   range-repro.ts  {"ok":true}
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
22/22 repros passed
```

### What this ticket did not settle

- **`bd ready` stays named, deliberately.** Ticket `02` wrote it out as the one store command in this
  file, because the retry fact is the store's own word (§10.3) and its criterion named it. This ticket
  added no store command of its own — no `bd comments`, `bd show` or `bd history` appears in the new
  prose — and left that one sentence alone. A stricter reading of "names no store command of its own"
  would move that sentence to the contract.
- **A run with no review write at all** — `skip: no review.md` / `skip: empty review.md` — is not named in
  the new prose; the two skips the ticket asks for are. They are written by `summary.ts` through the same
  `skipLine` helper, and read back as skips the same way.
- **The `review error:` recovery path is stated in the `review.md` bullet only** (the position stays, so
  the next run covers the range again). The failures block under a failed review is covered by the same
  sentence as the skipped review's, because `summary.ts` treats both through `reviewSkipReason`.
- **The `/tmp` labs left by earlier pack tickets** (`beads-lab-06` … `beads-lab-10`, `drain-skill-evidence`)
  were not touched: this ticket built none of its own, and those are other tickets' recorded evidence.
