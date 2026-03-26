'use client';

import { useEffect, useRef, useState } from 'react';

export default function FPSCounter() {
  const [fps, setFps] = useState(0);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const tick = (now: number) => {
      frameRef.current++;
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 500) {
        setFps(Math.round((frameRef.current * 1000) / elapsed));
        frameRef.current = 0;
        lastTimeRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  const colour = fps >= 55 ? 'text-accent-green' : fps >= 30 ? 'text-[var(--warning)]' : 'text-[var(--danger)]';

  return (
    <div className={`fixed bottom-2 right-2 z-40 font-mono text-[10px] tracking-widest ${colour} opacity-30 select-none pointer-events-none`}>
      {fps} FPS
    </div>
  );
}
