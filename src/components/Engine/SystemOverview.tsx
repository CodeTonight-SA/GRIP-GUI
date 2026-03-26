'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { Activity, Dna, Layers, Sparkles, Shield, Cpu, Brain, type LucideIcon } from 'lucide-react';

/** Animated number counter — counts from 0 to target over duration. GPU-friendly: only text updates. */
function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView || reduceMotion) { setDisplay(value); return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value, duration, reduceMotion]);

  return <span ref={ref}>{display}</span>;
}

interface SystemStat {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
}

/**
 * System Overview — GRIP health and capabilities at a glance.
 * Fetches real data from GRIP APIs when available, falls back to defaults.
 *
 * Swiss Nihilism: numbered stats, monospace, asymmetric layout.
 * Novel: each stat has a tiny bar showing relative scale.
 */
export default function SystemOverview() {
  const [stats, setStats] = useState<SystemStat[]>([
    { label: 'GENOME', value: 'GEN 33', icon: Dna, accent: true },
    { label: 'SKILLS', value: 149, icon: Sparkles },
    { label: 'MODES', value: 30, icon: Layers },
    { label: 'AGENTS', value: 21, icon: Cpu },
    { label: 'GATES', value: 10, icon: Shield },
    { label: 'CUBE', value: '0.68', icon: Brain },
  ]);

  // Try to fetch real genome stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/grip/health');
        if (res.ok) {
          const data = await res.json();
          setStats(prev => prev.map(stat => {
            if (stat.label === 'GENOME' && data.generation) {
              return { ...stat, value: `GEN ${data.generation}` };
            }
            if (stat.label === 'SKILLS' && data.skillCount) {
              return { ...stat, value: data.skillCount };
            }
            return stat;
          }));
        }
      } catch {
        // Use defaults
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="border border-[var(--border)] bg-[var(--card)]">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--primary)]" strokeWidth={1.5} />
          <span className="font-mono text-xs font-bold tracking-widest text-[var(--foreground)]">
            SYSTEM
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-0">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.08, ease: 'easeOut' }}
            className={`p-4 ${i < stats.length - 1 ? 'border-b border-r border-[var(--border)]' : ''} ${
              i % 3 === 2 ? 'lg:border-r-0' : ''
            } ${i % 2 === 1 ? 'border-r-0 lg:border-r' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-3 h-3 ${stat.accent ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} strokeWidth={1.5} />
              <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                {stat.label}
              </span>
            </div>
            <span className={`font-mono text-lg font-bold tracking-tighter ${
              stat.accent ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
            }`}>
              {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
