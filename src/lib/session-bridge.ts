/**
 * session-bridge.ts — renderer-side initialiser for the IPC session store.
 *
 * Boot sequence:
 *  1. If electronAPI.session is unavailable → no-op (browser fallback path)
 *  2. Fetch current store from main process via session:store IPC
 *  3. If main store is empty AND localStorage has legacy session data,
 *     dispatch session:importLegacy with the localStorage payload
 *  4. Subscribe to session:changed broadcasts; mirror the new store back
 *     to localStorage so existing chat-storage readers see fresh data after
 *     cross-window mutations. Also dispatch a 'grip:sessions-synced'
 *     CustomEvent so components can rerender within the same window.
 *
 * This PR (PR-2 of plans/per-session-modes-cross-window.md) intentionally
 * does NOT route reads/writes through the bridge — that's PR-3, where
 * chat-storage.ts switches its source of truth. PR-2 establishes the
 * round-trip plumbing and migrates existing localStorage data into the
 * main-process store, so PR-3 can start from a hydrated state.
 *
 * Falsifiable hypotheses:
 *  - H311 (legacy import idempotent): boot twice in same window → second
 *    boot's importLegacy call returns imported:false (already populated)
 *  - H313 (cross-window mirror works): window A creates a session via
 *    DevTools → window B's localStorage mirrors the new entry within
 *    one event-loop tick of the broadcast
 */

import type { ChatSession } from './chat-storage';

const CHATS_KEY = 'grip-chats';
const ACTIVE_KEY = 'grip-active-chat';
const TABS_KEY = 'grip-open-tabs';
const SYNCED_EVENT = 'grip:sessions-synced';

interface SessionStoreSnapshot {
  version: 1;
  sessions: Array<ChatSession & { modes: string[] }>;
  activeSessionId: string | null;
  openTabIds: string[];
}

interface ElectronSessionAPI {
  list: () => Promise<{ sessions: SessionStoreSnapshot['sessions'] }>;
  store: () => Promise<SessionStoreSnapshot>;
  active: () => Promise<{ activeSessionId: string | null; openTabIds: string[] }>;
  create: (params: { model?: string }) => Promise<unknown>;
  setActive: (params: { id: string | null }) => Promise<unknown>;
  setModes: (params: { id: string; modes: string[] }) => Promise<unknown>;
  setOpenTabs: (params: { ids: string[] }) => Promise<unknown>;
  close: (params: { id: string }) => Promise<unknown>;
  rename: (params: { id: string; title: string }) => Promise<unknown>;
  updateMeta: (params: {
    id: string;
    meta: Partial<{ messageCount: number; sessionId: string; model: string; title: string }>;
  }) => Promise<unknown>;
  importLegacy: (payload: {
    sessions: Array<ChatSession & { modes?: string[] }>;
    activeSessionId: string | null;
    openTabIds: string[];
    globalModes: string[];
  }) => Promise<{ store: SessionStoreSnapshot; imported: boolean }>;
  onChanged: (cb: (store: SessionStoreSnapshot) => void) => () => void;
}

interface ElectronGripAPI {
  getModes: () => Promise<{ modes: string[] }>;
}

interface WindowWithElectron extends Window {
  electronAPI?: { session?: ElectronSessionAPI; grip?: ElectronGripAPI };
}

let initialised = false;
let unsubscribeChanged: (() => void) | null = null;

function getApi(): ElectronSessionAPI | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithElectron;
  return w.electronAPI?.session ?? null;
}

function getGripApi(): ElectronGripAPI | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithElectron;
  return w.electronAPI?.grip ?? null;
}

export function isSessionBridgeAvailable(): boolean {
  return getApi() !== null;
}

function readLegacyFromLocalStorage(): {
  sessions: Array<ChatSession & { modes?: string[] }>;
  activeSessionId: string | null;
  openTabIds: string[];
} {
  try {
    const sessionsRaw = localStorage.getItem(CHATS_KEY);
    const activeRaw = localStorage.getItem(ACTIVE_KEY);
    const tabsRaw = localStorage.getItem(TABS_KEY);
    return {
      sessions: sessionsRaw ? JSON.parse(sessionsRaw) : [],
      activeSessionId: activeRaw ?? null,
      openTabIds: tabsRaw ? JSON.parse(tabsRaw) : [],
    };
  } catch {
    return { sessions: [], activeSessionId: null, openTabIds: [] };
  }
}

function writeStoreToLocalStorage(store: SessionStoreSnapshot): void {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(store.sessions));
    if (store.activeSessionId) {
      localStorage.setItem(ACTIVE_KEY, store.activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
    localStorage.setItem(TABS_KEY, JSON.stringify(store.openTabIds));
  } catch {
    // localStorage quota / disabled — best-effort
  }
}

/**
 * Initialise the bridge. Idempotent — safe to call multiple times. Should be
 * invoked once during renderer boot (e.g. from ClientLayout's mount effect).
 *
 * Returns a Promise that resolves once the boot sequence completes (hydration
 * + optional legacy migration). Does NOT block UI rendering.
 */
export async function initSessionBridge(): Promise<void> {
  if (initialised) return;
  const api = getApi();
  if (!api) return; // browser-only fallback — bridge is no-op
  initialised = true;

  // 1. Hydrate from main-process store
  let store = await api.store();

  // 2. One-shot legacy import if main store is empty and localStorage has data
  if (store.sessions.length === 0) {
    const legacy = readLegacyFromLocalStorage();
    if (legacy.sessions.length > 0) {
      const grip = getGripApi();
      const globalModes = grip ? (await grip.getModes()).modes ?? [] : [];
      const result = await api.importLegacy({
        sessions: legacy.sessions,
        activeSessionId: legacy.activeSessionId,
        openTabIds: legacy.openTabIds,
        globalModes,
      });
      if (result.imported) store = result.store;
    }
  } else {
    // Main store has data — overwrite localStorage so renderer reads see the
    // canonical state. This is the "main process is the source of truth" rule.
    writeStoreToLocalStorage(store);
  }

  // 3. Subscribe to cross-window mutations. When any window mutates the store,
  //    every other window's bridge mirrors the new state into its own
  //    localStorage and fires a CustomEvent so components can refresh.
  unsubscribeChanged = api.onChanged((newStore) => {
    writeStoreToLocalStorage(newStore);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: newStore }));
    }
  });
}

/**
 * Tear down the bridge subscription. Used by tests; production renderers
 * keep the bridge alive for the whole window lifetime.
 */
export function teardownSessionBridge(): void {
  if (unsubscribeChanged) {
    unsubscribeChanged();
    unsubscribeChanged = null;
  }
  initialised = false;
}

export const SESSIONS_SYNCED_EVENT = SYNCED_EVENT;
