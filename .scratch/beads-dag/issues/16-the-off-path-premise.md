# 16 — the off-PATH premise removes every path that resolves the binary

**What to build:** `envWithoutStore()` in `beads-dag-drain/tests/target.ts` removes only
`dirname(storeBinary())` from PATH, so a PATH holding a *second* directory with an executable `bd` leaves the
binary findable and breaks the premise the suite builds on ("a Target that cannot find the store").
Found by ticket `beads-skills/02`'s author: with a second `bd` directory prepended, `store-backup-repro.ts`
failed once — 17/18 — for exactly this reason, while the machine's own PATH gives 18/18. The fix is to remove
every PATH entry under which an executable `bd` resolves, so the premise holds by construction rather than by
luck about which directory `storeBinary()` happened to pick.

**Spec:** `.archon/workflows/beads-dag/README.md` (Gates) and `beads-dag-drain/tests/target.ts`
**Blocked by:** None
**Status:** BLOCKED

- [x] `envWithoutStore()` drops every PATH entry under which an executable `bd` resolves, not only the one
      `storeBinary()` picked
- [x] with a second `bd` directory prepended to PATH, the suite is green again (21 repros as of ticket
      `14`), and the premise is *shown*: the same environment prints nothing for `command -v bd`
- [x] nothing else about the tests' environment changes: the suite still passes on the machine's own PATH

---

## Comments

Built. `envWithoutStore()` now drops every PATH entry under which an executable `bd` resolves, so the
premise — a Target that cannot find the store — holds by construction rather than by which directory
`storeBinary()` happened to pick. The pack `README.md` was left untouched: its Gates section already
records the premise as a repro *inside* the one suite, and this is what the helper needed to mean.

Changed, before → after (`target.ts`, nothing else in the pack):

```ts
/** The environment as a Target that cannot find the store: the binary's directory out of PATH. */
export function envWithoutStore(): NodeJS.ProcessEnv {
  const storeDir = dirname(storeBinary());
  const entries = (process.env.PATH ?? "").split(delimiter).filter((dir) => dir !== "" && dir !== storeDir);
  return { ...process.env, PATH: entries.join(delimiter) };
}
```

```ts
/**
 * The environment as a Target that cannot find the store: every PATH entry under which an executable
 * `bd` resolves is out, not only the one `storeBinary()` happened to pick. A second install earlier or
 * later on PATH would otherwise leave the binary findable, and the premise is what the repros assert.
 */
export function envWithoutStore(): NodeJS.ProcessEnv {
  const entries = (process.env.PATH ?? "")
    .split(delimiter)
    .filter((dir) => dir !== "" && !isExecutable(join(dir, "bd")));
  return { ...process.env, PATH: entries.join(delimiter) };
}
```

`isExecutable` is the file's own predicate — the one `findOnPath("bd")` already uses — so the filter drops
exactly the entries the fixture's own PATH lookup would accept; there is no second notion of where the
binary can live. The helper still returns a full environment for the child.

### The premise, shown

A `/tmp` scratch directory held a symlink to `bd` and was prepended to PATH for every command below. The
defect first, on the unfixed helper, in the one repro `beads-skills/02` observed fail:

```console
$ env -u BEADS_BIN PATH="/tmp/bd-second-16:$PATH" bun .archon/workflows/beads-dag/beads-dag-drain/tests/store-backup-repro.ts
{"ok":false,"error":"an unresolvable binary prints nothing on stdout: got \"store pushed to its Dolt remote\\n\", want \"\""}
$ echo $?
1
```

After the fix the same command prints `{"ok":true}`. And the premise is *shown*, not asserted: under that
same PATH, the environment `envWithoutStore()` builds resolves no `bd`, prints nothing for `command -v bd`
and exits 127 — while the old shape, printed beside it, still resolved the machine's own directory:

```json
{ "before": { "pathEntriesResolvingBd": ["/data3/yky/.local/bin", "… ×5"],
              "commandVStdout": "/data3/yky/.local/bin/bd\n", "commandVStatus": 0 },
  "after":  { "pathEntriesResolvingBd": [],
              "commandVStdout": "", "commandVStatus": 127 } }
```

### The two suite runs

Both from this repository, `env -u BEADS_BIN`, `timeout 1200`, all 21 repros:

```console
$ env -u BEADS_BIN PATH="/tmp/bd-second-16:$PATH" timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
…
21/21 repros passed

$ env -u BEADS_BIN timeout 1200 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
…
21/21 repros passed
```

Nothing else about the tests' environment moves: on the machine's own PATH, where `bd` resolves at
`/data3/yky/.local/bin/bd`, the new helper's environment is byte-identical to the old one's — same keys,
same PATH, no differing key. The typecheck gate (`./node_modules/.bin/tsc -p tsconfig.pack.json`) exits 0.
The `/tmp` scratch (the second `bd` directory and the two check scripts) was removed after the runs.

### Left unsettled

- `BEADS_BIN` stays inherited by the child environment. It is the suite's own override, and the pack's
  `store.ts` never reads it, so it cannot make the store resolvable through PATH; the ticket is about
  PATH, and this keeps the helper's contract as it was.
- `envWithoutStore()` no longer calls `storeBinary()`, so it no longer throws when no binary exists
  anywhere. Nothing observable changes — the fixture throws at its first call in that state, and the
  helper still returns a full environment with no `bd` resolvable through PATH.
- A relative PATH entry is judged from the suite's own cwd, exactly as `findOnPath` judges it. Unchanged
  behaviour, noted because the predicate now reads each entry the same way the lookup does.
