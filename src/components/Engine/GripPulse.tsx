'use client';

interface PulseMetric {
  label: string;
  value: number;
  max: number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * GRIP Pulse — ambient health visualisation, 100% CSS-driven.
 *
 * Vertical bar meters with CSS keyframe pulse at staggered delays.
 * GPU-accelerated: uses opacity + transform only (no layout triggers).
 * No JS timers, no setState re-renders — pure 60fps.
 *
 * Swiss Nihilism: sharp bars, single accent colour, hospital monitor aesthetic.
 */
export default function GripPulse() {
  const metrics: PulseMetric[] = [
    { label: 'CTX', value: 23, max: 100, unit: '%', status: 'healthy' },
    { label: 'TOK', value: 45, max: 1000, unit: 'K', status: 'healthy' },
    { label: 'SKL', value: 5, max: 10, status: 'healthy' },
    { label: 'AGT', value: 2, max: 10, status: 'healthy' },
    { label: 'SAF', value: 10, max: 10, status: 'healthy' },
  ];

  return (
    <div className="flex items-end gap-1 h-8">
      {metrics.map((metric, i) => {
        const height = (metric.value / metric.max) * 100;
        const colour = metric.status === 'critical' ? 'var(--danger)'
          : metric.status === 'warning' ? 'var(--warning)'
          : 'var(--primary)';

        return (
          <div key={metric.label} className="flex flex-col items-center gap-0.5" title={`${metric.label}: ${metric.value}${metric.unit || ''}`}>
            <div className="w-2 h-6 bg-[var(--border)] relative overflow-hidden">
              <div
                className="absolute bottom-0 w-full grip-pulse-bar"
                style={{
                  height: `${height}%`,
                  backgroundColor: colour,
                  animationDelay: `${i * 400}ms`,
                  willChange: 'opacity',
                }}
              />
            </div>
            <span className="font-mono text-[6px] tracking-widest text-[var(--muted-foreground)]">
              {metric.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
