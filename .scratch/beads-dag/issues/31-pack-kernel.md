# beads-dag/31 — lift the pack kernel out of drain

**What to build:** inquiry, experiment, execute, and read import a pack kernel for store, Target run lock, Main lock, attempted, roles, naming, doc-commit, node-entry, git, domains, failures, agent, worker-env, prompt, config, and node-outcomes. They do not reach through the drain executor to get those. Drain-alone merge modules stay in drain. Execute, read, and experiment-run folders stay. `tools/` stays out of the pack. Closed stays in the domain adapter (ADR-0006). Leftover repair stays in each executor (ADR-0002). Existing callers keep their behaviour.

- [ ] callers import those capabilities from the kernel, not from the drain executor
- [ ] drain-alone merge modules remain in drain
- [ ] existing callers stay green: pack typecheck and the drain repro suite
- [ ] no new behaviour
