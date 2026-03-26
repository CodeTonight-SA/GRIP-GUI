---
name: bash-tool-enforcer
description: Enforces use of modern CLI tools for performance and consistency
version: 1.0.0
triggers:
  - bash command execution
---

# Bash Tool Enforcer

Use modern, faster CLI tools instead of legacy equivalents.

## Replacements

| Legacy | Modern | Reason |
|--------|--------|--------|
| `grep` | `rg` (ripgrep) | 10-100x faster, respects .gitignore |
| `find` | `fd` | Faster, simpler syntax, respects .gitignore |
| `cat` | `bat` | Syntax highlighting, line numbers |
| `ls` | `exa`/`eza` | Better formatting, git integration |

## Always Exclude

When searching, always exclude dependency directories:
```bash
rg --glob '!node_modules/*' --glob '!venv/*' "pattern"
fd --exclude node_modules --exclude venv "pattern"
```

## JSON Processing

Always use `jq` for JSON manipulation. For JSONL files, use `jq -s` (slurp mode).
