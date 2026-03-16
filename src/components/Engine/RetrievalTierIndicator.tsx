'use client';

/**
 * Visualises GRIP-First Thinking retrieval tiers.
 * Shows which tier GRIP is operating at for each response.
 *
 * Tier 0: Session context (~0 tokens)
 * Tier 1: KONO semantic search (~200 tokens)
 * Tier 2: Structured lookup (~500 tokens)
 * Tier 3: Filesystem search (~1000 tokens)
 * Tier 4: Explore agent (~88k tokens)
 *
 * Novel design: a cascading waterfall where each tier is a step down,
 * and only the active tier glows cyan. Higher tiers (more expensive)
 * are visually "deeper" — reinforcing the cost metaphor.
 */

interface RetrievalTierIndicatorProps {
  activeTier: number;
  compact?: boolean;
}

const TIERS = [
  { id: 0, label: 'CONTEXT', tokens: '~0', description: 'Session memory' },
  { id: 1, label: 'KONO', tokens: '~200', description: 'Semantic search' },
  { id: 2, label: 'LOOKUP', tokens: '~500', description: 'Known paths' },
  { id: 3, label: 'SEARCH', tokens: '~1K', description: 'Filesystem' },
  { id: 4, label: 'EXPLORE', tokens: '~88K', description: 'Deep agent' },
];

export default function RetrievalTierIndicator({
  activeTier,
  compact = false,
}: RetrievalTierIndicatorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">T</span>
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className="transition-colors"
            style={{
              width: 3 + tier.id,
              height: 8,
              backgroundColor: tier.id <= activeTier ? 'var(--primary)' : 'var(--border)',
              opacity: tier.id === activeTier ? 1 : tier.id < activeTier ? 0.4 : 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="grip-label block mb-1">RETRIEVAL TIER</span>
      {TIERS.map((tier) => {
        const isActive = tier.id === activeTier;
        const isPast = tier.id < activeTier;
        return (
          <div
            key={tier.id}
            className="flex items-center gap-2 transition-colors"
            style={{ paddingLeft: tier.id * 4 }}
          >
            <div
              className="w-1.5 h-1.5 shrink-0 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--primary)' : isPast ? 'var(--primary)' : 'var(--border)',
                opacity: isActive ? 1 : isPast ? 0.3 : 0.15,
              }}
            />
            <span className={`font-mono text-[9px] tracking-widest ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
            }`}>
              {tier.label}
            </span>
            <span className="font-mono text-[8px] text-[var(--muted-foreground)] opacity-50">
              {tier.tokens}
            </span>
          </div>
        );
      })}
    </div>
  );
}
