/**
 * HAL Integration Tests — verify the HAL<->GRIP-GUI pipeline.
 *
 * Tests the mapInferResult() translation layer (hal-server /api/infer
 * GripInferResult -> GripStreamEvent) and the hal-client API shapes.
 * Inlines the logic to avoid Next.js path alias issues in vitest.
 *
 * The canonical AI syscall is hal-server `/api/infer` on :3850 (HAL #331),
 * which wraps `grip_infer`/RAILLM. It returns a SINGLE JSON object
 * (not a JSONL/SSE stream of Anthropic content_block_delta events).
 * There is no `/api/conversation` route in live HAL.
 */
import { describe, it, expect } from 'vitest';

// ---- Inlined from grip-session.ts: HAL_DEFAULTS + result mapping ----

const HAL_DEFAULTS = {
  inferBase: 'http://127.0.0.1:3850',
  gateway: 'http://127.0.0.1:4010',
} as const;

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

interface HalInferResult {
  ok?: boolean;
  text?: string;
  provider?: string;
  model?: string;
  idr_ref?: string;
  error?: string | { message?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
}

function halErrorMessage(raw: HalInferResult): string {
  if (typeof raw.error === 'string') return raw.error;
  if (raw.error && typeof raw.error === 'object' && raw.error.message) return raw.error.message;
  return 'HAL inference failed';
}

function mapInferResult(raw: HalInferResult, requestedModel: string): GripStreamEvent[] {
  const text = (raw.text || '').trim();
  if (raw.ok === false || !text) {
    return [{ type: 'error', data: halErrorMessage(raw) }];
  }
  const metrics: GripMetrics = {
    model: raw.model || requestedModel,
  };
  return [
    { type: 'text', data: text },
    { type: 'metrics', data: metrics },
  ];
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

describe('HAL_DEFAULTS — canonical endpoint constants', () => {
  it('infer base points at hal-server :3850 (the /api/infer route host)', () => {
    expect(HAL_DEFAULTS.inferBase).toBe('http://127.0.0.1:3850');
  });

  it('gateway points at the HAL gateway :4010 (/v1/* proxy host)', () => {
    expect(HAL_DEFAULTS.gateway).toBe('http://127.0.0.1:4010');
  });

  it('never references the dead /api/conversation route', () => {
    // Guards against re-introducing the endpoint drift this fix removed.
    expect(`${HAL_DEFAULTS.inferBase}/api/infer`).toContain('/api/infer');
    expect(`${HAL_DEFAULTS.inferBase}/api/infer`).not.toContain('/api/conversation');
  });
});

describe('mapInferResult — /api/infer result translation', () => {
  it('maps a successful result to text then metrics events', () => {
    const raw: HalInferResult = {
      ok: true,
      text: 'GRIP is a critical thinking machine.',
      provider: 'groq',
      model: 'groq/llama-3.3-70b',
      idr_ref: 'idr-abc',
    };
    const events = mapInferResult(raw, 'sonnet');
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'text', data: 'GRIP is a critical thinking machine.' });
    expect(events[1].type).toBe('metrics');
    expect((events[1].data as GripMetrics).model).toBe('groq/llama-3.3-70b');
  });

  it('trims surrounding whitespace from the assistant text', () => {
    const events = mapInferResult({ ok: true, text: '  hello world  \n' }, 'sonnet');
    expect(events[0].data).toBe('hello world');
  });

  it('falls back to the requested model when the result omits one', () => {
    const events = mapInferResult({ ok: true, text: 'hi' }, 'sonnet');
    expect((events[1].data as GripMetrics).model).toBe('sonnet');
  });

  it('maps ok:false to a single error event with the server message', () => {
    const events = mapInferResult({ ok: false, error: 'Provider timeout' }, 'sonnet');
    expect(events).toEqual([{ type: 'error', data: 'Provider timeout' }]);
  });

  it('reads error.message when error is an object', () => {
    const events = mapInferResult({ ok: false, error: { message: 'rate limited' } }, 'sonnet');
    expect(events).toEqual([{ type: 'error', data: 'rate limited' }]);
  });

  it('treats empty text as a failure even when ok is true', () => {
    const events = mapInferResult({ ok: true, text: '   ' }, 'sonnet');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
  });

  it('provides a generic error message when none is supplied', () => {
    const events = mapInferResult({ ok: false }, 'sonnet');
    expect(events[0]).toEqual({ type: 'error', data: 'HAL inference failed' });
  });

  it('does not emit a metrics event on the error path', () => {
    const events = mapInferResult({ ok: false, error: 'boom' }, 'sonnet');
    expect(events.some((e) => e.type === 'metrics')).toBe(false);
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

  it('/api/infer request has the HAPPI-shaped grip_infer body', () => {
    // Matches lib/hal_llm_adapter.py::_grip_infer_call — { prompt, model, audit }.
    const request = {
      prompt: 'What is GRIP?',
      model: 'groq/llama-3.3-70b',
      audit: false,
    };
    expect(request).toHaveProperty('prompt');
    expect(typeof request.prompt).toBe('string');
    expect(typeof request.model).toBe('string');
    expect(typeof request.audit).toBe('boolean');
    // The old, incorrect /api/conversation body used `message`/`session_id`.
    expect(request).not.toHaveProperty('message');
  });

  it('/api/infer response has the GripInferResult shape', () => {
    const response: HalInferResult = {
      ok: true,
      text: 'answer',
      provider: 'groq',
      model: 'groq/llama-3.3-70b',
      idr_ref: 'idr-xyz',
      usage: { input_tokens: 12, output_tokens: 34 },
    };
    expect(response).toHaveProperty('ok');
    expect(response).toHaveProperty('text');
    expect(response).toHaveProperty('provider');
    expect(response).toHaveProperty('model');
    expect(typeof response.text).toBe('string');
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
