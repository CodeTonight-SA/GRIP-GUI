---
name: session-context-preservation
description: Auto-update session state for seamless cross-session continuity
version: 1.0.0
triggers:
  - milestone completion
  - session end
  - context gate (85%)
---

# Session Context Preservation

Automatically save session state so the next session can pick up seamlessly.

## What to Save

- Completed work items
- Remaining tasks
- Key decisions made
- Files modified
- Current approach/strategy
- Blockers encountered

## Where to Save

Project memory directory: `~/.claude/projects/<project>/memory/session_context.md`

## When to Save

1. After each major milestone (PR created, feature complete, etc.)
2. When context reaches 85% (before compaction)
3. When user invokes `/save`
4. Before session ends
