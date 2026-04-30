// @vitest-environment jsdom

/**
 * session-bridge.test.ts — verifies the renderer-side IPC session bootstrap.
 *
 * Goodhart-resistant: asserts on real behaviour (localStorage contents,
 * dispatched events, IPC call args) rather than mock call counts alone.
 *
 * Strategy: mock window.electronAPI.session per test. Real localStorage is
 * cleared between tests. vi.resetModules() forces a fresh bridge instance
 * each test so the `initialised` module-level flag doesn't leak.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Stub localStorage with a full mock — Node 22+ ships a built-in localStorage
// that shadows jsdom's and lacks a working clear()/key() implementation.
let _lsStore: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => _lsStore[key] ?? null,
  setItem: (key: string, val: string) => { _lsStore[key] = String(val); },
  removeItem: (key: string) => { delete _lsStore[key]; },
  clear: () => { _lsStore = {}; },
  get length() { return Object.keys(_lsStore).length; },
  key: (i: number) => Object.keys(_lsStore)[i] ?? null,
});

interface MockSessionAPI {
  list: ReturnType<typeof vi.fn>;
  store: ReturnType<typeof vi.fn>;
  active: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  setActive: ReturnType<typeof vi.fn>;
  setModes: ReturnType<typeof vi.fn>;
  setOpenTabs: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
  updateMeta: ReturnType<typeof vi.fn>;
  importLegacy: ReturnType<typeof vi.fn>;
  onChanged: ReturnType<typeof vi.fn>;
}

interface MockGripAPI {
  getModes: ReturnType<typeof vi.fn>;
}

let onChangedHandler: ((store: unknown) => void) | null = null;

function installMockApi(opts: {
  initialStore?: { version: 1; sessions: unknown[]; activeSessionId: string | null; openTabIds: string[] };
  importLegacyResult?: { store: unknown; imported: boolean };
  globalModes?: string[];
}): MockSessionAPI {
  const initial = opts.initialStore ?? {
    version: 1 as const,
    sessions: [],
    activeSessionId: null,
    openTabIds: [],
  };
  const sessionApi: MockSessionAPI = {
    list: vi.fn(async () => ({ sessions: initial.sessions })),
    store: vi.fn(async () => initial),
    active: vi.fn(async () => ({
      activeSessionId: initial.activeSessionId,
      openTabIds: initial.openTabIds,
    })),
    create: vi.fn(),
    setActive: vi.fn(),
    setModes: vi.fn(),
    setOpenTabs: vi.fn(),
    close: vi.fn(),
    rename: vi.fn(),
    updateMeta: vi.fn(),
    importLegacy: vi.fn(async () =>
      opts.importLegacyResult ?? { store: initial, imported: false },
    ),
    onChanged: vi.fn((cb: (store: unknown) => void) => {
      onChangedHandler = cb;
      return () => {
        onChangedHandler = null;
      };
    }),
  };
  const gripApi: MockGripAPI = {
    getModes: vi.fn(async () => ({ modes: opts.globalModes ?? [] })),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electronAPI = { session: sessionApi, grip: gripApi };
  return sessionApi;
}

async function loadBridge() {
  const mod = await import('../../src/lib/session-bridge');
  // Each test gets a fresh module — initialised flag reset
  return mod;
}

describe('session-bridge', () => {
  beforeEach(async () => {
    vi.resetModules();
    onChangedHandler = null;
    _lsStore = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
  });

  it('isSessionBridgeAvailable returns false when electronAPI absent', async () => {
    const bridge = await loadBridge();
    expect(bridge.isSessionBridgeAvailable()).toBe(false);
  });

  it('isSessionBridgeAvailable returns true when electronAPI.session present', async () => {
    installMockApi({});
    const bridge = await loadBridge();
    expect(bridge.isSessionBridgeAvailable()).toBe(true);
  });

  it('initSessionBridge is a no-op when electronAPI absent', async () => {
    const bridge = await loadBridge();
    await expect(bridge.initSessionBridge()).resolves.toBeUndefined();
    // localStorage untouched
    expect(localStorage.getItem('grip-chats')).toBeNull();
  });

  it('initSessionBridge calls importLegacy when main store empty and localStorage has sessions', async () => {
    const legacySession = {
      id: 'legacy-1',
      title: 'Old',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      messageCount: 3,
      model: 'sonnet',
    };
    localStorage.setItem('grip-chats', JSON.stringify([legacySession]));
    localStorage.setItem('grip-active-chat', 'legacy-1');
    localStorage.setItem('grip-open-tabs', JSON.stringify(['legacy-1']));
    const importedStore = {
      version: 1 as const,
      sessions: [{ ...legacySession, modes: ['code'] }],
      activeSessionId: 'legacy-1',
      openTabIds: ['legacy-1'],
    };
    const api = installMockApi({
      globalModes: ['code'],
      importLegacyResult: { store: importedStore, imported: true },
    });
    const bridge = await loadBridge();
    await bridge.initSessionBridge();
    // importLegacy should have been called with the localStorage data
    expect(api.importLegacy).toHaveBeenCalledTimes(1);
    const callArg = api.importLegacy.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.activeSessionId).toBe('legacy-1');
    expect(callArg.globalModes).toEqual(['code']);
    expect(Array.isArray(callArg.sessions)).toBe(true);
    expect((callArg.sessions as unknown[]).length).toBe(1);
  });

  it('initSessionBridge does NOT call importLegacy when main store has data', async () => {
    const apiStore = {
      version: 1 as const,
      sessions: [
        { id: 's1', title: 'Existing', createdAt: '', updatedAt: '', messageCount: 0, model: 'sonnet', modes: [] },
      ],
      activeSessionId: 's1',
      openTabIds: ['s1'],
    };
    const api = installMockApi({ initialStore: apiStore });
    const bridge = await loadBridge();
    await bridge.initSessionBridge();
    expect(api.importLegacy).not.toHaveBeenCalled();
    // localStorage should now reflect the main store
    const stored = JSON.parse(localStorage.getItem('grip-chats') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('s1');
  });

  it('session:changed broadcast mirrors store back to localStorage and dispatches CustomEvent', async () => {
    installMockApi({});
    const bridge = await loadBridge();
    await bridge.initSessionBridge();
    // Verify the bridge subscribed
    expect(onChangedHandler).not.toBeNull();
    let receivedDetail: unknown = null;
    window.addEventListener(bridge.SESSIONS_SYNCED_EVENT, (ev) => {
      receivedDetail = (ev as CustomEvent).detail;
    });
    // Simulate a broadcast from main process
    const newStore = {
      version: 1 as const,
      sessions: [
        { id: 'broadcast-1', title: 'From Other Window', createdAt: '', updatedAt: '', messageCount: 0, model: 'sonnet', modes: [] },
      ],
      activeSessionId: 'broadcast-1',
      openTabIds: ['broadcast-1'],
    };
    onChangedHandler!(newStore);
    // localStorage should now have the broadcast data
    const stored = JSON.parse(localStorage.getItem('grip-chats') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('broadcast-1');
    expect(localStorage.getItem('grip-active-chat')).toBe('broadcast-1');
    expect(JSON.parse(localStorage.getItem('grip-open-tabs') || '[]')).toEqual(['broadcast-1']);
    // CustomEvent fired
    expect(receivedDetail).toEqual(newStore);
  });

  it('initSessionBridge is idempotent — second call does not re-subscribe', async () => {
    const api = installMockApi({});
    const bridge = await loadBridge();
    await bridge.initSessionBridge();
    await bridge.initSessionBridge();
    expect(api.store).toHaveBeenCalledTimes(1);
    expect(api.onChanged).toHaveBeenCalledTimes(1);
  });
});
