/**
 * GRIP Session Manager — connects the GUI to the real GRIP backend.
 *
 * Architecture:
 * - In Electron: spawns `claude` CLI via node-pty (full PTY, interactive)
 * - In Browser (dev): connects to localhost API route that spawns `claude -p`
 *
 * The key insight: `claude` CLI IS the GRIP backend. When run from ~/.claude,
 * it loads all GRIP infrastructure (CLAUDE.md, skills, modes, hooks, gates).
 * We don't need a separate backend — we just need to spawn the CLI correctly.
 *
 * For ultra-fast responses without full context reload:
 * - Use `--resume` with session ID to reuse existing context
 * - Use `--output-format stream-json` for structured streaming
 * - Parse stream events to extract text deltas in real-time
 */

export interface GripMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  detectedMode?: string;
  detectedSkills?: string[];
  metrics?: GripMetrics;
  streaming?: boolean;
}

export interface GripMetrics {
  costUsd?: number;
  numTurns?: number;
  totalDurationMs?: number;
  timeToFirstChunkMs?: number;
  sessionId?: string;
  model?: string;
}

export interface StreamEvent {
  type: string;
  message?: {
    content: Array<{ type: string; text?: string }>;
  };
  delta?: {
    type: string;
    text?: string;
  };
  text?: string;
  cost_usd?: number;
  num_turns?: number;
  session_id?: string;
  model?: string;
}

/**
 * Extract text content from a stream-json event.
 * Handles multiple event shapes from Claude CLI output.
 */
export function extractTextFromEvent(event: StreamEvent): string | null {
  // Message with content blocks (assistant turn complete)
  if (event.message?.content) {
    const texts = event.message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '');
    if (texts.length) return texts.join('');
  }
  // Text delta (streaming chunk)
  if (event.delta?.type === 'text_delta' && event.delta.text) {
    return event.delta.text;
  }
  // Plain text event
  if (event.type === 'assistant' && typeof event.text === 'string') {
    return event.text;
  }
  return null;
}

/**
 * Extract metrics from a result event.
 */
export function extractMetrics(event: StreamEvent): GripMetrics | null {
  if (event.type !== 'result') return null;
  return {
    costUsd: event.cost_usd,
    numTurns: event.num_turns,
    sessionId: event.session_id,
    model: event.model,
  };
}

/**
 * Check if running in Electron environment.
 */
export function isElectronEnv(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).electronAPI;
}

/**
 * Send a prompt to GRIP via the API route (browser mode).
 * Returns an async iterator of text chunks for streaming display.
 */
export async function* sendToGrip(
  prompt: string,
  sessionId?: string,
  model: string = 'sonnet',
): AsyncGenerator<{ type: 'text' | 'metrics' | 'error' | 'done'; data: string | GripMetrics }> {
  try {
    const response = await fetch('/api/grip/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId, model }),
    });

    if (!response.ok) {
      yield { type: 'error', data: `GRIP error: ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', data: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event: StreamEvent = JSON.parse(line);
          const text = extractTextFromEvent(event);
          if (text) {
            yield { type: 'text', data: text };
          }
          const metrics = extractMetrics(event);
          if (metrics) {
            yield { type: 'metrics', data: metrics };
          }
        } catch {
          // Non-JSON line — forward as raw text
          if (line.trim()) {
            yield { type: 'text', data: line };
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const event: StreamEvent = JSON.parse(buffer);
        const text = extractTextFromEvent(event);
        if (text) yield { type: 'text', data: text };
      } catch {
        if (buffer.trim()) yield { type: 'text', data: buffer };
      }
    }

    yield { type: 'done', data: '' };
  } catch (err) {
    yield { type: 'error', data: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
