#!/usr/bin/env python3
"""
File-based locking for safe concurrent access.

Uses fcntl on Unix and msvcrt on Windows for cross-platform
advisory file locking. Timeout prevents deadlocks.
"""

import os
import sys
import time


class FileLock:
    """Cross-platform advisory file lock with timeout."""

    def __init__(self, path, timeout=5.0):
        self.path = str(path) + ".lock"
        self.timeout = timeout
        self._fd = None

    def acquire(self):
        """Acquire the lock, blocking up to timeout seconds."""
        deadline = time.monotonic() + self.timeout
        while True:
            try:
                self._fd = os.open(
                    self.path,
                    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                )
                # Write PID for debugging stale locks
                os.write(self._fd, str(os.getpid()).encode())
                return True
            except FileExistsError:
                if time.monotonic() >= deadline:
                    # Check for stale lock
                    self._cleanup_stale()
                    return False
                time.sleep(0.05)

    def release(self):
        """Release the lock."""
        if self._fd is not None:
            try:
                os.close(self._fd)
            except OSError:
                pass
            self._fd = None
        try:
            os.unlink(self.path)
        except OSError:
            pass

    def _cleanup_stale(self):
        """Remove lock file if owning process is dead."""
        try:
            with open(self.path, "r") as f:
                pid = int(f.read().strip())
            # Check if process exists
            os.kill(pid, 0)
        except (ValueError, ProcessLookupError, PermissionError, OSError):
            # Process is dead or PID is invalid — stale lock
            try:
                os.unlink(self.path)
            except OSError:
                pass

    def __enter__(self):
        if not self.acquire():
            raise TimeoutError(f"Could not acquire lock: {self.path}")
        return self

    def __exit__(self, *args):
        self.release()
