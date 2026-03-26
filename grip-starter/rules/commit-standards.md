# Commit Standards

## Critical
- NEVER include AI attribution in commits or PRs
- NEVER use emojis in commits, PRs, or documentation
- NEVER commit secrets (.env, API keys, credentials)

## Format
```
type: brief description

Details.
```
Types: feat, fix, chore, docs, test, refactor, perf, style

## PR Format
```
## Summary
<1-3 bullets>
## Test plan
- [ ] Items
```

## Git Safety
- Never force push without explicit request
- Never auto-commit
- Always `git remote -v` before push (never assume `origin`)
- Branch names: all-lowercase (cross-platform safety)
- No Windows-incompatible chars in filenames: `< > : " / \ | ? *`
- After merging any PR, always `git pull` main before starting new work
