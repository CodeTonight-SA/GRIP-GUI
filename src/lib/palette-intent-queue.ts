/**
 * Pending-intent queue for palette -> ChatInterface handoff.
 *
 * Problem: CommandPalette dispatches `grip:run-command` AND `router.push('/')`
 * in the same click. On non-engine routes, the ChatInterface is unmounted when
 * the event fires. Without a queue, the intent is silently lost — exactly the
 * Devil's Advocate failure mode the S1 council rider calls out.
 *
 * Solution: the palette writes the intent here BEFORE dispatching. ChatInterface,
 * once it mounts, consumes the latest intent on its active tab. The dispatch is
 * still emitted so already-mounted listeners catch the intent immediately for
 * the same-route case.
 *
 * Kept in module scope rather than localStorage because intents are in-memory
 * one-shots — there is no cross-reload value, and the queue resets cleanly on
 * page reload.
 */

export interface PendingRunCommand {
  id: string;
  name: string; // e.g. '/save'
  enqueuedAt: number;
}

let pending: PendingRunCommand | null = null;

export function enqueueRunCommand(id: string, name: string): void {
  pending = { id, name, enqueuedAt: Date.now() };
}

/**
 * Read-and-clear. Returns null if no intent is pending or the last one is
 * stale (older than 5 seconds — anything longer is a navigation the user
 * probably abandoned).
 */
export function consumePendingRunCommand(): PendingRunCommand | null {
  const current = pending;
  pending = null;
  if (!current) return null;
  if (Date.now() - current.enqueuedAt > 5000) return null;
  return current;
}

/** Test-only: clear the queue without consuming. */
export function resetQueue(): void {
  pending = null;
}
