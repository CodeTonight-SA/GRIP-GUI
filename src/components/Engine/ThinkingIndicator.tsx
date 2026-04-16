'use client';

import { motion } from 'framer-motion';

/**
 * Thinking indicator — shown when Claude is in extended thinking mode.
 * Distinct from TypingIndicator: slower pulse, different colour (amber),
 * and a brain-like visual to communicate deep reasoning vs. text generation.
 */
export default function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="p-3 flex items-center gap-3"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)',
          background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
        }}
      >
        {/* Pulsing concentric rings — represents deep thought */}
        <div className="relative w-5 h-5 flex items-center justify-center">
          <motion.div
            className="absolute w-5 h-5"
            style={{ border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-3 h-3"
            style={{ border: '1px solid color-mix(in srgb, var(--warning) 60%, transparent)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.3, ease: 'easeInOut' }}
          />
          <div className="w-1.5 h-1.5" style={{ backgroundColor: 'var(--warning)' }} />
        </div>

        <span
          className="font-mono text-[10px] tracking-widest"
          style={{ color: 'color-mix(in srgb, var(--warning) 80%, var(--foreground))' }}
        >
          EXTENDED THINKING...
        </span>
      </div>
    </div>
  );
}
