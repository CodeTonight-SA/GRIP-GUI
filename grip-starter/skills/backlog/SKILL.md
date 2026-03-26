---
name: backlog
description: Personal knowledge staging with categorisation and action proposals
version: 1.0.0
triggers:
  - /backlog
  - note-taking
  - idea capture
---

# Backlog

Drop notes, URLs, ideas, documents. GRIP categorises, analyses, and proposes actions.

## Usage

```
/backlog add "idea or note here"
/backlog list
/backlog process
```

## Categories

- **Task**: Actionable work item
- **Idea**: Needs further exploration
- **Reference**: Useful link or resource
- **Bug**: Something broken to investigate
- **Enhancement**: Improvement to existing feature

## Processing

When `/backlog process` is invoked:
1. Review all unprocessed items
2. Categorise each item
3. Propose actions (create issue, add to sprint, research, archive)
4. Ask user to confirm actions
