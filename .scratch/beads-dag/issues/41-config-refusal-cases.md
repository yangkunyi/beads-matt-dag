# beads-dag/41 — pin the config reader's refusals, case by case

**The finding (medium, from the drain's review of beads-dag/37):** replacing the hand-rolled YAML subset
reader with `Bun.YAML.parse` left the refusal contract unguarded. The ticket's whole point was that the
refusals survive the swap — a nested value, a bare key, a duplicate key, each naming its file and line —
and `config-repro.ts` exercised only `loadConfig`'s happy scalar path, so nothing would have gone red if
one of them had been quietly dropped. In the event none were, which is exactly why nobody noticed.

**On Main as c9edede.**

- [x] `config-repro.ts` imports `parseConfigText` and drives it from text alone, no filesystem: a nested
  value, a bare key, a duplicate key, and a syntax error.
- [x] each refusal names the file and the line where the line is knowable — nested value and bare key at
  their own line, a duplicate key at its **second** appearance.
- [x] a syntax error names the file only, and the test says why: the platform parser reports no line, so
  the line the reader prints is the one its own key scan found and there is none to find.
- [x] an unknown key is ignored rather than refused, and `fromFile` records only the keys the text set.
- [x] a file with no keys at all — comments only — keeps the defaults and records nothing.
- [x] `tsc -p tsconfig.pack.json` clean, repro prints `{"ok":true}`, and the full suite is 45/45.
