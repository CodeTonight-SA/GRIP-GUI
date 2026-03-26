'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const BREW_STAGES = [
  { label: 'GRINDING BEANS', detail: 'Analysing session entropy...', duration: 800 },
  { label: 'HEATING WATER', detail: 'Warming up the genome...', duration: 600 },
  { label: 'BREWING', detail: 'Extracting convergence patterns...', duration: 1200 },
  { label: 'POURING', detail: 'Decanting insights...', duration: 800 },
  { label: 'READY', detail: 'Your session coffee is served.', duration: 0 },
];

export default function CoffeePage() {
  const [stage, setStage] = useState(0);
  const [fillPercent, setFillPercent] = useState(0);

  useEffect(() => {
    if (stage >= BREW_STAGES.length - 1) return;
    const timer = setTimeout(() => {
      setStage(s => s + 1);
      setFillPercent(p => Math.min(100, p + 25));
    }, BREW_STAGES[stage].duration);
    return () => clearTimeout(timer);
  }, [stage]);

  const isReady = stage >= BREW_STAGES.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-8">
      {/* Cup */}
      <div className="relative mb-8">
        {/* Steam */}
        {isReady && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-6 bg-[var(--muted-foreground)] opacity-30"
                style={{
                  animation: `steam-rise 2s ease-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Cup body */}
        <div className="relative w-32 h-40 border-2 border-[var(--foreground)] overflow-hidden">
          {/* Liquid fill */}
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            initial={{ height: 0 }}
            animate={{ height: `${fillPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(180deg, #8B4513 0%, #5C2E0A 100%)`,
            }}
          />
          {/* GRIP logo in cup */}
          {isReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="font-display text-2xl font-bold text-white tracking-tighter">GRIP</span>
            </motion.div>
          )}
        </div>
        {/* Handle */}
        <div className="absolute right-[-18px] top-[30px] w-4 h-16 border-2 border-[var(--foreground)] border-l-0" />
        {/* Saucer */}
        <div className="w-40 h-2 border-2 border-[var(--foreground)] -ml-4 mt-0" />
      </div>

      {/* Status */}
      <div className="text-center space-y-2">
        <motion.h2
          key={stage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-sm tracking-widest text-[var(--primary)]"
        >
          {BREW_STAGES[stage]?.label}
        </motion.h2>
        <motion.p
          key={`detail-${stage}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-xs tracking-wider text-[var(--muted-foreground)]"
        >
          {BREW_STAGES[stage]?.detail}
        </motion.p>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-[var(--secondary)] mx-auto mt-4">
          <motion.div
            className="h-full bg-[var(--primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {isReady && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Link
              href="/"
              className="font-mono text-xs tracking-widest text-[var(--primary)] border border-[var(--primary)] px-4 py-2 hover:bg-[var(--primary)]/10 transition-colors"
            >
              BACK TO ENGINE
            </Link>
          </motion.div>
        )}
      </div>

      {/* Easter egg label */}
      <div className="absolute bottom-6 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] opacity-30">
        /coffee
      </div>
    </div>
  );
}
