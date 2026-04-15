'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const SHORTCUTS = [
  { category: 'NAVIGATION', items: [
    { keys: ['1'], description: 'Engine' },
    { keys: ['2'], description: 'Agents' },
    { keys: ['3'], description: 'Tasks' },
    { keys: ['4'], description: 'Vault' },
    { keys: ['5'], description: 'Skills' },
    { keys: ['6'], description: 'Modes' },
  ]},
  { category: 'COMMANDS', items: [
    { keys: ['Cmd', 'K'], description: 'Command Palette' },
    { keys: ['Cmd', 'B'], description: 'Toggle Sidebar' },
    { keys: ['Cmd', 'Shift', 'F'], description: 'Focus Mode' },
    { keys: ['Cmd', ','], description: 'Settings' },
    { keys: ['D'], description: 'Toggle Dark Mode' },
    { keys: ['M'], description: 'Memory' },
    { keys: ['?'], description: 'This Help' },
  ]},
  { category: 'CHAT', items: [
    { keys: ['Enter'], description: 'Send Message' },
    { keys: ['Shift', 'Enter'], description: 'New Line' },
    { keys: ['Esc'], description: 'Close Overlay' },
  ]},
];

/**
 * Full-screen keyboard shortcuts overlay.
 * Triggered by pressing '?' anywhere.
 * Swiss Nihilism: black overlay, monospace, sharp borders, cyan accents.
 */
export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="fixed inset-0 z-[300]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => setIsOpen(false)}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="border border-[var(--border)] bg-[var(--card)]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)]">
              KEYBOARD SHORTCUTS
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] border border-[var(--border)] px-2 py-0.5 hover:text-[var(--foreground)] transition-colors"
            >
              ESC
            </button>
          </div>

          {/* Shortcuts */}
          <div className="p-6 space-y-6">
            {SHORTCUTS.map((group, groupIndex) => (
              <motion.div
                key={group.category}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: reduceMotion ? 0 : groupIndex * 0.1 }}
              >
                <span className="font-mono text-[10px] tracking-widest text-[var(--primary)] block mb-2">
                  {group.category}
                </span>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <div key={item.description} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, i) => (
                          <span key={i}>
                            <kbd className="font-mono text-[10px] tracking-wider text-[var(--foreground)] bg-[var(--secondary)] border border-[var(--border)] px-1.5 py-0.5 min-w-[24px] text-center inline-block">
                              {key}
                            </kbd>
                            {i < item.keys.length - 1 && (
                              <span className="text-[var(--muted-foreground)] text-[10px] mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[var(--border)]">
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              PRESS ? TO TOGGLE | ESC TO CLOSE
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
