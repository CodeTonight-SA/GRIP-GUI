#!/usr/bin/env python3
"""
Locked append for safe concurrent JSONL file operations.

Combines file_lock with atomic patterns to safely append
to JSONL (newline-delimited JSON) files from multiple processes.
"""

import json
import os
from pathlib import Path

from .file_lock import FileLock


def locked_append(path, record):
    """Append a JSON record to a JSONL file with file locking.

    Args:
        path: Target JSONL file path (str or Path)
        record: Dict to serialise and append
    """
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    line = json.dumps(record, ensure_ascii=False) + "\n"

    with FileLock(str(target)):
        with open(str(target), "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()
            os.fsync(f.fileno())


def read_jsonl(path):
    """Read all records from a JSONL file.

    Args:
        path: JSONL file path (str or Path)

    Returns:
        List of parsed dicts. Skips malformed lines.
    """
    target = Path(path)
    if not target.exists():
        return []

    records = []
    with open(str(target), "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records
