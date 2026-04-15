/**
 * broadcast.ts
 *
 * §13.5 — Hybrid IPC routing via workspace window registry
 *
 * Three routing patterns replace the 30+ singleton `mainWindow.webContents.send(...)`
 * call sites identified by Agent C in §12.2:
 *
 *   Pattern 1 — Agent-initiated: route to the owning workspace window.
 *   Pattern 2 — User-initiated: resolved from event.sender (see ipc-handlers.ts).
 *   Pattern 3 — Service-initiated: broadcast to all workspace windows.
 *
 * This module owns the registry and exposes helpers for all three patterns.
 * W8a-refactor migrates every call site to use one of these three helpers.
 *
 * Registry lifecycle:
 *   - registerWorkspaceWindow() is called by window-manager.ts on BrowserWindow creation.
 *   - deregisterWorkspaceWindow() is called on the 'closed' event to prevent
 *     sending to destroyed webContents (which throws in Electron).
 */

import { BrowserWindow } from 'electron';

/** Module-level registry: workspaceId → BrowserWindow. */
const windowRegistry = new Map<string, BrowserWindow>();

/**
 * Register a workspace window. Call this immediately after BrowserWindow
 * creation in window-manager.ts so the registry is always current.
 */
export function registerWorkspaceWindow(workspaceId: string, window: BrowserWindow): void {
  windowRegistry.set(workspaceId, window);
  window.on('closed', () => deregisterWorkspaceWindow(workspaceId));
}

/**
 * Remove a workspace window from the registry.
 * Called automatically on the 'closed' event; can also be called explicitly.
 */
export function deregisterWorkspaceWindow(workspaceId: string): void {
  windowRegistry.delete(workspaceId);
}

/**
 * Pattern 1 — Agent-initiated routing.
 * Returns the BrowserWindow for the given workspaceId, or null if not found
 * (e.g. the window was closed between the agent event firing and this call).
 * Callers use optional-chaining: `getWindowForWorkspace(id)?.webContents.send(...)`.
 */
export function getWindowForWorkspace(workspaceId: string): BrowserWindow | null {
  return windowRegistry.get(workspaceId) ?? null;
}

/**
 * Pattern 3 — Service-initiated broadcast.
 * Sends `channel` with `payload` to every registered workspace window.
 * Safe to call when the registry is empty (no-op).
 * Used by update-checker, slack-bot, telegram-bot, scheduler-handlers.
 */
export function broadcastToAllWorkspaces(channel: string, payload: unknown): void {
  for (const win of windowRegistry.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

/**
 * Return all currently registered workspace IDs.
 * Useful for diagnostics and the concurrency-cap check (soft warn at 6th window).
 */
export function getAllWorkspaceIds(): string[] {
  return Array.from(windowRegistry.keys());
}
