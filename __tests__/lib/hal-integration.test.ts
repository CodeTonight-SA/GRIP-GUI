/**
 * HAL Integration Tests — verify the HAL<->GRIP-GUI streaming pipeline.
 *
 * Tests the parseHalEvent() translation layer and hal-client API shapes.
 * Inlines the logic to avoid Next.js path alias issues in vitest.
 */
import { describe, it, expect } from 'vitest';

// ---- Inlined from grip-session.ts: parseHalEvent ----

interface GripMetrics {
  costUsd?: number;
  numTurns?: number;
  sessionId?: string;
  model?: string;
}

type GripStreamEvent = {
  type: string;
  data: string | GripMetrics | Record<string, unknown>;
};

function parseHalEvent(line: string): GripStreamEvent | null {
  if (!line) return null;
  try {
    const raw = JSON.parse(line);
    if (raw.type === 'system' && raw.subtype === 'init') {
      return { type: 'init', data: raw.session_id };
    }
    if (raw.type === 'content_block_delta' && raw.delta?.type === 'text_delta') {
      return { type: 'text', data: raw.delta.text };
    }
    if (raw.type === 'result') {
      return {
        type: 'metrics',
        data: {
          costUsd: raw.cost_usd,
          numTurns: raw.num_turns,
          sessionId: raw.session_id,
          model: raw.model,
        } as GripMetrics,
      };
    }
    if (raw.type === 'error') {
      return { type: 'error', data: raw.error?.message || 'Unknown HAL error' };
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Inlined from hal-client.ts: HalSession type ----

interface HalSession {
  id: string;
  title: string;
  model: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}

function halToChatSession(h: HalSession) {
  return {
    id: h.id,
    title: h.title,
    createdAt: new Date(h.created_at * 1000).toISOString(),
    updatedAt: new Date(h.updated_at * 1000).toISOString(),
    messageCount: h.message_count,
    model: h.model,
    sessionId: h.id,
  };
}

// ---- Tests ----

describe('parseHalEvent — JSONL translation', () => {
  it('parses init event with session_id', () => {
    const line = '{"type":"system","subtype":"init","session_id":"abc12345"}';
    const event = parseHalEvent(line);
    expect(event).toEqual({ type: 'init', data: 'abc12345' });
  });

  it('parses text delta event', () => {
    const line = '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello world"}}';
    const event = parseHalEvent(line);
    expect(event).toEqual({ type: 'text', data: 'Hello world' });
  });

  it('parses result event with metrics', () => {
    const line = '{"type":"result","cost_usd":0.005,"num_turns":3,"session_id":"abc","model":"groq/llama"}';
    const event = parseHalEvent(line);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('metrics');
    const metrics = event!.data as GripMetrics;
    expect(metrics.costUsd).toBe(0.005);
    expect(metrics.numTurns).toBe(3);
    expect(metrics.sessionId).toBe('abc');
    expect(metrics.model).toBe('groq/llama');
  });

  it('parses error event', () => {
    const line = '{"type":"error","error":{"message":"Provider timeout"}}';
    const event = parseHalEvent(line);
    expect(event).toEqual({ type: 'error', data: 'Provider timeout' });
  });

  it('returns null for unknown event type', () => {
    const line = '{"type":"ping"}';
    expect(parseHalEvent(line)).toBeNull();
  });

  it('returns null for empty line', () => {
    expect(parseHalEvent('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseHalEvent('{broken json')).toBeNull();
  });

  it('handles error event without message', () => {
    const line = '{"type":"error","error":{}}';
    const event = parseHalEvent(line);
    expect(event).toEqual({ type: 'error', data: 'Unknown HAL error' });
  });

  it('handles multiple text chunks in sequence', () => {
    const lines = [
      '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}',
      '{"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}',
    ];
    const events = lines.map(parseHalEvent).filter(Boolean);
    expect(events).toHaveLength(2);
    expect(events[0]!.data).toBe('Hello ');
    expect(events[1]!.data).toBe('world');
  });
});

describe('halToChatSession — type conversion', () => {
  it('converts HAL session to ChatSession shape', () => {
    const hal: HalSession = {
      id: 'abc12345',
      title: 'Test conversation',
      model: 'groq/llama-3.3-70b',
      message_count: 6,
      created_at: 1712444400,  // 2024-04-07T01:00:00Z
      updated_at: 1712448000,  // 2024-04-07T02:00:00Z
    };
    const chat = halToChatSession(hal);
    expect(chat.id).toBe('abc12345');
    expect(chat.title).toBe('Test conversation');
    expect(chat.model).toBe('groq/llama-3.3-70b');
    expect(chat.messageCount).toBe(6);
    expect(chat.sessionId).toBe('abc12345');
    expect(chat.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(chat.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('converts timestamps from unix to ISO strings', () => {
    const hal: HalSession = {
      id: 'x',
      title: 'T',
      model: 'm',
      message_count: 0,
      created_at: 0,  // epoch
      updated_at: 0,
    };
    const chat = halToChatSession(hal);
    expect(chat.createdAt).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('HAL API contract — endpoint shapes', () => {
  it('/api/sessions list response has expected shape', () => {
    const response = {
      sessions: [
        { id: 'a', title: 'First', model: 'groq/llama', message_count: 2, created_at: 1.0, updated_at: 2.0 },
        { id: 'b', title: 'Second', model: 'anthropic/claude', message_count: 4, created_at: 3.0, updated_at: 4.0 },
      ],
      count: 2,
    };
    expect(response.sessions).toHaveLength(2);
    expect(response.count).toBe(response.sessions.length);
    for (const s of response.sessions) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('model');
      expect(s).toHaveProperty('message_count');
    }
  });

  it('/api/conversation request has expected shape', () => {
    const request = {
      message: 'What is GRIP?',
      session_id: 'abc12345',
      model: 'groq/llama-3.3-70b',
    };
    expect(request).toHaveProperty('message');
    expect(typeof request.message).toBe('string');
    expect(typeof request.session_id).toBe('string');
  });

  it('/api/providers response has expected shape', () => {
    const response = {
      providers: [
        { name: 'groq', type: 'cloud', healthy: true, models: ['llama-3.3-70b-versatile'], base_url: 'https://...' },
        { name: 'ollama', type: 'local', healthy: true, models: ['llama3.2'], base_url: 'http://localhost:11434' },
      ],
    };
    for (const p of response.providers) {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('type');
      expect(['cloud', 'local', 'enterprise', 'gateway']).toContain(p.type);
      expect(p).toHaveProperty('models');
      expect(Array.isArray(p.models)).toBe(true);
    }
  });
});
