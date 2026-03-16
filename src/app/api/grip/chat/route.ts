import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const GRIP_DIR = join(homedir(), '.claude');

/**
 * GRIP Chat API — spawns `claude -p` with stream-json output.
 *
 * This is the bridge between the GRIP GUI and the real GRIP backend.
 * The `claude` CLI loads all GRIP infrastructure (CLAUDE.md, skills,
 * modes, hooks, gates) from ~/.claude automatically.
 *
 * Returns a streaming response with JSONL events that the client
 * parses for text deltas, metrics, and completion signals.
 *
 * For session resumption (ultra-fast): pass sessionId to use
 * `--resume` flag which skips full context reload.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, sessionId, model = 'sonnet' } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build claude CLI args
  const args = [
    '-p',
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
