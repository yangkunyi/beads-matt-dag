# The operator surface

*Assembled 2026-09-17 from the operator-surface grilling (Q1–Q13) on top of ADR-0001, ADR-0006,
ADR-0007 and the tracker contract. Status: **designed, not built.** The overview already shows the
graph, overlays a live run, and writes `bd comment`. This spec is the rest of the surface: the
operator writes the graph without a session, and starting a selection starts the domain's existing
run with an allow-list.*

The surface is a view of the Target's beads graph. It is not an executor and not a second store.
Issues stay issues. Drain, inquiry and experiment stay three runs. Merge stays in drain.

## Problem Statement

The operator can see the Target's issues and comment on one of them. Everything else that makes the
graph *his* still needs a session or a CLI: creating an issue in a domain, drawing a blocking edge
inside that domain, drawing a crossing `relates-to` or `discovered-from`, moving the five triage
labels, and starting only the issues he has selected. Today a drain takes every gated ready issue
up to concurrency; the only hold-back is taking the gate off. There is no way to point at a handful
of issues and run just those, and no way to edit the graph without first opening an agent.

He does not want an n8n canvas. The picture is not the workflow. The picture is the issues, and the
existing run for their domain does the work.

## Solution

Grow the existing operator surface into the place a human writes the graph and starts a run:

- The page still reads the Target through the store, never the jsonl export. A React canvas may
  draw the same issues and edges; positions and gestures live in the view; beads remains the graph.
- Without a session, the operator may create an issue (type is the domain; that domain's identity
  labels go on at create; default triage is `needs-triage`), add or remove intra-domain `blocks`,
  add or remove crossing `relates-to` and `discovered-from`, comment, and move the five triage
  labels. The surface refuses `closed`, `reading:`, `parent-child`, cross-domain `blocks`, and
  every other label.
- Starting a selection starts **the domain's existing run** — drain, inquiry, or experiment — with
  an allow-list of those issue ids. The canvas does not claim, merge, or stamp `closed`. A mixed-domain
  selection does not start. An omitted allow-list keeps today's pick; a present allow-list is this
  run's pool, not a brake on anyone else.

## User Stories

1. As the operator, I want to see the Target's issues as a graph, so that what depends on what is
   visible without reading `bd show` one id at a time.
2. As the operator, I want the graph to be the store's graph, so that what I see cannot drift from
   what a drain will pick.
3. As the operator, I want to filter the view by type, status and label, so that I can look at one
   domain or one triage pile without the other two shouting.
4. As the operator, I want to click an issue and see its status, comments and documents, so that
   the graph and the record are one place.
5. As the operator, I want to pan and zoom the graph, so that a large Target is still usable.
6. As the operator, I want a layout that respects dependency direction, so that blockers sit where
   the eye expects them.
7. As the operator, I want to drag an issue to read it more easily, so that the layout is a view I
   can nudge.
8. As the operator, I want a reload to come from the store again, so that a session's write shows
   up without me guessing.
9. As the operator, I want issue positions to stay out of the store, so that a layout never becomes
   a second graph.
10. As the operator, I want a live drain, inquiry or experiment run overlaid on the same page, so
    that I can see which issues this run has attempted without a second dashboard.
11. As the operator, I want to comment on the selected issue immediately, so that a reply does not
    wait on an agent.
12. As the operator, I want that comment to be a store comment, so that `bd show` and the page
    agree.
13. As the operator, I want creating an issue to require a domain (its type), so that nothing
    enters the store without a closure meaning.
14. As the operator, I want a new development issue to be a work type (`task`, `bug`, …), so that
    drain still owns it.
15. As the operator, I want a new question or idea to be type `decision`, so that inquiry owns it.
16. As the operator, I want a new experiment to be type `experiment` with the `experiment` identity
    label, so that the experiment run can find it.
17. As the operator, I want a newly created issue to carry `needs-triage` and not the gate, so that
    creating is not starting.
18. As the operator, I want a newly created issue to have a handle and a body of prose, so that a
    later drain can name it in git.
