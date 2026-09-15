# Closure is per domain

Every issue's `closed` means what its own domain says it means, and a domain is a **type**:

| Domain | Type | `closed` means | Who may write it |
|---|---|---|---|
| inquiry | `decision` | the question is answered | the session holding the question, on the operator's word |
| development | the work types (`task`, `bug`, …) | the work is in Main | the drain's settlement, and nothing else |
| experiments | `experiment` | the result is recorded | the session that worked it, on a completeness check of the record — no signature |

ADR-0004 said close means merged, and rejected "letting `resolved` and `merged` be two closure meanings on
one graph" because each edge would then carry an unstated domain. The domain is no longer unstated: **it is
the issue's type**. Three meanings on one graph are safe exactly when every reader can see which one an
issue carries, and when a closure in one domain can never release work in another.

That last part is the rule, and it is enforced rather than trusted: **a blocking relation never crosses a
domain** — neither `blocks` nor the `parent-child` hierarchy, at any depth, in either direction. A drain
refuses the run while any implementation issue's blocking ancestry reaches a non-work type, and the check
reads one set — the pack's `NON_WORK_TYPES` (`decision`, `experiment`) — so a new flavour of question or of
experiment cannot leak in by omission. What joins two domains carries information and no gate: `relates-to`
for a loose see-also, and `discovered-from` for the handoff a result makes.

A dependency that is real but not a gate is recorded where the fact lives, not as an edge across the
boundary: an experiment's run record carries the code commit it ran against, instead of hanging a `blocks`
edge on a work ticket.

An experiment's closure is a **completeness check**, not a judgement. The record holds what was measured and
where it was read from, whether the result met the reference frozen in the ticket before the run, what the
run covered, and `reading: none yet` — and the operator's judgement is deliberately not a field of it; it
leaves the ticket as an idea or a work ticket, linked back. That is also why this closure needs no
signature. The shape itself lives in the tracker doc's Experiments section; this ADR fixes only what
`closed` means and who may write it.

**Adding a domain** is two things: registering its type (`bd config set types.custom <type>` — the store
refuses a type it does not know, which is what keeps a ticket from silently being created in the wrong
one), and teaching the drain to refuse chains that reach it. For the three domains above the second ships
with the flow, so it is **one act** for a Target; a Target that invents a fourth does both, and until it
does, the new type must not enter a blocking chain from either side.

Supersedes the "two closure meanings on one graph" rejection in ADR-0004, whose reason was an unstated
domain on the edge — a type states it. ADR-0004 stands for development's meaning: an issue that closes as
work must be in Main, and `wontfix` is a label, never a closure.
