---
name: secrets-detection
description: Detect and prevent accidental exposure of secrets in code and output
version: 1.0.0
triggers:
  - file writes
  - git commits
  - tool output scanning
---

# Secrets Detection

Prevents accidental exposure of API keys, tokens, passwords, and other secrets.

## Detected Patterns

- AWS access keys (`AKIA...`)
- GitHub PATs (`ghp_...`, `gho_...`, `ghs_...`)
- Slack tokens (`xoxb-...`, `xoxp-...`)
- API secret keys (`sk-...`)
- Stripe keys (`sk_live_...`, `rk_live_...`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- JWT tokens (`eyJ...`)
- Hardcoded passwords

## Enforcement

The `secrets-hook.py` PostToolUse hook scans tool output for secret patterns
and warns before they can be committed.

## Prevention

- Use environment variables, not hardcoded values
- Use `.env` files (never commit them)
- Use secrets managers for production
- Add `.env` to `.gitignore`
