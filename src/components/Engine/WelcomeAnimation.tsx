'use client';

import { useState, useEffect } from 'react';

/**
 * Animated welcome sequence for first-time users.
 * A single cyan square that expands, then contracts into the GRIP wordmark.
 * Plays once on first visit, then never again.
 *
 * Swiss Nihilism: geometric, stark, no roundness, only cyan on grey.
 * Duration: 2 seconds total. Respects prefers-reduced-motion.
 */
export default function WelcomeAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Check if reduced motion is preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    // Check if already shown
    if (localStorage.getItem('grip-welcome-shown') === 'true') {
      onComplete();
      return;
    }

    const timers = [
      setTimeout(() => setPhase(1), 100),   // Square appears
      setTimeout(() => setPhase(2), 600),   // Square expands
      setTimeout(() => setPhase(3), 1200),  // Text appears
      setTimeout(() => {
        setPhase(4);                         // Fade out
        localStorage.setItem('grip-welcome-shown', 'true');
      }, 2000),
      setTimeout(() => onComplete(), 2400), // Remove
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-[var(--background)]"
      style={{
        opacity: phase === 4 ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      <div className="flex flex-col items-center">
        {/* Expanding square */}
        <div
          className="bg-[var(--primary)] transition-all"
          style={{
            width: phase >= 2 ? 48 : 8,
            height: phase >= 2 ? 48 : 8,
            transitionDuration: '0.5s',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Text reveal */}
        <div
          className="mt-6 text-center"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.4s ease-out',
          }}
        >
          <span className="font-mono text-2xl font-bold tracking-widest text-[var(--foreground)]">
            GRIP
          </span>
          <span className="block font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] mt-1">
            COMMANDER
          </span>
        </div>
      </div>
    </div>
  );
}
