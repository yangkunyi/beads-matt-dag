# 17 — a dsh run's session lands in the run's artifacts too

**What to build:** ticket `06`'s criterion — a runner's session file is reported on the result and lands under
the run's artifacts — holds for Pi (the pack writes `sessions/<key>/<role>.jsonl` into `ARTIFACTS_DIR` itself)
and not for dsh, whose harness keeps its session log under `DSH_HOME` (its config root, because `--profile`
boots `$DSH_HOME/profiles`); the pack reports that real path and nothing else (README, "the runners"). So a
dsh run leaves its transcripts outside the run that produced them, and the acceptance's artifacts are complete
for one runner and not the other. Found by the pack acceptance and recorded only.

The fix is a **read-only view, not a move**: after a dsh turn, copy the harness's session file into the run's
artifacts and report the copy. ADR-0005 bars a *maintained mirror of state*, not an artifact a run leaves
behind, and the harness's file stays where its harness keeps it.

**Spec:** `.archon/workflows/beads-dag/README.md` ("the runners"), ticket `06`'s third criterion
**Blocked by:** None
**Status:** BLOCKED

- [x] after a dsh turn the harness's session file is copied into the run's artifacts and the **copy's** path is
      what the result reports (`PackAgentResult.sessionFile`)
- [x] the copy is a view: nothing keeps it in sync, the harness's own file is neither moved nor rewritten, and
      a missing or unreadable harness file degrades **loudly** (a stderr line) instead of failing a turn whose
      work already landed
- [x] Pi's behaviour is unchanged — it already writes inside the artifacts
- [x] a repro drives the seam with the stub dsh and asserts the artifact copy exists; a live dsh turn is quoted
      if this machine can produce one, and if it cannot the Comments say so rather than implying it was run
- [x] no Target's git state changes, and no new artifact is written for the Pi runner

## Comments

Built. After a dsh turn the pack leaves a **view** of the harness's session in the run's artifacts, and
`PackAgentResult.sessionFile` reports the copy, not the harness's file. The destination is Pi's own path,
imported rather than re-derived (`roleSessionFile`, `pi-session.ts`): one run's artifacts hold
`sessions/<key>/<role>.jsonl` per role whichever runner wrote it. The harness's file stays where its
harness keeps it — nothing moves it, nothing rewrites it — and nothing keeps the two in sync; the copy is
what the turn leaves behind, not a mirror of state (ADR-0005). The pack README's "the runners" paragraph
and the module table now say so. Pi is untouched: it never enters the copy path, and the repro pins its
session directory to exactly `["implement.jsonl"]`.

**The copy point is measured, not preferred.** The view is taken after `rt.close()`, because the harness
finishes writing the turn's log *after* it reports the turn idle. On this machine, with a live dsh turn
(`dsh` 0.1.5-rc.1, profile `sdk-minimal`, the gateway resolved from `~/.pi/agent/models.json`'s
`providers.packy`), a copy taken the moment `session.status: idle` arrived was 2715 B and ended at
`session/title` — the turn's own `assistant/message`, `step/end` and `turn/end` rows landed later; polled
with no shutdown, the lag was **209 ms**. `rt.close()` at idle takes 12 ms and the harness has flushed by
the time its shutdown reply comes back (10 rows at idle, all 13 after close). The same live turn with the
copy after close produced a 3916 B view, **byte-identical** to the harness's file. `dsh-agent.ts` names
that measurement where the copy sits, and the repro pins the order: the stub appends a final row in its
`shutdown` handler, so a copy taken before close fails `holding the harness's own bytes` (mutation proof
below).

**A copy that cannot happen degrades loudly and never fails a turn.** `sessionView` catches every failure
(no session file at all, an unreadable source, a directory-shaped source, an unwritable artifacts dir),
writes one line on stderr — the channel `open.ts`'s configuration line uses — and returns the harness's own
path, which is what the result reported before this change. `answer` and `lastError` are untouched, so a
turn whose work landed stays a turn. Exact line from a stub harness that wrote no session file:

```
beads-dag: dsh session view not written: the harness left no session file there: /tmp/beads-dag-17-live/dsh-home/sessions/--tmp-degrade-work-3lSOr8--/session-0a0115ec4fef4975856fef1a9ec7df58/session.v3.jsonl -> /tmp/degrade-view-lF9g0M/sessions/feat/11/implement.jsonl; the result reports the harness's own path
```

and that turn's own probe printed, verbatim:

```
{"answer":{"kind":"text","text":"STUB-ANSWER"},"sessionFile":"/tmp/beads-dag-17-live/dsh-home/sessions/--tmp-degrade-work-3lSOr8--/session-0a0115ec4fef4975856fef1a9ec7df58/session.v3.jsonl","viewExists":false,"viewReadable":false}
```

(`lastError` is absent from the JSON because it is `undefined`.) The fallback reports the harness's path
even when nothing is there: there is no copy path to report, and the harness's path is still more truthful
than a fabricated one. Criterion 1 reads on the normal path (a copy exists and the result names it); the
degraded path is criterion 2's.

### The repro (`tests/runner-repro.ts`, driven through the `DSH_BIN` stub)

