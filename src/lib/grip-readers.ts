/**
 * Shared readers for GRIP genome + instance state.
 *
 * Both the /api/grip/health and /api/grip/status routes need the same view of
 * the local GRIP installation's genome and latest instance. Keeping the parse
 * logic here (rather than duplicating it per-route) is a DRY win and — more
 * importantly — guarantees the two routes can never drift onto different,
 * incompatible readings of the same files.
 *
 * The on-disk shapes (verified against a live Gen 111 installation):
 *
 *   cache/genome.json
 *     { generation: number,
 *       genes: { [id]: ... },        // a DICT, not an array — no `.length`
 *       fitness_history: number[],   // current fitness = last element
 *       ... }                        // there is NO top-level `fitness` key
 *
 *   projects/<dir>/grip/index.json
 *     { instances: [ {                // an INDEX (list of records), not one instance
 *         content_hash: string,       // 16-hex; the only stable id (no `sha` field)
 *         serialized_at: string,      // ISO ts — pick the latest by this
 *         message_count: number,
 *         lineage: { generation: number, ... },
 *       }, ... ],
 *       created_at: string,
 *       branches: { ... } }
 *
 * Parsing is split from disk I/O so it can be unit-tested against the exact
 * live shapes without touching the filesystem.
 */

export interface GenomeView {
  generation: number;
  geneCount: number;
  fitness: number;
}

export interface InstanceView {
  sha: string;
  gen: number;
  messages: number;
}

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : null;
}

/**
 * Extract the genome view from a parsed genome.json object.
 *
 * geneCount = Object.keys(genes).length because `genes` is a dict.
 * fitness   = last element of `fitness_history` (there is no top-level
 *             `fitness` key in the live shape — it is always null when present).
 */
export function parseGenome(raw: unknown): GenomeView | null {
  const g = asObject(raw);
  if (!g) return null;

  const generation = typeof g.generation === 'number' ? g.generation : 0;

  const genes = asObject(g.genes);
  const geneCount = genes ? Object.keys(genes).length : 0;

  const history = Array.isArray(g.fitness_history) ? g.fitness_history : [];
  const last = history.length > 0 ? history[history.length - 1] : 0;
  const fitness = typeof last === 'number' ? last : 0;

  return { generation, geneCount, fitness };
}

/**
 * Extract the latest-instance view from a parsed grip/index.json object.
 *
 * index.json is an INDEX whose `instances` is a list of per-instance records.
 * The latest is chosen by `serialized_at` (falling back to `created_at`). The
 * record carries everything the panel needs, so no sibling per-UUID file read
 * is required:
 *   sha      -> content_hash[:8]      (there is no `sha` field)
 *   gen      -> lineage.generation
 *   messages -> message_count
 */
export function parseLatestInstance(raw: unknown): InstanceView | null {
  const index = asObject(raw);
  if (!index) return null;

  const instances = Array.isArray(index.instances) ? index.instances : [];
  if (instances.length === 0) return null;

  const sortKey = (e: unknown): string => {
    const o = asObject(e);
    const ts = o?.serialized_at ?? o?.created_at;
    return typeof ts === 'string' ? ts : '';
  };

  let latest = asObject(instances[0]);
  let latestKey = sortKey(instances[0]);
  for (const entry of instances) {
    const key = sortKey(entry);
    if (key > latestKey) {
      latest = asObject(entry);
      latestKey = key;
    }
  }
  if (!latest) return null;

  const hash = typeof latest.content_hash === 'string' ? latest.content_hash : '';
  const sha = hash.slice(0, 8) || '?';

  const lineage = asObject(latest.lineage);
  const gen = typeof lineage?.generation === 'number' ? lineage.generation : 0;

  const messages = typeof latest.message_count === 'number' ? latest.message_count : 0;

  return { sha, gen, messages };
}
