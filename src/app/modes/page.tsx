'use client';

import { useState, useEffect, useCallback } from 'react';
import { GRIP_MODES, MODE_CATEGORIES, type ModeCategory } from '@/lib/grip-modes';
import { Check, Loader2 } from 'lucide-react';

export default function ModesPage() {
  const [activeModes, setActiveModes] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<ModeCategory | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load active modes from real ~/.claude/.active-modes
  useEffect(() => {
    fetch('/api/grip/modes')
      .then(res => res.json())
      .then(data => {
        if (data.modes?.length) setActiveModes(data.modes);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Save modes to real file when selection changes
  const saveModes = useCallback(async (modes: string[]) => {
    setSaving(true);
    try {
      await fetch('/api/grip/modes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modes }),
      });
    } catch { /* silent fail */ }
    setSaving(false);
  }, []);

  const toggleMode = useCallback((modeId: string) => {
    setActiveModes(prev => {
      let next: string[];
      if (prev.includes(modeId)) {
        next = prev.filter(m => m !== modeId);
      } else if (prev.length >= 3) {
        next = [...prev.slice(1), modeId];
      } else {
        next = [...prev, modeId];
      }
      saveModes(next);
      return next;
    });
  }, [saveModes]);

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
            {saving && <Loader2 className="w-3 h-3 text-[var(--primary)] animate-spin" />}
            {loaded && !saving && activeModes.length > 0 && (
              <span className="font-mono text-[8px] tracking-widest text-[var(--success)]">SAVED</span>
            )}
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors min-h-[44px] ${
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
              className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors min-h-[44px] ${
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

      {/* Mode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModes.map((mode) => {
          const isActive = activeModes.includes(mode.id);
          return (
            <button
              key={mode.id}
              onClick={() => toggleMode(mode.id)}
              className={`text-left p-5 border transition-all min-h-[44px] ${
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
