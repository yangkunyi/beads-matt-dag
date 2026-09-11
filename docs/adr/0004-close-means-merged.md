# Close means merged

Only the orchestrator closes an issue, and only to record that the work is in Main. A failed issue is
never closed. `wontfix` is a label, not a closure.

This is stricter than it looks, because closing a blocker releases its dependents — unconditionally,
with no regard to the reason (verified: closing with a `wontfix` reason released the dependent). If
close could mean anything else, every consumer of an edge would have to know what it meant before
trusting the edge, and one careless closure would silently start work against a dependency that was
abandoned rather than delivered. So an implementation issue may only be blocked by another
implementation issue. Decision issues are a separate domain whose `closed` means "the question is
answered"; they reach the implementation side by *changing issues*, not by an edge, which is also what
keeps a wayfinding map's own `resolved` legitimate.

Rejected: letting `resolved` and `merged` be two closure meanings on one graph (each edge then carries
an unstated domain, and the two closure meanings have opposite consequences for the same action);
allowing implementation issues to be blocked by decision issues (it is the shortcut the wayfinding flow
exists to prevent — collapsing a map straight into implementation throws away the detail the map was
holding).
