'use client';

import { Sparkles } from 'lucide-react';

interface SkillPillProps {
  name: string;
  active?: boolean;
  paramount?: boolean;
  onClick?: () => void;
}

/**
 * Inline skill indicator pill.
 * Shows active skills as sharp-cornered badges with monospace text.
 * PARAMOUNT skills get a cyan accent border.
 *
 * Swiss Nihilism: no rounded corners, monospace, tracking-wider.
 */
export default function SkillPill({ name, active = false, paramount = false, onClick }: SkillPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] tracking-wider
        transition-colors border
        ${paramount
          ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
          : active
            ? 'border-[var(--foreground)]/20 text-[var(--foreground)] bg-[var(--secondary)]'
            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50'
        }
      `}
    >
      {paramount && <Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} />}
      {name.toUpperCase()}
    </button>
  );
}