19. As the operator, I want to supply the feature the handle belongs to, so that issues land in a
    named pile rather than an anonymous one.
20. As the operator, I want the surface to allocate the next number in that feature, so that I do
    not invent colliding handles.
21. As the operator, I want the body to carry handle and prose and no status, so that the store
    remains the only place state lives.
22. As the operator, I want to draw a `blocks` edge between two issues of the same domain, so that
    I can say what must finish first without a session.
23. As the operator, I want to remove a `blocks` edge I no longer mean, so that a dependent can
    become ready without waiting on abandoned work.
24. As the operator, I want a `blocks` edge across domains to be refused, so that a recorded
    result can never release development work.
25. As the operator, I want a `parent-child` edge to be impossible from the surface, so that the
    canvas cannot sneak a second blocking kind across or inside a domain.
26. As the operator, I want to draw `relates-to` between any two issues, including across
    domains, so that a see-also does not have to pretend to be a gate.
27. As the operator, I want to draw `discovered-from` from a derived issue to its source, so that
    a handoff a result made is visible on the graph.
28. As the operator, I want `discovered-from` to stay non-blocking, so that the handoff never
    becomes a gate.
29. As the operator, I want the surface to refuse a second relation between the same pair, so that
    a handoff and a see-also cannot both exist (the store already forbids it).
30. As the operator, I want connecting two issues in the same domain to mean `blocks` unless I
    pick a crossing kind, so that the common gesture matches the common intent.
31. As the operator, I want connecting two issues in different domains to require `relates-to` or
    `discovered-from`, so that a drag cannot silently create a cross-domain `blocks`.
32. As the operator, I want an edge I draw to become a store write immediately, so that React
    state is never the graph of record.
33. As the operator, I want a failed store write to leave the view as the store still is, so that
    a refused edge does not sit on the canvas as if it landed.
34. As the operator, I want to move an issue from `needs-triage` to `needs-info`, so that I can
    mark what I still have to say.
35. As the operator, I want to move an issue to `ready-for-agent`, so that I can put it in a
    frontier without typing `bd label`.
36. As the operator, I want to brake an issue back to `needs-triage` or `needs-info`, so that I
    can pull it out of a frontier without touching anyone else's gate.
37. As the operator, I want to mark an issue `wontfix`, so that an abandoned idea is dropped
    without being `closed`.
38. As the operator, I want only one of the five triage labels at a time, so that an issue cannot
    be both gated and braked.
39. As the operator, I want every other label write to be refused, so that `reading:`, `idea:*`
    and domain identity labels are not a second triage.
40. As the operator, I want `closed` to be impossible from the surface, so that development's
    close stays merge-then-stamp and inquiry's close stays a session on my word.
41. As the operator, I want `reading:` to be impossible from the surface, so that clearing an
    unread experiment stays the session's act.
42. As the operator, I want `bd human respond` never to be used, so that a reply cannot close an
    issue by accident.
43. As the operator, I want to select several issues and start work on just those, so that a
    drain does not take the rest of the gated pile.
44. As the operator, I want that start to launch drain when the selection is development, so that
    merge and worktree still happen where they already do.
45. As the operator, I want that start to launch inquiry when the selection is `decision`, so that
    questions are read by the reading run, not by drain.
46. As the operator, I want that start to launch the experiment run when the selection is
    `experiment`, so that a record is written by the run that knows what complete means.
47. As the operator, I want a mixed-domain selection to be refused at start, so that one click
    cannot pretend three closures are one run.
48. As the operator, I want the run to receive an allow-list of the selected ids, so that pick
    claims only that pool.
49. As the operator, I want issues left out of the selection to keep their gates, so that scoping
    a run is not braking the rest of the Target.
50. As the operator, I want an omitted allow-list (a run started from the CLI, not the surface) to
    keep today's pick, so that unattended drains do not change meaning.
51. As the operator, I want an issue on the allow-list that is not ready, not gated, already
    attempted, or the wrong type for that run, to be excluded with a named rule, so that "nothing
    happened" is still explainable.
