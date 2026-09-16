# 03 — Peer level with no edge between domains

## Question

Experiments and development are peers at the same level (§8, D2), and no blocking edge may cross a domain
(ADR-0004). Then how is a real dependency expressed — "run this ablation, then build the thing it justifies" —
when `blocks` is unavailable across the boundary: a human reading a closed experiment and creating the
implementation ticket afterwards, or an edge kind the store does not have yet? And who creates the ticket on
the other side (the operator, as in the inquiry domain)?

The frontier's behaviour is the other half: with both kinds open, the store offers both, and a drain must not
take an experiment. Ticket 05 owns that rule; this ticket owns what the graph looks like.
