/**
 * Embedding Cache Service
 *
 * LRU cache for embedding vectors with cost tracking.
 * Each embedding costs ~$0.0001, so we limit cache size to ~$1 max.
 *
 * Usage:
 *   const cache = new EmbeddingCache({ maxEmbeddings: 10000 });
 *   const embedding = await cache.getOrFetch(text, fetchFn);
 */

export interface EmbeddingCacheStats {
  hits: number;
  misses: number;
  fetchCount: number;
  estimatedCost: number; // in dollars
  cacheSize: number;
}

export class EmbeddingCache {
  private cache: Map<string, number[]> = new Map();
  private accessOrder: string[] = [];
  private maxEmbeddings: number;
  private stats: EmbeddingCacheStats = {
    hits: 0,
    misses: 0,
    fetchCount: 0,
    estimatedCost: 0,
    cacheSize: 0,
  };

  constructor(options?: { maxEmbeddings?: number }) {
    this.maxEmbeddings = options?.maxEmbeddings ?? 10000;
  }

  /**
   * Get embedding from cache or fetch if missing.
   * Automatically manages LRU eviction.
   */
  async getOrFetch(
    text: string,
    fetchFn: (text: string) => Promise<number[]>
  ): Promise<number[]> {
    const cacheKey = this.hash(text);

    // Check cache
    if (this.cache.has(cacheKey)) {
      this.stats.hits++;
      // Move to end (most recently used)
      const idx = this.accessOrder.indexOf(cacheKey);
      if (idx > -1) {
        this.accessOrder.splice(idx, 1);
      }
      this.accessOrder.push(cacheKey);
      return this.cache.get(cacheKey)!;
    }

    // Cache miss - fetch
    this.stats.misses++;
    const embedding = await fetchFn(text);

    // Store in cache
    this.cache.set(cacheKey, embedding);
    this.accessOrder.push(cacheKey);
    this.stats.fetchCount++;
    this.stats.estimatedCost += 0.0001; // Each embedding costs ~$0.0001
    this.stats.cacheSize = this.cache.size;

    // Evict oldest if over limit
    if (this.cache.size > this.maxEmbeddings) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.cacheSize = this.cache.size;
      }
    }

    return embedding;
  }

  /**
   * Get from cache only (no fetch).
   */
  get(text: string): number[] | undefined {
    const cacheKey = this.hash(text);
    if (this.cache.has(cacheKey)) {
      this.stats.hits++;
      // Move to end
      const idx = this.accessOrder.indexOf(cacheKey);
      if (idx > -1) {
        this.accessOrder.splice(idx, 1);
      }
      this.accessOrder.push(cacheKey);
      return this.cache.get(cacheKey);
    }
    return undefined;
  }

  /**
   * Pre-populate cache with known embeddings.
   */
  set(text: string, embedding: number[]): void {
    const cacheKey = this.hash(text);
    if (!this.cache.has(cacheKey)) {
      this.accessOrder.push(cacheKey);
      this.stats.estimatedCost += 0.0001;
    }
    this.cache.set(cacheKey, embedding);
    this.stats.cacheSize = this.cache.size;

    // Evict oldest if over limit
    if (this.cache.size > this.maxEmbeddings) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.cacheSize = this.cache.size;
      }
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): EmbeddingCacheStats {
    return { ...this.stats };
  }

  /**
   * Clear cache.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      fetchCount: 0,
      estimatedCost: 0,
      cacheSize: 0,
    };
  }

  /**
   * Deterministic hash of text for caching.
   * Uses simple string hash, not cryptographic.
   */
  private hash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `h${Math.abs(hash)}`;
  }
}
