# 03 — The frontier, composed and claimed atomically

**What to build:** Pick asks the store what can start, then applies what the store cannot answer:
decision issues are excluded by type, issues without the gate label are excluded, anything this run
already tried is excluded, and an issue whose attempt failed is offered as a retry — it is `open` again,
so the retry channel is the store's own ready answer. The result is truncated to the configured
concurrency and claimed in one transaction, so no two workers can start the same issue — and the node
reports why each eligible-looking issue was left out.

**Spec:** `docs/specs/2026-09-11-beads-dag.md`
**Blocked by:** `02`
**Status:** BLOCKED

- [x] with a store holding an eligible issue, a blocked one, a decision issue, one without the gate
      label, and one that was attempted and put back to `open` with a failure comment, pick claims
      exactly the eligible issue and the retried one
- [x] the claim is one transaction: a failure part-way leaves nothing claimed
- [x] the batch honours the concurrency cap, and a later iteration of the same run offers nothing that
      was already claimed
- [x] the exclusion report names, per issue, the rule that excluded it
- [x] a decision issue is never offered — including when a new flavour of question is introduced, which
      by construction cannot be forgotten
- [x] ~~an issue whose branch already carries a merge commit is offered only when it came from the failed
      side of the frontier~~ — **removed 2026-09-11, nothing built** (see Comments): a failure is an
      event, so there is no failed side of the frontier and no such candidate; and a merge that landed
      but was never recorded leaves its issue `in_progress`, where it is not a candidate at all — ticket
      07's opening reconcile closes it before pick runs. Pick makes no git check of its own.

## Comments

