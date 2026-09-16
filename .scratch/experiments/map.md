# Experiments — the map

## Destination

A spec at `docs/specs/<date>-experiment-domain.md` that fixes what the experiment domain is: the ticket, the
result record, DVC's seat, the edges across the domain boundary, and what `closed` means there — down to the
interface a run store plugs into, without choosing one.

## Notes

- **Domain:** experiments. `closed` = the result is recorded. Nothing blocks across domains, in either
  direction (ADR-0004): what crosses is a link, never a gate — `relates-to` for a see-also, and
  `discovered-from` for the handoff, from the work ticket a result justified back to this map's ticket. The
  operator decides to open a ticket in another domain; the session types it.
- **Standing preferences (operator, 2026-09-14):** interface level only — no runner, no scheduler, no cluster
  (Q2a). Vendor-neutral: the record leaves a socket where W&B or MLflow plugs in; which one is not this map's
  decision (Q3a, "留一个口给记录"). The spec is the destination; code is not (Q1a).
- **Skills every session consults:** `/grilling`, `/domain-modeling`; for anything read, the inquiry tooling
  at `tools/inquiry/` with its corpus convention (`docs/agents/issue-tracker.md`, "Reading, and the corpus").
- **Corpus:** `.scratch/experiments/sources/`, `.scratch/experiments/notes/`.
- **An experiment's result may spawn an idea** — a `decision` issue in the inquiry domain, linked back
  with `relates-to`. That object is settled (2026-09-14): its comment thread is its development and its
  state is read off that record (`docs/agents/issue-tracker.md`, "Ideas").

## Decisions so far

- [DVC's seat: pins, the lock, and where a metric comes from](lab-zfl.1) — DVC's own holdings, read from its documentation: the declarations in `dvc.yaml`, the hashes and param values in the lock, experiments as refs under `.git/refs/exps`, metrics as declared key/values. The seat itself — which facts the flow keeps — went to [The result record](lab-zfl.2), which settled it.
- [The result record: home, fields, and the socket a run store plugs into](lab-zfl.2) — one document per ticket (`.scratch/<effort>/results/<NN>-<slug>.md`) carrying the attempts table and the verdict, plus a comment per change, because comments are where who, when and order survive; fields = deciding metric (and its source), parameters, budget spent, three version pointers, an optional run pointer, the verdict, and what the result does not establish; written by a thin target-side script (registration before the run, collection after), the verdict the operator's; the socket is `get(run)` plus optional `set-tag`, and `search(issue)` was declined — the flow owns which issue and which attempt. v1 reads DVC alone, and a vendor later fills only the fields DVC cannot see.
- [Peer level with no edge between domains](lab-zfl.3) — what crosses is a link, never a gate: `relates-to`
  for a see-also and `discovered-from` for the handoff (the work ticket a result justified points back
  here), one edge per pair. `blocks` and `parent-child` cross in neither direction — "run this ablation,
  then build the thing it justifies" is sequenced by hand, and "this code must exist first" is recorded as
  the run's version pointers rather than enforced. Blocking stays normal inside the domain (a pilot before a
  full sweep), the store's other named kinds are never used because they display as gates and hold nothing
  back, both ends of a handoff say so in prose, and the operator decides while the session types the ticket.
- [An experiment ticket, and who may work it unattended](lab-zfl.4) — the plan is what makes a ticket
  runnable: the deciding metric and where it is read from, the reference the result is read against (a
  prediction, a baseline, or the explicit word *exploratory*), and the intended pin, with a hypothesis and a
  budget both optional. Writing the script, running it, collecting the numbers and writing the record may
  all run AFK; the operator appears twice — agreeing the plan, and later saying what the result means.
  Changing the deciding metric opens a new ticket (the old one closes `wontfix`, linked `relates-to`), the
  budget is recorded and never enforced (which settles that fog item), and both the record's closing lines
  (measured, met or missed, scope, `reading: none yet`) and closure itself are mechanical — no signature —
  because `closed` here is bookkeeping; the operator's judgement leaves the ticket as an idea or a work
  ticket, and a result nobody has interpreted says so in the record (`reading: none yet`) — surfacing those
  is [The review surface](lab-zfl.7)'s question, graduated from this map's fog.
