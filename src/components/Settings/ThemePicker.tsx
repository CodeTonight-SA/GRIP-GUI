'use client';

import { useStore } from '@/store';
import { THEMES, getTheme, getThemesByCategory } from '@/lib/themes';

const CATEGORY_LABELS: Record<string, string> = {
  swiss: 'SWISS',
  nature: 'NATURE',
  retro: 'RETRO',
  futuristic: 'FUTURISTIC',
};

export default function ThemePicker() {
  const { theme, setTheme } = useStore();
  const grouped = getThemesByCategory();
  const currentTheme = getTheme(theme);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tighter text-[var(--foreground)]">THEME</h3>
          <p className="text-[10px] font-mono tracking-wider text-[var(--muted-foreground)] mt-0.5">
            {currentTheme.name} | Press T to cycle, D for dark/light toggle
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([category, themes]) => (
        <div key={category}>
          <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] mb-2">
            {CATEGORY_LABELS[category] || category.toUpperCase()}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative p-2 border transition-colors text-left ${
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--secondary)]'
                      : 'border-[var(--border)] hover:border-[var(--primary)]'
                  }`}
                  title={t.name}
                >
                  {/* Preview swatch */}
                  <div className="flex gap-0.5 mb-1.5">
                    <div
                      className="w-full h-6 border border-black/10"
                      style={{ backgroundColor: t.colors.background }}
                    />
                    <div
                      className="w-3 h-6 shrink-0"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                  </div>
                  <p className="font-mono text-[10px] tracking-wider text-[var(--foreground)] truncate">
                    {t.name}
                  </p>
                  <p className="font-mono text-[8px] tracking-wider text-[var(--muted-foreground)]">
                    {t.isDark ? 'DARK' : 'LIGHT'}
                  </p>
                  {isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)]" />
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
