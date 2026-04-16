// @vitest-environment jsdom
/**
 * Tests for chat-storage helpers including the new tab persistence functions.
 * Uses a vi.stubGlobal localStorage mock so the tests are environment-agnostic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateTitle,
  getChatSessions,
  createChatSession,
  deleteChatSession,
  getOpenTabIds,
  setOpenTabIds,
  updateChatTitle,
  getActiveChatId,
} from '../../src/lib/chat-storage';

// Provide a fully-functional localStorage stub that works in any Vitest environment.
let store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { store = {}; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
});

beforeEach(() => {
  store = {}; // Reset between tests
});

describe('generateTitle', () => {
  it('returns the full message when shorter than 50 chars', () => {
    expect(generateTitle('Fix the login bug')).toBe('Fix the login bug');
  });

  it('truncates long messages with ellipsis', () => {
    const long = 'A'.repeat(60);
    const result = generateTitle(long);
    expect(result).toHaveLength(50);
    expect(result.endsWith('...')).toBe(true);
  });

  it('collapses whitespace', () => {
    expect(generateTitle('hello   world\nfoo')).toBe('hello world foo');
  });
});

describe('getOpenTabIds / setOpenTabIds', () => {
  it('returns empty array when nothing stored', () => {
    expect(getOpenTabIds()).toEqual([]);
  });

  it('round-trips an array of IDs', () => {
    setOpenTabIds(['a', 'b', 'c']);
    expect(getOpenTabIds()).toEqual(['a', 'b', 'c']);
  });

  it('overwrites previous value on successive calls', () => {
    setOpenTabIds(['x']);
    setOpenTabIds(['y', 'z']);
    expect(getOpenTabIds()).toEqual(['y', 'z']);
  });
});

describe('createChatSession', () => {
  it('stores a new session and returns it', () => {
    const session = createChatSession('haiku');
    expect(session.model).toBe('haiku');
    expect(getChatSessions()).toHaveLength(1);
  });

  it('sets the new session as the active chat', () => {
    const session = createChatSession('sonnet');
    expect(getActiveChatId()).toBe(session.id);
  });

  it('prepends new sessions (most recent first)', () => {
    const first = createChatSession('sonnet');
    const second = createChatSession('opus');
    expect(getChatSessions()[0].id).toBe(second.id);
    expect(getChatSessions()[1].id).toBe(first.id);
  });
});

describe('deleteChatSession', () => {
  it('removes the session from the list', () => {
    const s = createChatSession('sonnet');
    deleteChatSession(s.id);
    expect(getChatSessions().find(x => x.id === s.id)).toBeUndefined();
  });

  it('updates the active ID to the next session after deletion', () => {
    const s1 = createChatSession('sonnet');
    const s2 = createChatSession('opus');
    deleteChatSession(s2.id); // s2 was active; s1 becomes active
    expect(getActiveChatId()).toBe(s1.id);
  });
});

describe('updateChatTitle', () => {
  it('updates the title of an existing session', () => {
    const s = createChatSession('sonnet');
    updateChatTitle(s.id, 'New Title Here');
    expect(getChatSessions().find(x => x.id === s.id)?.title).toBe('New Title Here');
  });

  it('truncates titles longer than 60 chars', () => {
    const s = createChatSession('sonnet');
    updateChatTitle(s.id, 'X'.repeat(70));
    expect(getChatSessions().find(x => x.id === s.id)?.title).toHaveLength(60);
  });
});
