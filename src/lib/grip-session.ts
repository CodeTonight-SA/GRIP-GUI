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

import { buildHappiEnvelope, halInferBodyFromEnvelope, DEFAULT_MODEL } from '@/lib/happi-envelope';

export interface ToolUseEvent {
  toolName: string;
  toolId: string;
  input: Record<string, unknown>;
}

export interface ToolResultEvent {
  toolId: string;
  output: string;
  isError?: boolean;
}

export interface GateEvent {
  id: string;
  type: 'deny' | 'warn' | 'info';
  gate: string;
  message: string;
  timestamp: Date;
}

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
  toolUses?: ToolUseEvent[];
  toolResults?: ToolResultEvent[];
  gates?: GateEvent[];
  isThinking?: boolean;
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
  subtype?: string;
  message?: {
    content: Array<{ type: string; text?: string; name?: string; id?: string; input?: Record<string, unknown> }>;
  };
  delta?: {
    type: string;
    text?: string;
  };
  text?: string;
  // tool_use fields
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
  // result fields
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
 * Strip metadata blocks from response text that shouldn't be shown to users.
 * Filters <system-reminder>, <command-*>, and <claude-mem-context> blocks
 * that leak through from Claude CLI's stream-json output.
 */
const METADATA_TAGS = 'system-reminder|command-message|command-name|command-args|claude-mem-context';
const CLOSED_METADATA_RE = new RegExp(`<(?:${METADATA_TAGS})>[\\s\\S]*?<\\/(?:${METADATA_TAGS})>`, 'g');
const UNCLOSED_METADATA_RE = new RegExp(`<(?:${METADATA_TAGS})>[\\s\\S]*$`);

export function filterResponseMetadata(text: string): string {
  if (!text) return text;
  return text
    .replace(CLOSED_METADATA_RE, '')
    .replace(UNCLOSED_METADATA_RE, '')
    .replace(/\n{3,}/g, '\n\n')
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
    'result', 'error', 'input_json', 'thinking'];
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
 * Extract tool_use event data.
 */
export function extractToolUse(event: StreamEvent): ToolUseEvent | null {
  if (event.type === 'tool_use' && event.name && event.id) {
    return { toolName: event.name, toolId: event.id, input: event.input || {} };
  }
  // Also check content blocks for tool_use
  if (event.message?.content) {
    const toolBlock = event.message.content.find(b => b.type === 'tool_use');
    if (toolBlock?.name && toolBlock?.id) {
      return { toolName: toolBlock.name, toolId: toolBlock.id, input: toolBlock.input || {} };
    }
  }
  return null;
}

/**
 * Extract tool_result event data.
 */
export function extractToolResult(event: StreamEvent): ToolResultEvent | null {
  if (event.type === 'tool_result' && event.tool_use_id) {
    const output = typeof event.content === 'string'
      ? event.content
      : Array.isArray(event.content)
        ? event.content.filter(b => b.type === 'text').map(b => b.text || '').join('')
        : '';
    return { toolId: event.tool_use_id, output, isError: event.is_error };
  }
  return null;
}

/**
 * Extract thinking event data.
 * Claude CLI emits thinking events during extended thinking (stream-json).
 * Returns the thinking text content, or null if not a thinking event.
 */
export function extractThinking(event: StreamEvent): string | null {
  if (event.type === 'thinking' && typeof event.text === 'string') {
    return event.text;
  }
  // Content block with thinking type
  if (event.type === 'content_block_start' && event.delta?.type === 'thinking') {
    return '';
  }
  if (event.delta?.type === 'thinking_delta' && event.delta.text) {
    return event.delta.text;
  }
  return null;
}

/**
 * Detect GRIP gate patterns in text.
 * Returns a GateEvent if a gate pattern is found, null otherwise.
 * Gate patterns: [GRIP], [QUALITY], [GRIP SECRET WARNING], [LEARNING]
 */
