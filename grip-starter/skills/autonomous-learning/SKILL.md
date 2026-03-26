---
name: autonomous-learning
description: Dialectical reasoning framework for self-improvement through pattern detection
version: 1.0.0
triggers:
  - error patterns detected
  - repeated corrections
  - high novelty scores
---

# Autonomous Learning

Learn from error patterns and generate improvements to prevent recurrence.

## Pattern Detection

1. **Repeated correction**: User corrects the same type of mistake twice
2. **Tool failure**: Same tool fails with same error pattern
3. **Approach rejection**: User rejects the same approach category twice

## Learning Loop

1. **Detect**: Notice the pattern (correction, failure, rejection)
2. **Analyse**: What went wrong and why?
3. **Generalise**: Is this specific to this context or universal?
4. **Record**: Save the insight to memory for future sessions
5. **Apply**: Use the insight in the current session

## Output

When a learning insight is generated:
```
[LEARNING] Pattern: [description]
Insight: [what to do differently]
Scope: [project-specific | universal]
```
