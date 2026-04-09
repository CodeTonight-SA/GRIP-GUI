'use client';

import type { HalProvider } from '@/lib/hal-client';

interface ProviderHealthBarProps {
  provider: HalProvider;
}

export function ProviderHealthBar({ provider }: ProviderHealthBarProps) {
  const integrity = provider.integrity ?? 1.0;
  const target = provider.target_integrity ?? 1.0;
  const pct = Math.round(integrity * 100);
  const isHealthy = provider.healthy;

  const barColor = pct > 80
    ? 'var(--success)'
    : pct > 50
      ? 'var(--warning)'
      : 'var(--danger)';

  const typeLabel = provider.type === 'local' ? 'LOCAL' : 'CLOUD';
  const typeColor = provider.type === 'local' ? 'var(--success)' : 'var(--info)';

  return (
    <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] p-3">
      {/* Status dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: isHealthy ? 'var(--success)' : 'var(--danger)' }}
      />

      {/* Provider name + type */}
      <div className="w-24 flex-shrink-0">
        <div className="font-mono text-sm font-bold text-[var(--foreground)]">
          {provider.name}
        </div>
        <div className="text-[10px] font-mono tracking-wider" style={{ color: typeColor }}>
          {typeLabel}
        </div>
      </div>

      {/* Integrity bar */}
      <div className="flex-1">
        <div className="h-2 bg-[var(--muted)] relative">
          {/* Target line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[var(--foreground)] opacity-30"
            style={{ left: `${target * 100}%` }}
          />
          {/* Actual bar */}
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Percentage */}
      <div className="w-12 text-right font-mono text-sm" style={{ color: barColor }}>
        {pct}%
      </div>

      {/* Models count */}
      <div className="w-16 text-right text-xs text-[var(--muted-foreground)] font-mono">
        {provider.models?.length ?? 0} models
      </div>
    </div>
  );
}
