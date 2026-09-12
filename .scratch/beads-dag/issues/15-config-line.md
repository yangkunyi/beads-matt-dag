# 15 — a run says which configuration it used

**What to build:** The opening node prints one line naming the effective configuration and where each value
came from — the Target's config file, or the built-in default. Today `loadConfig` silently returns the
defaults when `.scratch/beads-dag.yaml` is absent and nothing anywhere records what was in effect, so "the
Target has no config file" is indistinguishable from "a file said so". A Target needs no config file at all:
every key has a usable default, and with the store binary on PATH none of them has to be written.

**Spec:** `docs/specs/2026-09-11-beads-issue-tracker-consensus.md` (§10.7) and
`.archon/workflows/beads-dag/beads-dag-drain/scripts/config.ts`
**Blocked by:** `02`
**Status:** BLOCKED

- [x] the opening node writes one line naming runner, model, thinkingLevel, concurrency and store, each with
      its source: the config file, or the default
- [x] a Target with no config file runs exactly as today — defaults, no error — and the line says so
- [x] a value that came from the config file is reported as such, and a malformed file still fails loudly,
      unchanged
- [x] the line reaches a run's record the way the pack's other diagnostics do, with no new artifact unless
      the Comments argue for one
- [x] no resolved value changes

---

## Comments

