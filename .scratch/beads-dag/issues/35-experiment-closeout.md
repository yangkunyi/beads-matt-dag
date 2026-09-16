# beads-dag/35 — experiment close-out last node

**What to build:** the experiment executor gains a last node that releases the same Target run lock that experiment `open` took, and writes attempted, closed-on-record, and failed. It reads attempted-ids plus store facts (closed on record completeness, failed attempts). It is not drain's review or summary and not inquiry's draft report. Do not merge the experiment-run include into this node. Closed stays completeness-of-record (ADR-0006).

- [ ] the last node releases the Target run lock that this run's `open` took
- [ ] the last node writes attempted, closed-on-record, and failed from attempted-ids and store facts
- [ ] the node is not drain review/summary and not inquiry's draft report
- [ ] existing callers stay green: pack typecheck and the drain repro suite
