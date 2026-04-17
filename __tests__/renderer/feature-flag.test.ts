// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFeatureEnabled } from '../../src/lib/feature-flag';

// Environment-agnostic localStorage stub, matching the repo convention
// established in ChatStorage.test.tsx / ModeStackChip.test.tsx.
let lsStore: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => lsStore[key] ?? null,
  setItem: (key: string, value: string) => {
    lsStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete lsStore[key];
  },
  clear: () => {
    lsStore = {};
  },
  get length() {
    return Object.keys(lsStore).length;
  },
  key: (i: number) => Object.keys(lsStore)[i] ?? null,
});

beforeEach(() => {
  lsStore = {};
});

describe('isFeatureEnabled', () => {
  it('returns true when the flag key is absent (opt-out contract)', () => {
    expect(isFeatureEnabled('myFlag')).toBe(true);
  });

  it('returns true when the flag value is the string "true"', () => {
    localStorage.setItem('myFlag', 'true');
    expect(isFeatureEnabled('myFlag')).toBe(true);
  });

  it('returns true for any non-"false" string (e.g. "1", "on", "yes")', () => {
    localStorage.setItem('myFlag', '1');
    expect(isFeatureEnabled('myFlag')).toBe(true);
    localStorage.setItem('myFlag', 'on');
    expect(isFeatureEnabled('myFlag')).toBe(true);
    localStorage.setItem('myFlag', 'yes');
    expect(isFeatureEnabled('myFlag')).toBe(true);
  });

  it('returns false ONLY when the flag value is the literal string "false"', () => {
    localStorage.setItem('myFlag', 'false');
    expect(isFeatureEnabled('myFlag')).toBe(false);
  });

  it('is case-sensitive — "False" and "FALSE" do not disable (literal match only)', () => {
    localStorage.setItem('myFlag', 'False');
    expect(isFeatureEnabled('myFlag')).toBe(true);
    localStorage.setItem('myFlag', 'FALSE');
    expect(isFeatureEnabled('myFlag')).toBe(true);
  });

  it('returns true when localStorage.getItem throws (privacy mode / quota)', () => {
    const originalGetItem = localStorage.getItem;
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    expect(isFeatureEnabled('myFlag')).toBe(true);
    vi.mocked(localStorage.getItem).mockRestore?.();
    localStorage.getItem = originalGetItem;
  });

  it('returns true when window is undefined (SSR)', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — deliberately removing window to simulate SSR
    delete globalThis.window;
    expect(isFeatureEnabled('myFlag')).toBe(true);
    globalThis.window = originalWindow;
  });

  it('treats different flag keys independently', () => {
    localStorage.setItem('flagA', 'false');
    localStorage.setItem('flagB', 'true');
    expect(isFeatureEnabled('flagA')).toBe(false);
    expect(isFeatureEnabled('flagB')).toBe(true);
    expect(isFeatureEnabled('flagC')).toBe(true);
  });
});
