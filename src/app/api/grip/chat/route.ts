import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { DEFAULT_MODEL, resolveServerHalUrl } from './hal';

const GRIP_DIR = join(homedir(), '.claude');

/**
 * GRIP Chat API — routes to the HAL multi-provider substrate when reachable,
 * else spawns `claude -p` with stream-json output.
 *
 * Default backend resolution (see ./hal::resolveServerHalUrl):
 *  - HAL `/api/infer` (hal-server :3850) when NEXT_PUBLIC_HAL_URL is set or the
 *    opt-in default flag NEXT_PUBLIC_HAL_DEFAULT is truthy. This is the path
 *    that gives the GUI HAL's provider cascade (CCH → Kimi → cheap → local)
 *    and provider-agnostic cost/limit handling, reflecting the live
 *    session-model choice rather than pinning to the Anthropic `sonnet` alias.
 *  - The `claude` CLI spawn otherwise (and as the fallback when HAL is
 *    unreachable) — it loads all GRIP infrastructure (CLAUDE.md, skills,
 *    modes, hooks, gates) from ~/.claude automatically.
 *
 * Both paths return a streaming JSONL response the client parses for text
 * deltas, metrics, and completion signals. For session resumption
 * (ultra-fast): pass sessionId to use the CLI `--resume` flag.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, sessionId, model = DEFAULT_MODEL } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // HAL-first: when a HAL backend resolves, route through its provider cascade.
  // On any HAL failure we fall through to the claude CLI spawn below.
  const halUrl = resolveServerHalUrl();
  if (halUrl) {
    const halResponse = await tryHalInfer(halUrl, prompt, model);
    if (halResponse) return halResponse;
  }

  // Build claude CLI args
  const args = [
    '-p',
    '--verbose',
    '--output-format', 'stream-json',
    '--model', model,
  ];

  // Resume existing session for ultra-fast response (no context reload)
  if (sessionId) {
    args.push('--resume', sessionId);
  }

  // Add the prompt last
  args.push(prompt);

  // Create a streaming response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const proc = spawn('claude', args, {
        cwd: GRIP_DIR,
        env: {
          ...process.env,
          // Ensure GRIP infrastructure is loaded
          HOME: homedir(),
        },
      });

      proc.stdout.on('data', (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()));
      });

      proc.stderr.on('data', (data: Buffer) => {
        // Log stderr server-side only — don't forward to client
        // unless it's a critical error
        const text = data.toString();
        if (text.includes('Error') || text.includes('error')) {
          const errorEvent = JSON.stringify({ type: 'error', message: text.trim() }) + '\n';
          controller.enqueue(encoder.encode(errorEvent));
        }
      });

      proc.on('close', () => {
        controller.close();
      });

      proc.on('error', (err) => {
        const errorEvent = JSON.stringify({ type: 'error', message: err.message }) + '\n';
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      });

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        proc.kill('SIGTERM');
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Call hal-server `/api/infer` and translate its single GripInferResult into
 * the JSONL stream (text → result → ) the chat client already parses.
 *
 * Returns a streaming Response on success, or null on any failure (HAL
 * unreachable, non-2xx, empty/failed result) so the caller falls through to
 * the `claude` CLI spawn — HAL is the default-when-reachable backend, the CLI
 * is always the fallback.
 */
async function tryHalInfer(
  halUrl: string,
  prompt: string,
  model: string,
): Promise<Response | null> {
  try {
    const res = await fetch(`${halUrl}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, audit: false }),
    });
    if (!res.ok) return null;

    const raw = await res.json();
    const text = (raw?.text || '').trim();
    if (raw?.ok === false || !text) return null;

    // Emit the same JSONL event shapes the CLI stream-json path produces:
    // an assistant message (text) then a result event (metrics).
    const assistant = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text }] },
    });
    const result = JSON.stringify({
      type: 'result',
      model: raw?.model || model,
    });
    return new Response(`${assistant}\n${result}\n`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return null;
  }
}
