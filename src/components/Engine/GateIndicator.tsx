'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';

export interface GateEvent {
  id: string;
  type: 'deny' | 'warn' | 'info';
  gate: string;
  message: string;
  timestamp: Date;
}

interface GateIndicatorProps {
  gates: GateEvent[];
}

const TYPE_STYLES = {
  deny: {
    border: 'border-red-800/60',
    bg: 'bg-red-950/30',
    icon: 'text-red-400',
    label: 'BLOCKED',
    labelColor: 'text-red-400',
  },
  warn: {
    border: 'border-amber-800/60',
    bg: 'bg-amber-950/20',
    icon: 'text-amber-400',
    label: 'WARNING',
    labelColor: 'text-amber-400',
  },
  info: {
    border: 'border-blue-800/60',
    bg: 'bg-blue-950/20',
    icon: 'text-blue-400',
    label: 'GATE',
    labelColor: 'text-blue-400',
  },
};

/**
 * Gate indicator — shows when GRIP safety gates fire during a response.
 * Displays denied actions (red), warnings (amber), and info (blue).
 * Expandable to show the full gate message.
 */
export default function GateIndicator({ gates }: GateIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  if (gates.length === 0) return null;

  const latest = gates[gates.length - 1];
  const style = TYPE_STYLES[latest.type];

  return (
    <motion.div
      className="my-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 border ${style.border} ${style.bg} text-left transition-colors hover:opacity-90`}
      >
        <Shield className={`w-3.5 h-3.5 ${style.icon} flex-shrink-0`} />
        <span className={`font-mono text-[10px] tracking-widest ${style.labelColor} flex-shrink-0`}>
          {style.label}
        </span>
        <span className="font-mono text-xs text-[var(--muted-foreground)] truncate flex-1">
          {latest.gate}
        </span>
        <span className="font-mono text-[10px] text-[var(--muted-foreground)] opacity-50 flex-shrink-0">
          {gates.length > 1 ? `${gates.length} gates` : ''}
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-[var(--muted-foreground)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)] flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={`border border-t-0 ${style.border} ${style.bg} px-3 py-2 space-y-1.5`}>
              {gates.map((gate) => {
                const gStyle = TYPE_STYLES[gate.type];
                return (
                  <div key={gate.id} className="flex items-start gap-2">
                    <span className={`font-mono text-[10px] tracking-widest ${gStyle.labelColor} mt-0.5 flex-shrink-0`}>
                      {gStyle.label}
                    </span>
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      {gate.message}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
