---
name: dependency-guardian
description: Prevents reading from dependency directories that waste tokens
version: 1.0.0
triggers:
  - file read operations
  - search operations
---

# Dependency Guardian

Mechanically prevents reading from dependency and build directories.

## Forbidden Directories

`node_modules`, `.next`, `dist`, `build`, `__pycache__`, `venv`, `.venv`,
`target`, `vendor`, `Pods`, `.gradle`, `coverage`

## Enforcement

The `dependency-guardian-hook.py` PreToolUse hook blocks Read/Grep/Glob/Bash
calls targeting forbidden directories.

## Alternatives

- Read `.d.ts` type definitions
- Check package README/docs
- Use public API documentation
- Reference `package.json` for versions
