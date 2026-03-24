'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  compact?: boolean;
}

const MODELS = [
  { id: 'sonnet', label: 'SONNET', description: 'Fast, capable', badge: 'DEFAULT' },
  { id: 'opus', label: 'OPUS', description: 'Most capable, slower', badge: 'DEEP' },
  { id: 'haiku', label: 'HAIKU', description: 'Fastest, lightweight', badge: 'QUICK' },
];

/**
 * Model selector for the chat input area.
 * Swiss Nihilism: monospace, tracking-widest, sharp dropdown.
 */
export default function ModelSelector({ value, onChange, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = MODELS.find(m => m.id === value) || MODELS[0];

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
        >
          {current.label}
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-1 border border-[var(--border)] bg-[var(--card)] z-50 min-w-[140px] animate-fade-in">
            {MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => { onChange(model.id); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  model.id === value
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
                }`}
              >
                <span className="font-mono text-[9px] tracking-widest">{model.label}</span>
                <span className="font-mono text-[7px] tracking-wider opacity-50">{model.badge}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
      >
        <span className="font-mono text-[10px] tracking-widest text-[var(--foreground)]">
          {current.label}
        </span>
        <ChevronDown className={`w-3 h-3 text-[var(--muted-foreground)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 border border-[var(--border)] bg-[var(--card)] z-50 min-w-[180px] animate-fade-in">
          {MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => { onChange(model.id); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2.5 transition-colors ${
                model.id === value
                  ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest">{model.label}</span>
                <span className="font-mono text-[8px] tracking-wider opacity-50">{model.badge}</span>
              </div>
              <span className="text-[9px] opacity-60 block mt-0.5">{model.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
