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
  imageDataUrl?: string;
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
 * Detect CLI noise lines that should not be shown in the chat UI.
 * These are status/progress messages from the claude CLI or stderr.
 */
function isCliNoise(line: string): boolean {
  const noisePatterns = [
    /^[╭╰│├└─]/,                     // Box-drawing characters (CLI UI frames)
    /^─+$/,                            // Horizontal rules
    /^\s*\d+%/,                        // Progress percentages
    /^(connecting|loading|starting|initializing|resolving)/i,
    /^session\s+(id|started|resumed)/i,
    /^(model|using|warning):\s/i,
    /^\s*$/,                           // Whitespace-only
  ];
  return noisePatterns.some(p => p.test(line));
}

/**
 * Filter non-JSON lines — only allow through genuine human-readable text.
 */
function isAllowedNonJsonLine(line: string): boolean {
  const cleaned = stripAnsi(line);
  if (!cleaned) return false;
  // Skip JSON fragments
  if (cleaned.startsWith('{') || cleaned.startsWith('[') || cleaned.startsWith('"')) return false;
  // Skip raw primitives
  if (/^\s*(true|false|null|\d+)\s*$/.test(cleaned)) return false;
  // Skip CLI noise
  if (isCliNoise(cleaned)) return false;
  return true;
}

/**
 * Extract text content from a stream-json event.
 * Handles multiple event shapes from Claude CLI output.
 */
export function extractTextFromEvent(event: StreamEvent): string | null {
  // Skip non-text events entirely — these should NEVER be shown to the user
  const skipTypes = ['system', 'init', 'tool_use', 'tool_result', 'content_block_start',
    'content_block_stop', 'message_start', 'message_stop', 'ping',
    'result', 'error', 'input_json'];
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
 *
 * @param onPromptSessionId - Called with the prompt session ID once available (for stop button)
 */
export async function* sendToGrip(
  prompt: string,
  sessionId?: string,
  model: string = 'sonnet',
  onPromptSessionId?: (id: string) => void,
): AsyncGenerator<{ type: 'text' | 'metrics' | 'error' | 'done'; data: string | GripMetrics }> {
  // Electron path: use IPC for real PTY streaming
  if (isElectronEnv()) {
    yield* sendToGripElectron(prompt, sessionId, model, onPromptSessionId);
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
          // Non-JSON line — only forward genuine human-readable text
          if (isAllowedNonJsonLine(line)) {
            yield { type: 'text', data: stripAnsi(line) };
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
        const metrics = extractMetrics(event);
        if (metrics) yield { type: 'metrics', data: metrics };
      } catch {
        if (isAllowedNonJsonLine(buffer)) {
          yield { type: 'text', data: stripAnsi(buffer) };
        }
      }
    }

    yield { type: 'done', data: '' };
  } catch (err) {
    yield { type: 'error', data: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Electron IPC path — uses grip: handlers for one-shot streaming.
 * Collects output via event listeners, yields as text/metrics chunks.
 * Line-buffers IPC chunks to prevent partial JSON from leaking through.
 */
async function* sendToGripElectron(
  prompt: string,
  sessionId?: string,
  model: string = 'sonnet',
  onPromptSessionId?: (id: string) => void,
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
    // NOTE: Persistent stream session (streamMessage) disabled — the
    // --input-format stream-json protocol needs investigation for the
    // correct JSON schema. One-shot with --resume is reliable.
    const result = await api.prompt({ prompt, model, sessionId });

    if (!result!.success) {
      yield { type: 'error', data: result!.error || 'Failed to start prompt' };
      return;
    }

    const promptSessionId = result!.sessionId!;
    onPromptSessionId?.(promptSessionId);

    // Collect output via events using a promise-based queue
    type ChunkType = 'text' | 'metrics' | 'done';
    const chunks: Array<{ type: ChunkType; data: string | GripMetrics }> = [];
    let resolve: (() => void) | null = null;
    let done = false;
    // Line buffer: accumulate partial IPC chunks until we get complete lines
    let lineBuffer = '';

    const pushChunk = (type: ChunkType, data: string | GripMetrics) => {
      chunks.push({ type, data });
      if (resolve) { resolve(); resolve = null; }
    };

    const processLine = (line: string) => {
      if (!line.trim()) return;
      try {
        const parsed: StreamEvent = JSON.parse(line);
        const text = extractTextFromEvent(parsed);
        if (text) pushChunk('text', text);
        const metrics = extractMetrics(parsed);
        if (metrics) pushChunk('metrics', metrics);
      } catch {
        // Non-JSON line — only forward genuine human-readable text
        if (isAllowedNonJsonLine(line)) {
          pushChunk('text', stripAnsi(line));
        }
      }
    };

    const unsubOutput = api.onPromptOutput((event: { sessionId: string; data: string }) => {
      if (event.sessionId !== promptSessionId) return;

      // Accumulate into line buffer and process complete lines
      lineBuffer += event.data;
      const lines = lineBuffer.split('\n');
      // Keep the last (potentially incomplete) segment in the buffer
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        processLine(line);
      }
    });

    const unsubDone = api.onPromptDone((event: { sessionId: string; exitCode: number }) => {
      if (event.sessionId !== promptSessionId) return;
      // Process any remaining buffered content
      if (lineBuffer.trim()) {
        processLine(lineBuffer);
        lineBuffer = '';
      }
      done = true;
      pushChunk('done', '');
    });

    // Yield chunks as they arrive
    try {
      while (!done || chunks.length > 0) {
        if (chunks.length > 0) {
          const chunk = chunks.shift()!;
          if (chunk.type === 'done') break;
          yield { type: chunk.type as 'text' | 'metrics', data: chunk.data };
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
