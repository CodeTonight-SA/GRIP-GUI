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
 * Strip ANSI escape codes and terminal control sequences from text.
 * These leak through when PTY is used instead of child_process.
 */
export function stripAnsi(text: string): string {
  return text
    // Standard ANSI escape sequences
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // OSC sequences (title setting, etc.)
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    // Other escape sequences
    .replace(/\x1b[^[(\x1b]*(?:\x1b|$)/g, '')
    // Remaining control characters (except newline, tab)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    // Common terminal bracket sequences that slip through
    .replace(/\[\?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\][0-9];[^\x07]*\x07?/g, '')
    .replace(/\[<u/g, '')
    .trim();
}

/**
 * Extract text content from a stream-json event.
 * Handles multiple event shapes from Claude CLI output.
 */
export function extractTextFromEvent(event: StreamEvent): string | null {
  // Skip non-text events entirely — these should NEVER be shown to the user
  const skipTypes = ['system', 'init', 'tool_use', 'tool_result', 'content_block_start',
    'content_block_stop', 'message_start', 'message_stop', 'ping'];
  if (skipTypes.includes(event.type)) return null;
  // Also skip if event has subtype 'init' (system init events)
  if ((event as unknown as Record<string, unknown>).subtype === 'init') return null;

  // Message with content blocks (assistant turn complete)
  if (event.message?.content) {
    const texts = event.message.content
      .filter((b) => b.type === 'text')
      .map((b) => stripAnsi(b.text || ''));
    if (texts.length) return texts.join('');
  }
  // Text delta (streaming chunk)
  if (event.delta?.type === 'text_delta' && event.delta.text) {
    return stripAnsi(event.delta.text);
  }
  // Plain text event
  if (event.type === 'assistant' && typeof event.text === 'string') {
    return stripAnsi(event.text);
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
 * Checks both the preload bridge AND navigator.userAgent as fallback,
 * since the preload script may not have initialised yet when the
 * renderer makes its first call (app:// protocol timing).
 */
export function isElectronEnv(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).electronAPI) return true;
  // Fallback: Electron always includes 'Electron' in the user agent
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) return true;
  return false;
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
      // 404 in Electron means app:// can't serve API routes — fall back to IPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (response.status === 404 && (window as any).electronAPI?.grip) {
        yield* sendToGripElectron(prompt, sessionId, model);
        return;
      }
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
          // Non-JSON line — strip ANSI, skip raw JSON fragments
          const cleaned = stripAnsi(line);
          if (cleaned && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
            yield { type: 'text', data: cleaned };
          }
        }
      }
    }

    // Process remaining buffer — strip raw JSON fragments
    if (buffer.trim()) {
      try {
        const event: StreamEvent = JSON.parse(buffer);
        const text = extractTextFromEvent(event);
        if (text) yield { type: 'text', data: text };
      } catch {
        const cleaned = stripAnsi(buffer);
        if (cleaned && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
          yield { type: 'text', data: cleaned };
        }
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
  // Wait up to 2s for preload bridge to initialise (app:// protocol timing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let api = (window as any).electronAPI?.grip;
  if (!api) {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 200));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      api = (window as any).electronAPI?.grip;
      if (api) break;
    }
  }
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
          // Non-JSON line — strip ANSI and only forward if it has real content
          const cleaned = stripAnsi(line);
          // Skip raw JSON objects that failed to parse (init events, etc.)
          if (cleaned && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
            chunks.push({ type: 'text', data: cleaned });
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