52. As the operator, I want starting from the surface not to claim, merge, or stamp `closed`, so
    that the canvas cannot impersonate an executor.
53. As the operator, I want a start to refuse when another run already holds the Target, so that
    the existing run lock remains the one mutex.
54. As the operator, I want an empty selection not to start a run, so that a misclick does not
    open an executor with an empty pool.
55. As the operator, I want a new work type whose `closed` still means "in Main" to go through
    drain, so that a docs issue does not grow a fourth executor.
56. As the operator, I want execution to hang on the domain, not on each issue, so that I never
    assign an executor per node.
57. As the operator, I want an optional look-over before start to stay optional and outside the
    pack, so that I can still start a run without it.
58. As a session, I still want to close a question on the operator's word, so that the surface
    being able to comment does not move inquiry's closure.
59. As a session, I still want to write `reading:` after an experiment, so that the handoff's
    words stay mine even if the operator already drew `discovered-from`.
60. As the drain, I want the allow-list applied at pick beside the rules I already have, so that
    a scoped run is still ready, gated, not attempted, and not a non-work type.
61. As the inquiry run, I want the same allow-list rule on my pick, so that a selected handful of
    questions is one reading run.
62. As the experiment run, I want the same allow-list rule on my pick, so that a selected handful
    of experiments is one experiment run.
63. As the flow's maintainer, I want the surface's writes tested without the canvas library, so
    that React Flow cannot become the spec.
64. As the flow's maintainer, I want pick's allow-list tested at pick, so that "start this
    selection" is true even when nobody opened the page.
65. As the flow's maintainer, I want the jsonl export to stay unread, so that ADR-0001 is not
    walked back by a convenience parse.

## Implementation Decisions

- **One write door.** The existing overview request handler grows from "comment only" to a single
  tagged intent: comment, create, add edge, remove edge, triage, start. Unknown intents are
  refused. Close, `reading:`, and non-triage labels are not fields that get ignored; they are
  rejected if present.
- **Policy sits behind that door, not in the canvas.** A deep operator-actions module takes the
  intent and a store write runner (and, for start, a run launcher). The canvas and the HTTP
  adapter call it. Tests call it. The module is the seam the overview test already pointed at,
  widened.
- **Create.** Type is required and is the domain. Development accepts the work types the store
  already knows; inquiry is `decision`; experiments are `experiment`. On create: that domain's
  identity labels (experiments: `experiment`; inquiry and development: type is enough), triage
  `needs-triage` only, never the gate. The operator supplies the feature; the surface allocates
  the next unused `NN` and a slug from the title. The bead is created with `handle` and `slug`
  metadata. The body is written as the tracker already requires — handle and prose, no status.
  Prose may be just the title.
- **Edges.** Intra-domain `blocks` via the store's dep add (dependent, blocker). Crossing
  `relates-to` via the store's relate. Crossing `discovered-from` via dep add of the derived onto
  the source, type `discovered-from`. Remove is the matching dep remove. The module refuses:
  `blocks` when the two issues' domains differ; `parent-child` always; any other edge type; a
  pair that already has a relation. Domain is read from type (`decision` → inquiry,
  `experiment` → experiment, everything else → development), same rule as the overview.
- **Canvas gestures.** Same-domain connect proposes `blocks`. Cross-domain connect does not
  default: the operator must pick `relates-to` or `discovered-from`. `onConnect` is a proposal
  into operator-actions, never `addEdge` onto React state as the record. After a successful
  write, the view reloads from the store. After a refusal, the view is unchanged and the reason
  is shown.
- **React is allowed and not the store.** The canvas may use React Flow with a layered layout
  (elkjs). Nodes and edges in React are a projection. Layout coordinates are view-only; they are
  not written to beads. A reload may relayout.
- **Triage.** Exactly the five labels, one replacing one: applying one removes the other four of
  the family if present. Anything else is refused, including `reading:*` and `idea:*`.
