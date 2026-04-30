/**
 * session-handlers.ts — IPC bridge between renderer and session-store.
 *
 * Pattern: every mutation handler returns the new store snapshot AND broadcasts
 * `session:changed` to all workspace windows. Renderers subscribe to the broadcast
 * and refresh their reactive cache. This keeps multiple windows synced without
 * each one having to invoke session:list on every change.
 *
 * Read-only handlers (session:list, session:active) do not broadcast.
 *
 * Race resolution: handlers serialise through the main-process event loop, so
 * "concurrent" mutations from two windows are actually sequential at IPC arrival.
 * Last command wins. This matches the ADR's last-write-wins decision.
 */

import { ipcMain } from 'electron';
import { broadcastToAllWorkspaces } from '../core/broadcast';
import {
  initSessionStore,
  listSessions,
  getActiveSessionId,
  getOpenTabIds,
  createSession,
  setActiveSession,
  setSessionModes,
  setOpenTabs,
  closeSession,
  renameSession,
  updateSessionMeta,
  importLegacy,
  getStore,
  type SessionStoreFile,
} from '../services/session-store';

const CHANGED_EVENT = 'session:changed';

function broadcast(): void {
  broadcastToAllWorkspaces(CHANGED_EVENT, getStore());
}

export function registerSessionHandlers(): void {
  // Initialise the in-memory cache from disk on first registration.
  initSessionStore();

  // ─── Read-only ────────────────────────────────────────────────────
  ipcMain.handle('session:list', async () => {
    return { sessions: listSessions() };
  });

  ipcMain.handle('session:store', async () => {
    return getStore();
  });

  ipcMain.handle('session:active', async () => {
    return { activeSessionId: getActiveSessionId(), openTabIds: getOpenTabIds() };
  });

  // ─── Mutations ────────────────────────────────────────────────────
  ipcMain.handle('session:create', async (_event, params: { model?: string }) => {
    const session = createSession(params?.model ?? 'sonnet');
    broadcast();
    return { session, store: getStore() };
  });

  ipcMain.handle('session:setActive', async (_event, params: { id: string | null }) => {
    const store = setActiveSession(params.id);
    broadcast();
    return { store };
  });

  ipcMain.handle(
    'session:setModes',
    async (_event, params: { id: string; modes: string[] }) => {
      const store = setSessionModes(params.id, params.modes ?? []);
      broadcast();
      return { store };
    },
  );

  ipcMain.handle('session:setOpenTabs', async (_event, params: { ids: string[] }) => {
    const store = setOpenTabs(params.ids ?? []);
    broadcast();
    return { store };
  });

  ipcMain.handle('session:close', async (_event, params: { id: string }) => {
    const store = closeSession(params.id);
    broadcast();
    return { store };
  });

  ipcMain.handle('session:rename', async (_event, params: { id: string; title: string }) => {
    const store = renameSession(params.id, params.title);
    broadcast();
    return { store };
  });

  ipcMain.handle(
    'session:updateMeta',
    async (
      _event,
      params: {
        id: string;
        meta: Partial<{ messageCount: number; sessionId: string; model: string; title: string }>;
      },
    ) => {
      const store = updateSessionMeta(params.id, params.meta);
      broadcast();
      return { store };
    },
  );

  // ─── One-shot legacy import ────────────────────────────────────────
  // Called by the renderer the first time it boots after the IPC layer is
  // available. The renderer reads its localStorage and posts the contents
  // here. Idempotent: a second call with sessions already in the store is
  // a no-op (see session-store.importLegacy).
  ipcMain.handle(
    'session:importLegacy',
    async (
      _event,
      payload: {
        sessions: Array<{
          id: string;
          title: string;
          createdAt: string;
          updatedAt: string;
          messageCount: number;
          model: string;
          sessionId?: string;
          modes?: string[];
        }>;
        activeSessionId: string | null;
        openTabIds: string[];
        globalModes: string[];
      },
    ): Promise<{ store: SessionStoreFile; imported: boolean }> => {
      const before = getStore().sessions.length;
      const store = importLegacy(payload);
      const imported = before === 0 && store.sessions.length > 0;
      if (imported) broadcast();
      return { store, imported };
    },
  );
}
