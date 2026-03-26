'use client';

import { useState } from 'react';

interface TradingCard {
  id: string;
  name: string;
  title: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'PARAMOUNT';
  stats: { label: string; value: string }[];
  description: string;
  colour: string;
  glowColour: string;
}

const RARITY_COLOURS: Record<string, string> = {
  COMMON: 'border-[var(--muted-foreground)]',
  RARE: 'border-accent-blue',
  EPIC: 'border-accent-purple',
  LEGENDARY: 'border-[var(--warning)]',
  PARAMOUNT: 'border-accent-cyan',
};

const CARDS: TradingCard[] = [
  {
    id: 'convergence', name: 'CONVERGENCE', title: 'The Engine',
    rarity: 'LEGENDARY', colour: '#22d3ee', glowColour: 'rgba(34,211,238,0.3)',
    description: 'Recursive task decomposition with criterion-based exit gates at every level.',
    stats: [{ label: 'DEPTH', value: '11' }, { label: 'PHASES', value: '4' }, { label: 'TYPE', value: 'FRACTAL' }],
  },
  {
    id: 'genome', name: 'GENOME', title: 'The DNA',
    rarity: 'PARAMOUNT', colour: '#8B5CF6', glowColour: 'rgba(139,92,246,0.3)',
    description: '213 genes tracking fitness across every GRIP behaviour. Evolution through natural selection.',
    stats: [{ label: 'GENES', value: '213' }, { label: 'GEN', value: '34' }, { label: 'FITNESS', value: '0.467' }],
  },
  {
    id: 'broly', name: 'BROLY', title: 'The Meta-Agent',
    rarity: 'EPIC', colour: '#FF6B9D', glowColour: 'rgba(255,107,157,0.3)',
    description: 'Recursive meta-agent with fractal architecture, multi-framework reasoning, and 4-type memory.',
    stats: [{ label: 'POWER', value: 'SSJ3' }, { label: 'MEMORY', value: '4-TYPE' }, { label: 'ARCH', value: 'FRACTAL' }],
  },
  {
    id: 'kono', name: 'KONO', title: 'The Memory',
    rarity: 'RARE', colour: '#22c55e', glowColour: 'rgba(34,197,94,0.3)',
    description: 'Semantic knowledge substrate with vector embeddings. What GRIP remembers, forever.',
    stats: [{ label: 'DIM', value: '384' }, { label: 'MODEL', value: 'MiniLM' }, { label: 'TYPE', value: 'VECTOR' }],
  },
  {
    id: 'ultrathink', name: 'ULTRATHINK', title: 'The Mind',
    rarity: 'PARAMOUNT', colour: '#FACC15', glowColour: 'rgba(250,204,21,0.3)',
    description: 'Extended reasoning with 6 verification gates. Always active. Cannot be disabled.',
    stats: [{ label: 'GATES', value: '6' }, { label: 'STATUS', value: 'ALWAYS' }, { label: 'LEVEL', value: '++' }],
  },
  {
    id: 'modes', name: 'MODE STACK', title: 'The Context',
    rarity: 'EPIC', colour: '#3B82F6', glowColour: 'rgba(59,130,246,0.3)',
    description: '30 operating modes. Stack up to 3 simultaneously. Each shapes how GRIP thinks.',
    stats: [{ label: 'MODES', value: '30' }, { label: 'MAX', value: '3' }, { label: 'ACTIVE', value: 'YES' }],
  },
];

export default function TradingCards() {
  const [flipped, setFlipped] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {CARDS.map(card => {
        const isFlipped = flipped === card.id;
        return (
          <div
            key={card.id}
            className="relative cursor-pointer perspective-1000"
            style={{ perspective: '1000px' }}
            onClick={() => setFlipped(isFlipped ? null : card.id)}
          >
            <div
              className="relative w-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                minHeight: '220px',
              }}
            >
              {/* Front */}
              <div
                className={`absolute inset-0 border-2 ${RARITY_COLOURS[card.rarity]} bg-[var(--card)] p-4 flex flex-col backface-hidden`}
                style={{
                  backfaceVisibility: 'hidden',
                  boxShadow: `0 0 20px ${card.glowColour}`,
                }}
              >
                {/* Holographic shimmer */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    background: `linear-gradient(135deg, transparent 30%, ${card.colour} 50%, transparent 70%)`,
                    backgroundSize: '200% 200%',
                    animation: 'card-shimmer 3s ease-in-out infinite',
                  }}
                />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: card.colour }}>{card.rarity}</span>
                  <div className="w-3 h-3" style={{ backgroundColor: card.colour }} />
                </div>
                <h3 className="font-display text-lg font-bold tracking-tighter text-[var(--foreground)] relative z-10">{card.name}</h3>
                <p className="font-mono text-[10px] tracking-wider text-[var(--muted-foreground)] mb-3 relative z-10">{card.title}</p>
                <div className="mt-auto flex gap-3 relative z-10">
                  {card.stats.map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="font-mono text-sm font-bold" style={{ color: card.colour }}>{stat.value}</div>
                      <div className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Back */}
              <div
                className={`absolute inset-0 border-2 ${RARITY_COLOURS[card.rarity]} bg-[var(--card)] p-4 flex flex-col items-center justify-center`}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  boxShadow: `0 0 20px ${card.glowColour}`,
                }}
              >
                <div className="w-8 h-8 mb-3" style={{ backgroundColor: card.colour }} />
                <p className="text-xs text-center text-[var(--muted-foreground)] leading-relaxed">{card.description}</p>
                <span className="font-mono text-[8px] tracking-widest text-[var(--muted-foreground)] mt-3 border-t border-[var(--border)] pt-2">CLICK TO FLIP</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
