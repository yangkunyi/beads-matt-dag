# Attention canvas frame, comment, and camera

*Assembled 2026-09-21 from a grill on the attention UI: the beads graph was drawing the whole store including closed, hiding the open work; edges looked missing; the operator could not comment except when `next` happened to be a comment; a list click did not take the camera to the issue. Status: **landed the same night in this clone** (canvas frame, comment on any selection, camera fit; the behaviour and its assertions live in `tools/attention-ui/attention-ui-test.ts`; the store tickets are attention-ui/01–03). Glossary: `docs/CONTEXT.md` (**canvas frame**, **comment**, **attention UI**). ADR-0007 still holds: the canvas is a view.*

## Problem Statement

The operator opens the attention UI to see the work that is still in front of them, and to write a record on an issue without a session. What they get instead is the whole store — on this Target, 137 closed issues drowning three open ones — with almost no visible edges, because the ten `blocks` edges that exist sit among the closed history. Clicking a row in the inbox does not move the camera to that issue. Clicking the pane or an empty bucket clears the selection, and an empty selection is pinned to "draw everything". Commenting is the leftover primary act: a braked issue shows triage, a graph-only selection shows no form at all.

They did not ask for a denser store graph. They asked for a canvas that frames the open work, a comment that is always a record, and a list click that actually lands on the issue.

## Solution

Give the beads graph a **canvas frame** and give the detail panel a comment that is not gated on `next`.

- Open issues stay on the canvas. Closed issues appear only as a one-hop neighbour of the current selection. With nothing selected: every open issue, no closed. **Show all** is the whole store, including closed.
- Edges among visible issues still draw. If the open set has no edges, the default view has no lines; that is the store, not a missing renderer. History DAG is Show all.
- The operator may write a **comment** on whatever is selected. It is a record. It does not change status, labels, or closure. The row's `next` remains the primary act and sits above the form.
- A click in the inbox selects that issue, reframes, and fits the camera to it. A click on the pane clears the selection and returns to the empty-selection frame (open only), not the whole store.

## User Stories

