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
 * Send a prompt to GRIP.
 * In Electron: uses IPC to grip-engine-handlers (PTY-based, ultra-fast).
 * In Browser: uses /api/grip/chat API route (spawns claude -p).
 * Returns an async iterator of text chunks for streaming display.
 */
export async function* sendToGrip(
  prompt: string,
  sessionId?: string,
  model: string = 'sonnet',
): AsyncGenerator<{ type: 'text' | 'metrics' | 'error' | 'done'; data: string | GripMetrics }> {
  // Electron path: use IPC for real PTY streaming
  if (isElectronEnv()) {
    yield* sendToGripElectron(prompt, sessionId, model);
    return;
  }

  // Browser path: use API route
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

/**
 * Electron IPC path — uses grip: handlers for PTY-based streaming.
 * Collects output via event listeners, yields as text chunks.
 */
async function* sendToGripElectron(
  prompt: string,
  sessionId?: string,
  model: string = 'sonnet',
): AsyncGenerator<{ type: 'text' | 'metrics' | 'error' | 'done'; data: string | GripMetrics }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI?.grip;
  if (!api) {
    yield { type: 'error', data: 'Electron GRIP API not available' };
    return;
  }

  try {
    // Use one-shot prompt mode (spawns claude -p with stream-json)
    const result = await api.prompt({ prompt, model, sessionId });
    if (!result.success) {
      yield { type: 'error', data: result.error || 'Failed to start prompt' };
      return;
    }

    const promptSessionId = result.sessionId;

    // Collect output via events using a promise-based queue
    const chunks: Array<{ type: 'text' | 'done'; data: string }> = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const unsubOutput = api.onPromptOutput((event: { sessionId: string; data: string }) => {
      if (event.sessionId !== promptSessionId) return;

      // Parse stream-json lines
      const lines = event.data.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed: StreamEvent = JSON.parse(line);
          const text = extractTextFromEvent(parsed);
          if (text) {
            chunks.push({ type: 'text', data: text });
            if (resolve) { resolve(); resolve = null; }
          }
        } catch {
          // Raw text output
          if (line.trim()) {
            chunks.push({ type: 'text', data: line });
            if (resolve) { resolve(); resolve = null; }
          }
        }
      }
    });

    const unsubDone = api.onPromptDone((event: { sessionId: string; exitCode: number }) => {
      if (event.sessionId !== promptSessionId) return;
      done = true;
      chunks.push({ type: 'done', data: '' });
      if (resolve) { resolve(); resolve = null; }
    });

    // Yield chunks as they arrive
    try {
      while (!done || chunks.length > 0) {
        if (chunks.length > 0) {
          const chunk = chunks.shift()!;
          if (chunk.type === 'done') break;
          yield { type: 'text', data: chunk.data };
        } else {
          // Wait for next chunk
          await new Promise<void>(r => { resolve = r; });
        }
      }
    } finally {
      unsubOutput();
      unsubDone();
    }

    yield { type: 'done', data: '' };
  } catch (err) {
    yield { type: 'error', data: `Electron IPC error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
