/**
 * Chat Storage — persist chat history across page reloads.
 *
 * Uses localStorage for browser, could be extended to
 * SQLite (via Electron IPC) for desktop app.
 *
 * Structure:
 * - grip-chats: Array of ChatSession metadata
 * - grip-chat-{id}: Individual chat message history
 * - grip-active-chat: Currently active chat ID
 */

import type { GripMessage, GripMetrics } from './grip-session';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  model: string;
  sessionId?: string;  // Claude session ID for --resume
}

const CHATS_KEY = 'grip-chats';
const ACTIVE_KEY = 'grip-active-chat';
const CHAT_PREFIX = 'grip-chat-';
const VERSION_KEY = 'grip-storage-version';
const CURRENT_STORAGE_VERSION = 4;
const MAX_CHATS = 50;

/**
 * Detect and replace raw JSON content in stored messages.
 * Old sessions may have raw stream-json objects saved as message content.
 */
function sanitiseMessageContent(content: string): string {
  if (!content) return content;
  const trimmed = content.trim();
  // Detect raw JSON objects or arrays (stream-json artefacts)
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      // If it parses as a stream event (has 'type' field), it's an artefact
      if (parsed && typeof parsed === 'object' && ('type' in parsed || Array.isArray(parsed))) {
        return '[Message from previous session format — no longer available]';
      }
    } catch {
      // Not valid JSON — leave as-is
    }
  }
  return content;
}

/**
 * Run storage migration when version changes.
 * Clears corrupted message bodies from old format sessions.
 */
export function migrateStorageIfNeeded(): void {
  try {
    const stored = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
    if (stored >= CURRENT_STORAGE_VERSION) return;

    // Migration v3: nuke all localStorage data (full reset)
    if (stored < 4) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('grip-')) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
      localStorage.setItem(VERSION_KEY, String(CURRENT_STORAGE_VERSION));
      return;
    }

    // Migration v2: sanitise existing chat messages
    const sessions = getChatSessions();
    for (const session of sessions) {
      const key = CHAT_PREFIX + session.id;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const messages = JSON.parse(raw);
        let changed = false;
        for (const msg of messages) {
          const cleaned = sanitiseMessageContent(msg.content);
          if (cleaned !== msg.content) {
            msg.content = cleaned;
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(key, JSON.stringify(messages));
        }
      } catch {
        // Corrupted chat data — remove it
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(VERSION_KEY, String(CURRENT_STORAGE_VERSION));
  } catch {
    // Storage unavailable — skip migration
  }
}

/**
 * Get all chat sessions (metadata only).
 */
export function getChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get the active chat ID.
 */
export function getActiveChatId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

/**
 * Set the active chat ID.
 */
export function setActiveChatId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

/**
 * Get messages for a specific chat.
 */
export function getChatMessages(chatId: string): GripMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_PREFIX + chatId);
    if (!raw) return [];
    const messages = JSON.parse(raw);
    // Restore Date objects and sanitise any raw JSON from old sessions
    return messages.map((m: GripMessage) => ({
      ...m,
      content: sanitiseMessageContent(m.content),
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

/**
 * Save messages for a specific chat.
 */
export function saveChatMessages(chatId: string, messages: GripMessage[]): void {
  localStorage.setItem(CHAT_PREFIX + chatId, JSON.stringify(messages));

  // Update session metadata
  const sessions = getChatSessions();
  const idx = sessions.findIndex(s => s.id === chatId);
  if (idx >= 0) {
    sessions[idx].updatedAt = new Date().toISOString();
    sessions[idx].messageCount = messages.length;
    localStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  }
}

/**
 * Create a new chat session.
 */
export function createChatSession(model: string = 'sonnet'): ChatSession {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
    model,
  };

  const sessions = getChatSessions();
  sessions.unshift(session);

  // Prune old chats beyond limit
  if (sessions.length > MAX_CHATS) {
    const removed = sessions.splice(MAX_CHATS);
    for (const s of removed) {
      localStorage.removeItem(CHAT_PREFIX + s.id);
    }
  }

  localStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  setActiveChatId(session.id);

  return session;
}

/**
 * Update chat session title (auto-generated from first message).
 */
export function updateChatTitle(chatId: string, title: string): void {
  const sessions = getChatSessions();
  const idx = sessions.findIndex(s => s.id === chatId);
  if (idx >= 0) {
    sessions[idx].title = title.slice(0, 60);
    localStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  }
}

/**
 * Update session ID for resumption.
 */
export function updateSessionId(chatId: string, sessionId: string): void {
  const sessions = getChatSessions();
  const idx = sessions.findIndex(s => s.id === chatId);
  if (idx >= 0) {
    sessions[idx].sessionId = sessionId;
    localStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  }
}

/**
 * Delete a chat session.
 */
export function deleteChatSession(chatId: string): void {
  const sessions = getChatSessions().filter(s => s.id !== chatId);
  localStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  localStorage.removeItem(CHAT_PREFIX + chatId);

  if (getActiveChatId() === chatId) {
    setActiveChatId(sessions[0]?.id || null);
  }
}

/**
 * Auto-generate a title from the first user message.
 */
export function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + '...';
}
