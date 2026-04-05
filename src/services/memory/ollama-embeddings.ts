/**
 * Ollama Local Embeddings
 *
 * Connects to local Ollama instance for semantic embeddings.
 * Zero cost, runs locally, perfect for development.
 *
 * Requires: ollama pull nomic-embed-text
 *
 * Usage:
 *   const embedder = new OllamaEmbeddings();
 *   const vec = await embedder.embed('Your text here');
 */

export interface OllamaEmbeddingsOptions {
  baseUrl?: string; // Default: http://localhost:11434
  model?: string; // Default: nomic-embed-text
  timeout?: number; // Default: 30000ms
}

export interface OllamaEmbedResponse {
  embedding: number[];
}

export class OllamaEmbeddings {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(options?: OllamaEmbeddingsOptions) {
    this.baseUrl = options?.baseUrl ?? 'http://localhost:11434';
    this.model = options?.model ?? 'nomic-embed-text';
    this.timeout = options?.timeout ?? 30000;
  }

  /**
   * Generate embedding for text using local Ollama
   */
  async embed(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaEmbedResponse;
      return data.embedding;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if Ollama is available and model is loaded
   */
  async healthCheck(): Promise<{ available: boolean; model: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });

      if (!response.ok) {
        return {
          available: false,
          model: this.model,
          error: `Ollama not responding: ${response.statusText}`,
        };
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const modelExists =
        data.models?.some(
          (m) => m.name === this.model || m.name.startsWith(`${this.model}:`)
        ) ?? false;

      if (!modelExists) {
        return {
          available: false,
          model: this.model,
          error: `Model '${this.model}' not found. Run: ollama pull ${this.model}`,
        };
      }

      return {
        available: true,
        model: this.model,
      };
    } catch (error) {
      return {
        available: false,
        model: this.model,
        error: `Ollama not available: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get embedding dimension (nomic-embed-text uses 768)
   */
  getDimension(): number {
    return 768; // nomic-embed-text dimension
  }
}
