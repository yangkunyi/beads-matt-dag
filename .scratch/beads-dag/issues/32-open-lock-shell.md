# beads-dag/32 — plug drain, inquiry, and experiment open into one lock-and-release shell

**What to build:** drain, inquiry, and experiment `open` keep their own leftover repair and premises, and plug into one lock-and-release shell. The shell takes the Target run lock, prints the config line, runs the leftover repair and premises it is given, and releases the lock if that work fails. Leftover repair stays out of the socket: drain from git, inquiry and experiment from the store (ADR-0002). No domain switch inside the shell. Closed stays out of the shell (ADR-0006).

- [ ] the three `open` nodes call one shell for take-lock, config line, and release-on-failure
- [ ] leftover repair and premises remain in each executor and are passed into the shell
- [ ] a failure in that work releases the lock
- [ ] existing callers stay green: pack typecheck and the drain repro suite
