/**
 * HAPPI/1.1 envelope helper tests.
 *
 * Locks the GUI-side half of the HAPPI envelope contract: the shape GRIP-GUI
 * builds must mirror the canonical Python builder
 * (`skills/donna/_happi_dispatch.py::build_envelope` /
 * `lib/hal/happi/envelope.py`), and the `/api/infer` wire body must be derived
 * FROM the envelope (prompt from `content`, model from `flags.model`).
 *
 * Goodhart-proof: asserts the real field values + the real derivation, not that
 * a function was merely called. Each assertion fails under an obvious mutation
 * (wrong version, prompt smuggled into flags.message, model dropped, etc.).
 */
import { describe, it, expect } from 'vitest';
import {
  HAPPI_VERSION,
  buildHappiEnvelope,
  halInferBodyFromEnvelope,
  type HappiEnvelope,
} from '@/lib/happi-envelope';

describe('HAPPI_VERSION', () => {
  it('is the HAPPI/1.1 contract HAL implements', () => {
    expect(HAPPI_VERSION).toBe('happi/1.1');
  });
});

describe('buildHappiEnvelope — canonical shape', () => {
  it('stamps the version, a default cmd of chat, and empty args', () => {
    const env = buildHappiEnvelope({ content: 'hello' });
    expect(env.v).toBe('happi/1.1');
    expect(env.cmd).toBe('chat');
    expect(env.args).toEqual([]);
  });

  it('carries the user message in content (the canonical primary slot)', () => {
    const env = buildHappiEnvelope({ content: 'What is GRIP?' });
    expect(env.content).toBe('What is GRIP?');
    // NEVER smuggled into flags.message — the #2697 envelope-content contract.
    expect(env.flags).not.toHaveProperty('message');
  });

  it('puts the model in flags (provider-agnostic directive)', () => {
    const env = buildHappiEnvelope({ content: 'hi', flags: { model: 'sonnet' } });
    expect(env.flags.model).toBe('sonnet');
  });

  it('carries the session id in ctx, not in content or flags', () => {
    const env = buildHappiEnvelope({
      content: 'hi',
      ctx: { session_id: 'abc-123' },
    });
    expect(env.ctx).toEqual({ session_id: 'abc-123' });
    expect(env.content).toBe('hi');
  });

  it('omits content, ctx, and auth when not supplied (no empty slots)', () => {
    const env = buildHappiEnvelope({});
    expect(env).not.toHaveProperty('content');
    expect(env).not.toHaveProperty('ctx');
    expect(env).not.toHaveProperty('auth');
  });

  it('omits an empty ctx object', () => {
    const env = buildHappiEnvelope({ content: 'hi', ctx: {} });
    expect(env).not.toHaveProperty('ctx');
  });

  it('folds audit:true into flags.audit', () => {
    const env = buildHappiEnvelope({ content: 'hi', audit: true });
    expect(env.flags.audit).toBe(true);
  });

  it('does not set flags.audit when audit is false', () => {
    const env = buildHappiEnvelope({ content: 'hi', audit: false });
    expect(env.flags).not.toHaveProperty('audit');
  });

  it('carries an auth descriptor when supplied', () => {
    const env = buildHappiEnvelope({
      content: 'hi',
      auth: { scheme: 'apikey', token: 'keychain:grip-gemini' },
    });
    expect(env.auth).toEqual({ scheme: 'apikey', token: 'keychain:grip-gemini' });
  });

  it('generates a stable, prefixed correlation id by default', () => {
    const env = buildHappiEnvelope({ content: 'hi' });
    expect(env.id).toMatch(/^gui-[0-9a-f]{12}$/);
  });

  it('honours an explicit id override (deterministic tests)', () => {
    const env = buildHappiEnvelope({ content: 'hi', id: 'fixed-id' });
    expect(env.id).toBe('fixed-id');
  });

  it('produces unique ids across calls', () => {
    const a = buildHappiEnvelope({ content: 'x' });
    const b = buildHappiEnvelope({ content: 'y' });
    expect(a.id).not.toBe(b.id);
  });

  it('does not mutate the caller-supplied flags object', () => {
    const flags = { model: 'sonnet' };
    buildHappiEnvelope({ content: 'hi', flags, audit: true });
    expect(flags).not.toHaveProperty('audit');
  });
});

describe('halInferBodyFromEnvelope — /api/infer wire-body derivation', () => {
  it('derives prompt from content, model from flags.model, audit from flags.audit', () => {
    const env = buildHappiEnvelope({
      content: 'What is GRIP?',
      flags: { model: 'groq/llama-3.3-70b' },
      audit: true,
    });
    const body = halInferBodyFromEnvelope(env);
    expect(body).toEqual({
      prompt: 'What is GRIP?',
      model: 'groq/llama-3.3-70b',
      audit: true,
    });
  });

  it('matches the exact hal-server contract: prompt + model + audit only', () => {
    // The old, incorrect body used `message`/`session_id`. Guard against drift.
    const body = halInferBodyFromEnvelope(
      buildHappiEnvelope({ content: 'hi', flags: { model: 'sonnet' } }),
    );
    expect(Object.keys(body).sort()).toEqual(['audit', 'model', 'prompt']);
    expect(body).not.toHaveProperty('message');
    expect(body).not.toHaveProperty('session_id');
  });

  it('falls back to empty strings when content/model are absent', () => {
    const env: HappiEnvelope = {
      v: 'happi/1.1',
      id: 'x',
      cmd: 'chat',
      args: [],
      flags: {},
    };
    const body = halInferBodyFromEnvelope(env);
    expect(body.prompt).toBe('');
    expect(body.model).toBe('');
    expect(body.audit).toBe(false);
  });

  it('does not leak the session id from ctx into the wire body', () => {
    const env = buildHappiEnvelope({
      content: 'hi',
      flags: { model: 'sonnet' },
      ctx: { session_id: 'should-not-appear' },
    });
    const body = halInferBodyFromEnvelope(env);
    expect(JSON.stringify(body)).not.toContain('should-not-appear');
  });
});
