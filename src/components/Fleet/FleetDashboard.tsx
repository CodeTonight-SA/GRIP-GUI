'use client';

import { useEffect, useState } from 'react';
import { halFleet, halAgents, halTasks, halProviders, type HalFleetSnapshot, type HalAgent, type HalTask, type HalProvider } from '@/lib/hal-client';
import { AgentCard } from './AgentCard';
import { ProviderHealthBar } from './ProviderHealthBar';

export function FleetDashboard() {
  const [fleet, setFleet] = useState<HalFleetSnapshot | null>(null);
  const [agents, setAgents] = useState<HalAgent[]>([]);
  const [tasks, setTasks] = useState<HalTask[]>([]);
  const [providers, setProviders] = useState<HalProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [f, a, t, p] = await Promise.all([
        halFleet(), halAgents(), halTasks(), halProviders(),
      ]);
      setFleet(f);
      setAgents(a);
      setTasks(t);
      setProviders(p);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--muted-foreground)] font-mono text-sm tracking-wider">
          FLEET COMMAND LOADING
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Fleet Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="AGENTS" value={fleet?.total_agents ?? 0} />
        <StatCard label="SESSIONS" value={fleet?.total_sessions ?? 0} />
        <StatCard label="TASKS DONE" value={fleet?.completed_tasks ?? 0} />
        <StatCard
          label="COST"
          value={`$${(fleet?.total_cost_usd ?? 0).toFixed(4)}`}
        />
      </div>

      {/* Provider Health */}
      <section>
        <h2 className="grip-label mb-3">PROVIDER HEALTH</h2>
        <div className="space-y-2">
          {providers.map((p) => (
            <ProviderHealthBar key={p.name} provider={p} />
          ))}
          {providers.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No providers detected</p>
          )}
        </div>
      </section>

      {/* Agents */}
      <section>
        <h2 className="grip-label mb-3">FLEET AGENTS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((a) => (
            <AgentCard key={a.agent_id} agent={a} />
          ))}
          {agents.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No agents defined</p>
          )}
        </div>
      </section>

      {/* Tasks */}
      <section>
        <h2 className="grip-label mb-3">BACKGROUND TASKS</h2>
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.task_id} task={t} />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No tasks running</p>
          )}
        </div>
      </section>

      {/* Fleet Metrics */}
      <section>
        <h2 className="grip-label mb-3">FLEET METRICS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="ZERO COST"
            value={`${((fleet?.zero_cost_ratio ?? 0) * 100).toFixed(0)}%`}
          />
          <StatCard label="PROVIDERS" value={fleet?.provider_diversity ?? 0} />
          <StatCard label="COUNCIL" value={fleet?.council_usage ?? 0} />
          <StatCard label="SENTINEL" value={fleet?.sentinel_interventions ?? 0} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] p-3">
      <div className="grip-label text-[var(--muted-foreground)]">{label}</div>
      <div className="text-xl font-mono font-bold text-[var(--foreground)] mt-1">
        {value}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: HalTask }) {
  const statusColor = {
    queued: 'var(--muted-foreground)',
    running: 'var(--warning)',
    completed: 'var(--success)',
    failed: 'var(--danger)',
    cancelled: 'var(--muted-foreground)',
  }[task.status] ?? 'var(--foreground)';

  return (
    <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] p-3">
      <div>
        <span className="font-mono text-sm">{task.task_id}</span>
        <span className="mx-2 text-[var(--muted-foreground)]">|</span>
        <span className="text-sm">{task.description.slice(0, 60)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono" style={{ color: statusColor }}>
          {task.status.toUpperCase()}
        </span>
        <span className="text-xs text-[var(--muted-foreground)] font-mono">
          ${task.cost_usd.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
