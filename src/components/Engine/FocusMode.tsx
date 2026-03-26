'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Minimize2, Maximize2 } from 'lucide-react';

interface FocusModeProps {
  children: React.ReactNode;
  onToggle?: (focused: boolean) => void;
}

/**
 * Focus Mode — strips the UI to just the chat interface.
 * Hides sidebar, context panel, and status bar.
 * Triggered by Cmd+Shift+F or the focus button.
 *
 * Design: when entering focus mode, the background subtly darkens
 * and the chat interface expands to full width with generous margins.
 * A single floating "exit focus" button remains in the corner.
 *
 * For knowledge workers who just want to think with GRIP.
 */
export default function FocusMode({ children, onToggle }: FocusModeProps) {
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setFocused(prev => {
          const next = !prev;
          onToggle?.(next);
          return next;
        });
      }
      if (e.key === 'Escape' && focused) {
        setFocused(false);
        onToggle?.(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused, onToggle]);

  return (
    <div className="relative">
      {children}
      {/* Focus mode trigger */}
      {!focused && (
        <button
          onClick={() => { setFocused(true); onToggle?.(true); }}
          className="absolute top-3 right-3 p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors opacity-0 hover:opacity-100"
          title="Enter Focus Mode (Cmd+Shift+F)"
        >
          <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}

      {/* Cinematic focus overlay */}
      <AnimatePresence>
        {focused && (
          <motion.div
            className="fixed inset-0 z-[100] bg-[var(--background)]"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Exit button */}
            <motion.button
              onClick={() => { setFocused(false); onToggle?.(false); }}
              className="fixed top-4 right-4 z-[101] p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors border border-[var(--border)] bg-[var(--card)]"
              title="Exit Focus Mode (Esc)"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Minimize2 className="w-4 h-4" strokeWidth={1.5} />
            </motion.button>

            {/* Mode indicator */}
            <motion.div
              className="fixed top-4 left-4 z-[101]"
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 0.4, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                FOCUS MODE
              </span>
            </motion.div>

            {/* Full-width chat */}
            <div className="h-full max-w-4xl mx-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
