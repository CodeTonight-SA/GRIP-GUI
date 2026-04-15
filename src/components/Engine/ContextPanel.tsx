'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Layers, Sparkles, Activity, Plus, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
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
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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

      {/* Slash Command Quick Stack */}
      <SlashCommandStack />

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

const SLASH_COMMANDS = [
  { cmd: '/recall', desc: 'Load all memory', category: 'session' },
  { cmd: '/save', desc: 'Persist session state', category: 'session' },
  { cmd: '/mode', desc: 'Switch operating mode', category: 'session' },
  { cmd: '/converge', desc: 'Recursive convergence', category: 'workflow' },
  { cmd: '/rsi', desc: 'RSI sprint loop', category: 'workflow' },
  { cmd: '/broly', desc: 'Meta-agent protocol', category: 'workflow' },
  { cmd: '/learn', desc: 'Run learning pipeline', category: 'workflow' },
  { cmd: '/create-pr', desc: 'Automated PR creation', category: 'git' },
  { cmd: '/shipit', desc: 'Commit + push + PR', category: 'git' },
  { cmd: '/review-pr', desc: 'Review contribution', category: 'git' },
  { cmd: '/coffee', desc: 'Session diagnostic', category: 'easter' },
  { cmd: '/demo', desc: 'Demo protocols', category: 'easter' },
];

function SlashCommandStack() {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(['/recall', '/save']));

  const toggle = (cmd: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cmd)) next.delete(cmd);
      else next.add(cmd);
      return next;
    });
  };

  return (
    <div className="p-4 flex-1 overflow-y-auto">
      <button
        onClick={() => setExpanded(!expanded)}
        className="grip-label flex items-center gap-1 mb-2 w-full text-left"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Terminal className="w-3 h-3" />
        COMMANDS ({selected.size})
      </button>
      {expanded && (
        <div className="space-y-0.5">
          {SLASH_COMMANDS.map(({ cmd, desc }) => {
            const isSelected = selected.has(cmd);
            return (
              <button
                key={cmd}
                onClick={() => toggle(cmd)}
                className={`w-full flex items-center justify-between py-1 px-1.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <span className="font-mono text-[10px] tracking-wider">{cmd}</span>
                <span className="font-mono text-[8px] tracking-wider opacity-50 truncate ml-2">{desc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