1. As an operator, I want the canvas to show open issues by default, so that I can see the work that is still in front of me.
2. As an operator, I want closed issues off the default canvas, so that 137 closed issues cannot drown three open ones.
3. As an operator, I want every open issue to stay on the canvas when I select one, so that selecting a row does not hide the rest of the open work.
4. As an operator, I want a closed issue to appear when it shares an edge with the selection, so that I can see why this open issue sits next to that closed one.
5. As an operator, I want a closed issue that is two hops away to stay off the canvas, so that a selection does not flood-fill the closed history.
6. As an operator, I want an empty selection to mean "all open, no closed", so that a first paint and a pane click are the same frame.
7. As an operator, I want clicking the pane to clear the selection without dumping the whole store, so that a misclick is not a 140-node graph.
8. As an operator, I want an empty attention bucket to leave the canvas on open issues, so that switching to drafts does not become Show all.
9. As an operator, I want Show all to draw every issue including closed, so that I can still read the historical DAG when I ask for it.
10. As an operator, I want Show all to keep working when something is selected, so that the checkbox is the whole-store opt-in, not a second selection mode.
11. As an operator, I want turning Show all off to restore the canvas frame, so that I can leave history without reloading.
12. As an operator, I want edges drawn between visible issues, so that a `blocks` or crossing link I can see in the store is a line on the canvas.
13. As an operator, I want a dashed line for a crossing and a solid line for `blocks`, so that I can tell a gate from a handoff.
14. As an operator, I want no line when the visible issues share no edge, so that I do not invent a DAG the store does not have.
15. As an operator on a Target whose open issues are islands, I want to accept a default view with no lines, so that I am not forced to keep closed history on screen just to display old `blocks`.
16. As an operator, I want Show all to reveal those historical `blocks`, so that the lines I remember are one checkbox away.
17. As an operator, I want a click on an inbox row to select that issue on the canvas, so that list and graph are one selection.
18. As an operator, I want that click to fit the camera to the selected issue, so that I do not hunt for a node below the fold.
19. As an operator, I want the camera fit to include the selected issue's one-hop closed neighbours when they are in the frame, so that the reason it is on the canvas is on screen.
20. As an operator, I want a click on a canvas issue to select it in the inbox when it is in the focused bucket, so that the two panels still share one id.
21. As an operator, I want a click on a canvas issue that is not in the focused bucket to still select it, so that a closed neighbour or an open issue in another bucket can be the subject of a comment.
22. As an operator, I want the detail panel to name an issue that is selected but not in this bucket, so that I know Capture and comment still apply to it.
23. As an operator, I want to write a comment on the selected issue no matter what its `next` is, so that a braked issue is not mute.
24. As an operator, I want that comment to be a record on the bead, so that I am not changing status, labels, or closure by typing.
25. As an operator, I want the primary act for `next` to stay above the comment form, so that triage, start, wait, and grill are still the first thing I see.
26. As an operator, I want the comment form on a graph-only selection, so that I do not have to find the issue in a bucket to leave a record.
27. As an operator, I want submitting a comment to refresh the snapshot and the overview, so that the new record appears in the comment list without a reload.
28. As an operator, I want the comment list to show author, time, and text for the selected issue, so that I can read what is already on the bead.
29. As an operator, I want an empty comment list to say none, so that I do not wonder whether comments failed to load.
30. As an operator, I want a blank submit to do nothing, so that I do not stamp an empty record.
31. As an operator, I want a refused comment to stay on the form with the reason, so that I can fix it without losing the text.
32. As a session, I want attention JSON to stay the boot object, so that this spec does not invent a second navigator.
33. As a drain, I want this spec to write nothing in the store except the operator's tagged comment, so that a canvas frame is not an executor.
34. As an operator, I want Capture to keep using the selected issue as `from`, so that growing a decision still hangs off whatever the list or the canvas selected.
35. As an operator, I want Show all not to change which issue is selected, so that fitting the camera and commenting do not depend on the checkbox.
36. As an operator, I want `in_progress` issues to count as open on the canvas, so that a live run's claims stay visible.
37. As an operator, I want a closed neighbour to look closed (muted), so that I do not treat history as work.
38. As an operator, I want the three domain lanes to remain, so that inquiry, development, and experiments still sit in bands.
39. As an operator, I want a lane with no visible issue to still occupy a band, so that an empty domain does not collapse the layout.
40. As an operator, I want connecting two visible issues to keep proposing through the tagged door, so that a canvas gesture is still not a store write.
41. As an operator, I want a same-domain connect to keep proposing `blocks`, so that intra-lane gates do not become crossings.
42. As an operator, I want a cross-domain connect to keep asking relates-to or discovered-from, so that a closure in one domain cannot release another.
43. As an operator, I want the canvas not to use `addEdge` as the record, so that React state does not become a second graph.
44. As an operator, I want list virtualisation and unused widgets left alone, so that this spec does not turn into a UI rewrite.
45. As an operator, I want the eight-second first paint left as a later cut, so that framing the graph is not blocked on `bd show`.
46. As an operator, I want the page-height layout left as a later cut, so that camera fit is the jump, not a CSS rewrite.
47. As an operator, I want existing Show all checkbox id to remain, so that a probe or a test that clicks it still finds it.
48. As an operator, I want the comment form to have a stable id, so that a test can see it when `next` is triage.
49. As an operator, I want a selected closed neighbour to be commentable, so that a record on history is still a `bd comment` on that bead.
50. As an operator, I want deleting, triaging, and launching to stay the tagged door they already are, so that this spec does not reopen ADR-0007.
51. As an operator, I want a Target with zero open issues and Show all off to be an empty canvas of lanes, so that "nothing is waiting" is visible on the graph as well as in the inbox.
52. As an operator, I want a Target with open issues and no selection (after a pane click) to show those open issues, so that clearing selection is not clearing the work.

