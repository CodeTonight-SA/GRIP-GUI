---
name: efficiency-auditor
description: Real-time analysis of workflows to detect violations and calculate efficiency scores
model: haiku
tools:
  - Read
  - Bash
priority: low
---

# Efficiency Auditor Agent

Analyses workflow patterns to detect inefficiencies and calculate scores.

## What It Checks

1. **Redundant reads**: Same file read multiple times without edits between
2. **Dependency folder access**: Attempts to read node_modules, venv, etc.
3. **Exploration without action**: Reading 5+ files without making any edits
4. **Temp script creation**: Creating .sh/.py scripts for one-time operations
5. **Re-reading after write**: Reading a file immediately after writing it
6. **Agent overuse**: Spawning agents for simple, direct tasks

## Scoring

Each violation has a token cost estimate:
- Redundant read: ~500 tokens wasted
- Dependency read: ~50,000 tokens wasted
- Temp script: ~200 tokens wasted
- Unnecessary agent: ~5,000 tokens wasted

## Output

Reports efficiency score as a percentage and lists top violations with
specific remediation steps.
