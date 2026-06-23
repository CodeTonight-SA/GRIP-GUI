/**
 * Server-side HAL routing tests for the GRIP chat API route.
 *
 * Locks the behaviour that closes "chat path bypasses HAL multi-provider
 * substrate" (currency-13): the `/api/grip/chat` route must route through HAL's
 * `/api/infer` cascade WHEN reachable, while keeping the `claude` CLI spawn as
 * the byte-identical default until an operator opts in.
 *
 * Goodhart-proof: asserts the real resolution decisions and the exact URL/flag
 * boundaries, not that a function was merely called. Each assertion fails under
 * an obvious mutation (default-on instead of fail-closed, flag inverted,
 * override ignored, model literal changed).
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MODEL,
  HAL_DEFAULTS,
  isFlagEnabled,
  resolveServerHalUrl,
} from '@/app/api/grip/chat/hal';
import { DEFAULT_MODEL as ENVELOPE_DEFAULT_MODEL } from '@/lib/happi-envelope';

describe('DEFAULT_MODEL — single source of truth', () => {
  it('is the historical sonnet alias (behaviour byte-identical for callers)', () => {
    expect(DEFAULT_MODEL).toBe('sonnet');
  });

  it('matches the envelope-side default so both chat paths agree', () => {
    // If these ever diverge, the browser path and the server route would
    // default to different models — the bug this constant exists to prevent.
    expect(DEFAULT_MODEL).toBe(ENVELOPE_DEFAULT_MODEL);
  });
});

describe('HAL_DEFAULTS — canonical infer endpoint', () => {
  it('infer base points at hal-server :3850 (the /api/infer host)', () => {
    expect(HAL_DEFAULTS.inferBase).toBe('http://127.0.0.1:3850');
  });
});

describe('isFlagEnabled — opt-in flag boundary', () => {
  it('treats unset / empty / "0" / "false" as OFF (fail-closed)', () => {
    expect(isFlagEnabled(undefined)).toBe(false);
    expect(isFlagEnabled('')).toBe(false);
    expect(isFlagEnabled('0')).toBe(false);
    expect(isFlagEnabled('false')).toBe(false);
  });

  it('treats "1" / "true" / any other non-empty value as ON', () => {
    expect(isFlagEnabled('1')).toBe(true);
    expect(isFlagEnabled('true')).toBe(true);
    expect(isFlagEnabled('yes')).toBe(true);
  });
});

describe('resolveServerHalUrl — env-only HAL resolution', () => {
  it('returns null with no env (default-CLI behaviour preserved)', () => {
    // The load-bearing fail-closed case: absent any flag, the route must NOT
    // silently route to HAL — it falls through to the claude CLI spawn.
    expect(resolveServerHalUrl({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('returns null when the opt-in flag is explicitly off', () => {
    expect(
      resolveServerHalUrl({ NEXT_PUBLIC_HAL_DEFAULT: '0' } as NodeJS.ProcessEnv),
    ).toBeNull();
  });

  it('returns the canonical infer base when the opt-in flag is on', () => {
    expect(
      resolveServerHalUrl({ NEXT_PUBLIC_HAL_DEFAULT: '1' } as NodeJS.ProcessEnv),
    ).toBe(HAL_DEFAULTS.inferBase);
  });

  it('prefers an explicit NEXT_PUBLIC_HAL_URL over the default', () => {
    const env = {
      NEXT_PUBLIC_HAL_URL: 'http://hal.internal:9999',
      NEXT_PUBLIC_HAL_DEFAULT: '1',
    } as NodeJS.ProcessEnv;
    expect(resolveServerHalUrl(env)).toBe('http://hal.internal:9999');
  });

  it('trims a trailing slash so callers can append /api/infer', () => {
    const env = {
      NEXT_PUBLIC_HAL_URL: 'http://hal.internal:9999/',
    } as NodeJS.ProcessEnv;
    expect(resolveServerHalUrl(env)).toBe('http://hal.internal:9999');
  });
});
