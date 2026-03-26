---
name: chat-history-search
description: Search and reference past conversations for context continuity
version: 1.0.0
triggers:
  - /remind-yourself
  - references to past conversations
  - prior session context needed
---

# Chat History Search

Search past conversations to find previous solutions, decisions, and context.

## Usage

```
/remind-yourself "what approach did we use for auth?"
```

## Search Strategy

1. Check memory files first (project memory, global memory)
2. Search git log for relevant commits
3. Search CLAUDE.md files for documented decisions
4. Check plan files for prior approaches

## Output

When a relevant past decision is found:
```
[RECALL] Found in [source]:
Decision: [what was decided]
Context: [why it was decided]
Date: [when]
```
