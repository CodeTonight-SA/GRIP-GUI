#!/usr/bin/env python3
"""
Atomic write pattern for crash-resistant file operations.

Uses temp-file + rename pattern to ensure that a crash between
write and rename only orphans a temp file, never corrupts the target.
"""

import json
import os
import tempfile
from pathlib import Path


def atomic_write(path, content):
    """Write atomically using temp-file + rename pattern.

    Args:
        path: Target file path (str or Path)
        content: File content (str or bytes)
    """
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    mode = "wb" if isinstance(content, bytes) else "w"
    encoding = None if isinstance(content, bytes) else "utf-8"

    fd, tmp_path = tempfile.mkstemp(
        dir=str(target.parent),
        prefix=f".{target.name}.",
        suffix=".tmp",
    )
    try:
        with os.fdopen(fd, mode, encoding=encoding) as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, str(target))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def atomic_write_json(path, data):
    """Write JSON atomically with pretty formatting.

    Args:
        path: Target file path (str or Path)
        data: JSON-serialisable data
    """
    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    atomic_write(path, content)
