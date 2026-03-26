import { describe, it, expect } from 'vitest';

/**
 * Regression test for: "s.toUpperCase is not a function"
 *
 * Root cause: insights.jsonl `source` field can be non-string
 * (number, null, undefined, object). The Insights page called
 * .toUpperCase() on raw values without String() coercion.
 *
 * Fix: all .toUpperCase() calls go through String() or toStr() helper.
 */

// Replicate the toStr helper from insights/page.tsx
const toStr = (v: unknown): string => (typeof v === 'string' ? v : String(v || 'unknown'));

describe('Insights toUpperCase safety', () => {
  it('handles string source normally', () => {
    expect(toStr('evo').toUpperCase()).toBe('EVO');
  });

  it('handles null source', () => {
    expect(toStr(null).toUpperCase()).toBe('UNKNOWN');
  });

  it('handles undefined source', () => {
    expect(toStr(undefined).toUpperCase()).toBe('UNKNOWN');
  });

  it('handles numeric source', () => {
    expect(toStr(42).toUpperCase()).toBe('42');
  });

  it('handles empty string source without throwing', () => {
    // Empty string is still a string — toStr returns it as-is
    expect(() => toStr('').toUpperCase()).not.toThrow();
  });

  it('handles boolean source', () => {
    expect(toStr(true).toUpperCase()).toBe('TRUE');
  });

  it('handles object source', () => {
    const result = toStr({ foo: 'bar' });
    expect(typeof result).toBe('string');
    expect(() => result.toUpperCase()).not.toThrow();
  });

  it('produces unique filter chips from mixed source types', () => {
    const insights = [
      { source: 'evo' },
      { source: null },
      { source: undefined },
      { source: 42 },
      { source: 'skill' },
      { source: '' },
    ];
    const sources = ['all', ...new Set(insights.map(i => toStr(i.source)))];
    // Should not throw
    sources.forEach(s => {
      expect(() => String(s).toUpperCase()).not.toThrow();
    });
    // Should contain expected values
    expect(sources).toContain('all');
    expect(sources).toContain('evo');
    expect(sources).toContain('skill');
    expect(sources).toContain('unknown');
  });
});
