---
name: code-agentic
description: Agentic execution protocols with verification gates and rollback mechanisms
version: 1.0.0
triggers:
  - destructive operations
  - high-risk changes
  - autonomous execution
---

# Agentic Protocols

## Verification Gates

Before any significant change:
1. **Pre-check**: Verify the current state matches expectations
2. **Execute**: Make the change
3. **Post-check**: Verify the change had the intended effect
4. **Rollback plan**: Know how to undo if post-check fails

## Confidence Thresholds

- **> 99%**: Proceed autonomously
- **80-99%**: Proceed with verification
- **< 80%**: HALT and ask the user

## Rollback Mechanisms

- **Git**: `git stash` before risky changes, `git stash pop` to restore
- **File backup**: Copy file before destructive edits
- **Database**: Use transactions, never raw DDL without backup

## Anti-Patterns

- Retrying the same failed command repeatedly
- Brute-forcing past errors without understanding root cause
- Making changes without verifying the current state first
