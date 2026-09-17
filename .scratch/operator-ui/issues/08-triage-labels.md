# operator-ui/08 — triage labels

**What to build:** the operator surface moves the five triage labels — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` — one replacing one. That is the gate, the brake, and dropping an idea. Every other label write is refused, including `reading:` and `idea:*`. Abandoned work is `wontfix`, not `closed`.

- [ ] applying one triage label removes the other four of the family
- [ ] `ready-for-agent` and a brake are possible from the surface
- [ ] `wontfix` is a label, not a close
- [ ] a non-triage label write is refused and the store is not written
- [ ] the tools typecheck stays clean
