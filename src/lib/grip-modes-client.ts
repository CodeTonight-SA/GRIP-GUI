/**
 * grip-modes-client — surface-agnostic read/write for active GRIP modes.
 *
 * In the packaged Electron app, the Next.js static export strips
 * /api/grip/modes (Issue #133). This helper picks the right transport:
 *   - Electron: window.electronAPI.grip.getModes() / setModes() via IPC
 *   - Web / dev: fetch('/api/grip/modes') as before
 *
 * Both paths read/write the same file (~/.claude/.active-modes) so either
 * transport agrees on the authoritative state.
 *
 * Callers get an always-safe Promise<ModesReadResult> for reads
 * ({ modes: string[]; error: boolean }). The `error` flag distinguishes
 * "fetched empty" from "fetch failed" — ModeStackChip needs this for its
 * honest-blank 'MODES —' state, CommandPalette needs it to avoid
 * overwriting state on a read failure. Callers that don't care about
 * error distinction can just destructure `modes` and ignore `error`.
 * setActiveModes() returns Promise<void>; errors are swallowed silently.
 */

import { isElectronEnv } from './grip-session';

interface ElectronGripModesApi {
  getModes?: () => Promise<{ modes?: string[] } | undefined>;
  setModes?: (modes: string[]) => Promise<{ modes?: string[]; saved?: boolean; error?: string } | undefined>;
}

function gripApi(): ElectronGripModesApi | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI?.grip ?? null;
}

function sanitise(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((m): m is string => typeof m === 'string');
}

export interface ModesReadResult {
  modes: string[];
  error: boolean;
}

export async function getActiveModes(): Promise<ModesReadResult> {
  const grip = gripApi();
  if (isElectronEnv() && grip?.getModes) {
    try {
      const result = await grip.getModes();
      return { modes: sanitise(result?.modes), error: false };
    } catch {
      return { modes: [], error: true };
    }
  }
  try {
    const res = await fetch('/api/grip/modes');
    if (!res.ok) return { modes: [], error: true };
    const data = await res.json();
    return { modes: sanitise(data?.modes), error: false };
  } catch {
    return { modes: [], error: true };
  }
}

export async function setActiveModes(modes: string[]): Promise<void> {
  const grip = gripApi();
  if (isElectronEnv() && grip?.setModes) {
    try {
      await grip.setModes(modes);
    } catch {
      /* silent — matches the existing "silent fail" posture */
    }
    return;
  }
  try {
    await fetch('/api/grip/modes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modes }),
    });
  } catch {
    /* silent */
  }
}
