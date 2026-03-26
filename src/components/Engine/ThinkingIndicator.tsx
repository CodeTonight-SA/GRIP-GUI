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
      <div className="border border-amber-800/40 bg-amber-950/20 p-3 flex items-center gap-3">
        {/* Pulsing concentric rings — represents deep thought */}
        <div className="relative w-5 h-5 flex items-center justify-center">
          <motion.div
            className="absolute w-5 h-5 border border-amber-500/40"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-3 h-3 border border-amber-500/60"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.3, ease: 'easeInOut' }}
          />
          <div className="w-1.5 h-1.5 bg-amber-400" />
        </div>

        <span className="font-mono text-[10px] tracking-widest text-amber-400/80">
          EXTENDED THINKING...
        </span>
      </div>
    </div>
  );
}
