# 19 — blocking through a decision parent is refused too

**What to build:** the domain preflight walks `blocks` edges only. An implementation issue **parented under**
a decision issue inherits that decision's blocked-ness (`parent-child`), so closing the decision's own blocker
can release implementation work with no `blocks` edge for the preflight to see — the same cross-domain release
§10.4 forbids, reached by another edge type. Found by the acceptance and recorded only (ticket `09`'s second
residual: "a walk over blocking ancestors would be the fix if that structure ever appears").

Fix: the preflight walks the **blocking ancestry** of every non-decision issue — `blocks` and `parent-child`,
at any depth — and refuses when any ancestor is a decision issue. §7.2 already calls parent-child the wrong
tool for a wayfinder map; this makes the pack refuse it instead of hoping.

**Spec:** §10.4, §7.2; `.scratch/beads-dag/issues/09-brake-and-domains.md` (Residual risks, second bullet)
**Blocked by:** `09`
**Status:** BLOCKED

- [x] the preflight refuses an implementation issue whose blocking ancestry (either edge type, any depth)
      reaches a decision issue, naming the chain rather than the edge
- [x] implementation→implementation ancestry stays legal: a two-deep implementation chain is reviewed
      normally, pinned by a repro, so the walk cannot be over-broad
- [x] the check still runs before any write and still fails with exit 1 and no stdout token
- [x] `relates-to` and every other edge type stay out of it, and the Comments say how the pack reads edge types
      (`bd list --all --json`'s shape) rather than assuming
- [x] the README's domain boundary names both edge types, **and so does the Target-facing contract**:
      `skills/setup-matt-pocock-skills/issue-tracker-beads.md` ("Closure never crosses domains") still says
      only a `blocks` edge is refused, so an operator could publish a `parent-child` edge the pack will
      refuse — fix the sentence and refresh the install (`cp -a skills/<member> ~/.pi/agent/skills/`, then
      `diff -rq` empty)

## Comments

Built. **The premise is real, and the store's shape is wider than the ticket's wording:** in bd 1.2.2 the
`parent-child` relation is *both* an edge type — in the same `dependencies` array `bd list --all --json`
answers, beside `blocks` — and an issue field (`parent`) the store derives from that edge when it answers.
`bd dep --help` lists it in the dependency-type vocabulary, `bd create --parent` and `bd update --parent`
are the field-shaped doors to it, and the edge-shaped door is `bd dep add --type parent-child`; all of
them leave the two in step. So there is no third relation hiding anywhere: the walk reads both shapes.

**What the store holds, quoted.** `bd version 1.2.2 (6c124203e)`. `bd dep add --help`:

```
-t, --type string         Dependency type (blocks|tracks|related|parent-child|discovered-from|until|caused-by|validates|relates-to|supersedes) (default "blocks")
```

`bd create --help`: `--parent string  Parent issue ID for hierarchical child (e.g., 'bd-a3f8e9')`;
`bd update --help`: `--parent string  New parent issue ID (reparents the issue, use empty string to remove
parent)`. On a scratch store (`t-t0h` the decision, `t-ps4` the task blocking it, `t-t0h.1` a child created
with `--parent`, `t-tyq` a `blocks` dependent), `bd list --all --json --limit 0` answers:

```
{"id": "t-t0h.1", "issue_type": "task", "status": "open", "parent": "t-t0h",
 "dependencies": [{"depends_on_id": "t-t0h", "type": "parent-child"}]}
{"id": "t-tyq", "issue_type": "task", "status": "open", "parent": null,
 "dependencies": [{"depends_on_id": "t-t0h", "type": "blocks"}]}
```

The child's edge points at the parent with `type: "parent-child"`, the same direction a `blocks` edge
takes, and `parent` repeats it as a field. The inheritance is real, staged rather than assumed: while
`t-ps4` is open, `bd blocked --json` names `["t-tyq", "t-t0h.1", "t-t0h"]` and `bd ready` offers only
`t-ps4`; after `bd close t-ps4`, `bd ready` offers `["t-t0h.1", "t-t0h"]`. Closing the decision's own
blocker released the implementation child with no `blocks` edge of its own — precisely the release §10.4
forbids, which the blocks-only walk could not see.

**What changed.** `domains.ts`: `assertNoCrossDomainEdges` is still one function, one predicate, one
message — the walk landed inside it, so ticket `18`'s two doors (`open`'s preflight, `pick`'s per-cycle
claim) inherit it untouched. It now walks each non-decision issue's blocking ancestry breadth first —
`blocks` and `parent-child` edges plus the `parent` field, any depth, a decision ending its branch — and
renders every chain hop by hop: `feat/72 [x] is parented under the decision issue feat/71 [y]
(parent-child)`, `feat/73 [z] is blocked by feat/72 [x] (blocks), which is parented under …`. Every other
edge type is not walked; `relates-to` stays out. The `parent` field is belt-and-braces — bd derives it
from the edge (`bd export` shows only the edge), so the edge array is the ground truth — but the walk
reads what the store answers rather than assuming one shape. `store.ts` reads the field; `open.ts`'s node
comment says "naming the chain". No other node, YAML, executor, settlement or reader changed.

