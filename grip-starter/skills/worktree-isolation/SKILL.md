---
name: worktree-isolation
description: Git worktree isolation for concurrent sessions and safe branch work
version: 1.0.0
triggers:
  - concurrent sessions detected
  - branch switching needed
  - isolation required
---

# Worktree Isolation

Use git worktrees to isolate concurrent work and prevent branch conflicts.

## When to Use

- Multiple Claude Code sessions running simultaneously
- Feature work that shouldn't affect the main working directory
- Experimental changes that need easy cleanup

## Pattern

```bash
git worktree add /tmp/feature-name feat/feature-name
cd /tmp/feature-name
# ... do work, commit, push ...
git worktree remove /tmp/feature-name
```

## Benefits

- Main session stays on `main` branch
- No risk of concurrent branch switching
- Easy cleanup — just remove the worktree
- Full git history available in the worktree
