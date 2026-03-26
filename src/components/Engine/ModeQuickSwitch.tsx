'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ChevronDown } from 'lucide-react';
import { GRIP_MODES, getModesByCategory, type ModeCategory } from '@/lib/grip-modes';

/**
 * Inline mode quick-switcher for the Engine context panel.
 * Dropdown that shows current mode and allows instant switching.
 * No page navigation required — switch modes mid-conversation.
 *
 * Swiss Nihilism: sharp dropdown, monospace, tracking-widest categories.
 */
export default function ModeQuickSwitch() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('code');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const currentMode = GRIP_MODES.find(m => m.id === activeMode);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 p-2 border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[var(--primary)]" strokeWidth={1.5} />
          <span className="font-mono text-xs font-bold tracking-wider text-[var(--primary)]">
            {currentMode?.name || 'CODE'}
          </span>
        </div>
        <ChevronDown className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute top-full left-0 right-0 mt-1 border border-[var(--border)] bg-[var(--card)] z-50 max-h-[300px] overflow-y-auto">
          {(['development', 'strategy', 'content', 'research', 'operations', 'meta'] as ModeCategory[]).map(category => {
            const modes = getModesByCategory(category);
            return (
              <div key={category}>
                <div className="px-3 py-1.5 bg-[var(--secondary)]">
                  <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                    {category.toUpperCase()}
                  </span>
                </div>
                {modes.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => { setActiveMode(mode.id); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                      mode.id === activeMode
                        ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
                    }`}
                  >
                    <div>
                      <span className="font-mono text-[10px] tracking-widest block">{mode.name}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5 max-w-[200px] truncate">
                        {mode.description}
                      </span>
                    </div>
                    {mode.id === activeMode && (
                      <div className="w-1.5 h-1.5 bg-[var(--primary)] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
