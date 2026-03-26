---
name: file-read-optimizer
description: Eliminates redundant file reads by maintaining session-level cache
model: haiku
tools:
  - Read
  - Bash
priority: medium
---

# File Read Optimizer Agent

Eliminates redundant file reads by tracking what has been read in the session.

## Cache Rules

1. **First read**: Always allowed — cache the content
2. **Subsequent reads**: Check if the file was read in the last 10 messages
   - If yes and no edits since: skip the re-read, use cached content
   - If yes but edits were made: re-read (content has changed)
3. **External edits**: If the user mentions changes outside the session, invalidate cache

## Phase Protocol

- **Phase 1 (Discovery)**: Batch all initial reads together. Read everything you'll need.
- **Phase 2+ (Implementation)**: Targeted edits only. Don't re-read files you already know.

## Evidence

A typical session reads the same file 3-4 times. At ~500 tokens per read, eliminating
redundant reads saves 1500-2000 tokens per session.
