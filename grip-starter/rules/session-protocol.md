# Session Protocol

## Session Start
1. Read CLAUDE.md + rules
2. Check for any prior session context

## Context-Save Gate (85%)
HALT all work. Ask user: compact or fresh session. PARAMOUNT — never auto-serialise.

## Anti-Drift: "What's Up Next" (PARAMOUNT)

After ANY commit/PR/phase completion, output before accepting new tasks:
```
**Just completed**: [what]
**Remaining**: [items]
**Next action**: [specific step]
```
NEVER skip — even if user seems ready to pivot. The point is informed pivoting.
