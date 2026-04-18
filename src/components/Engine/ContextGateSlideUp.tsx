'use client';

/**
 * ContextGateSlideUp — action strip at 85% context (S5).
 *
 * When the conversation approaches GRIP's PARAMOUNT context gate at 85%,
 * surfaces three options at the point of fear instead of burying them in
 * settings. Replaces, not augments, the red gauge in the status bar — the
 * council's explicit scope rider (see plans/grip-commander-phase2-backlog.md).
 *
 * Events it reads:
 *   - `grip:context-gate-warning` with `{ percent: number }` — triggers the
 *     slide-up when percent >= 85. Parent can also dispatch `{ percent: 0 }`
 *     (or below 85) to manually dismiss.
 *
 * Events it dispatches on each action:
 *   - `grip:context-gate-action` with `{ action: 'compact' | 'fresh' | 'checkpoint' }`
 *
 * The main process / session control server picks up the dispatched action
 * and executes the corresponding flow. This component is renderer-only — no
 * IPC here, no direct state mutation. Keeping it pure makes it trivially
 * testable and lets the action handlers evolve independently.
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Compass, Save, Zap, type LucideIcon } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/feature-flag';

const WARN_EVENT = 'grip:context-gate-warning';
const ACTION_EVENT = 'grip:context-gate-action';
const FLAG_KEY = 'contextGateSlideUp';
const TRIGGER_THRESHOLD = 85;

type Action = 'compact' | 'fresh' | 'checkpoint';

interface WarnDetail {
  percent: number;
}

/**
 * ContextGateActionButton — DRY subcomponent for the three slide-up actions.
 * Extracted per Issue #127: the original three buttons differed only in
 * icon, label, and action argument. Keeping the markup here (not a separate
 * file) because it's only meaningful inside ContextGateSlideUp.
 */
interface ActionButtonProps {
  action: Action;
  icon: LucideIcon;
  label: string;
  onClick: (action: Action) => void;
}

function ContextGateActionButton({ action, icon: Icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={() => onClick(action)}
      data-testid={`context-gate-action-${action}`}
      className="flex items-center gap-1.5 border border-[var(--border)] px-3 py-1 font-mono text-[10px] tracking-widest text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
    >
      <Icon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
      {label}
    </button>
  );
}

function dispatchAction(action: Action): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTION_EVENT, { detail: { action } }));
}

export default function ContextGateSlideUp() {
  const [percent, setPercent] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [flagEnabled] = useState(() => isFeatureEnabled(FLAG_KEY));

  useEffect(() => {
    if (!flagEnabled) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WarnDetail>).detail;
      if (!detail || typeof detail.percent !== 'number') return;
      setPercent(detail.percent);
      // Any new reading below threshold implicitly re-arms the dismissal.
      if (detail.percent < TRIGGER_THRESHOLD) setDismissed(false);
    };
    window.addEventListener(WARN_EVENT, handler);
    return () => window.removeEventListener(WARN_EVENT, handler);
  }, [flagEnabled]);

  const handle = useCallback((action: Action) => {
    dispatchAction(action);
    setDismissed(true);
  }, []);

  if (!flagEnabled) return null;

  const visible =
    percent !== null && percent >= TRIGGER_THRESHOLD && !dismissed;

  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="context-gate-title"
      aria-describedby="context-gate-description"
      data-testid="context-gate-slide-up"
      className="absolute bottom-4 left-4 right-4 z-30 border border-[var(--danger)] bg-[var(--card)] shadow-lg animate-[slideUp_200ms_ease-out]"
    >
      <div className="flex items-center gap-4 px-6 py-3">
        <AlertTriangle
          className="w-4 h-4 text-[var(--danger)] shrink-0"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <span
            id="context-gate-title"
            className="font-mono text-[11px] tracking-widest text-[var(--danger)] uppercase"
          >
            Context gate {percent}% —
          </span>{' '}
          <span
            id="context-gate-description"
            className="font-mono text-[11px] tracking-widest text-[var(--muted-foreground)]"
          >
            pick an action before we blow the 85% ceiling.
          </span>
        </div>
        <ContextGateActionButton action="compact" icon={Compass} label="COMPACT" onClick={handle} />
        <ContextGateActionButton action="fresh" icon={Zap} label="FRESH SESSION" onClick={handle} />
        <ContextGateActionButton action="checkpoint" icon={Save} label="CHECKPOINT" onClick={handle} />
      </div>
    </div>
  );
}
