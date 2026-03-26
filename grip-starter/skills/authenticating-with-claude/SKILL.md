---
name: authenticating-with-claude
description: Claude API authentication and identity setup
version: 1.0.0
triggers:
  - first-run detection
  - identity setup
  - API authentication
---

# Authenticating with Claude

## Setup

1. Ensure `claude` CLI is installed: `npm install -g @anthropic-ai/claude-code`
2. Authenticate: `claude login`
3. Verify: `claude --version`

## API Key

If using the Anthropic API directly:
1. Get key from console.anthropic.com
2. Set `ANTHROPIC_API_KEY` environment variable
3. Never hardcode the key in source files

## Identity

GRIP uses a signature system for team identification:
- Format: `{LETTER}>>` (e.g., V>>, A>>, M>>)
- Configure in `~/.claude/facts/identity.md`
