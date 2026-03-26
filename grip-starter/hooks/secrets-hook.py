#!/usr/bin/env python3
"""
Secrets Detection — PostToolUse Hook
=====================================
Scans tool output for accidentally exposed secrets (API keys,
tokens, passwords) before they can be committed or displayed.

Patterns detect common secret formats across AWS, GitHub, Slack,
Stripe, and generic API key patterns.
"""

import json
import re
import sys

SECRET_PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key"),
    (r"(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*\S+", "AWS Secret Key"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub PAT"),
    (r"gho_[a-zA-Z0-9]{36}", "GitHub OAuth Token"),
    (r"ghs_[a-zA-Z0-9]{36}", "GitHub App Token"),
    (r"xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+", "Slack Bot Token"),
    (r"xoxp-[0-9]+-[0-9]+-[a-zA-Z0-9]+", "Slack User Token"),
    (r"sk-[a-zA-Z0-9]{20,}", "API Secret Key"),
    (r"sk_live_[a-zA-Z0-9]+", "Stripe Live Key"),
    (r"rk_live_[a-zA-Z0-9]+", "Stripe Restricted Key"),
    (r"(?:password|passwd|pwd)\s*[=:]\s*['\"][^'\"]{8,}['\"]", "Hardcoded Password"),
    (r"(?:api[_-]?key|apikey)\s*[=:]\s*['\"][a-zA-Z0-9]{16,}['\"]", "API Key"),
    (r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----", "Private Key"),
    (r"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+", "JWT Token"),
]

COMPILED_PATTERNS = [(re.compile(p, re.IGNORECASE), name) for p, name in SECRET_PATTERNS]


def main():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return

    tool_name = event.get("tool_name", "")
    tool_output = event.get("tool_output", "")

    if not tool_output or tool_name not in ("Bash", "Read", "Grep"):
        return

    # Scan output for secret patterns
    output_str = str(tool_output)[:10000]  # Limit scan to first 10k chars
    found = []

    for pattern, name in COMPILED_PATTERNS:
        if pattern.search(output_str):
            found.append(name)

    if found:
        types = ", ".join(found[:3])
        warning = (
            f"[GRIP SECRET WARNING] Potential secrets detected: {types}. "
            f"Do NOT commit these values. Use environment variables or a secrets manager."
        )
        print(json.dumps({"message": warning}))


if __name__ == "__main__":
    main()
