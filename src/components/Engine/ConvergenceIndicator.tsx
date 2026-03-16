'use client';

import { useState, useEffect } from 'react';

interface ConvergenceIndicatorProps {
  /** Current convergence depth (0 = surface, higher = deeper) */
  depth?: number;
  /** Maximum depth */
  maxDepth?: number;
  /** Whether convergence is active */
  active?: boolean;
  /** Criterion text */
  criterion?: string;
}

/**
 * Visual convergence depth indicator.
 * Shows concentric rings that fill as convergence deepens.
 * Novel design: the rings pulse subtly when active, creating
 * a "breathing" effect that mirrors Fibonacci Wave protocol.
 */
export default function ConvergenceIndicator({
  depth = 0,
  maxDepth = 11,
  active = false,
  criterion,
}: ConvergenceIndicatorProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, [active]);

  const rings = Math.min(5, maxDepth);
  const filledRings = Math.ceil((depth / maxDepth) * rings);

  return (
    <div className="flex items-center gap-3">
      {/* Concentric rings */}
      <div className="relative w-8 h-8 flex items-center justify-center">
        {Array.from({ length: rings }).map((_, i) => {
          const size = 8 + i * 5;
          const isFilled = i < filledRings;
          return (
            <div
              key={i}
              className="absolute border transition-all"
              style={{
                width: size,
                height: size,
                borderColor: isFilled ? 'var(--primary)' : 'var(--border)',
                opacity: active && pulse && isFilled ? 0.6 : 1,
                transitionDuration: '0.6s',
              }}
            />
          );
        })}
        {active && (
          <div
            className="absolute w-2 h-2 bg-[var(--primary)]"
            style={{ opacity: pulse ? 1 : 0.4, transition: 'opacity 0.6s' }}
          />
        )}
      </div>

      {/* Text */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-[var(--foreground)]">
            {active ? 'CONVERGING' : depth > 0 ? 'CONVERGED' : 'IDLE'}
          </span>
          {depth > 0 && (
            <span className="font-mono text-[9px] tracking-wider text-[var(--muted-foreground)]">
              D{depth}/{maxDepth}
            </span>
          )}
        </div>
        {criterion && (
          <span className="font-mono text-[8px] tracking-wider text-[var(--muted-foreground)] block mt-0.5 max-w-[200px] truncate">
            {criterion}
          </span>
        )}
      </div>
    </div>
  );
}
