---
name: grip-first-retrieval
description: Check what you already know before searching externally
version: 1.0.0
triggers:
  - information retrieval
  - uncertainty about facts
  - knowledge lookup
---

# GRIP-First Retrieval

When unsure or retrieving information, check what you already know first.

## Retrieval Tiers (escalate only when prior tier fails)

| Tier | Method | Cost | When |
|------|--------|------|------|
| 0 | Session context / mental model | ~0 tokens | "Do I already know this?" |
| 1 | Memory files (project + global) | ~200 tokens | Saved knowledge |
| 2 | Structured lookup (Read known paths) | ~500 tokens | Known file locations |
| 3 | Filesystem search (Grep/Glob) | ~1000 tokens | Unknown file locations |
| 4 | Explore agent | ~88k tokens | ONLY after tiers 0-3 exhausted |

Each escalation requires a documented reason. Return at the FIRST tier that resolves.

## When to Skip

- Direct execution commands ("fix this bug")
- Pure creation tasks ("write a new component")
- User-requested web searches
- Conversational exchanges
