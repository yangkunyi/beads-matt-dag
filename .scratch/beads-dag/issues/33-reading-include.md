# beads-dag/33 — reading include owns its labels and paths

**What to build:** the include that reads owns the labels and paths it needs. The read node no longer imports the inquiry folder. Parent YAML still includes the child. Folders stay split (Archon fan-out). Not a pack-kernel move and not a merge of execute, read, or experiment-run.

- [ ] reading's labels and paths live in a module the reading include owns
- [ ] the read node does not import the inquiry folder
- [ ] parent YAML still includes the child; folders stay split
- [ ] existing callers stay green: pack typecheck and the drain repro suite
