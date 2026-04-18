'use client';

/**
 * ModeStackChip — sidebar chip showing the active GRIP mode stack.
 *
 * Reads GET /api/grip/modes on mount and on every pathname change (council rider:
 * no cached state — if the toggle silently fails, the chip reflects reality, not
 * intent). Click dispatches `grip:open-palette` with `presetFilter='MODES'` so the
 * existing CommandPalette picks up the intent without coupling.
 *
 * Feature-flag rollback: when `localStorage.sidebarShowModeChip === 'false'`, the
 * component returns null. Ship behind flag for first release.
 */

import { useEffect, useState, useCallback } from 'react';
import { Layers } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/feature-flag';
import { getActiveModes } from '@/lib/grip-modes-client';

const OPEN_PALETTE_EVENT = 'grip:open-palette';
const FLAG_KEY = 'sidebarShowModeChip';

interface ModeStackChipProps {
  showLabels: boolean;
  isMobile?: boolean;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'ready'; modes: string[] }
  | { status: 'error' };

function openModesPalette(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OPEN_PALETTE_EVENT, { detail: { presetFilter: 'MODES' } }),
  );
}

function renderLabel(state: FetchState): string {
  if (state.status === 'loading') return '—';
  if (state.status === 'error') return 'MODES —';
  if (state.modes.length === 0) return 'NO MODES';
  return state.modes.join(' · ').toUpperCase();
}

export default function ModeStackChip({ showLabels, isMobile = false }: ModeStackChipProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const pathname = usePathname();
  const [flagEnabled] = useState(() => isFeatureEnabled(FLAG_KEY));

  useEffect(() => {
    if (!flagEnabled) return;
    let cancelled = false;

    // IPC-aware read: Electron uses window.electronAPI.grip.getModes(),
    // web uses fetch('/api/grip/modes'). Helper picks the right transport
    // so the packaged build doesn't 404 (Issue #133). Error flag lets us
    // distinguish "fetched empty" (render 'NO MODES') from "fetch failed"
    // (render honest 'MODES —').
    getActiveModes().then(({ modes, error }) => {
      if (cancelled) return;
      setState(error ? { status: 'error' } : { status: 'ready', modes });
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, flagEnabled]);

  const handleClick = useCallback(() => {
    openModesPalette();
  }, []);

  if (!flagEnabled) return null;

  const label = renderLabel(state);
  const ariaLabel =
    state.status === 'ready' && state.modes.length > 0
      ? `${state.modes.length} mode${state.modes.length === 1 ? '' : 's'} active: ${state.modes.join(', ')}. Click to manage.`
      : 'No modes active. Click to stack modes.';
  const showShortcutHint = showLabels && !isMobile;

  return (
    <button
      onClick={handleClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid="mode-stack-chip"
      className="group/chip relative w-full flex items-center gap-2.5 px-3 py-2 border-b border-[var(--border)] text-[var(--primary)] hover:bg-[var(--secondary)] transition-colors"
    >
      <Layers className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      {showLabels && (
        <span className="flex-1 font-mono text-[10px] tracking-widest truncate text-left">
          {label}
        </span>
      )}
      {showShortcutHint && (
        <span className="text-[9px] text-[var(--muted-foreground)] opacity-40 font-mono tabular-nums shrink-0">
          ⌘⇧M
        </span>
      )}
      {/* Collapsed tooltip — mirrors NavLink affordance */}
      {!showLabels && (
        <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--card)] border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--foreground)] whitespace-nowrap opacity-0 group-hover/chip:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm">
          {label}
        </span>
      )}
    </button>
  );
}
