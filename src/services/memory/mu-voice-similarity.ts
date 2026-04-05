/**
 * μ-Voice Similarity Service
 *
 * Calculates semantic similarity between memories using embeddings.
 * Uses cosine similarity with embedding cache.
 *
 * Threshold: 0.8 = nearly identical semantic meaning
 * Cost: FREE with local Ollama (nomic-embed-text)
 *
 * Usage:
 *   const mu = new MuVoiceSimilarity(); // Uses local Ollama by default
 *   const similarity = await mu.compare(newMemory, existingMemory);
 *   if (similarity > 0.8) { // similar patterns }
 */

import { EmbeddingCache } from './embedding-cache';
import { MistralEmbeddings } from './mistral-embeddings';

export interface SimilarityResult {
  score: number; // 0.0 to 1.0
  isAboveThreshold: boolean; // score >= 0.8
}

export class MuVoiceSimilarity {
  private embeddingCache: EmbeddingCache;
  private embeddingFn: (text: string) => Promise<number[]>;
  private threshold: number = 0.8;

  constructor(options?: {
    embeddingFn?: (text: string) => Promise<number[]>;
    threshold?: number;
    maxCachedEmbeddings?: number;
    useOllama?: boolean; // Default: true
  }) {
    this.embeddingCache = new EmbeddingCache({
      maxEmbeddings: options?.maxCachedEmbeddings ?? 10000,
    });

    // Use Mistral embeddings by default (you have it locally!)
    const mistral = new MistralEmbeddings();
    this.embeddingFn =
      options?.embeddingFn ?? ((text: string) => mistral.embed(text));

    this.threshold = options?.threshold ?? 0.8;
  }

  /**
   * Compare two texts for semantic similarity.
   */
  async compare(textA: string, textB: string): Promise<SimilarityResult> {
    const embeddingA = await this.embeddingCache.getOrFetch(
      textA,
      this.embeddingFn
    );
    const embeddingB = await this.embeddingCache.getOrFetch(
      textB,
      this.embeddingFn
    );

    const score = this.cosineSimilarity(embeddingA, embeddingB);

    return {
      score,
      isAboveThreshold: score >= this.threshold,
    };
  }

  /**
   * Find similar memories from a list.
   * Returns array of indices and scores for memories above threshold.
   */
  async findSimilar(
    query: string,
    memories: string[]
  ): Promise<Array<{ index: number; memory: string; score: number }>> {
    const results: Array<{ index: number; memory: string; score: number }> = [];

    const queryEmbedding = await this.embeddingCache.getOrFetch(
      query,
      this.embeddingFn
    );

    for (let i = 0; i < memories.length; i++) {
      const memoryEmbedding = await this.embeddingCache.getOrFetch(
        memories[i],
        this.embeddingFn
      );

      const score = this.cosineSimilarity(queryEmbedding, memoryEmbedding);

      if (score >= this.threshold) {
        results.push({
          index: i,
          memory: memories[i],
          score,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Batch compare: find similarities between two lists.
   * Returns similarity matrix (sparse — only above threshold).
   */
  async batchCompare(
    listA: string[],
    listB: string[]
  ): Promise<Array<{ a: number; b: number; score: number }>> {
    const results: Array<{ a: number; b: number; score: number }> = [];

    for (let i = 0; i < listA.length; i++) {
      const similar = await this.findSimilar(listA[i], listB);
      for (const match of similar) {
        results.push({
          a: i,
          b: match.index,
          score: match.score,
        });
      }
    }

    return results;
  }

  /**
   * Get cache statistics.
   */
  getCacheStats() {
    return this.embeddingCache.getStats();
  }

  /**
   * Clear cache.
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Cosine similarity between two vectors.
   * Formula: (A · B) / (||A|| × ||B||)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    if (vecA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Default embedding function.
   * In production, this would call OpenAI, Claude, or another embedding service.
   * For testing, this generates a simple hash-based embedding.
   */
  private async defaultEmbedding(text: string): Promise<number[]> {
    // For testing: simple deterministic embedding based on text hash
    // In production, replace with actual embedding API call
    const hash = this.simpleHash(text);

    // Generate a 768-dimensional vector (standard embedding size)
    const vec = new Array(768);
    let seededRandom = hash;

    for (let i = 0; i < 768; i++) {
      // Seeded pseudo-random using the hash
      seededRandom = (seededRandom * 9301 + 49297) % 233280;
      vec[i] = (seededRandom / 233280) * 2 - 1; // Range: -1 to 1
    }

    // Normalize to unit vector
    let magnitude = 0;
    for (let i = 0; i < vec.length; i++) {
      magnitude += vec[i] * vec[i];
    }
    magnitude = Math.sqrt(magnitude);

    for (let i = 0; i < vec.length; i++) {
      vec[i] /= magnitude;
    }

    return vec;
  }

  /**
   * Simple hash function for deterministic embedding seeds.
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
