'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Layers, Sparkles, Activity, Plus } from 'lucide-react';
import RetrievalTierIndicator from './RetrievalTierIndicator';
import ConvergenceIndicator from './ConvergenceIndicator';
import ModeQuickSwitch from './ModeQuickSwitch';

interface ContextPanelProps {
  activeMode?: string;
  activeSkills?: string[];
  contextUsage?: number;
  tokenCount?: number;
}

export default function ContextPanel({
  activeMode = 'code',
  activeSkills = ['design-principles', 'feature-complete'],
  contextUsage = 23,
  tokenCount = 45200,
}: ContextPanelProps) {
  const reduceMotion = useReducedMotion();
  const ctxColour = contextUsage > 80 ? 'var(--danger)' : contextUsage > 60 ? 'var(--warning)' : 'var(--primary)';
  return (
    <div className="h-full flex flex-col bg-[var(--card)]">
      {/* Mode — Quick Switch */}
      <div className="p-4 border-b border-[var(--border)]">
        <span className="grip-label block mb-2">MODE</span>
        <ModeQuickSwitch />
      </div>

      {/* Active Skills */}
      <div className="p-4 border-b border-[var(--border)]">
        <span className="grip-label block mb-2">SKILLS</span>
        <div className="space-y-1.5">
          {activeSkills.map((skill, i) => (
            <motion.div
              key={skill}
              className="flex items-center gap-2"
              initial={reduceMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: reduceMotion ? 0 : i * 0.05 }}
            >
              <Sparkles className="w-3 h-3 text-[var(--primary)]" strokeWidth={1.5} />
              <span className="font-mono text-[11px] tracking-wider text-[var(--foreground)]">
                {skill}
              </span>
            </motion.div>
          ))}
          <button className="flex items-center gap-2 mt-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            <span className="font-mono text-[10px] tracking-widest">ADD SKILL</span>
          </button>
        </div>
      </div>

      {/* Session Health */}
      <div className="p-4 border-b border-[var(--border)]">
        <span className="grip-label block mb-2">SESSION</span>
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">CTX</span>
              <span className="font-mono text-[10px] tracking-wider text-[var(--foreground)]">{contextUsage}%</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border)] overflow-hidden">
              <motion.div
                className="h-full"
                initial={reduceMotion ? { width: `${contextUsage}%` } : { width: '0%' }}
                animate={{ width: `${contextUsage}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ backgroundColor: ctxColour }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">TOKENS</span>
            <span className="font-mono text-[10px] tracking-wider text-[var(--foreground)]">
              {(tokenCount / 1000).toFixed(1)}K
            </span>
          </div>
        </div>
      </div>

      {/* Retrieval Tier — GRIP-First Thinking visualised */}
      <div className="p-4 border-b border-[var(--border)]">
        <RetrievalTierIndicator activeTier={0} />
      </div>

      {/* Convergence — depth indicator */}
      <div className="p-4 border-b border-[var(--border)]">
        <span className="grip-label block mb-2">CONVERGENCE</span>
        <ConvergenceIndicator depth={0} maxDepth={11} active={false} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 flex-1">
        <span className="grip-label block mb-2">ACTIONS</span>
        <div className="space-y-1">
          {[
            { label: 'NEW CHAT', shortcut: 'N' },
            { label: 'SWITCH MODE', shortcut: '6' },
            { label: 'BROWSE SKILLS', shortcut: '5' },
            { label: 'COMMANDS', shortcut: 'K' },
          ].map((action) => (
            <button
              key={action.label}
              className="w-full flex items-center justify-between py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <span className="font-mono text-[10px] tracking-widest">{action.label}</span>
              <span className="font-mono text-[9px] text-[var(--muted-foreground)] opacity-50">
                {action.shortcut}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Safety Status */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-[var(--success)]" strokeWidth={1.5} />
          <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
            SAFETY GATES ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
}
