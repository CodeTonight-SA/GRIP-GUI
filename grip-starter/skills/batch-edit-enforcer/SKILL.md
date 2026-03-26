---
name: batch-edit-enforcer
description: Enforces batch edit operations instead of multiple individual Edit calls
version: 1.0.0
triggers:
  - multiple sequential edits to same file
---

# Batch Edit Enforcer

When making multiple changes to the same file, batch them into a single response
with multiple Edit calls rather than spreading across multiple turns.

## Rule

If you need to make 3+ changes to the same file:
1. Plan all changes first
2. Make all Edit calls in a single response
3. Verify once after all changes are applied

## Anti-Pattern

Making one edit, reading the file, making another edit, reading again.
This wastes tokens on redundant reads between edits.
