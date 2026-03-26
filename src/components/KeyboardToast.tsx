'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';

interface ToastMessage {
  id: number;
  key: string;
  label: string;
}

let toastCounter = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

/** Show a keyboard shortcut toast from anywhere */
export function showKeyboardToast(key: string, label: string) {
  const msg: ToastMessage = { id: ++toastCounter, key, label };
  listeners.forEach(fn => fn(msg));
}

export default function KeyboardToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const handleToast = useCallback((msg: ToastMessage) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    listeners.add(handleToast);
    return () => { listeners.delete(handleToast); };
  }, [handleToast]);

  // Auto-dismiss after 1.5s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--foreground)]"
        >
          <kbd className="px-1.5 py-0.5 bg-[var(--secondary)] border border-[var(--border)] text-[var(--primary)] font-bold">
            {toast.key}
          </kbd>
          <span className="text-[var(--muted-foreground)]">{toast.label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