- **Comment.** Unchanged: `bd comment` on the selected issue. `bd human respond` is not called.
- **Start.** The selection must be non-empty and one domain. The launcher starts that domain's
  existing workflow (drain / inquiry / experiment) the same way a CLI start does, and passes the
  selected ids as this run's allow-list. The surface does not claim, does not merge, does not
  stamp `closed`. If the Target run lock is already held, start fails the same way a second CLI
  start does.
- **Allow-list at pick.** Each domain run's pick already composes a frontier from the store's
  ready set minus that run's own rules. A present allow-list adds one rule: an issue whose id is
  not in the list is excluded and reported (`outside-allow-list`), and is not claimed. The issue
  keeps whatever triage it had. An omitted allow-list is today's behaviour. An empty allow-list
  claims nothing. Being on the list does not bypass ready, gate (or that run's equivalent),
  attempted, or type checks; those remain named exclusions.
- **No new executor, no per-issue executor, no optional-merge flag.** New work whose closure is
  still "in Main" is development. A fourth domain is a later spec.
- **Read path unchanged.** Graph, comments, documents, live overlay: still the store, the
  documents on disk, the run lock, Archon status, artefacts, attempted. Not a pack publish API.
  Not jsonl.

## Testing Decisions

- Test external behaviour through the two existing sites: operator-actions (via the overview's
  request door and the module itself) and each domain run's pick. Do not test React Flow, elkjs,
  or CSS. Do not parse jsonl to build fixtures when a fake store runner will do.
- A good test names an intent and an outcome: accepted write and the store commands that went
  out, or a refusal and no write. For pick: a ready gated set plus an allow-list, and which ids
  were claimed or excluded under which rule.
- Prior art: the overview test already fakes `bd`, asserts comment-only writes, filters, live
  overlay, and "jsonl is not read". Extend that style. Pick already reports named exclusions;
  add `outside-allow-list` beside them, including the omitted-list case that must not change.
- Pin at least: create without a type is refused; create does not apply the gate; cross-domain
  `blocks` is refused; `parent-child` is refused; `closed` and `reading:` are refused; mixed-domain
  start is refused; empty selection does not launch; same-domain `blocks` and crossing
  `relates-to` / `discovered-from` produce the matching store write; triage replaces triage;
  pick with a list never claims an id outside it; pick with no list still claims as today;
  an id on the list that lacks the gate is excluded as missing-gate, not silently claimed.

## Out of Scope

- Unifying drain, inquiry and experiment into one executor, or an "optional merge" switch.
- Assigning an executor per issue, or treating the canvas as n8n.
- Replacing beads with a relational store, or mirroring the graph.
- A fourth domain, or teaching drain a new closure meaning.
- Operator writes of `closed`, `reading:`, `parent-child`, `idea:*`, or any label outside the
  five triage labels and the identity labels applied at create.
- Persisting canvas positions in the store or in a parallel file the flow reads.
- An AI pre-check node, lock, or pack step before start (it may exist later as an optional
  helper outside the pack).
- Protected human classification labels beyond the five triage labels (already deferred).
- Changing what `closed` means in any domain, or who stamps it.
- Auto-applying the gate when starting a selection. Ungated selected issues stay excluded at
  pick.
- Writing `fed:` into an experiment record from the surface. Drawing `discovered-from` is the
  graph half; the record line stays the session's with `reading:`.
- The pack kernel, open-shell, and include-vocab work already landed; this spec does not reopen
  them.

## Further Notes

- Glossary: `docs/CONTEXT.md`. Decision: ADR-0007 (surface is a view; executors stay per domain).
  Crossing kinds and "a gate never crosses" remain ADR-0004 / ADR-0006. Beads remains ADR-0001.
- The canvas library recommendation (React Flow + elkjs, `onConnect` mapped to a store write)
  lives in the research note under `.scratch/research-flow/`. It is not a second graph.
- `related-to` is not a kind. `field` is not a word this repo uses for a domain.
- Next skill: `/to-tickets`. Publication puts `ready-for-agent` on the issues this spec
  produces; this document is not an issue.
