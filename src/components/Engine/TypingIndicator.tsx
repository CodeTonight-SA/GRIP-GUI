'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PROCESSING_STATES = [
  'CONVERGING...',
  'EVALUATING SAFETY GATES...',
  'APPLYING GRIP-FIRST RETRIEVAL...',
  'SEARCHING SKILL GRAPH...',
  'SYNTHESISING RESPONSE...',
  'CHECKING CONFIDENCE GATE...',
  'TRAVERSING CONTEXT...',
];

/**
 * Typing indicator with GRIP personality.
 * Three sharp cyan rectangles pulse in sequence (not dots — Swiss Nihilism).
 * Status messages rotate every 2.5s, providing ambient GRIP system awareness.
 */
export default function TypingIndicator() {
  const [stateIndex, setStateIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStateIndex(prev => (prev + 1) % PROCESSING_STATES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="border border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          {/* Three pulsing bars — sharp, not round */}
          <div className="flex items-end gap-0.5 h-3">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 bg-[var(--primary)]"
                animate={{ height: ['4px', '12px', '4px'] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Rotating status message */}
          <AnimatePresence mode="wait">
            <motion.span
              key={stateIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]"
            >
              {PROCESSING_STATES[stateIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