**Repros** (`domain-repro.ts`, three new cases, each driving the nodes and reading only the store, the
artifacts and git):

1. `feat/70`–`feat/74`: the dangerous shape staged — `feat/70` blocks the decision `feat/71`,
   `feat/72` is parented under `feat/71`, `feat/73` is blocked by `feat/72`. While `feat/70` is open the
   store withholds `feat/72`; closing it releases `feat/72`. `open` then exits **1** with empty stdout,
   names both chains (blocks then parent-child) and every id and handle, claims nothing, and does not
   repair the `in_progress` leftover (`feat/74`) or comment on it.
2. `feat/80`–`feat/81`: the parent relation written **after** `open`; the store offers the child and
   `pick` exits **1** with empty stdout, no exclusion report, no attempted ids; after
   `bd update feat/80 --parent ""` the same run directory claims it.
3. `feat/90`–`feat/92`: the legal two-deep chain — `feat/91` blocked by `feat/90`, `feat/92` parent-child
   under `feat/91`. `open` exits 0, `pick` works `feat/90`, and after its closure the next cycle claims
   `feat/91` and `feat/92` — the over-broad walk has a pinned counterexample.

The existing `relates-to` case (`feat/40`–`feat/42`) is untouched and still pins that a non-blocking edge
to a decision is not refused.

**Mutation proofs** (a copy of the pack under `/tmp/dom-mut-19/<name>/beads-dag`, one edit each, then
`bun <copy>/beads-dag-drain/tests/domain-repro.ts`):

| Mutation | The repro's failure |
| --- | --- |
| `blocks`-only (drop `parent-child` from the walk, drop the `parent` read) | *open fails loudly: "opened\n"* — the hierarchy ancestry is not refused |
| depth one (stop after the direct ancestor) | *the reason names <grandchild id>: …* — the chain stops at the parent |
| every edge type walked (drop the type filter) | *open exits clean when the edge stays in the domain: got 1, want 0* — the `relates-to` case |
| any two-deep ancestor refused, decision or not | *open exits clean on a two-deep implementation chain: got 1, want 0* — the legal chain |

**Gates, verbatim** (store binary on `PATH`, as the README's gates require; run on the frozen bytes that
this commit carries):

```
$ timeout 1500 bun .archon/workflows/beads-dag/beads-dag-drain/tests/run-all.ts
ok   bookkeeping-repro.ts  {"ok":true}
ok   brief-repro.ts  {"ok":true}
ok   config-repro.ts  {"ok":true}
ok   conflict-repro.ts  {"ok":true}
ok   domain-repro.ts  {"ok":true}
ok   drain-noop-repro.ts  {"ok":true}
ok   failures-repro.ts  {"ok":true}
ok   lock-repro.ts  {"ok":true}
ok   node-outcomes-repro.ts  {"ok":true}
ok   pick-repro.ts  {"ok":true}
ok   range-repro.ts  {"ok":true}
ok   reconcile-repro.ts  {"ok":true}
ok   report-repro.ts  {"ok":true}
ok   roles-repro.ts  {"ok":true}
ok   runner-repro.ts  {"ok":true}
ok   settle-repro.ts  {"ok":true}
ok   store-backup-repro.ts  {"ok":true}
ok   store-module-repro.ts  {"ok":true}
ok   store-open-repro.ts  {"ok":true}
ok   worker-readonly-repro.ts  {"ok":true}
ok   worktree-repro.ts  {"ok":true}
ok   yaml-contract-repro.ts  {"ok":true}
22/22 repros passed
suite exit=0        # 654s, wall clock

$ timeout 300 ./node_modules/.bin/tsc -p tsconfig.pack.json
tsc exit=0
```