- [The experiment kind, and what keeps the drain off it](lab-zfl.5) — an experiment ticket is type
  `experiment`, registered in the Target's store; **a type is a domain**, and the pack spells the non-work
  types once (`NON_WORK_TYPES = {decision, experiment}`), so `pick` excludes both from the frontier, the
  repair touches neither one's status, and the cross-domain preflight refuses any blocking chain reaching
  either — the crossing `.3` banned, now enforced for the second domain rather than merely described. The
  store enforces one thing only (a type it does not know cannot be created); the pack ships the set, the
  repro suite pins the three readers so a re-hardcoded `decision` would fail the gate, and the setup skill
  registers the type beside `bd init`. An experiment ticket carries handle/slug metadata, its record at
  `.scratch/<effort>/results/`, and the `experiment` label — never the gate label.
- [Closure for experiments: "the result is recorded", written down](lab-zfl.6) — a new ADR
  (`docs/adr/0006-closure-is-per-domain.md`) rather than an edit to 0004, which keeps `close means merged`
  for development and gains a "partly superseded" note: what 0004 rejected — several closure meanings on
  one graph — it rejected because an edge would then carry an unstated domain, and **a domain is the
  type**. So `closed` means what the issue's domain says, and who may write it differs: development's is
  the drain's settlement, inquiry's the session's on the operator's word, an experiment's a completeness
  check with no signature. The safety rule is the crossing ban, enforced in code (`.5`). CONTEXT.md's
  `closed` term and Domains section were updated, the ADR index gained 0006, the unreferenced duplicate
  `0003-four-statuses` was removed, and this Target's copies of `CONTEXT.md`, `docs/adr/` and
  `docs/agents/issue-tracker.md` were refreshed (its CONTEXT.md still said `relates-to` was the only
  crossing link).
- [The review surface: a recorded result nobody has read](lab-zfl.7) — nothing sweeps for results still
  carrying `reading: none yet`, and nothing should: no chain waits on an unread result, so the answer is
  visibility, not machinery (Q1a). The record stamps a `reading:none` label **in the same act as the
  close** — the rule ideas already use — which turns the document line into a query:
  `bd list -t experiment -s closed -l reading:none`, run at the start of a working session beside the
  frontier (Q4a). **The operator dropped Q4c** — no map lists unread results: one fact lives in one place
  (the record and its label), and a page repeating it is a second thing that can be wrong. Writing the
  reading clears it in one act, and declining to read is written down as a reading too — `reading:
  declined — <why>` — so unread is not a debt and nothing is ever overdue (Q3a). Nothing acts on the list
  (Q2a), and nothing new was built: the fog about where the experiment half's code lives stays open.

## Not yet specified

Nothing: the destination was reached (spec written 2026-09-15), and the one item still in the fog was ruled
out of scope below rather than resolved.

## Out of scope

- **Where the experiment half's code lives** — `.2` settled *that* there is a thin script (registration before
  the run, collection after, copied in like `tools/inquiry/`), not which directory it sits in. That is an
  implementation choice, not this flow's design: settle it the day the first experiment is really run. Moved
  here from *Not yet specified* when the map reached its destination (2026-09-15).

- **The verification leg** — a separate half (the inquiry synthesis, §7), not this domain.
- **Scheduling, multi-machine runs, cluster plumbing** — the destination stops at the interface.
- **Whether the experiment domain gets its own pack folder** — decided later, on evidence this map produces
  (Q4, 2026-09-14).
- **The idea object** — how an idea is tracked, and how its development is recorded. That is the inquiry
  half's business (operator, 2026-09-14); this map only has to say where an experiment's result hands off.
