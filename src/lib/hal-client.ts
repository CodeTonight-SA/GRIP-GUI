/**
 * HAL Client — typed API client for HAL backend.
 *
 * When HAL backend is active (NEXT_PUBLIC_HAL_URL or localStorage 'grip-hal-url'),
 * this module provides full HAL API access: sessions, chat (streaming), providers,
 * Fleet Commander (agents, tasks, fleet snapshot), and health monitoring.
 *
 * Data flows:
 *   GRIP-GUI <-> HAL /api/* <-> HAL registries <-> disk
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

// ─── Fleet Commander API ────────────────────────────────────

export interface HalAgent {
  agent_id: string;
  name: string;
  version: number;
  model: string;
  routing_strategy: string;
  created_at: number;
  updated_at: number;
}

export interface HalFleetSnapshot {
  timestamp: number;
  total_agents: number;
  total_sessions: number;
  active_sessions: number;
  completed_tasks: number;
  total_cost_usd: number;
  zero_cost_ratio: number;
  provider_diversity: number;
  council_usage: number;
  sentinel_interventions: number;
}

export interface HalTask {
  task_id: string;
  agent_id: string;
  description: string;
  status: string;
  turns_completed: number;
  cost_usd: number;
}

export interface HalProvider {
  name: string;
  type: string;
  healthy: boolean;
  models: string[];
  integrity?: number;
  target_integrity?: number;
}

export interface HalHealth {
  status: string;
  providers: HalProvider[];
  uptime_s: number;
}

export async function halProviders(): Promise<HalProvider[]> {
  const url = getHalUrl();
  if (!url) return [];
  const res = await fetch(`${url}/api/providers`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.providers || [];
}

export async function halFleet(): Promise<HalFleetSnapshot | null> {
  const url = getHalUrl();
  if (!url) return null;
  const res = await fetch(`${url}/api/fleet`);
  if (!res.ok) return null;
  return res.json();
}

export async function halAgents(): Promise<HalAgent[]> {
  const url = getHalUrl();
  if (!url) return [];
  const res = await fetch(`${url}/api/agents`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.agents || [];
}

export async function halTasks(agentId?: string): Promise<HalTask[]> {
  const url = getHalUrl();
  if (!url) return [];
  const query = agentId ? `?agent_id=${agentId}` : '';
  const res = await fetch(`${url}/api/tasks${query}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.tasks || [];
}

export async function halHealth(): Promise<HalHealth | null> {
  const url = getHalUrl();
  if (!url) return null;
  const res = await fetch(`${url}/api/health`);
  if (!res.ok) return null;
  return res.json();
}

export async function halChat(
  sessionId: string,
  message: string,
  model?: string,
): Promise<ReadableStream<string> | null> {
  const url = getHalUrl();
  if (!url) return null;
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, model }),
  });
  if (!res.ok || !res.body) return null;
  return res.body.pipeThrough(new TextDecoderStream());
}
