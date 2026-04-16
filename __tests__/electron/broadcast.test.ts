import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Helpers ────────────────────────────────────────────────────────────
type ClosedListener = () => void;

interface MockWindow {
  _closedListeners: ClosedListener[];
  _destroyed: boolean;
  isDestroyed: ReturnType<typeof vi.fn>;
  webContents: { send: ReturnType<typeof vi.fn> };
  once: ReturnType<typeof vi.fn>;
  /** Fire the 'closed' event on this mock window. */
  simulateClose(): void;
  /** Pretend Electron has destroyed this window's webContents. */
  simulateDestroy(): void;
}

function makeMockWindow(): MockWindow {
  const win: MockWindow = {
    _closedListeners: [],
    _destroyed: false,
    isDestroyed: vi.fn(() => win._destroyed),
    webContents: { send: vi.fn() },
    once: vi.fn((event: string, listener: ClosedListener) => {
      if (event === 'closed') win._closedListeners.push(listener);
    }),
    simulateClose() {
      win._destroyed = true;
      win._closedListeners.forEach((fn) => fn());
    },
    simulateDestroy() {
      win._destroyed = true;
    },
  };
  return win;
}

// ── Electron mock ──────────────────────────────────────────────────────
vi.mock('electron', () => ({
  BrowserWindow: class {},
}));

// ── Import SUT after mocks ─────────────────────────────────────────────
import {
  registerWorkspaceWindow,
  deregisterWorkspaceWindow,
  getAllWorkspaceIds,
  getWindowForWorkspace,
  broadcastToAllWorkspaces,
} from '../../electron/core/broadcast';

// ── Reset registry between tests ───────────────────────────────────────
beforeEach(() => {
  // Deregister any workspace registered by previous tests
  for (const id of getAllWorkspaceIds()) {
    deregisterWorkspaceWindow(id);
  }
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────
describe('broadcast — window registry', () => {
  it('registers a window and returns it', () => {
    const win = makeMockWindow();
    registerWorkspaceWindow('ws-1', win as never);

    expect(getWindowForWorkspace('ws-1')).toBe(win);
    expect(getAllWorkspaceIds()).toContain('ws-1');
  });

  it('deregisters a window explicitly', () => {
    const win = makeMockWindow();
    registerWorkspaceWindow('ws-1', win as never);
    deregisterWorkspaceWindow('ws-1');

    expect(getWindowForWorkspace('ws-1')).toBeNull();
    expect(getAllWorkspaceIds()).not.toContain('ws-1');
  });

  it('auto-deregisters when the window fires its closed event', () => {
    const win = makeMockWindow();
    registerWorkspaceWindow('ws-auto', win as never);

    win.simulateClose();

    expect(getWindowForWorkspace('ws-auto')).toBeNull();
    expect(getAllWorkspaceIds()).not.toContain('ws-auto');
  });

  it('returns null for an unknown workspaceId', () => {
    expect(getWindowForWorkspace('does-not-exist')).toBeNull();
  });

  it('returns null for a destroyed window', () => {
    const win = makeMockWindow();
    registerWorkspaceWindow('ws-dead', win as never);
    win.simulateDestroy();

    expect(getWindowForWorkspace('ws-dead')).toBeNull();
  });
});

describe('broadcastToAllWorkspaces', () => {
  it('sends to a single registered window', () => {
    const win = makeMockWindow();
    registerWorkspaceWindow('ws-1', win as never);

    broadcastToAllWorkspaces('test:event', { foo: 'bar' });

    expect(win.webContents.send).toHaveBeenCalledWith('test:event', { foo: 'bar' });
  });

  it('sends to all registered windows', () => {
    const a = makeMockWindow();
    const b = makeMockWindow();
    registerWorkspaceWindow('ws-a', a as never);
    registerWorkspaceWindow('ws-b', b as never);

    broadcastToAllWorkspaces('multi:event', 42);

    expect(a.webContents.send).toHaveBeenCalledWith('multi:event', 42);
    expect(b.webContents.send).toHaveBeenCalledWith('multi:event', 42);
  });

  it('is a no-op when the registry is empty', () => {
    // No windows registered — must not throw
    expect(() => broadcastToAllWorkspaces('empty:event')).not.toThrow();
  });

  /**
   * §14.4 regression anchor — LOAD-BEARING guard:
   *
   * If window A is destroyed (webContents gone), broadcasting must NOT throw
   * and must still deliver the event to window B. Without the isDestroyed()
   * guard in broadcastToAllWorkspaces(), an uncaught exception in the main
   * process silently prevents every subsequent window in the loop from
   * receiving the event.
   */
  it('§14.4 — skips destroyed window and still delivers to live window', () => {
    const dead = makeMockWindow();
    const live = makeMockWindow();
    registerWorkspaceWindow('ws-dead', dead as never);
    registerWorkspaceWindow('ws-live', live as never);

    // Simulate the window being destroyed without firing 'closed'
    // (e.g. the process crashed — registry not yet cleaned up)
    dead.simulateDestroy();

    broadcastToAllWorkspaces('app:update-available', { version: '2.0.0' });

    expect(dead.webContents.send).not.toHaveBeenCalled();
    expect(live.webContents.send).toHaveBeenCalledWith('app:update-available', { version: '2.0.0' });
  });

  it('§14.4 — removes destroyed window from registry during broadcast', () => {
    const dead = makeMockWindow();
    registerWorkspaceWindow('ws-dead', dead as never);
    dead.simulateDestroy();

    broadcastToAllWorkspaces('any:event');

    // Destroyed window should have been evicted from registry
    expect(getAllWorkspaceIds()).not.toContain('ws-dead');
  });

  it('passes undefined payload when called without second argument', () => {
    const win = makeMockWindow();
    registerWorkspaceWindow('ws-1', win as never);

    broadcastToAllWorkspaces('app:update-downloaded');

    expect(win.webContents.send).toHaveBeenCalledWith('app:update-downloaded', undefined);
  });
});