Built. `loadConfig` returns the effective values **with the reading's provenance** — the file it read and
which keys that file set — so "what will run" and "who wrote it" travel together, and `configLine` (the
same module) renders both as one line over `CONFIG_KEYS`. `open` prints it to stderr right after the store
preflight, before the graph preflight that can refuse the run. No new artifact, and not for convenience:
the line needed no artifact to be visible, because it uses the channel the repair lines already use — and
the runner already records a node's stderr as `stderr_tail` in its `exec_output` event. Stdout is
untouched: `open`'s whole stdout is still one `opened` token, which is exactly why the line could not go
there (a node's stdout is its token channel).

The line's shape (`beads-dag: config: <key>=<value> (<source>)`, `CONFIG_KEYS` order):

```text
beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), concurrency=4 (default), store=/data3/yky/.local/bin/bd (PATH)
beads-dag: config: runner=pi (/tmp/beads-lab-15/.scratch/beads-dag.yaml), model=the runner's default (default), thinkingLevel=low (/tmp/beads-lab-15/.scratch/beads-dag.yaml), concurrency=1 (/tmp/beads-lab-15/.scratch/beads-dag.yaml), store=/data3/yky/.local/bin/bd (PATH)
```

The first is a Target with no file; the second is the same Target with three keys written. A key's source
is presence in the file, not difference from the default: `runner: pi` above is the default value and the
line still names the file. `model`'s default is the runner's own default (the pack's value is unset), and
the line says so; the store's source is the one distinction `store.ts` already makes — the file that wrote
the override, or `PATH`. A store override reads `store=<binary> (<resolved config path>)`.

### Evidence — a throwaway `/tmp/beads-lab-15` lab (bd 1.2.2), installed by copy

`rm -rf ~/.archon/workflows/beads-dag && cp -r .archon/workflows/beads-dag ~/.archon/workflows/beads-dag`,
then `diff -r` identical — checked before the runs and re-checked after the commit. The lab: `git init -b
main`, one seed commit, `bd init --prefix lab --non-interactive --skip-agents --skip-hooks`; `bd ready` was
`[]` before run (1), and run (1) left the store untouched — so it was `[]` for the later runs too.

**(1) no config file, a real drain — defaults, no error.** Run `0f689c08f4b7e92c976fa61aa62cece6`,
**completed** (2.6 s). Its `open` record:

```json
{"type":"node_start","step":"open","content":"<script>"}
{"type":"exec_output","step":"open","content":"<script>","exit_code":0,"stdout_tail":"opened","stderr_tail":"beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), concurrency=4 (default), store=/data3/yky/.local/bin/bd (PATH)"}
{"type":"node_complete","step":"open","content":"<script>","duration_ms":1248}
```

After the run: `bd ready --json` `[]`, `bd list --json` `[]`, `git status --porcelain` empty, `git worktree
list` the Target only — the run did exactly what the default configuration says, and the line said the
defaults were in effect.

**(2) a config file that sets a key.** Same Target, `.scratch/beads-dag.yaml` =
`runner: pi` / `thinkingLevel: low` / `concurrency: 1`. Run `85a30168112f678beda4fe5290afa420`, **completed**;
its `open` record:

```json
{"type":"exec_output","step":"open","exit_code":0,"stdout_tail":"opened","stderr_tail":"beads-dag: config: runner=pi (/tmp/beads-lab-15/.scratch/beads-dag.yaml), model=the runner's default (default), thinkingLevel=low (/tmp/beads-lab-15/.scratch/beads-dag.yaml), concurrency=1 (/tmp/beads-lab-15/.scratch/beads-dag.yaml), store=/data3/yky/.local/bin/bd (PATH)"}
```

**(3) a malformed file still fails loudly, unchanged.** `concurrency: nope`. Run
`92bd83ce192db5f547016f81aae1fec3`, **failed**:

```json
{"type":"exec_output","step":"open","exit_code":1,"stderr_tail":"invalid concurrency in /tmp/beads-lab-15/.scratch/beads-dag.yaml: nope"}
{"type":"node_error","step":"open","error":"Script node 'open' failed [exit 1]: invalid concurrency in /tmp/beads-lab-15/.scratch/beads-dag.yaml: nope"}
{"type":"node_skipped","step":"drain","content":"trigger_rule"}
{"type":"node_skipped","step":"review","content":"trigger_rule"}
{"type":"node_skipped","step":"summary","content":"trigger_rule"}
{"type":"workflow_error","error":"DAG workflow 'beads-dag-drain' failed: node open failed. 3 downstream nodes were skipped."}
```

**(4) one real drain showing the line in the run's stderr and completing normally** — run (1)'s
record, abridged to the boundaries:

```json
{"type":"workflow_start","content":""}
{"type":"node_start","step":"open","content":"<script>"}
{"type":"exec_output","step":"open","content":"<script>","exit_code":0,"stdout_tail":"opened","stderr_tail":"beads-dag: config: runner=pi (default), model=the runner's default (default), thinkingLevel=high (default), concurrency=4 (default), store=/data3/yky/.local/bin/bd (PATH)"}
{"type":"node_complete","step":"open","content":"<script>","duration_ms":1248}
{"type":"node_start","step":"pick","content":"<script>"}
{"type":"exec_output","step":"pick","content":"<script>","exit_code":0,"stdout_tail":"[]"}
{"type":"exec_output","step":"drain-iteration-1","content":"<until_bash>","exit_code":0}
{"type":"exec_output","step":"review","content":"<script>","exit_code":0,"stdout_tail":"nothing"}
{"type":"exec_output","step":"summary","content":"<script>","exit_code":0,"stdout_tail":"nothing"}
{"type":"workflow_complete"}
```

The line is the node's `stderr_tail` — the same channel, and the same record, the repair lines reach.
The lab was removed when the ticket was done.

### Gates and diff

- `bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts` → `22/22 repros passed` (21 before;
  `config-repro.ts` added: the line's shape, `loadConfig`'s provenance, and no-file / file / store-override /
  malformed through the node, with `open`'s stdout still the bare token).
- `./node_modules/.bin/tsc -p tsconfig.pack.json` → zero errors.
- Changed: `scripts/config.ts` (provenance + `configLine`), `scripts/node-entry.ts` (hands the handler the
  provenance), `scripts/open.ts` (prints the line), `report-node.ts` / `execute.ts` / `backup.ts` /
  `tests/lock-repro.ts` (`.config` off the new `loadConfig` return), `README.md` (one sentence), new
  `tests/config-repro.ts`. The design record was not edited.

### What the ticket did not settle

- The exact words: the `beads-dag: config:` prefix, the `(default)` / `(<resolved config path>)` / `(PATH)`
  source vocabulary, and `model=the runner's default (default)`. The ticket named the values and the two
  sources, not the spelling.
- The config file is named by its resolved absolute path — the same path `INPUTS_CONFIG` resolves to, so a
  Target pointed at a file elsewhere sees that file.
- A file that exists but sets no effective key (a typo'd key, an unknown key) reads exactly like no file:
  per-key provenance is the whole reading, and the effective configuration is identical.
- The line is written after `preflightStore`, so a run whose store cannot be resolved fails with its existing
  message and prints no line: the store's resolution is one of the things the line would have named.
- A key whose parsed value does not take effect (`model: null`) is not provenance: `fromFile` records the
  keys that set the value, not the keys the file mentioned.
