# Bash Safety

## Tool Selection
Use `rg` (not grep), `fd` (not find), `jq` for JSON. Always exclude
`node_modules`, `venv`, etc.

## Syntax Safety (zsh eval)
- No semicolons after `$()` — use `&&` instead
- Use pipes for multiple sed: `sed 's|a||' | sed 's|b||'`

## Path Handling
- Always `--` before variable paths to prevent flag interpretation
- Quote file paths with spaces using double quotes

## JSONL Processing
Always use `jq -s` (slurp mode) for JSONL files.

## Cross-Platform
Scripts must work on macOS (zsh), Linux (bash), Windows Git Bash.
- Python: `python3` or `python` (use detection: `command -v python3 || command -v python`)
- Paths: `$HOME` not hardcoded
- Shebang: `#!/usr/bin/env bash`

## macOS: No `timeout` Command
macOS does not ship GNU `timeout`. Alternatives:
- **Python**: `subprocess.run(..., timeout=N)` — preferred, cross-platform
- **Bash builtin**: background + kill pattern
