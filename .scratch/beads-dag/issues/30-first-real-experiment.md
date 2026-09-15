# beads-dag/30 — the first real experiment

**What to build:** the same acceptance for the experiment half — the day this domain stops being paper and
runs on a real stage with the DVC installed on this machine. One real experiment ticket — a deciding metric
and the file it is read from, a reference frozen before anything runs, the data and code it is pinned to —
whose stage already exists in Main (the experiment's code lands through a development ticket, never through
this executor). Then the experiment executor runs it for real: the run is registered under its name before
anything executes, the points execute in temporary workspaces (a sweep of several points is one ticket, one
table, one close), the numbers are collected and read back, the record is written with its four labelled
closing lines, and the ticket closes by itself when the record is complete — with the unread marker on until
the operator reads it, after which the reading clears the marker in one act and names what the result fed,
written on both ends. Whatever the real stage exposes is fixed here: whether the tool flags the design chose
hold up, whether the collected JSON says what the record needs, whether a run whose input was missing is
caught rather than recorded as a number.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "Testing Decisions" (§ the third
gate), "The experiment executor"; `docs/specs/2026-09-15-experiment-domain.md`.

- [ ] a real experiment ticket runs end to end: registered before, executed in temporary workspaces,
      collected after, a complete record, and the ticket closing itself
- [ ] the record carries its four labelled closing lines and is committed, and the ticket carries the unread
      marker until the operator reads it
- [ ] the operator's reading clears the marker in one act and names what the result fed, with the line
      written on both ends
- [ ] a deliberately incomplete record leaves the ticket open with the exact missing piece named — proved
      once for real, not only in a repro
- [ ] anything the real stage exposed about the thin script or the executor is fixed, with a repro wherever a
      repro can hold it
- [ ] the flow's documents describe what the real run did: the experiment-domain spec's DVC seat, the tracker
      contract's Experiments section, the pack README