The stub already wrote a session file under `DSH_HOME` (`sessions/<dash-slug>/<sessionId>/session.v3.jsonl`),
so the premise was real and no side of the seam had to be changed to make it so. What changed on the stub
side is its **tail** — it now appends `{"stub":"final"}` in its `shutdown` handler and records
`sessionFile`/`sessionMtimeMs` — plus the `STUB_NO_SESSION=1` knob for the degrade case. The repro drives
`dshAgent` (the seam) and asserts:

- the reported path is `roleSessionFile(artifacts, "feat/01", "implement")`, not the harness's file;
- the view exists and is byte-identical to the harness file, shutdown row included;
- the harness's file still exists where the harness wrote it, and its mtime is the one the harness left at
  shutdown — not moved, not rewritten;
- with `STUB_NO_SESSION=1` (stderr captured in-process): the turn still answers `STUB-ANSWER`, `lastError`
  stays undefined, no view exists, the result reports the harness's path, and stderr carries the line above
  naming both paths;
- Pi: `readdirSync(artifacts/sessions/feat/01)` is exactly `["implement.jsonl"]` — the dsh view adds no
  second artifact for Pi.

Red first, against the old adapter (the ticket's defect, exactly):

```
$ timeout 300 bun .archon/workflows/beads-dag/beads-dag-drain/tests/runner-repro.ts
{"ok":false,"error":"the reported session file is the view under the run's artifacts: got \"/tmp/runner-dsh-mKTwpe/dsh-home/sessions/--tmp-runner-dsh-mKTwpe-worktree--/session-985b851966ec4d1abdef8c6eeab0916e/session.v3.jsonl\", want \"/tmp/runner-dsh-mKTwpe/artifacts/sessions/feat/01/implement.jsonl\""}
EXIT=1
```

Green after: `timeout 300 bun …/tests/runner-repro.ts` → `{"ok":true}`, exit 0.

**Mutation proof for the copy point** (a fresh copy of the pack under `/tmp`, the copy moved before
`rt.close()`):

```
{"ok":false,"error":"holding the harness's own bytes: got \"{\\\"stub\\\":true}\\n\", want \"{\\\"stub\\\":true}\\n{\\\"stub\\\":\\\"final\\\"}\\n\""}
```

### A live dsh turn (a manual probe, not in the suite)

Producible on this machine, and produced: a throwaway script importing the pack's `dshAgent` with the real
`dsh` on PATH (no `DSH_BIN`), a temp worktree/artifacts pair, `thinkingLevel: "off"`, one short prompt — and
**not** added to the suite, which still starts only shims (`PI_SDK_PATH`, `DSH_BIN`):

```
$ timeout 300 bun probe.ts
{
  "artifacts": "/tmp/live-view-WlM8b3",
  "work": "/tmp/live-work-bF55HD",
  "ms": 4839,
  "sessionFile": "/tmp/live-view-WlM8b3/sessions/live/01/implement.jsonl",
  "answer": { "kind": "text", "text": "hello from a live dsh turn" },
  "reportedExists": true,
  "reportedBytes": 3916,
  "viewTree": [ "live", "live/01", "live/01/implement.jsonl" ]
}
$ cmp ~/.dsh-pack/sessions/--tmp-live-work-bF55HD--/*/session.v3.jsonl /tmp/live-view-WlM8b3/sessions/live/01/implement.jsonl && echo VIEW-IDENTICAL
VIEW-IDENTICAL
```

The view's rows: `session, agent/inbox/spliced, turn/start, agent/inbox/spliced, step/start, system/message,
user/message, request/header, request/context, session/title, assistant/message, step/end, turn/end` — the
turn's own ending included. The harness's file (3916 B) is still there; the probe left the session under
`~/.dsh-pack`, which is the harness's own config root, and touched no Target.

### Gates, verbatim (exit codes are the shell's)

```
$ time timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
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

real	10m23.953s
SUITE_EXIT=0

$ timeout 300 ./node_modules/.bin/tsc -p tsconfig.pack.json
TSC_EXIT=0
```

### Install

```
$ rm -rf ~/.archon/workflows/beads-dag && cp -r .archon/workflows/beads-dag ~/.archon/workflows/beads-dag
$ diff -rq .archon/workflows/beads-dag ~/.archon/workflows/beads-dag
INSTALL DIFF: EMPTY (exit 0)
```

### Left open / residuals

- Only the **missing** harness file is driven in the suite; "unreadable" is the same catch (an explicit
  `existsSync` only exists to avoid leaving an empty directory, and `copyFileSync`'s EACCES/EISDIR/ENOSPC
  all arrive at the same handler). A chmod-based case would not be portable: on a root-run machine read
  permission is not enforced, so the case would stop exercising anything.
- The view is a **snapshot at close**: a harness that wrote again after shutdown would leave the view
  behind, by design — the harness's own file stays the live log, and nothing re-reads it later.
- `dsh-agent.ts` now imports `roleSessionFile` from `pi-session.ts`. That is deliberate (one derivation of
  the one session-path contract, and the alternative — a second `join` — can drift), but it does mean the
  dsh adapter depends on a module named for the Pi runner; if a third runner ever arrives, the formula
  belongs in `agent.ts` beside the seam's `sessionFile` field.
- The reported path is diagnostics either way; no code path closes an issue, settles a turn or records a
  failure because of it.
