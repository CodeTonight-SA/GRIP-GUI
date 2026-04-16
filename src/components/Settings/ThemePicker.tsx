'use client';

import { useCallback, useRef } from 'react';
import { useStore } from '@/store';
import { THEMES, getTheme, getThemesByCategory, applyTheme } from '@/lib/themes';

const CATEGORY_LABELS: Record<string, string> = {
  swiss: 'SWISS',
  nature: 'NATURE',
  retro: 'RETRO',
  futuristic: 'FUTURISTIC',
};

const CATEGORY_COUNTS: Record<string, string> = {
  swiss: '7 themes',
  nature: '7 themes',
  retro: '4 themes',
  futuristic: '5 themes',
};

export default function ThemePicker() {
  const { theme, setTheme } = useStore();
  const grouped = getThemesByCategory();
  const currentTheme = getTheme(theme);
  // Track the committed theme so we can restore on hover-out
  const committedThemeRef = useRef(theme);

  const handleMouseEnter = useCallback((themeId: string) => {
    // Live preview: apply CSS vars without committing to store
    applyTheme(themeId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Restore to committed theme
    applyTheme(committedThemeRef.current);
  }, []);

  const handleSelect = useCallback((themeId: string) => {
    committedThemeRef.current = themeId;
    setTheme(themeId);
  }, [setTheme]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tighter text-[var(--foreground)]">THEME</h3>
          <p className="text-[10px] font-mono tracking-wider text-[var(--muted-foreground)] mt-0.5">
            {currentTheme.name} &middot; {currentTheme.isDark ? 'DARK' : 'LIGHT'} &middot; Press T to cycle
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
            {THEMES.length} THEMES
          </span>
        </div>
      </div>

      {/* Category groups */}
      {Object.entries(grouped).map(([category, themes]) => (
        <div key={category}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-3">
            <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              {CATEGORY_LABELS[category] || category.toUpperCase()}
            </p>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <p className="font-mono text-[9px] text-[var(--muted-foreground)] opacity-60">
              {CATEGORY_COUNTS[category] || `${themes.length} themes`}
            </p>
          </div>

          {/* Theme grid — 4 columns */}
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  onMouseEnter={() => handleMouseEnter(t.id)}
                  onMouseLeave={handleMouseLeave}
                  onFocus={() => handleMouseEnter(t.id)}
                  onBlur={handleMouseLeave}
                  className={`group relative p-2 border transition-all duration-150 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] ${
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--secondary)]'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--secondary)]'
                  }`}
                  aria-label={`${t.name} theme${t.isDark ? ', dark' : ', light'}${isActive ? ', currently active' : ''}`}
                  aria-pressed={isActive}
                  title={t.name}
                >
                  {/* 4-stripe preview swatch: background, secondary, border stripe, primary */}
                  <div className="flex gap-px mb-2 overflow-hidden" style={{ height: '28px' }}>
                    {/* Background fill — widest */}
                    <div
                      className="flex-1 border border-black/10"
                      style={{ backgroundColor: t.colors.background }}
                    />
                    {/* Secondary — medium */}
                    <div
                      className="w-4 shrink-0"
                      style={{ backgroundColor: t.colors.secondary }}
                    />
                    {/* Border tone — thin divider */}
                    <div
                      className="w-1.5 shrink-0"
                      style={{ backgroundColor: t.colors.border }}
                    />
                    {/* Primary accent — solid stripe */}
                    <div
                      className="w-4 shrink-0"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                  </div>

                  {/* Theme name */}
                  <p className="font-mono text-[9px] tracking-wider text-[var(--foreground)] truncate leading-tight">
                    {t.name}
                  </p>

                  {/* Dark/light badge */}
                  <p className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] mt-0.5">
                    {t.isDark ? 'DARK' : 'LIGHT'}
                  </p>

                  {/* Active indicator — primary dot, top-right */}
                  {isActive && (
                    <div
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-none"
                      style={{ backgroundColor: t.colors.primary }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