**The contract, and the installs.** `skills/setup-matt-pocock-skills/issue-tracker-beads.md` ("Closure
never crosses domains") now says the refusal covers an implementation issue's **blocking ancestry** through
`blocks` **or** the `parent-child` relation, at any depth, names the chain, and gives the operator both
removals (`bd dep remove`, `bd update <id> --parent ""`). The pack README's domain section names both
relations and carries the new refusal example; its quoted tail keeps ticket `18`'s clause `the drain
claims nothing while the edge stands.` `skills/drain/SKILL.md` was left alone as the task said. Both
installs were refreshed and proved equal:

```
$ rm -rf ~/.archon/workflows/beads-dag && cp -a .archon/workflows/beads-dag ~/.archon/workflows/beads-dag
$ diff -rq .archon/workflows/beads-dag ~/.archon/workflows/beads-dag                       # exit 0, no output
$ rm -rf ~/.pi/agent/skills/setup-matt-pocock-skills && cp -a skills/setup-matt-pocock-skills ~/.pi/agent/skills/setup-matt-pocock-skills
$ diff -rq skills/setup-matt-pocock-skills ~/.pi/agent/skills/setup-matt-pocock-skills     # exit 0, no output
```

**Left open, flagged.**

- The `parent`-field read cannot be pinned by a behaviour test: bd 1.2.2 derives the field from the same
  edge in every answer (`bd export` omits the key), so no store written through `bd` can hold one without
  the other. The `blocks`-only mutation covers the edge; the field read is defence in depth, not a second
  predicate.
- The refusal is structural, not release-timed: an implementation child of an *open, unblocked* decision
  is offered by `bd ready` right now and is refused anyway (case 2). That is the ticket's fix sentence
  read plainly — §7.2 calls parent-child the wrong tool here — said out loud so an operator does not wait
  for a release that will never be the trigger.
- A large hierarchy under one decision produces one chain per refused issue, so the error grows with the
  subtree. It is bounded by the store's graph and names every issue that cannot start; no cap was added.
- A direct `blocks` edge now reads `… is blocked by the decision issue Y (blocks)` — the hop's edge type
  is named — and the operator clause is "Remove the edge that crosses the domains …". The closing clause
  `the drain claims nothing while the edge stands.` is byte-for-byte ticket `18`'s, and the README's
  quoted example is the new one.
- Ticket `18`'s two-command window (a decision closed between `pick`'s graph read and its `bd batch`) is
  unchanged: no store-side transaction spans a read and a claim.

**Review, both axes inline** (no sub-agents in this session), over the diff since `e9048c1`. *Standards:*
every touched module keeps its doc comment; `store.ts` is still the only place a store command is built
(`store-module-repro` green) and the new walk reaches the store through `allIssues`; `domains.ts` stays
the one home of the `decision` vocabulary, with no second predicate and no second message for the two call
sites to drift in; no new dependency; no YAML, executor, settlement or reader change. One finding, fixed:
`parent-child` was spelled in two constants; `BLOCKING_EDGE_TYPES` now references `PARENT_CHILD`. Judgement
calls kept: the BFS is per issue rather than memoised (a store is tens to hundreds of issues, and the one
store read dominates); the chain is rendered with per-edge wording (`is blocked by` / `is parented under`)
rather than a uniform arrow, because that reads as the store's own semantics; `StoreIssue.parent` is read
beside the edge rather than trusted as the only shape. *Spec:* all five criteria are implemented and
pinned; the walk is over ancestry at any depth through exactly `blocks` and `parent-child`; §10.4's
release is refused at both doors without a second check; the contract and the README are the only docs
touched, and only where the behaviour they described changed.
