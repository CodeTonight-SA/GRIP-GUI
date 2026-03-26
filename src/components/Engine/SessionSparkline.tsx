'use client';

import { useMemo } from 'react';

interface SessionSparklineProps {
  /** Array of message timestamps (Date.now() values) */
  timestamps: number[];
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Number of time buckets */
  buckets?: number;
}

/**
 * Session Activity Sparkline — a novel inline SVG chart.
 *
 * Shows message frequency over the current session as a tiny bar chart.
 * Groups timestamps into time buckets and renders a miniature histogram.
 * Unique to GRIP Commander — no other chat app visualises session activity
 * at this resolution in the status bar.
 *
 * Swiss Nihilism: sharp bars, cyan fill, no axes, no labels.
 * Pure data visualisation in ~40px width.
 */
export default function SessionSparkline({
  timestamps,
  width = 40,
  height = 12,
  buckets = 10,
}: SessionSparklineProps) {
  const bars = useMemo(() => {
    if (timestamps.length < 2) return [];

    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const range = max - min || 1;
    const bucketWidth = range / buckets;

    // Count messages per bucket
    const counts = new Array(buckets).fill(0);
    for (const ts of timestamps) {
      const idx = Math.min(Math.floor((ts - min) / bucketWidth), buckets - 1);
      counts[idx]++;
    }

    const maxCount = Math.max(...counts, 1);
    return counts.map(c => c / maxCount);
  }, [timestamps, buckets]);

  if (bars.length === 0) return null;

  const barWidth = width / bars.length;
  const gap = 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-label="Session activity"
    >
      {bars.map((value, i) => {
        const barH = Math.max(1, value * height);
        return (
          <rect
            key={i}
            x={i * barWidth + gap / 2}
            y={height - barH}
            width={Math.max(1, barWidth - gap)}
            height={barH}
            fill="var(--primary)"
            opacity={0.4 + value * 0.6}
          />
        );
      })}
    </svg>
  );
}
