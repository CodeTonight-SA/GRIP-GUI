---
name: asking-users
description: Core GRIP skill establishing AskUserQuestion as proactive confirmation gate
version: 1.0.0
triggers:
  - confidence < 99.9999999%
  - destructive actions
  - UI/UX decisions
  - multiple valid options
---

# Asking Users

AskUserQuestion is the core GRIP interaction primitive. Use it proactively.

## When to Ask

1. **Confidence gate**: Any uncertainty about the right approach
2. **Destructive actions**: Deleting files, force-pushing, dropping tables
3. **UI/UX decisions**: Colour, layout, copy — user knows best
4. **Multiple valid options**: Present options, let user choose
5. **Brand elements**: Logos, names, taglines — never assume

## How to Ask

- Be specific: "Should I use Redis or PostgreSQL for the session store?"
- Offer options: Present 2-3 choices with trade-offs
- Show context: Explain why you're asking
- Never ask yes/no when you need details

## Anti-Pattern

"I think this is what the user wants" — that thought means ASK.
