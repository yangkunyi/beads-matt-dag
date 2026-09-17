# beads-dag/37 — the config reader is the runtime's YAML parser, not a subset we maintain

**What to build:** `scripts/config.ts` hand-rolls a YAML reader — `parseConfigText`, `stripComment`,
`parseScalar`, about ninety lines — for what its own doc comment calls "the tiny YAML subset people
actually write on a Target: one flat mapping of scalars, with `#` comments and blank lines". The pack
runs on bun, and bun ships `Bun.YAML.parse`. Read the file with that, and keep the contract the
hand-rolled reader promised.

A parser is a wheel. A *subset* parser is a wheel plus a promise we have to keep by hand, and the
promise is written out in the doc comment: a nested map or list, a key with no value, a duplicate key,
a value that opens a flow collection or block scalar all throw with the file and line "instead of
being silently reinterpreted". Every one of those refusals is ours to maintain, and a Target author
whose perfectly ordinary YAML we reject files a bug against our subset rather than fixing their file.

**The contract that must not move** (read it off the current reader, then hold it):

- unknown keys are ignored, as they always were;
- the answer carries which keys the text set, so the opening node can name the config file as their
  source (`fromFile`);
- a nested map or list, a key with no value, and a duplicate key are **refused with the file and
  line**, not silently reinterpreted;
- an absent file is not an error: `DEFAULTS` stand.

**One decision to make in writing, because the platform's parser differs from ours:**

`Bun.YAML.parse` accepts a superset — nested maps, sequences, anchors — and its error is
`YAML Parse error: Unexpected token` with **no line number**. So pick one and say which:

1. validate the parsed shape (flat, scalar, known key) after `Bun.YAML.parse` and refuse the rest,
   naming the offending key — and if the file-and-line wording is still required, find the line with a
   small scan for that key rather than by walking the text again; or
2. let the superset through and record in the ADR (beads-dag/39) that a Target may now nest.

Option 1 keeps the promise; option 2 is honest about a promise we stopped wanting. Either is
acceptable — silently doing neither is not.

- [ ] `parseConfigText` no longer carries a hand-rolled scalar/comment reader of its own
- [ ] `Bun.YAML.parse` (or an equivalent platform parser, with the reason recorded) reads the file
- [ ] unknown keys still ignored; `fromFile` still names the keys the text set
- [ ] a nested value, a bare key, and a duplicate key are still refused, and the message still names
      the file and the line (or the decision to stop doing so is written in the ADR)
- [ ] an absent file still leaves `DEFAULTS` standing
- [ ] `beads-dag-drain/tests/config-repro.ts` and `beads-dag-drain/tests/yaml-contract-repro.ts` pass
      unchanged, or the change to what they assert is stated in the diff's message
- [ ] `bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts` green
- [ ] `./node_modules/.bin/tsc -p tsconfig.pack.json` clean
