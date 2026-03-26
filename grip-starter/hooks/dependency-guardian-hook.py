#!/usr/bin/env python3
"""
Dependency Guardian — PreToolUse Hook
=====================================
Prevents catastrophic token waste by blocking reads from dependency
and build directories (node_modules, venv, dist, etc.).

A single node_modules read can consume 50k+ tokens. This hook
mechanically prevents that by denying tool calls targeting forbidden paths.
"""

import json
import sys

FORBIDDEN_DIRS = [
    "node_modules", ".next", "dist", "build", "__pycache__",
    "venv", ".venv", "env", ".env", "target", "vendor",
    "Pods", ".gradle", ".m2", "bower_components", ".nuxt",
    ".output", ".turbo", "coverage", ".nyc_output",
    ".pytest_cache", ".mypy_cache", ".tox",
]


def main():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return

    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input", {})

    # Only gate file-reading tools
    if tool_name not in ("Read", "Grep", "Glob", "Bash"):
        return

    # Extract path from tool input
    path_value = ""
    if tool_name == "Bash":
        path_value = tool_input.get("command", "")
    elif tool_name == "Read":
        path_value = tool_input.get("file_path", "")
    elif tool_name in ("Grep", "Glob"):
        path_value = tool_input.get("path", "") or tool_input.get("pattern", "")

    if not path_value:
        return

    # Check for forbidden directory segments
    path_lower = path_value.lower()
    for forbidden in FORBIDDEN_DIRS:
        if f"/{forbidden}/" in path_lower or path_lower.endswith(f"/{forbidden}"):
            result = {
                "permissionDecision": "deny",
                "reason": f"[GRIP] Blocked: reading from {forbidden}/ wastes tokens. "
                          f"Use package docs or type definitions instead.",
            }
            print(json.dumps(result))
            return


if __name__ == "__main__":
    main()
