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
import { spawn as cpSpawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';

const GRIP_DIR = path.join(os.homedir(), '.claude');

interface EngineSession {
  ptyProcess: pty.IPty | null;
  buffer: string;
  ready: boolean;
  sessionId: string;
}

let engineSession: EngineSession | null = null;

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
        env: { ...process.env, HOME: os.homedir() },
      });

      const promptSessionId = crypto.randomUUID();

      proc.stdout.on('data', (data: Buffer) => {
        sendToRenderer('grip:promptOutput', { sessionId: promptSessionId, data: data.toString() });
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
        sendToRenderer('grip:promptDone', { sessionId: promptSessionId, exitCode: exitCode || 0 });
      });

      proc.on('error', (err) => {
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