export function detectGateInText(text: string): GateEvent | null {
  if (!text) return null;

  // Blocked actions
  const denyMatch = text.match(/\[GRIP\]\s*Blocked:\s*(.+)/i);
  if (denyMatch) {
    return {
      id: crypto.randomUUID(),
      type: 'deny',
      gate: 'Dependency Guardian',
      message: denyMatch[1].trim(),
      timestamp: new Date(),
    };
  }

  // Quality warnings
  const qualityMatch = text.match(/\[QUALITY\]\s*(.+)/i);
  if (qualityMatch) {
    const msg = qualityMatch[1].trim();
    const isDeny = msg.toLowerCase().includes('exceeds threshold');
    return {
      id: crypto.randomUUID(),
      type: isDeny ? 'deny' : 'warn',
      gate: 'Quality Gate',
      message: msg,
      timestamp: new Date(),
    };
  }

  // Secret warnings
  const secretMatch = text.match(/\[GRIP SECRET WARNING\]\s*(.+)/i);
  if (secretMatch) {
    return {
      id: crypto.randomUUID(),
      type: 'warn',
      gate: 'Secrets Detection',
      message: secretMatch[1].trim(),
      timestamp: new Date(),
    };
  }

  // Anti-drift reminders
  const driftMatch = text.match(/\[GRIP\]\s*Task completed\.\s*(.+)/i);
  if (driftMatch) {
    return {
      id: crypto.randomUUID(),
      type: 'info',
      gate: 'Anti-Drift',
      message: driftMatch[1].trim(),
      timestamp: new Date(),
    };
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
export type GripStreamEvent = {
  type: string;
  data: string | GripMetrics | ToolUseEvent | ToolResultEvent;
};

/**
 * HAL endpoint defaults (single source of truth — port-registry).
 *
 * - `inferBase` (hal-server, :3850) serves the canonical AI syscall
 *   `/api/infer` (+ `/api/infer-with-tools`), wrapping `grip_infer`/RAILLM.
 *   This is the route sendToGripHAL targets.
 * - `gateway` (HAL gateway, :4010) serves the OpenAI-compatible `/v1/*`
 *   proxy. Documented here for callers that need the chat-completions surface.
 *
 * There is NO `/api/conversation` route in live HAL — that was endpoint drift.
 */
export const HAL_DEFAULTS = {
  inferBase: 'http://127.0.0.1:3850',
  gateway: 'http://127.0.0.1:4010',
} as const;

/**
 * Resolve the HAL backend URL for chat routing.
 *
 * Resolution order (first match wins):
 *  1. localStorage 'grip-hal-url'      — explicit per-machine override
 *  2. NEXT_PUBLIC_HAL_URL              — explicit build/env override
 *  3. HAL_DEFAULTS.inferBase           — ONLY when the opt-in default flag
 *     (NEXT_PUBLIC_HAL_DEFAULT / localStorage 'grip-hal-default') is truthy
 *
 * Step 3 is what lets HAL become the default backend when reachable — routing
 * chat through HAL's multi-provider cascade (CCH → Kimi → cheap → local) for
 * provider-agnostic cost/limit handling — instead of pinning the GUI to the
 * Anthropic `claude` CLI and the `sonnet` alias. It is gated behind one
 * explicit flag so default behaviour stays byte-identical until an operator
 * opts in: absent the flag (and absent steps 1-2) this returns null and the
 * CLI path (Electron PTY / `/api/grip/chat`) is preserved unchanged.
 *
 * The CLI spawn always remains the fallback: when HAL is unreachable the
 * `/api/infer` fetch throws and sendToGripHAL surfaces an error, while the
 * server route (`/api/grip/chat`) falls through to the `claude` spawn.
 */
function halDefaultEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const v = localStorage.getItem('grip-hal-default');
    if (v && v !== '0' && v !== 'false') return true;
  }
  const env = process.env.NEXT_PUBLIC_HAL_DEFAULT;
  return !!env && env !== '0' && env !== 'false';
}

function getHalUrl(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('grip-hal-url');
    if (stored) return stored;
  }
  if (process.env.NEXT_PUBLIC_HAL_URL) return process.env.NEXT_PUBLIC_HAL_URL;
  if (halDefaultEnabled()) return HAL_DEFAULTS.inferBase;
  return null;
}

