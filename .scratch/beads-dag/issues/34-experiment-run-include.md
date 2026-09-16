# beads-dag/34 — experiment-run include owns record, issue helper, and tool spawn

**What to build:** the include that runs an experiment owns the record, the experiment-issue helper, and tool spawn. The run node no longer imports the experiment parent folder. Parent YAML still includes the child. Folders stay split (Archon fan-out). Not a pack-kernel move and not a merge of execute, read, or experiment-run.

- [ ] record, experiment-issue helper, and tool spawn live in modules the experiment-run include owns
- [ ] the run node does not import the experiment parent folder
- [ ] parent YAML still includes the child; folders stay split
- [ ] existing callers stay green: pack typecheck and the drain repro suite
