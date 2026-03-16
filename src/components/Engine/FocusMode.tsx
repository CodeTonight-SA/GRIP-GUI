'use client';

import { useState, useEffect } from 'react';
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

  if (!focused) {
    return (
      <div className="relative">
        {children}
        {/* Focus mode trigger */}
        <button
          onClick={() => { setFocused(true); onToggle?.(true); }}
          className="absolute top-3 right-3 p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors opacity-0 hover:opacity-100"
          title="Enter Focus Mode (Cmd+Shift+F)"
        >
          <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)] animate-fade-in">
      {/* Exit button */}
      <button
        onClick={() => { setFocused(false); onToggle?.(false); }}
        className="fixed top-4 right-4 z-[101] p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors border border-[var(--border)] bg-[var(--card)]"
        title="Exit Focus Mode (Esc)"
      >
        <Minimize2 className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {/* Mode indicator */}
      <div className="fixed top-4 left-4 z-[101]">
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)] opacity-40">
          FOCUS MODE
        </span>
      </div>

      {/* Full-width chat */}
      <div className="h-full max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}