export async function* sendToGrip(
  prompt: string,
  sessionId?: string,
  model: string = DEFAULT_MODEL,
  onPromptSessionId?: (id: string) => void,
): AsyncGenerator<GripStreamEvent> {
  // HAL backend path: call hal-server's /api/infer (single request/response)
  const halUrl = getHalUrl();
  if (halUrl) {
    yield* sendToGripHAL(halUrl, prompt, sessionId, model, onPromptSessionId);
    return;
  }

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
          const thinking = extractThinking(event);
          if (thinking !== null) {
            yield { type: 'thinking', data: thinking };
          }
          const text = extractTextFromEvent(event);
          if (text) {
            yield { type: 'text', data: text };
          }
          const toolUse = extractToolUse(event);
          if (toolUse) {
            yield { type: 'tool_use', data: toolUse };
          }
          const toolResult = extractToolResult(event);
          if (toolResult) {
            yield { type: 'tool_result', data: toolResult };
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
  model: string = DEFAULT_MODEL,
  onPromptSessionId?: (id: string) => void,
): AsyncGenerator<{ type: string; data: string | GripMetrics | ToolUseEvent | ToolResultEvent }> {
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

    if (!result.success) {
      yield { type: 'error', data: result.error || 'Failed to start prompt' };
      return;
    }

    const promptSessionId = result.sessionId!;
    onPromptSessionId?.(promptSessionId);

    // Collect output via events using a promise-based queue
    type ChunkType = 'text' | 'metrics' | 'tool_use' | 'tool_result' | 'thinking' | 'done';
    const chunks: Array<{ type: ChunkType; data: string | GripMetrics | ToolUseEvent | ToolResultEvent }> = [];
    let resolve: (() => void) | null = null;
    let done = false;
    // Line buffer: accumulate partial IPC chunks until we get complete lines
    let lineBuffer = '';

    const pushChunk = (type: ChunkType, data: string | GripMetrics | ToolUseEvent | ToolResultEvent) => {
      chunks.push({ type, data });
      if (resolve) { resolve(); resolve = null; }
    };

    const processLine = (line: string) => {
      if (!line.trim()) return;
      try {
        const parsed: StreamEvent = JSON.parse(line);
        const thinking = extractThinking(parsed);
        if (thinking !== null) pushChunk('thinking', thinking);
        const text = extractTextFromEvent(parsed);
        if (text) pushChunk('text', text);
        const toolUse = extractToolUse(parsed);
        if (toolUse) pushChunk('tool_use', toolUse);
        const toolResult = extractToolResult(parsed);
        if (toolResult) pushChunk('tool_result', toolResult);
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
          yield { type: chunk.type, data: chunk.data };
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

/**
 * Shape of the normalised GripInferResult that hal-server `/api/infer`
 * returns (HAL #331 — wraps `grip_infer`/RAILLM). This is a SINGLE JSON
 * object, not a stream of Anthropic content_block_delta events.
 */
export interface HalInferResult {
  ok?: boolean;
  text?: string;
  provider?: string;
  model?: string;
  idr_ref?: string;
  error?: string | { message?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * HAL backend path — calls hal-server's canonical AI syscall `/api/infer`
 * (HAL #331), the route `lib/hal_llm_adapter.py` POSTs to in live GRIP.
 *
 * The request is composed as a HAPPI/1.1 envelope first (prompt → `content`,
 * session → `ctx`, model → `flags.model`), so GRIP-GUI speaks the same
 * provider-agnostic contract as the rest of the substrate. `/api/infer` itself
 * re-wraps the call in a HAPPI envelope server-side and accepts the flat
 * `{prompt, model, audit}` wire body, which we derive from the envelope via
 * `halInferBodyFromEnvelope` — single source of truth in `lib/happi-envelope`.
 *
 * Response is a single JSON object (NOT a JSONL/SSE stream):
 *   { ok, text, provider, model, idr_ref, usage: { input_tokens, output_tokens } }
 *
 * We translate that one object into the GripStreamEvent sequence
 * (text → metrics → done) ChatInterface already consumes. hal-server
 * does not return a session id, so `onPromptSessionId` is only called
 * when the caller supplied one (resume passthrough).
 */
async function* sendToGripHAL(
  halUrl: string,
  prompt: string,
  sessionId?: string,
  model: string = DEFAULT_MODEL,
  onPromptSessionId?: (id: string) => void,
): AsyncGenerator<GripStreamEvent> {
  if (sessionId) onPromptSessionId?.(sessionId);
  try {
    const envelope = buildHappiEnvelope({
      content: prompt,
      flags: { model },
      ctx: sessionId ? { session_id: sessionId } : undefined,
      audit: false,
    });
    const response = await fetch(`${halUrl}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(halInferBodyFromEnvelope(envelope)),
    });

    if (!response.ok) {
      yield { type: 'error', data: `HAL error: ${response.status}` };
      return;
    }

    let raw: HalInferResult;
    try {
      raw = (await response.json()) as HalInferResult;
    } catch {
      yield { type: 'error', data: 'HAL returned an unparseable response' };
      return;
    }

    yield* mapInferResult(raw, model);
    yield { type: 'done', data: '' };
  } catch (err) {
    yield { type: 'error', data: `HAL connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Translate a single hal-server `/api/infer` GripInferResult into the
 * GripStreamEvent sequence ChatInterface expects. A fail-safe result
 * (`ok === false` or empty text) becomes one error event; a successful
 * result becomes a text event followed by a metrics event.
 */
function mapInferResult(raw: HalInferResult, requestedModel: string): GripStreamEvent[] {
  const text = (raw.text || '').trim();
  if (raw.ok === false || !text) {
    return [{ type: 'error', data: halErrorMessage(raw) }];
  }
  const metrics: GripMetrics = {
    model: raw.model || requestedModel,
  };
  return [
    { type: 'text', data: text },
    { type: 'metrics', data: metrics },
  ];
}

/**
 * Extract a human-readable error message from a HAL result. `error` may be
 * a bare string or an object with a `message` field; absent → generic.
 */
function halErrorMessage(raw: HalInferResult): string {
  if (typeof raw.error === 'string') return raw.error;
  if (raw.error && typeof raw.error === 'object' && raw.error.message) return raw.error.message;
  return 'HAL inference failed';
}
