'use client';

import { Activity, Layers, Sparkles, Shield } from 'lucide-react';
import GripPulse from './GripPulse';

interface GripStatusBarProps {
  activeMode?: string;
  skillCount?: number;
  contextPercent?: number;
  safetyActive?: boolean;
}

/**
 * A minimal status bar at the bottom of the Engine page.
 * Shows active mode, skill count, context usage, and safety gate status.
 * Swiss Nihilism: monospace, tracking-widest, paper-thin, no height waste.
 */
export default function GripStatusBar({
  activeMode = 'code',
  skillCount = 5,
  contextPercent = 23,
  safetyActive = true,
}: GripStatusBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 h-6 border-t border-[var(--border)] bg-[var(--card)] flex items-center px-4 gap-6 shrink-0">
      {/* Mode */}
      <div className="flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-[var(--primary)]" strokeWidth={1.5} />
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
          {activeMode.toUpperCase()}
        </span>
      </div>

      {/* Skills */}
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-[var(--muted-foreground)]" strokeWidth={1.5} />
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
          {skillCount} SKILLS
        </span>
      </div>

      {/* Context */}
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-[var(--muted-foreground)]" strokeWidth={1.5} />
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
          CTX {contextPercent}%
        </span>
        <div className="w-16 h-1 bg-[var(--border)]">
          <div
            className={`h-full transition-all ${contextPercent > 80 ? 'bg-[var(--danger)]' : contextPercent > 60 ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`}
            style={{ width: `${contextPercent}%` }}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pulse — ambient health visualisation */}
      <GripPulse />

      {/* Safety */}
      <div className="flex items-center gap-1.5">
        <Shield className={`w-3 h-3 ${safetyActive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`} strokeWidth={1.5} />
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
          {safetyActive ? 'GATES ACTIVE' : 'GATES OFF'}
        </span>
      </div>

      {/* GRIP version */}
      <span className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] opacity-40">
        GRIP 0.1.0
      </span>
    </div>
  );
}
