---
name: context-refresh
description: Systematically rebuild mental model of any repository at session start
version: 1.0.0
triggers:
  - session start
  - /refresh-context
  - cold start
---

# Context Refresh

Eliminates the cold-start problem by executing a 7-step discovery protocol.

## Protocol

1. Read CLAUDE.md and project config (package.json, Cargo.toml, etc.)
2. `git log --oneline -15` for recent history
3. `git status` for current state
4. Directory structure overview
5. Check for active PRs or branches
6. Read memory files if they exist
7. Synthesise into a working mental model

## Target

Complete refresh in < 3500 tokens. No exploration agents needed.
