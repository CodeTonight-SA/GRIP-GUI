/**
 * broadcast.ts — §13.5 Hybrid IPC routing via workspace window registry
 *
 * Replaces 62 singleton `mainWindow.webContents.send(...)` call sites with
 * three routing patterns:
 *
 *   Pattern 1 — Agent-initiated: route to the owning workspace window.
 *     getWindowForWorkspace(agent.workspaceId ?? 'default')?.webContents.send(...)
 *
 *   Pattern 2 — User-initiated: resolved at IPC handler invocation time.
 *     BrowserWindow.fromWebContents(event.sender)?.webContents.send(...)
 *
 *   Pattern 3 — Service-initiated: broadcast to all workspace windows.
 *     broadcastToAllWorkspaces(channel, payload)
 *
 * W8a-refactor baseline: all agents carry workspaceId = 'default'; the
 * registry holds exactly one window. All three patterns produce identical
 * output to the old singleton pattern in the single-workspace case.
 *
 * The isDestroyed() guard in broadcastToAllWorkspaces is LOAD-BEARING
 * (§14.4): sending to a destroyed webContents throws an uncaught exception
 * in the main process, which silently prevents every subsequent window in
 * the loop from receiving the event.
 */

import { BrowserWindow } from 'electron';

/** Module-level registry: workspaceId → BrowserWindow. */
const windowRegistry = new Map<string, BrowserWindow>();

// ─── Registry management ───────────────────────────────────────────────────

/**
 * Register a workspace window. Call immediately after BrowserWindow creation
 * so the registry is always current. Auto-deregisters the window on 'closed'.
 */
export function registerWorkspaceWindow(workspaceId: string, window: BrowserWindow): void {
  windowRegistry.set(workspaceId, window);
  window.once('closed', () => deregisterWorkspaceWindow(workspaceId));
}

/**
 * Remove a workspace window from the registry.
 * Auto-called on the 'closed' event; can also be called explicitly.
 */
export function deregisterWorkspaceWindow(workspaceId: string): void {
  windowRegistry.delete(workspaceId);
}

/**
 * Return all currently registered workspace IDs.
 * Useful for diagnostics and the concurrency-cap check (soft warn at 6th window).
 */
export function getAllWorkspaceIds(): string[] {
  return Array.from(windowRegistry.keys());
}

// ─── Pattern 1 — Agent-initiated routing ──────────────────────────────────

/**
 * Return the BrowserWindow for the given workspaceId, or null if not found.
 * Usage: getWindowForWorkspace(agent.workspaceId ?? 'default')?.webContents.send(...)
 */
export function getWindowForWorkspace(workspaceId: string): BrowserWindow | null {
  const win = windowRegistry.get(workspaceId);
  if (!win || win.isDestroyed()) return null;
  return win;
}

// ─── Pattern 3 — Service-initiated broadcast ──────────────────────────────

/**
 * Send `channel` with `payload` to every registered workspace window.
 * Safe to call when the registry is empty (no-op).
 *
 * Used by update-checker, slack-bot, telegram-bot, scheduler-handlers,
 * api-server, and any service that does not know which workspace is relevant.
 */
export function broadcastToAllWorkspaces(channel: string, payload?: unknown): void {
  for (const [wsId, win] of windowRegistry) {
    if (win.isDestroyed()) {
      windowRegistry.delete(wsId);
      continue;
    }
    win.webContents.send(channel, payload);
  }
}
