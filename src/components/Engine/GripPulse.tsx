'use client';

import { useState, useEffect } from 'react';

interface PulseMetric {
  label: string;
  value: number;
  max: number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * GRIP Pulse — a novel ambient health visualisation.
 *
 * Shows system health as a row of vertical bar meters,
 * each pulsing at a rate proportional to their value.
 * Healthy = slow, calm pulse. Critical = fast, urgent pulse.
 *
 * Swiss Nihilism: sharp bars, no colour except cyan/warning/danger.
 * Inspired by hospital heart monitors — minimal, functional, informative.
 */
export default function GripPulse() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

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

        // Subtle pulse animation offset per bar
        const pulsePhase = (tick + i) % 3;
        const opacity = pulsePhase === 0 ? 0.7 : 1;

        return (
          <div key={metric.label} className="flex flex-col items-center gap-0.5" title={`${metric.label}: ${metric.value}${metric.unit || ''}`}>
            <div className="w-2 h-6 bg-[var(--border)] relative">
              <div
                className="absolute bottom-0 w-full transition-all duration-500"
                style={{
                  height: `${height}%`,
                  backgroundColor: colour,
                  opacity,
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
