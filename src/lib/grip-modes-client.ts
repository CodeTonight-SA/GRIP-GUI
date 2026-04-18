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
 * Callers get an always-safe Promise<string[]> for reads (never throws,
 * returns []) and Promise<void> for writes (errors are swallowed, but
 * logged in dev). Callers that need richer error info can use the raw
 * electronAPI.grip.setModes() directly.
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

export async function getActiveModes(): Promise<string[]> {
  const grip = gripApi();
  if (isElectronEnv() && grip?.getModes) {
    try {
      const result = await grip.getModes();
      return sanitise(result?.modes);
    } catch {
      return [];
    }
  }
  try {
    const res = await fetch('/api/grip/modes');
    if (!res.ok) return [];
    const data = await res.json();
    return sanitise(data?.modes);
  } catch {
    return [];
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
