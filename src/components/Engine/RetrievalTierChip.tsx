'use client';

/**
 * RetrievalTierChip — the chat-input companion to RetrievalTierIndicator.
 *
 * Surfaces GRIP's Rule 0 (GRIP-First Thinking) retrieval tier in real time:
 * whenever a retrieval fires, a CustomEvent 'grip:retrieval-tier' is emitted
 * with { tier: number }; this chip listens and shows the plain-English label
 * for the most recent firing.
 *
 * Council scope rider (Devil's Advocate, Rule 17): labels are plain English,
 * NOT "TIER 0 / TIER 4". The first shippable slice is binary (cached vs
 * searched) per the Pragmatist scope note; the 5-way detail ships in a
 * follow-on once the tiers are observable from real telemetry sessions.
 *
 * Honest-blank state: the chip renders "—" with a dimmed icon until the first
 * event arrives. A dishonest default is worse than no default.
 */

import { useEffect, useState } from 'react';
import { Database, Search } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/feature-flag';

const EVENT_NAME = 'grip:retrieval-tier';
const FLAG_KEY = 'retrievalTierChip';

export interface RetrievalTierEventDetail {
  tier: number; // 0-4, per rules/efficiency-rules.md Rule 0 tier table
}

type ChipState =
  | { status: 'idle' }
  | { status: 'cached'; tier: number }
  | { status: 'searched'; tier: number };

function classifyTier(tier: number): Exclude<ChipState, { status: 'idle' }> {
  // Binary slice per Pragmatist scope: tier 0-1 = cached, 2-4 = searched.
  // The full 5-way detail is deferred to S4-PR2 once live telemetry exists.
  return tier <= 1 ? { status: 'cached', tier } : { status: 'searched', tier };
}

function renderLabel(state: ChipState): string {
  if (state.status === 'idle') return '—';
  if (state.status === 'cached') return 'CACHED';
  return 'SEARCHED';
}

export default function RetrievalTierChip() {
  const [state, setState] = useState<ChipState>({ status: 'idle' });
  const [flagEnabled] = useState(() => isFeatureEnabled(FLAG_KEY));

  useEffect(() => {
    if (!flagEnabled) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<RetrievalTierEventDetail>).detail;
      if (!detail || typeof detail.tier !== 'number') return;
      setState(classifyTier(detail.tier));
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [flagEnabled]);

  if (!flagEnabled) return null;

  const label = renderLabel(state);
  // Icon: Database for cached (memory hit), Search for searched (went to disk).
  // Keep both always imported so we don't get a render flash on first event.
  const Icon = state.status === 'searched' ? Search : Database;
  const isIdle = state.status === 'idle';
  const tone =
    state.status === 'cached'
      ? 'text-[var(--primary)]'
      : state.status === 'searched'
        ? 'text-[var(--warning)]'
        : 'text-[var(--muted-foreground)] opacity-60';

  const aria =
    state.status === 'idle'
      ? 'Retrieval tier: no retrieval yet in this session.'
      : state.status === 'cached'
        ? 'Last retrieval: cached (memory hit, near-zero cost).'
        : 'Last retrieval: searched (disk or agent, higher cost).';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={aria}
      data-testid="retrieval-tier-chip"
      className={`inline-flex items-center gap-1.5 border border-[var(--border)] px-2 py-0.5 w-fit mb-2 transition-colors ${tone}`}
    >
      <Icon className="w-3 h-3 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <span className="font-mono text-[9px] tracking-widest">
        {label}
      </span>
      {!isIdle && (
        <span
          className="font-mono text-[8px] tracking-widest opacity-40"
          data-testid="retrieval-tier-chip-tier-hint"
        >
          T{state.tier}
        </span>
      )}
    </div>
  );
}
