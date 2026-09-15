# beads-dag/26 — the thin experiment script

**What to build:** the second Target-side tool directory, peer of the reading pen — copied into a Target, not
installed, no package — carrying the two things an experiment cannot reconstruct afterwards. **register**
reserves a run's identity *before* anything executes: it queues the run under a name (nothing runs yet),
snapshots the name, the points it was queued with, the parameters and the code commit the run starts from,
and takes the ticket's declared ignored data paths so the queued run really sees its input — a queued run
works in a temporary workspace and gets only tracked bytes, so a stage whose ignored input is absent produces
a wrong number while the tool still reports success. **collect** executes the queue — in temporary
workspaces, which is what lets several points run at once and what leaves the operator's working tree alone
— and reports what the run produced: per run, the deciding metric's value and the file it was read from, the
parameters, and the version and artifact pointers. It trains nothing, schedules nothing and knows no cluster;
it shells out to `dvc` resolved on PATH with an override for tests, reads the tool's own JSON output (a
column tree whose entries are per-file data or error), and reports a metric it cannot read as empty rather
than guessing at a number.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The thin experiment script".

- [ ] `register` runs before anything executes and prints the run's identity: its name, its points, its
      parameters, its starting commit — with the registration also written into the run's artifacts
- [ ] `collect` executes the queue and prints, per run: the metric's value and the file it came from, the
      parameters, the code commit, the lock hash and the artifact hashes
- [ ] a queued run sees the ticket's declared ignored data paths (the flag that prevents a silently wrong
      number is carried through from the registration)
- [ ] a metric whose entry is an error rather than a value is reported as empty, never as a number
- [ ] both verbs can be pinned against a stub `dvc` on PATH, so the repros need no DVC, and a real smoke run
      against the DVC on this machine succeeds on a tiny stage
- [ ] the tools typecheck covers the new directory and the pack's suite stays one command
