# Scientific Method

## Hypothesis-Driven Development

Every significant change should have a falsifiable hypothesis:
- What behaviour are you changing?
- What metric will confirm the change worked?
- What would disprove it?

## Effect Size (Cohen's d)

Report effect SIZE, not just direction:
- |d| < 0.2: negligible (noise, don't act on it)
- 0.2-0.5: small (real but modest)
- 0.5-0.8: medium (worth attention)
- > 0.8: large (significant change)

## Falsification Awareness

Every signal, metric, and claim must state what would disprove it.
A system that only confirms is not doing science.

## Shadow Metrics (Goodhart Protection)

Never celebrate a metric without checking its shadow:
- velocity -> revert rate
- flow_state -> confusion proxy
- test_count -> mutation survival rate

Shadow metrics can only DECREASE scores. They are antibodies, not boosters.
