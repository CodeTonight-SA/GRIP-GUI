/**
 * grip-readers.test.ts — verifies the shared genome/instance parsers extract
 * the correct values from the REAL on-disk shapes of a live GRIP install.
 *
 * Goodhart-resistant: each fixture is the actual live shape (genes-as-dict,
 * no top-level `fitness`, index-with-instances-list, no `sha` field). The
 * assertions fail under the previous buggy logic that did `genes.length`,
 * `genome.fitness`, `inst.sha`, `inst.generation`, `inst.messages` — so a
 * regression to that logic turns these tests red.
 */

import { describe, it, expect } from 'vitest';
import { parseGenome, parseLatestInstance } from '@/lib/grip-readers';

describe('parseGenome', () => {
  // Live shape: genes is a DICT, fitness lives in fitness_history (last), and
  // there is NO top-level `fitness` key.
  const liveGenome = {
    generation: 111,
    genes: { a: {}, b: {}, c: {} },
    fitness: null,
    fitness_history: [0.4, 0.6, 0.8],
  };

  it('counts genes from the dict (not .length)', () => {
    expect(parseGenome(liveGenome)?.geneCount).toBe(3);
    // The old buggy `genes.length` would be undefined -> 0 here.
    expect((liveGenome.genes as { length?: number }).length).toBeUndefined();
  });

  it('reads fitness from the last fitness_history entry, not top-level fitness', () => {
    expect(parseGenome(liveGenome)?.fitness).toBe(0.8);
    // The old buggy `genome.fitness` is null -> 0.
    expect(liveGenome.fitness).toBeNull();
  });

  it('reads generation', () => {
    expect(parseGenome(liveGenome)?.generation).toBe(111);
  });

  it('returns zeros for an empty genome and null for non-objects', () => {
    expect(parseGenome({})).toEqual({ generation: 0, geneCount: 0, fitness: 0 });
    expect(parseGenome(null)).toBeNull();
    expect(parseGenome([])).toBeNull();
  });
});

describe('parseLatestInstance', () => {
  // Live shape: index.json is an INDEX. `instances` is a LIST of records, each
  // with content_hash (no `sha`), message_count, and a nested lineage.generation.
  const liveIndex = {
    instances: [
      {
        content_hash: '11111111aaaaaaaa',
        serialized_at: '2026-02-17T12:36:06Z',
        message_count: 213,
        lineage: { generation: 1, branch: 'main' },
      },
      {
        content_hash: 'e3b666bb4a629ce0',
        serialized_at: '2026-06-23T03:54:52Z',
        message_count: 129,
        lineage: { generation: 110, branch: 'main' },
      },
    ],
    created_at: '2026-02-17T12:36:07Z',
    branches: { main: {} },
  };

  it('picks the latest instance by serialized_at and reads its fields', () => {
    const v = parseLatestInstance(liveIndex);
    // sha = content_hash[:8] of the LATEST record (no `sha` field exists).
    expect(v?.sha).toBe('e3b666bb');
    // gen = lineage.generation (not a top-level `generation`).
    expect(v?.gen).toBe(110);
    // messages = message_count (not a top-level `messages`).
    expect(v?.messages).toBe(129);
  });

  it('does not treat the index itself as an instance (the original bug)', () => {
    // The old code did `inst.sha` / `inst.generation` / `inst.messages` on the
    // index object — all absent, yielding '?'/0/0. Prove they are absent so a
    // regression to that path cannot quietly pass.
    const idx = liveIndex as Record<string, unknown>;
    expect(idx.sha).toBeUndefined();
    expect(idx.generation).toBeUndefined();
    expect(idx.messages).toBeUndefined();
  });

  it('falls back to created_at when serialized_at is missing', () => {
    const v = parseLatestInstance({
      instances: [
        { content_hash: 'deadbeefdeadbeef', created_at: '2026-01-01T00:00:00Z', message_count: 5, lineage: { generation: 7 } },
        { content_hash: 'cafebabecafebabe', created_at: '2026-09-09T00:00:00Z', message_count: 9, lineage: { generation: 9 } },
      ],
    });
    expect(v?.sha).toBe('cafebabe');
    expect(v?.gen).toBe(9);
    expect(v?.messages).toBe(9);
  });

  it('handles a missing content_hash with the ? sentinel', () => {
    const v = parseLatestInstance({
      instances: [{ serialized_at: '2026-06-23T00:00:00Z', message_count: 1, lineage: { generation: 2 } }],
    });
    expect(v?.sha).toBe('?');
    expect(v?.gen).toBe(2);
    expect(v?.messages).toBe(1);
  });

  it('returns null for an empty index and non-objects', () => {
    expect(parseLatestInstance({ instances: [] })).toBeNull();
    expect(parseLatestInstance({})).toBeNull();
    expect(parseLatestInstance(null)).toBeNull();
    expect(parseLatestInstance([])).toBeNull();
  });
});
