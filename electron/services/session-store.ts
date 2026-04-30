/**
 * session-store.ts — main-process source of truth for chat sessions and per-session modes.
 *
 * Persists to ~/.grip/sessions.json (atomic write via rename). All renderers go through
 * IPC handlers in handlers/session-handlers.ts; this module owns the data and is the
 * single writer. The CLI's ~/.claude/.active-modes file is rewritten as a projection
 * of the active session's modes whenever active or modes change.
 *
 * Race resolution: single-threaded JS in main process, last-write-wins. POSIX
 * atomicity via .tmp + rename ensures concurrent reads never see a torn write.
 *
 * Schema version 1. Migration of legacy localStorage data happens at the renderer
 * via session:importLegacy IPC; the store has no SQL or schema-bump machinery.
 *
 * Falsifiable hypotheses:
 *  - H310: JSON-on-disk survives 4-window concurrent mutations under 50ms p99
 *  - H312: setActive projection writes ~/.claude/.active-modes synchronously,
 *          eliminating CLI race window between renderer change and CLI launch
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DATA_DIR } from '../constants';

export interface PersistedSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  model: string;
  sessionId?: string;        // Claude --resume id
  modes: string[];           // per-session mode stack (max 3 by convention)
}

export interface SessionStoreFile {
  version: 1;
  sessions: PersistedSession[];
  activeSessionId: string | null;
  openTabIds: string[];
}

const STORE_VERSION = 1 as const;
// Env-var overrides allow vitest to point the store at a temp dir without
// touching the operator's ~/.grip or ~/.claude. Production: undefined → defaults.
const SESSIONS_FILE = process.env.GRIP_TEST_SESSIONS_FILE
  || path.join(DATA_DIR, 'sessions.json');
const ACTIVE_MODES_FILE = process.env.GRIP_TEST_ACTIVE_MODES_FILE
  || path.join(os.homedir(), '.claude', '.active-modes');
const SESSIONS_DIR = path.dirname(SESSIONS_FILE);
const MAX_CHATS = 50;
const MAX_MODES_PER_SESSION = 3;

let cache: SessionStoreFile | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function defaultStore(): SessionStoreFile {
  return { version: STORE_VERSION, sessions: [], activeSessionId: null, openTabIds: [] };
}

function loadFromDisk(): SessionStoreFile {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) return defaultStore();
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SessionStoreFile>;
    if (parsed.version !== STORE_VERSION) {
      // Future migration hook. For v1 we only have one version, so any mismatch
      // means the file pre-dates this feature — discard and start clean.
      return defaultStore();
    }
    return {
      version: STORE_VERSION,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      activeSessionId: parsed.activeSessionId ?? null,
      openTabIds: Array.isArray(parsed.openTabIds) ? parsed.openTabIds : [],
    };
  } catch {
    return defaultStore();
  }
}

function saveToDisk(): void {
  if (!cache) return;
  ensureDataDir();
  const tmp = `${SESSIONS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tmp, SESSIONS_FILE);
}

function projectActiveModes(): void {
  if (!cache) return;
  const active = cache.sessions.find((s) => s.id === cache!.activeSessionId);
  const modes = active?.modes ?? [];
  try {
    const claudeDir = path.dirname(ACTIVE_MODES_FILE);
    if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(ACTIVE_MODES_FILE, modes.join('\n'), 'utf-8');
  } catch {
    // Projection is best-effort; CLI handles missing file gracefully
  }
}

export function initSessionStore(): SessionStoreFile {
  cache = loadFromDisk();
  return cache;
}

export function getStore(): SessionStoreFile {
  if (!cache) cache = loadFromDisk();
  return cache;
}

export function listSessions(): PersistedSession[] {
  return getStore().sessions;
}

export function getActiveSessionId(): string | null {
  return getStore().activeSessionId;
}

export function getOpenTabIds(): string[] {
  return getStore().openTabIds;
}

export function createSession(model: string = 'sonnet'): PersistedSession {
  const store = getStore();
  const session: PersistedSession = {
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
    model,
    modes: [],
  };
  store.sessions.unshift(session);
  if (store.sessions.length > MAX_CHATS) store.sessions.length = MAX_CHATS;
  store.activeSessionId = session.id;
  saveToDisk();
  projectActiveModes();
  return session;
}

export function setActiveSession(id: string | null): SessionStoreFile {
  const store = getStore();
  store.activeSessionId = id;
  saveToDisk();
  projectActiveModes();
  return store;
}

export function setSessionModes(id: string, modes: string[]): SessionStoreFile {
  const store = getStore();
  const session = store.sessions.find((s) => s.id === id);
  if (session) {
    session.modes = modes.slice(0, MAX_MODES_PER_SESSION);
    session.updatedAt = new Date().toISOString();
    saveToDisk();
    if (id === store.activeSessionId) projectActiveModes();
  }
  return store;
}

export function setOpenTabs(ids: string[]): SessionStoreFile {
  const store = getStore();
  store.openTabIds = ids;
  saveToDisk();
  return store;
}

export function closeSession(id: string): SessionStoreFile {
  const store = getStore();
  store.sessions = store.sessions.filter((s) => s.id !== id);
  store.openTabIds = store.openTabIds.filter((tid) => tid !== id);
  if (store.activeSessionId === id) {
    store.activeSessionId = store.sessions[0]?.id ?? null;
    projectActiveModes();
  }
  saveToDisk();
  return store;
}

export function renameSession(id: string, title: string): SessionStoreFile {
  const store = getStore();
  const session = store.sessions.find((s) => s.id === id);
  if (session) {
    session.title = title.slice(0, 60);
    session.updatedAt = new Date().toISOString();
    saveToDisk();
  }
  return store;
}

export function updateSessionMeta(
  id: string,
  meta: Partial<Pick<PersistedSession, 'messageCount' | 'sessionId' | 'model' | 'title'>>,
): SessionStoreFile {
  const store = getStore();
  const session = store.sessions.find((s) => s.id === id);
  if (session) {
    Object.assign(session, meta);
    session.updatedAt = new Date().toISOString();
    saveToDisk();
  }
  return store;
}

/**
 * One-shot import from renderer's localStorage. Called by the renderer the first
 * time it boots after the IPC store is available. Idempotent: subsequent calls
 * with the same data are no-ops because cache is already populated.
 */
export function importLegacy(payload: {
  sessions: Array<Omit<PersistedSession, 'modes'> & { modes?: string[] }>;
  activeSessionId: string | null;
  openTabIds: string[];
  globalModes: string[];
}): SessionStoreFile {
  const store = getStore();
  if (store.sessions.length > 0) return store; // already imported

  store.sessions = payload.sessions.map((s) => ({
    ...s,
    modes: s.modes ?? [...payload.globalModes].slice(0, MAX_MODES_PER_SESSION),
  }));
  store.activeSessionId = payload.activeSessionId;
  store.openTabIds = payload.openTabIds;
  saveToDisk();
  projectActiveModes();
  return store;
}

/** Test-only reset — used by vitest unit tests, never called in production. */
export function __resetForTesting(): void {
  cache = null;
}
