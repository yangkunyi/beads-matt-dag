# 02 — The result record: home, fields, and the socket a run store plugs into

## Question

What is a result record? Its home (one document per experiment, one per run, or appended to a log), its
fields (the deciding metric, the budget spent, the commit, the data pins, the state of the run), its author
(the agent that ran it, or the session that holds the map), and its relation to a run store — the operator's
constraint is that the record leaves a socket where W&B or MLflow plugs in, without the flow depending on
either.

This is what `closed` will mean for the domain (ticket 06 is blocked by it): a domain closes when the result
is recorded, so "recorded" has to be a shape before it can be a rule.
