'use client';

import type { HalAgent } from '@/lib/hal-client';

interface AgentCardProps {
  agent: HalAgent;
}

const STRATEGY_COLORS: Record<string, string> = {
  fallback: 'var(--info)',
  sentinel: 'var(--warning)',
  council: 'var(--primary)',
  fixed: 'var(--muted-foreground)',
};

export function AgentCard({ agent }: AgentCardProps) {
  const stratColor = STRATEGY_COLORS[agent.routing_strategy] ?? 'var(--foreground)';
  const age = formatAge(agent.created_at);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] p-4 card-hover">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-mono font-bold text-sm text-[var(--foreground)]">
          {agent.name}
        </h3>
        <span className="text-xs font-mono text-[var(--muted-foreground)]">
          v{agent.version}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">MODEL</span>
          <span className="font-mono text-[var(--foreground)]">
            {agent.model || 'auto'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">ROUTING</span>
          <span className="font-mono" style={{ color: stratColor }}>
            {agent.routing_strategy.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted-foreground)]">AGE</span>
          <span className="font-mono text-[var(--foreground)]">{age}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-[var(--border)]">
        <span className="text-[10px] font-mono text-[var(--muted-foreground)] tracking-wider">
          {agent.agent_id}
        </span>
      </div>
    </div>
  );
}

function formatAge(timestamp: number): string {
  const diff = (Date.now() / 1000) - timestamp;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
