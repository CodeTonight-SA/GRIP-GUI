---
name: converge
description: Recursive convergence on a task until criterion is met
version: 1.0.0
triggers:
  - /converge
  - complex multi-step tasks
  - iterative improvement
---

# Converge

Recursive convergence loop: keep improving until the criterion is satisfied.

## Pattern

```
converge(
    task="description of what to achieve",
    criterion="measurable exit condition",
    max_depth=3
)
```

## How It Works

1. **Assess**: Check current state against criterion
2. **Improve**: Make one improvement step
3. **Re-assess**: Check if criterion is now met
4. **Recurse**: If not met, go to step 2 (up to max_depth)
5. **Exit**: Report final state and whether criterion was met

## Examples

```
converge(task="fix all lint errors", criterion="lint passes with 0 errors")
converge(task="reduce bundle size", criterion="bundle < 500KB", max_depth=5)
```

## Guard Rails

- Maximum depth prevents infinite loops
- Each iteration must make measurable progress
- If stuck (no progress for 2 iterations): HALT and ask user
