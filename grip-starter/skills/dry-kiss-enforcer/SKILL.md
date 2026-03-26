---
name: dry-kiss-enforcer
description: Enforces DRY and KISS principles to eliminate duplication and over-engineering
version: 1.0.0
triggers:
  - code review
  - writing new code
  - refactoring
---

# DRY/KISS Enforcer

## DRY (Don't Repeat Yourself)

Every piece of knowledge should have a single, authoritative representation.

**Important nuance**: Three similar lines of code is NOT automatically a DRY violation.
Premature abstraction is worse than mild duplication. Extract only when:
- The same logic appears 3+ times
- The duplicated code changes together
- The abstraction has a clear, meaningful name

## KISS (Keep It Simple)

The right amount of complexity is the minimum needed for the current task.

**Signs of KISS violation**:
- Helper functions called from exactly one place
- Abstractions with only one implementation
- Configuration for things that never change
- Generic solutions for specific problems

## Enforcement

The `quality-hook.py` PreToolUse hook detects duplicate code blocks and warns.
