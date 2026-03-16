'use client';

import { useState } from 'react';
import { GRIP_MODES, MODE_CATEGORIES, type ModeCategory, type GripMode } from '@/lib/grip-modes';
import { Check } from 'lucide-react';

export default function ModesPage() {
  const [activeModes, setActiveModes] = useState<string[]>(['code']);
  const [activeCategory, setActiveCategory] = useState<ModeCategory | 'all'>('all');

  const toggleMode = (modeId: string) => {
    setActiveModes(prev => {
      if (prev.includes(modeId)) {
        return prev.filter(m => m !== modeId);
      }
      if (prev.length >= 3) {
        // Replace oldest
        return [...prev.slice(1), modeId];
      }
      return [...prev, modeId];
    });
  };

  const filteredModes = activeCategory === 'all'
    ? GRIP_MODES
    : GRIP_MODES.filter(m => m.category === activeCategory);

  const categories = Object.entries(MODE_CATEGORIES) as [ModeCategory, { label: string; description: string }][];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter text-[var(--foreground)]">
          Modes
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Switch how GRIP thinks. Select up to 3 modes simultaneously.
        </p>
        {activeModes.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">ACTIVE:</span>
            {activeModes.map(id => (
              <span key={id} className="font-mono text-xs tracking-wider text-[var(--primary)] border border-[var(--primary)] px-2 py-0.5">
                {id.toUpperCase()}
              </span>
            ))}
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              ({activeModes.length}/3)
            </span>
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors ${
            activeCategory === 'all'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          ALL ({GRIP_MODES.length})
        </button>
        {categories.map(([key, { label }]) => {
          const count = GRIP_MODES.filter(m => m.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors ${
                activeCategory === key
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Mode Grid — Asymmetric: 5+7 split */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModes.map((mode) => {
          const isActive = activeModes.includes(mode.id);
          return (
            <button
              key={mode.id}
              onClick={() => toggleMode(mode.id)}
              className={`text-left p-5 border transition-all ${
                isActive
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)]">
                  {mode.name}
                </span>
                {isActive && (
                  <div className="w-5 h-5 bg-[var(--primary)] flex items-center justify-center">
                    <Check className="w-3 h-3 text-[var(--primary-foreground)]" strokeWidth={2} />
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-3 leading-relaxed">
                {mode.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
                  {MODE_CATEGORIES[mode.category].label}
                </span>
                <span className="font-mono text-[9px] text-[var(--muted-foreground)]">|</span>
                <span className="font-mono text-[9px] tracking-wider text-[var(--muted-foreground)]">
                  ~{(mode.tokenBudget / 1000).toFixed(1)}K TOKENS
                </span>
              </div>
              {mode.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {mode.skills.slice(0, 3).map(skill => (
                    <span key={skill} className="font-mono text-[8px] tracking-wider text-[var(--muted-foreground)] border border-[var(--border)] px-1 py-0.5">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