## Implementation Decisions

- The canvas frame is one function: given the overview, the selection, and Show all, it returns the issue ids to draw. Show all is the whole store. Otherwise the set is every issue whose status is not `closed`, union the one-hop neighbourhood of the selection (any edge kind, either direction). That neighbourhood is how a closed issue enters the frame. An empty selection adds no neighbourhood, so closed stays out.
- The existing projection (nodes, edges, domain lanes) stays the renderer of that id set. It does not grow a second filter. Edges whose ends are not both in the set stay dropped. Lane layout stays intra-lane `blocks`. Positions stay in the view.
- The current pin "empty selection shows all" is replaced by the glossary: empty selection shows open issues. Tests that encoded the old pin change with it.
- The current pin "a selection drops every open issue that is not in the one-hop neighbourhood" is replaced by Q5-D: open issues stay. A two-hop *closed* issue still stays out. A two-hop *open* issue stays because it is open, not because it is a hop.
- Inbox selection and canvas selection remain one id. A list click sets it and asks the canvas to fit that issue (and its framed closed neighbours). A canvas node click sets it. A pane click clears it and does not fit the whole store.
- Fit runs on a selection change that came from the inbox or from a node click, not on every overview refresh, so a comment reload does not steal the pan.
- The detail panel always offers a comment form on the selected issue, including a selection that is not in the focused bucket and including a closed neighbour. The form posts the existing tagged `comment` intent. Primary act for `next` is unchanged and sits above the form. An empty submit is a no-op.
- No new store field, no new edge kind, no new attention bucket, no change to `loom attention --json`. The overview snapshot still comes from `bd list --all`; the frame filters in the view.

## Testing Decisions

A good test here asserts who is on the canvas and whether a comment is offered, from the projection and the page, not from React Flow internals.

- One seam: the canvas-frame function (today `framedIssueIds` / `projectGraph`). Overview tests already pin empty selection, one-hop neighbourhood, Show all, and dropped two-hop edges. Rewrite those pins to the new frame: empty selection is open-only; a selection keeps all open issues and adds closed one-hop neighbours; Show all is still the whole store; a two-hop closed issue stays out; edges still require both ends visible.
- Attention page tests already pin that the canvas lives on the attention UI, that Show all exists, and that comments render. Extend them to pin that a comment form is present even when `next` is triage, and that an empty-selection frame is not the closed store. Do not drive a browser for the frame; the projection is the behaviour.
- Camera fit is a React Flow call. Do not pin library method names. Pin that a list-driven selection change is the event that recentres, and that an overview refetch is not.

Prior art: `overview-test` for `projectGraph` / `framedIssueIds` / `proposeConnect`; `attention-ui-test` for page shape and the tagged write door.

## Out of Scope

- Speeding up `GET /` / `loadOverview` (`bd list` plus `bd show` of every commented id).
- The 4784px page height and other CSS layout.
- List virtualisation, command palette, markdown preview, resizable columns, or deleting unused packages.
- Changing how many edges the store has, auto-creating `blocks`, or a fourth edge kind.
- Flood-fill, two-hop closed history, or putting closed issues on the default canvas.
- Making comment change status, labels, or closure.
- Reopening the operator-ui page, a second human route, or ADR-0007.
- Pack pick, merge, `closed` stamp, and attention JSON itself.

## Further Notes

On the Target this grill used, three issues are open and none of them share an edge with anyone. Under this frame the default canvas is three islands and zero lines. That is correct. The ten `blocks` edges live among closed issues and appear under Show all, or as a one-hop neighbour if an open issue later grows an edge to one of them.

The white-screen fix (selection owned by the page, memoised on the id, written up only by clicks) stays. This spec does not put `onSelectionChange` back.
