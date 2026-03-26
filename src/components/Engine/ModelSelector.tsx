'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  compact?: boolean;
}

const MODELS = [
  { id: 'sonnet', label: 'SONNET', description: 'Fast, capable', badge: 'DEFAULT' },
  { id: 'opus', label: 'OPUS', description: 'Most capable, slower', badge: 'DEEP' },
  { id: 'haiku', label: 'HAIKU', description: 'Fastest, lightweight', badge: 'QUICK' },
];

/**
 * Model selector for the chat input area.
 * Swiss Nihilism: monospace, tracking-widest, sharp dropdown.
 */
export default function ModelSelector({ value, onChange, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = MODELS.find(m => m.id === value) || MODELS[0];
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (compact) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
        >
          {current.label}
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-full left-0 mb-1 border border-[var(--border)] bg-[var(--card)] z-50 min-w-[140px]"
            >
              {MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => { onChange(model.id); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                    model.id === value
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-widest">{model.label}</span>
                  <span className="font-mono text-[9px] tracking-wider opacity-50">{model.badge}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
      >
        <span className="font-mono text-[10px] tracking-widest text-[var(--foreground)]">
          {current.label}
        </span>
        <ChevronDown className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-1 border border-[var(--border)] bg-[var(--card)] z-50 min-w-[180px]"
          >
            {MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => { onChange(model.id); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  model.id === value
                    ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-widest">{model.label}</span>
                  <span className="font-mono text-[10px] tracking-wider opacity-50">{model.badge}</span>
                </div>
                <span className="text-[10px] opacity-60 block mt-0.5">{model.description}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