Built. Pick is one store query plus this run's own memory of what it tried: `readyIssues` (one `bd
ready --json --limit 0`), the pack's three rules, truncation to `concurrency`, and the whole batch
claimed in one `bd batch` transaction. The rules it cannot ask the store to explain are written, per
issue, into `pick-exclusions.json` in the run's artifacts.

**The reversal, 2026-09-11.** The design record was rewritten underneath this ticket (`7db0916`, "failure
is an event, not a fourth status": §10.3, §10.4) and the ticket was steered to it. What that changed here:

- `pick` is one query. There is no `bd list -s failed` half and no union: a failed attempt records its
  reason as a comment and puts the issue back to `open`, so `bd ready` is the retry channel itself and a
  retried issue is indistinguishable from fresh work in the store.
- Criterion 6 was not built, and is rewritten above to say why.
- The exclusion report keeps the rules it can still explain — decision type, missing gate label,
  attempted by this run — and lost the "already merged" rule with criterion 6.
- The fixture's failed issue is now made by attempting one (`in_progress`), recording `attempt 1 failed:
  …` as a comment, and putting it back to `open` (`failAttempt` in `tests/target.ts`). The repro asserts
  it is offered exactly like fresh work, and that its failure comment is the only difference.

**One deliberate departure from the literal command line in §10.4.** That command — `bd ready
--exclude-type decision -l ready-for-agent` — cannot report *why* an issue it filtered out was filtered
out, and the report has to name the rule per issue. So the pack asks for the same query unfiltered (`bd
ready`, readiness still the store's answer) and applies the type and label rules itself, which is what
makes them reportable. The exclusion is still by **type**, so a new flavour of question cannot leak in.

**Gates, verbatim**

```
$ BEADS_BIN=/data3/yky/.local/node-v24.19.0-linux-x64/bin/bd bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   drain-noop-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
7/7 repros passed
$ ./node_modules/.bin/tsc -p tsconfig.pack.json
(zero errors)
```

**Evidence per criterion** (all in `tests/pick-repro.ts`, each case driving `pick.ts` through the node
protocol and reading only the store's answers, the token, and the artifact):

1. one target holds an eligible issue, a blocked one, a decision issue, a decision issue with no
   `wayfinder:` label, one without the gate label and one that was attempted and reopened: the token is
   exactly `["feat/01","feat/06"]`, both end `in_progress`, the other four stay `open`, and the store's
   own answer offers the retried issue alongside the eligible one (`storeReady`), with `comment_count 1`
   as the only difference.
2. a store that refuses a claim batch once it is under way (the config `store:` override points at a
   wrapper that replaces the last line's id with a nonexistent one, so line 1 applies inside the
   transaction before line 2 fails): pick prints no token, exits non-zero, and **both** issues are still
   `open` in the store — the rollback, observed — with no report and no attempted-ids file written.
3. `concurrency: 2` over three eligible issues: exactly two are claimed and the token names those two;
   the next cycle of the same run offers exactly the issue the cap left behind; a third cycle offers
   nothing. An issue this run claimed that then failed (comment + `open`) is offered by the store and not
   by this run, with the report's rule `attempted-by-this-run`; a run with a fresh artifacts directory
   claims it again.
4. the report names each excluded issue and its rule — `decision-type` for both decision issues, the
   brand-new `wayfinder:` flavour included, `missing-gate-label` for the unlabelled one — and names
   nothing for the blocked issue, which never reached this step.
5. the same case as 1: a decision issue whose flavour label is new to the store, and one with no flavour
   label at all, are both excluded, because the rule is the type.

**Acceptance under the runner.** After `rm -rf ~/.archon/workflows/beads-dag && cp -r
.archon/workflows/beads-dag ~/.archon/workflows/beads-dag`, in a fresh `/tmp` lab (`bd init --prefix lab
--non-interactive --skip-agents --skip-hooks`) holding an eligible issue (`lab/01`), one blocked by it
(`lab/02`), a `decision` issue (`lab/03`) and one without the gate label (`lab/04`):
`archon workflow run beads-dag-drain --detach` → run `4aaf5484206769155a6cb93fa6e5fedc`, **completed**.
Its node log: `open` 494 ms, `pick` 747 ms, one `execute` instance for `lab/01` (the stub reported
`lab/01: not implemented`), second `pick` 479 ms with an empty fan-out, `review` 113 ms, `summary`
112 ms. `bd ready` before the run offered the decision issue, the unlabelled one and the eligible one, and
not the blocked one. Afterwards the store says `lab-5xt` (lab/01) `in_progress` and the other three
`open`; `attempted-ids.json` is `["lab-5xt"]`; the last cycle's `pick-exclusions.json` is
`{"picked": [], "excluded": [{"id": "lab-fa7", "handle": "lab/03", "rule": "decision-type"}, {"id":
"lab-i8c", "handle": "lab/04", "rule": "missing-gate-label"}]}`; and the Target's git log holds nothing
but the seed and `bd init`'s own commit.

**Mutation proofs** (a copy of the pack under `/tmp`, one edit each, then `pick-repro.ts`): the cap
ignored → *"the batch is truncated to the configured concurrency: got 3, want 2"*; `addAttempted` dropped
→ *"the run that tried it does not offer it again: got [feat/01], want []"*; the decision rule keyed on a
`wayfinder:` label instead of the type → *"pick offers … got [feat/01, feat/04, feat/06]"* (the bare
decision leaks); the gate-label rule dropped → *"got [feat/01, feat/05, feat/06]"*; the claims issued one
`bd update` per issue, or in two batches, or before the batch instead of inside it → each fails (the last
with *"nothing was claimed: the first issue is still open: got in_progress"*); the report's keys renamed →
the artifact assertion fails. Every assertion added here was shown to fail.

**Deviations, each deliberate**

- The claim sets `status=in_progress` and no assignee: the batch grammar cannot express `--claim`'s actor
  resolution, and `in_progress` is what keeps every other drain off the issue. Nothing in this flow reads
  an assignee.
- `pick` now requires `ARTIFACTS_DIR` and fails loudly without it: the report and the attempted set live
  there, so a pick with nowhere to keep them is a misconfiguration, not a run.
- An issue in the frontier with no `handle` metadata fails the node instead of being claimed — it cannot
  be named in git, so claiming it would start work whose branch, worktree and body path do not exist.
- `pick-exclusions.json` is rewritten each cycle rather than appended: it describes the cycle that just
  ran (the `[]` cycle is the one a human asks about), and earlier cycles are in the store's history.
- The report lists only the three rules; an issue the concurrency cap left for the next cycle is not an
  exclusion and is not listed.

**Store module surface, extended** (ticket 04 builds on it)

- `StoreIssue` — `{ id, type, status, labels, handle, slug }`, the store's JSON shape narrowed in one
  place; `handle`/`slug` read out of `metadata`.
- `readyIssues(store, target)` — the store's own answer to "what can start", from one
  `bd ready --json --limit 0` (the store's default cap is not a frontier).
- `claimIssues(store, target, ids)` — one `bd batch` on stdin, one transaction, all-or-nothing; a no-op
  for an empty list.
- `runStore` (private) gained an optional stdin, which is how the batch reaches the store.
- Not a store command, and so not in `store.ts`: `scripts/attempted.ts` — `readAttempted(artifactsDir)` /
  `addAttempted(artifactsDir, ids)` for the run's `attempted-ids.json`.

**Residual risk, pre-existing, not touched here.** `store-open-repro.ts` (ticket 02) asserts the "cannot
find the store binary" message lists the *first* entry of `process.env.PATH`, which is false when the
store binary's own directory is first on PATH — the suite then reports `6/7`. Reproduced on the stashed
working tree, so it is not this ticket's doing; run the suite with `BEADS_BIN` set (or with the store's
directory off PATH) and it is 7/7.
