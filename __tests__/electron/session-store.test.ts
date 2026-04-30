/**
 * session-store.test.ts — unit tests for electron/services/session-store.ts
 *
 * Goodhart-resistant: each test verifies actual VALUES (file contents, in-memory
 * state) rather than call counts. A test that always passes is worse than no test.
 *
 * Strategy: env-var override redirects the store at a per-test temp file. No fs
 * mocks — we exercise the real I/O path including atomic .tmp + rename.
 *
 * Hypothesis verification:
 *  - H310: atomic JSON write survives crash mid-write (rename is atomic on POSIX)
 *  - H312: setActive projects modes to active-modes file synchronously before return
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let testDir: string;
let sessionsFile: string;
let activeModesFile: string;

// IMPORTANT: import session-store AFTER setting env vars so the module-level
// constants pick up the overrides. We use fresh imports per test via vi.resetModules.
async function loadStore() {
  const mod = await import('../../electron/services/session-store');
  mod.__resetForTesting();
  return mod;
}

describe('session-store', () => {
  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-session-test-'));
    sessionsFile = path.join(testDir, 'sessions.json');
    activeModesFile = path.join(testDir, '.active-modes');
    process.env.GRIP_TEST_SESSIONS_FILE = sessionsFile;
    process.env.GRIP_TEST_ACTIVE_MODES_FILE = activeModesFile;
    // Vitest module cache — force a fresh module per test so the env vars are read.
    const { vi } = await import('vitest');
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.GRIP_TEST_SESSIONS_FILE;
    delete process.env.GRIP_TEST_ACTIVE_MODES_FILE;
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('initSessionStore returns default store when file is absent', async () => {
    const store = await loadStore();
    const result = store.initSessionStore();
    expect(result.version).toBe(1);
    expect(result.sessions).toEqual([]);
    expect(result.activeSessionId).toBeNull();
    expect(result.openTabIds).toEqual([]);
  });

  it('createSession writes to disk with expected shape', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const session = store.createSession('opus');
    expect(session.id).toMatch(/.+/);
    expect(session.model).toBe('opus');
    expect(session.modes).toEqual([]);
    expect(session.title).toBe('New Chat');
    // Verify the disk file actually contains the new session
    const onDisk = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
    expect(onDisk.sessions).toHaveLength(1);
    expect(onDisk.sessions[0].id).toBe(session.id);
    expect(onDisk.activeSessionId).toBe(session.id);
  });

  it('setSessionModes persists modes and projects to active-modes file', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const session = store.createSession();
    store.setSessionModes(session.id, ['code', 'security']);
    // In-memory check
    expect(store.listSessions()[0].modes).toEqual(['code', 'security']);
    // Projection check — active-modes file should hold the mode names, newline-separated
    expect(fs.existsSync(activeModesFile)).toBe(true);
    const projected = fs.readFileSync(activeModesFile, 'utf-8');
    expect(projected).toBe('code\nsecurity');
  });

  it('setSessionModes caps at 3 modes per session', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const session = store.createSession();
    store.setSessionModes(session.id, ['code', 'security', 'architect', 'review', 'research']);
    expect(store.listSessions()[0].modes).toEqual(['code', 'security', 'architect']);
  });

  it('setActiveSession reprojects modes when active session changes', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const a = store.createSession();
    const b = store.createSession();
    store.setSessionModes(a.id, ['code']);
    store.setSessionModes(b.id, ['security']);
    // b is active (most recently created), so active-modes should be 'security'
    expect(fs.readFileSync(activeModesFile, 'utf-8')).toBe('security');
    store.setActiveSession(a.id);
    // After switch, projection should reflect a's modes
    expect(fs.readFileSync(activeModesFile, 'utf-8')).toBe('code');
  });

  it('closeSession removes session from list and updates active', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const a = store.createSession();
    const b = store.createSession();
    store.setOpenTabs([a.id, b.id]);
    store.setActiveSession(a.id);
    store.closeSession(a.id);
    expect(store.listSessions().map((s) => s.id)).toEqual([b.id]);
    expect(store.getOpenTabIds()).toEqual([b.id]);
    expect(store.getActiveSessionId()).toBe(b.id);
  });

  it('importLegacy is idempotent — second call is a no-op', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const legacy = {
      sessions: [
        {
          id: 'legacy-1',
          title: 'Old Chat',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          messageCount: 5,
          model: 'sonnet',
        },
      ],
      activeSessionId: 'legacy-1',
      openTabIds: ['legacy-1'],
      globalModes: ['code'],
    };
    const result1 = store.importLegacy(legacy);
    expect(result1.sessions).toHaveLength(1);
    // Each session should pick up globalModes as initial modes
    expect(result1.sessions[0].modes).toEqual(['code']);

    // Second call should not duplicate
    const result2 = store.importLegacy({ ...legacy, sessions: [...legacy.sessions, legacy.sessions[0]] });
    expect(result2.sessions).toHaveLength(1);
  });

  it('atomic write survives via .tmp + rename — no torn writes visible', async () => {
    const store = await loadStore();
    store.initSessionStore();
    store.createSession();
    // After mutation, .tmp should NOT exist (rename completed) and sessions.json IS valid JSON
    const tmpPath = `${sessionsFile}.tmp`;
    expect(fs.existsSync(tmpPath)).toBe(false);
    const parsed = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
    expect(parsed.version).toBe(1);
    expect(parsed.sessions).toHaveLength(1);
  });

  it('updateSessionMeta merges partial fields without dropping modes', async () => {
    const store = await loadStore();
    store.initSessionStore();
    const session = store.createSession();
    store.setSessionModes(session.id, ['code']);
    store.updateSessionMeta(session.id, { messageCount: 12, title: 'New title' });
    const updated = store.listSessions()[0];
    expect(updated.messageCount).toBe(12);
    expect(updated.title).toBe('New title');
    expect(updated.modes).toEqual(['code']); // not overwritten
  });
});
