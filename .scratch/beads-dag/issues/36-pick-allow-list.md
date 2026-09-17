# beads-dag/36 — pick allow-list

**What to build:** each domain run's pick can take an allow-list of issue ids for this run. An issue not on the list is excluded as `outside-allow-list` and not claimed; its triage is untouched. An omitted list keeps today's pick. An empty list claims nothing. Being on the list does not bypass ready, that run's gate, attempted, or type.

- [ ] drain, inquiry and experiment pick claim only ids on a present allow-list
- [ ] an omitted allow-list still picks as today
- [ ] exclusions name `outside-allow-list` and do not brake the issue
- [ ] pack typecheck stays clean
