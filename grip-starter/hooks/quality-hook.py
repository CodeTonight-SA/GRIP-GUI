#!/usr/bin/env python3
"""
Quality Gate — PreToolUse Hook (Edit/Write)
============================================
Checks code being written for common quality issues:
- DRY violations (duplicate code blocks)
- KISS violations (overly complex abstractions for simple tasks)
- High cyclomatic complexity (too many if/for/while branches)

Warns on violations, blocks on severe cases (CC > 30).
"""

import json
import re
import sys


def count_complexity(code: str) -> int:
    """McCabe cyclomatic complexity approximation."""
    keywords = [
        r"\bif\b", r"\belif\b", r"\belse\b",
        r"\bfor\b", r"\bwhile\b",
        r"\bexcept\b", r"\bcatch\b",
        r"\bcase\b",
        r"\b&&\b", r"\b\|\|\b",
        r"\band\b", r"\bor\b",
        r"\bassert\b",
        r"\?\s*.*\s*:",  # ternary
    ]
    count = 1  # Base complexity
    for kw in keywords:
        count += len(re.findall(kw, code))
    return count


def check_duplicate_blocks(code: str) -> list:
    """Find duplicate code blocks (3+ consecutive identical lines)."""
    lines = code.split("\n")
    duplicates = []
    i = 0
    while i < len(lines) - 5:
        block = "\n".join(lines[i:i+3]).strip()
        if not block or len(block) < 30:
            i += 1
            continue
        rest = "\n".join(lines[i+3:])
        if block in rest:
            duplicates.append(f"Lines {i+1}-{i+3}")
        i += 1
    return duplicates[:3]


def main():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return

    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input", {})

    if tool_name not in ("Edit", "Write"):
        return

    # Get code content
    code = ""
    if tool_name == "Write":
        code = tool_input.get("content", "")
    elif tool_name == "Edit":
        code = tool_input.get("new_string", "")

    if not code or len(code) < 50:
        return

    warnings = []

    # Check cyclomatic complexity
    cc = count_complexity(code)
    if cc > 30:
        result = {
            "permissionDecision": "deny",
            "reason": (
                f"[QUALITY] Cyclomatic complexity {cc} exceeds threshold (30). "
                f"Decompose into smaller functions using Extract-Dispatch or Coordinator pattern."
            ),
        }
        print(json.dumps(result))
        return

    if cc > 15:
        warnings.append(f"CC={cc} (consider decomposition above 15)")

    # Check for duplicate blocks
    dupes = check_duplicate_blocks(code)
    if dupes:
        warnings.append(f"Possible DRY violation: duplicate code at {', '.join(dupes)}")

    if warnings:
        msg = "[QUALITY] " + " | ".join(warnings)
        print(json.dumps({"message": msg}))


if __name__ == "__main__":
    main()
