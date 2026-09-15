# beads-dag/22 — one document, landed in Main

**What to build:** the pack gains **one shared module that lands a run's own documents**. Two new executors
both write documents — a reading's receipts and note, an experiment's record and collected numbers — and
neither of them may merge an issue's work, so the landing is a seam of its own and not part of what the drain
does to Main. It commits **only the paths the run names**: never `-a`, never the index, so a session's staged
work survives the commit untouched (the accident this rule exists for already happened once here). It runs
under the Main lock, so two writers cannot interleave, and it makes **one commit per ticket** with the word
the domain gives it — `read: <handle> <slug>`, `record: <handle> <slug>`. A path the run did not write is not
committed; a path the run wrote that the flow does not name is left uncommitted and said out loud in the
run's report. The pack's README says what is drain-only the way the closed rule does: a module whose reason
to exist is that a run **merges an issue's work**, not one that writes Main.

**Spec:** `docs/specs/2026-09-15-inquiry-and-experiment-executors.md` — "The pack grows two folders".

- [ ] a run's documents land as one commit per ticket on the Target's current branch, with the domain's
      subject, and the Main lock is taken and released around the commit
- [ ] a file staged by another session before the commit is **still staged** after it, and no path outside
      the named list enters the commit
- [ ] a named path with nothing to commit is not an error and produces no commit
- [ ] the README's module-sharing line reads the closed rule (merges an issue's work), and its table names
      the new module
- [ ] a repro drives the module against a throwaway Target with a real store and a staged stranger file;
      the pack's suite stays one command and both typechecks stay clean
