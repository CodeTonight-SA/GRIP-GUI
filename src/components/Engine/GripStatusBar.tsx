'use client';

import { useState, useEffect } from 'react';
import { Activity, Layers, Sparkles, Shield, Clock, Cpu, Zap } from 'lucide-react';
import GripPulse from './GripPulse';
import SessionSparkline from './SessionSparkline';
import type { GripMetrics } from '@/lib/grip-session';

interface GripStatusBarProps {
  activeMode?: string;
  skillCount?: number;
  contextPercent?: number;
  safetyActive?: boolean;
  metrics?: GripMetrics | null;
  isStreaming?: boolean;
  messageTimestamps?: number[];
}

/**
 * A minimal status bar at the bottom of the Engine page.
 * Shows active mode, skill count, context usage, safety gate status, and live session metrics.
 * Swiss Nihilism: monospace, tracking-widest, paper-thin, no height waste.
 */
export default function GripStatusBar({
  activeMode = 'code',
  skillCount = 5,
  contextPercent = 23,
  safetyActive = true,
  metrics,
  isStreaming = false,
  messageTimestamps = [],
}: GripStatusBarProps) {
  // Session elapsed time — updates every 30s (not every second, to avoid re-renders)
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const startTime = Date.now();
    const update = () => {
      const mins = Math.floor((Date.now() - startTime) / 60000);
      if (mins < 1) setElapsed('');
      else if (mins < 60) setElapsed(`${mins}m`);
      else setElapsed(`${Math.floor(mins / 60)}h${mins % 60}m`);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 h-6 border-t border-[var(--border)] bg-[var(--card)] flex items-center px-4 gap-6 shrink-0 overflow-hidden">
      {/* Ambient sweep — subtle horizontal light that crosses the status bar */}
      <div className="status-sweep" />

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

      {/* Live session metrics */}
      {isStreaming && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[var(--primary)] animate-pulse" strokeWidth={1.5} />
          <span className="font-mono text-[9px] tracking-widest text-[var(--primary)]">
            STREAMING
          </span>
        </div>
      )}

      {metrics?.model && (
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-[var(--muted-foreground)]" strokeWidth={1.5} />
          <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
            {metrics.model.toUpperCase()}
          </span>
        </div>
      )}

      {metrics?.totalDurationMs && !isStreaming && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[var(--muted-foreground)]" strokeWidth={1.5} />
          <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
            {(metrics.totalDurationMs / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {metrics?.numTurns && (
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
          {metrics.numTurns} TURNS
        </span>
      )}

      {/* Session activity sparkline — novel visualisation */}
      {messageTimestamps.length >= 2 && (
        <div className="flex items-center gap-1.5" title="Session activity">
          <SessionSparkline timestamps={messageTimestamps} />
        </div>
      )}

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

      {/* Session elapsed + GRIP version */}
      {elapsed && (
        <span className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] opacity-40">
          {elapsed}
        </span>
      )}
      <span className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] opacity-40">
        GRIP 0.1.0
      </span>
    </div>
  );
}
