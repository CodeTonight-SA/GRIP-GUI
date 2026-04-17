// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enqueueRunCommand,
  consumePendingRunCommand,
  resetQueue,
} from '../../src/lib/palette-intent-queue';

beforeEach(() => {
  resetQueue();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('palette-intent-queue', () => {
  it('returns null when no command is queued', () => {
    expect(consumePendingRunCommand()).toBeNull();
  });

  it('returns the last queued command once, then clears', () => {
    enqueueRunCommand('save', '/save');
    const first = consumePendingRunCommand();
    expect(first).not.toBeNull();
    expect(first?.id).toBe('save');
    expect(first?.name).toBe('/save');
    // After consume, queue is empty.
    expect(consumePendingRunCommand()).toBeNull();
  });

  it('only keeps the most recent enqueue (race: two palette clicks in rapid succession)', () => {
    enqueueRunCommand('save', '/save');
    enqueueRunCommand('recall', '/recall');
    const result = consumePendingRunCommand();
    expect(result?.id).toBe('recall');
    expect(result?.name).toBe('/recall');
  });

  it('drops stale intents older than 5 seconds (abandoned navigation)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00Z'));
    enqueueRunCommand('save', '/save');
    // Advance time by 5.5 seconds — intent is now stale.
    vi.setSystemTime(new Date('2026-04-18T00:00:05.500Z'));
    expect(consumePendingRunCommand()).toBeNull();
  });

  it('keeps intents that are within the 5-second window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00Z'));
    enqueueRunCommand('save', '/save');
    vi.setSystemTime(new Date('2026-04-18T00:00:04.900Z'));
    const result = consumePendingRunCommand();
    expect(result?.id).toBe('save');
  });

  it('resetQueue clears without returning the item (test helper only)', () => {
    enqueueRunCommand('save', '/save');
    resetQueue();
    expect(consumePendingRunCommand()).toBeNull();
  });
});
