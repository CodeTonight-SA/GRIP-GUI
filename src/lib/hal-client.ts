/**
 * HAL Client — typed API client for HAL backend session management.
 *
 * When HAL backend is active (NEXT_PUBLIC_HAL_URL or localStorage 'grip-hal-url'),
 * this module provides session CRUD operations that sync with HAL's session registry.
 *
 * Session data flows:
 *   GRIP-GUI sidebar <-> HAL /api/sessions <-> HAL SessionRegistry <-> disk
 */

export interface HalSession {
  id: string;
  title: string;
  model: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}

export interface HalSessionDetail extends HalSession {
  history: Array<{ role: string; content: string }>;
  status: {
    turns: number;
    total_cost_usd: number;
    total_tokens: number;
    model: string;
    session_id: string;
  };
}

function getHalUrl(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('grip-hal-url');
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_HAL_URL || null;
}

export function isHalBackend(): boolean {
  return getHalUrl() !== null;
}

export async function listSessions(): Promise<HalSession[]> {
  const url = getHalUrl();
  if (!url) return [];
  const res = await fetch(`${url}/api/sessions`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.sessions || [];
}

export async function getSession(sessionId: string): Promise<HalSessionDetail | null> {
  const url = getHalUrl();
  if (!url) return null;
  const res = await fetch(`${url}/api/sessions/${sessionId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createSession(model?: string, title?: string): Promise<string | null> {
  const url = getHalUrl();
  if (!url) return null;
  const res = await fetch(`${url}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, title }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session_id;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const url = getHalUrl();
  if (!url) return false;
  const res = await fetch(`${url}/api/sessions/${sessionId}`, { method: 'DELETE' });
  return res.ok;
}
