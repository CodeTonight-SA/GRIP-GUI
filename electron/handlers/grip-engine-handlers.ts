/**
 * GRIP Engine IPC Handlers
 *
 * Manages a persistent claude CLI session for the Engine chat.
 * Uses node-pty for full PTY support (interactive, session persistence).
 *
 * In Electron: spawns `claude` with PTY for real interactive sessions
 * In Browser: falls back to the /api/grip/chat API route
 *
 * Key difference from the API route: PTY sessions are persistent —
 * the context stays loaded between messages. No --resume needed.
 * This is the ultra-fast path.
 */
import { ipcMain, BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import { spawn as cpSpawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';

/**
 * Build a PATH string that includes common claude installation directories.
 * The Electron process PATH may not include nvm/homebrew paths.
 * Cached after first call — PATH doesn't change at runtime.
 */
let cachedClaudePath: string | null = null;
function buildClaudePath(): string {
  if (cachedClaudePath) return cachedClaudePath;
  const home = os.homedir();
  const extras = [
    path.join(home, '.local', 'bin'),
    path.join(home, '.nvm', 'current', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
  ];
  const existing = (process.env.PATH || '').split(':');
  const seen = new Set<string>();
  cachedClaudePath = [...extras, ...existing]
    .filter(p => { if (!p || seen.has(p)) return false; seen.add(p); return true; })
    .join(':');
  return cachedClaudePath;
}

// Track active one-shot prompt processes for cancellation
const activePrompts = new Map<string, ChildProcess>();

const GRIP_DIR = path.join(os.homedir(), '.claude');

interface EngineSession {
  ptyProcess: pty.IPty | null;
  buffer: string;
  ready: boolean;
  sessionId: string;
}

let engineSession: EngineSession | null = null;

/**
 * Persistent streaming session — a long-lived `claude -p` process that uses
 * stream-json on both stdin and stdout. Context stays loaded between messages,
 * eliminating the 2-3s cold start per turn. This is the ultra-fast path.
 */
interface StreamSession {
  proc: ChildProcess;
  model: string;
  sessionId: string;
  alive: boolean;
}

let streamSession: StreamSession | null = null;

function killStreamSession() {
  if (streamSession?.proc) {
    streamSession.alive = false;
    streamSession.proc.kill('SIGTERM');
    streamSession = null;
  }
}

function startStreamSession(model: string = 'sonnet'): StreamSession {
  killStreamSession();

  const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--model', model];
  const proc = cpSpawn('claude', args, {
    cwd: GRIP_DIR,
    env: { ...process.env, HOME: os.homedir(), PATH: buildClaudePath() },
  });

  const sessionId = crypto.randomUUID();
  const session: StreamSession = { proc, model, sessionId, alive: true };

  proc.on('close', () => {
    session.alive = false;
    if (streamSession === session) {
      streamSession = null;
      console.log('Stream session closed');
    }
  });

  proc.on('error', (err) => {
    console.error('Stream session error:', err.message);
    session.alive = false;
    if (streamSession === session) streamSession = null;
  });

  proc.stderr?.on('data', (data: Buffer) => {
    // Log but don't forward stderr from the persistent session
    const text = data.toString().trim();
    if (text) console.error('[stream-session stderr]', text);
  });

  streamSession = session;
  console.log(`Stream session started: model=${model}, sessionId=${sessionId}`);
  return session;
}

/**
 * Pre-warm a GRIP session for instant first response.
 * Called from main.ts after app init.
 */
export function preWarmSession(model: string = 'sonnet') {
  try {
    startStreamSession(model);
  } catch (err) {
    console.error('Failed to pre-warm session:', err);
  }
}

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function sendToRenderer(channel: string, data: unknown) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

export function registerGripEngineHandlers() {
  /**
   * Start a new GRIP Engine session.
   * Spawns a claude CLI process with PTY.
   */
  /**
   * NOTE: This interactive PTY session is currently NOT used by the Engine chat UI.
   * The chat uses grip:prompt (one-shot, child_process.spawn) for each message.
   * This session is kept for future persistent-session streaming support.
   */
  ipcMain.handle('grip:startSession', async (_event, options: {
    model?: string;
  } = {}) => {
    // Kill existing session if any
    if (engineSession?.ptyProcess) {
      engineSession.ptyProcess.kill();
      engineSession = null;
    }

    const model = options.model || 'sonnet';
    const sessionId = crypto.randomUUID();

    try {
      const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: GRIP_DIR,
        env: {
          ...process.env,
          HOME: os.homedir(),
          TERM: 'xterm-256color',
          PATH: buildClaudePath(),
        },
      });

      engineSession = {
        ptyProcess,
        buffer: '',
        ready: false,
        sessionId,
      };

      // Forward PTY output to renderer
      ptyProcess.onData((data: string) => {
        if (engineSession) {
          engineSession.buffer += data;
        }
        sendToRenderer('grip:output', { sessionId, data });
      });

      ptyProcess.onExit(({ exitCode }) => {
        sendToRenderer('grip:sessionEnd', { sessionId, exitCode });
        engineSession = null;
      });

      // Start claude in interactive mode
      ptyProcess.write(`claude --model ${model}\r`);

      return { success: true, sessionId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  });

  /**
   * Send a message to the active GRIP Engine session.
   */
  ipcMain.handle('grip:sendMessage', async (_event, message: string) => {
    if (!engineSession?.ptyProcess) {
      return { success: false, error: 'No active session' };
    }

    // Clear buffer before sending
    engineSession.buffer = '';

    // Write message followed by enter
    engineSession.ptyProcess.write(message + '\r');

    return { success: true, sessionId: engineSession.sessionId };
  });

  /**
   * Send a prompt (non-interactive, one-shot).
   * Uses child_process.spawn (NOT pty) with stream-json for clean JSONL output.
   * PTY adds ANSI escape codes that corrupt the JSON stream.
   */
  ipcMain.handle('grip:prompt', async (_event, options: {
    prompt: string;
    model?: string;
    sessionId?: string;
  }) => {
    const { prompt, model = 'sonnet', sessionId } = options;

    const args = ['-p', '--output-format', 'stream-json', '--model', model];
    if (sessionId) args.push('--resume', sessionId);
    args.push(prompt);

    try {
      const proc = cpSpawn('claude', args, {
        cwd: GRIP_DIR,
        env: { ...process.env, HOME: os.homedir(), PATH: buildClaudePath() },
      });

      const promptSessionId = crypto.randomUUID();
      activePrompts.set(promptSessionId, proc);

      // Buffer stdout chunks for 16ms before sending to reduce IPC call count
      let outputBuffer = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const flushOutput = () => {
        if (outputBuffer) {
          sendToRenderer('grip:promptOutput', { sessionId: promptSessionId, data: outputBuffer });
          outputBuffer = '';
        }
        flushTimer = null;
      };

      proc.stdout.on('data', (data: Buffer) => {
        outputBuffer += data.toString();
        if (!flushTimer) {
          flushTimer = setTimeout(flushOutput, 16);
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        // Log stderr but don't forward raw errors to renderer
        const text = data.toString();
        if (text.includes('Error') || text.includes('error')) {
          sendToRenderer('grip:promptOutput', {
            sessionId: promptSessionId,
            data: JSON.stringify({ type: 'error', message: text.trim() }) + '\n',
          });
        }
      });

      proc.on('close', (exitCode) => {
        // Flush any remaining buffered output
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        flushOutput();
        activePrompts.delete(promptSessionId);
        sendToRenderer('grip:promptDone', { sessionId: promptSessionId, exitCode: exitCode || 0 });
      });

      proc.on('error', (err) => {
        activePrompts.delete(promptSessionId);
        sendToRenderer('grip:promptOutput', {
          sessionId: promptSessionId,
          data: JSON.stringify({ type: 'error', message: err.message }) + '\n',
        });
        sendToRenderer('grip:promptDone', { sessionId: promptSessionId, exitCode: 1 });
      });

      return { success: true, sessionId: promptSessionId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  });

  /**
   * Get current session status.
   */
  ipcMain.handle('grip:getSessionStatus', async () => {
    return {
      active: !!engineSession?.ptyProcess,
      sessionId: engineSession?.sessionId || null,
      bufferLength: engineSession?.buffer?.length || 0,
    };
  });

  /**
   * Kill the active session.
   */
  ipcMain.handle('grip:killSession', async () => {
    if (engineSession?.ptyProcess) {
      engineSession.ptyProcess.kill();
      engineSession = null;
      return { success: true };
    }
    return { success: false, error: 'No active session' };
  });

  /**
   * Kill a running one-shot prompt by session ID.
   */
  ipcMain.handle('grip:killPrompt', async (_event, sessionId: string) => {
    if (typeof sessionId !== 'string') {
      return { success: false, error: 'Invalid session ID' };
    }
    const proc = activePrompts.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      activePrompts.delete(sessionId);
      return { success: true };
    }
    return { success: false, error: 'No active prompt with that ID' };
  });

  /**
   * Start a persistent stream-json session.
   * This keeps a claude -p process alive with --input-format stream-json
   * for ultra-fast follow-up messages (no cold start).
   */
  ipcMain.handle('grip:startStreamSession', async (_event, options: {
    model?: string;
  } = {}) => {
    try {
      const session = startStreamSession(options.model);
      return { success: true, sessionId: session.sessionId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  });

  /**
   * Send a message through the persistent stream-json session.
   * The session stays alive between messages — no cold start.
   * Output is forwarded via grip:promptOutput events (same as one-shot).
   */
  ipcMain.handle('grip:streamMessage', async (_event, options: {
    prompt: string;
    model?: string;
  }) => {
    const { prompt, model = 'sonnet' } = options;

    // Start or restart session if needed
    if (!streamSession?.alive || (model && streamSession.model !== model)) {
      startStreamSession(model);
    }

    if (!streamSession?.alive || !streamSession.proc.stdin) {
      return { success: false, error: 'Failed to start stream session' };
    }

    const messageId = crypto.randomUUID();

    // Set up output forwarding for this message
    let outputBuffer = '';
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushOutput = () => {
      if (outputBuffer) {
        sendToRenderer('grip:promptOutput', { sessionId: messageId, data: outputBuffer });
        outputBuffer = '';
      }
      flushTimer = null;
    };

    // Track whether this message's response is complete
    let messageComplete = false;

    const onData = (data: Buffer) => {
      const text = data.toString();
      outputBuffer += text;

      // Check if this chunk contains a result event (end of message response)
      if (text.includes('"type":"result"') || text.includes('"type": "result"')) {
        messageComplete = true;
      }

      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushOutput();
          if (messageComplete) {
            sendToRenderer('grip:promptDone', { sessionId: messageId, exitCode: 0 });
            streamSession?.proc.stdout?.removeListener('data', onData);
          }
        }, 16);
      }
    };

    streamSession.proc.stdout?.on('data', onData);

    // Handle process death during this message
    const onClose = () => {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      flushOutput();
      if (!messageComplete) {
        sendToRenderer('grip:promptDone', { sessionId: messageId, exitCode: 1 });
      }
    };
    streamSession.proc.once('close', onClose);

    // Write the message as JSON to stdin
    const inputEvent = JSON.stringify({
      type: 'user_message',
      content: prompt,
    }) + '\n';

    try {
      streamSession.proc.stdin.write(inputEvent);
      return { success: true, sessionId: messageId };
    } catch (err) {
      streamSession.proc.stdout?.removeListener('data', onData);
      streamSession.proc.removeListener('close', onClose);
      return { success: false, error: err instanceof Error ? err.message : 'Write failed' };
    }
  });

  /**
   * Kill the persistent stream session.
   */
  ipcMain.handle('grip:killStreamSession', async () => {
    killStreamSession();
    return { success: true };
  });

  /**
   * Get GRIP system health (same as API route, but via IPC).
   */
  ipcMain.handle('grip:getHealth', async () => {
    try {
      const fs = await import('fs/promises');
      const genomePath = path.join(GRIP_DIR, 'cache', 'genome.json');
      const raw = await fs.readFile(genomePath, 'utf-8');
      const genome = JSON.parse(raw);

      const { readdirSync, existsSync } = await import('fs');

      let skillCount = 149;
      const skillsDir = path.join(GRIP_DIR, 'skills');
      if (existsSync(skillsDir)) {
        skillCount = readdirSync(skillsDir, { withFileTypes: true })
          .filter(d => d.isDirectory()).length;
      }

      return {
        status: 'healthy',
        generation: genome.generation || 33,
        geneCount: genome.genes ? Object.keys(genome.genes).length : 212,
        fitness: genome.fitness_history?.slice(-1)[0] || 0.467,
        skillCount,
      };
    } catch {
      return { status: 'error', generation: 33, skillCount: 149 };
    }
  });
}
