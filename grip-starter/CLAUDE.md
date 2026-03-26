# GRIP Starter Pack

Session continuity, safety gates, and efficiency protocols for Claude Code.

## What GRIP Is

GRIP is a knowledge work engine that makes Claude Code safer, more efficient,
and genuinely useful through mechanical enforcement — not suggestions.

## Core Principles

1. **Confidence Gate**: When uncertain, HALT and ask the user. Never guess.
2. **Safety Gates**: Deterministic, mechanical, cannot be overridden.
3. **Efficiency First**: Batch reads, avoid dependency folders, cache mental models.
4. **Anti-Drift**: After any commit/PR/phase, output remaining work before accepting new tasks.

## PARAMOUNT Rules

1. **Never read dependency folders**: `node_modules`, `.next`, `dist`, `build`, `__pycache__`, `venv`, `target`, `vendor`, `Pods`
2. **File read optimisation**: Batch Phase 1, targeted edits Phase 2+. Check cache before re-reading.
3. **Confidence gate**: When confidence < 99.9999999% -> HALT and AskUserQuestion.
4. **Context gate (85%)**: HALT all work, ask user (compact/fresh), never auto-serialise.
5. **Anti-drift**: After any commit/PR/phase -> output "What's Up Next" before accepting new tasks.

## Design Principles

SOLID, GRASP, DRY, KISS, YAGNI, BIG-O

Keep solutions simple (KISS). Do not over-complicate. When in doubt, propose
the simpler model first and let the user request more complexity.

## Git Operations

- Feature pushes auto-allowed. Protected branches require confirmation.
- Force pushes ALWAYS require explicit approval.
- `git status` before staging to detect concurrent session changes.
- Never include AI attribution in commits or PRs.

## Key Commands

- `/mode <name>` — Switch operating mode (code, review, security, etc.)
- `/converge` — Recursive convergence on a task until criterion is met
- `/create-pr` — Automated PR creation workflow

## Memory

Use auto memory (`~/.claude/projects/.../memory/`) actively:
- Save architectural decisions and debugging insights
- Create topic files for detailed notes
- Review memory at session start for relevant context

## Session Protocol

- On start: load CLAUDE.md, check rules
- Context gate (85%): HALT, ask user, never auto-serialise
- After completion: output "What's Up Next" summary

## Interaction Style

Language: British English.
Commits: Professional, no AI attribution, no emoji.
When uncertain: Ask, don't guess.
