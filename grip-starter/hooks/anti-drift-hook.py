#!/usr/bin/env python3
"""
Anti-Drift — TaskCompleted Hook
================================
After any task completion, reminds the agent to output remaining
work items before accepting new tasks.

Prevents the common failure mode where 32% of sessions ended with
partially-achieved goals due to untracked pivoting.
"""

import json
import sys


def main():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return

    # Emit a reminder to output remaining work
    reminder = (
        "[GRIP] Task completed. Before accepting new work, output: "
        "**Just completed**: [what] | **Remaining**: [items] | **Next action**: [step]"
    )
    print(json.dumps({"message": reminder}))


if __name__ == "__main__":
    main()
