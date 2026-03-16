'use client';

import { useState } from 'react';
import { GRIP_CONCEPTS } from '@/lib/grip-concepts';
import { ArrowLeft, ArrowRight, BookOpen, Lightbulb, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ConceptsPage() {
  const [activeConcept, setActiveConcept] = useState(0);
  const concept = GRIP_CONCEPTS[activeConcept];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/learn" className="font-mono text-[10px] tracking-widest text-[var(--primary)] hover:text-[var(--foreground)] transition-colors">
          LEARN
        </Link>
        <span className="font-mono text-[10px] text-[var(--muted-foreground)]">/</span>
        <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
          CONCEPTS
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Concept navigation — 3 cols */}
        <div className="col-span-12 lg:col-span-3">
          <span className="grip-label block mb-3">CORE CONCEPTS</span>
          <nav className="space-y-1">
            {GRIP_CONCEPTS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveConcept(i)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors font-mono text-xs ${
                  i === activeConcept
                    ? 'text-[var(--primary)] border-l-2 border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-l-2 border-transparent'
                }`}
              >
                <span className="text-[var(--primary)] font-bold">{c.number}</span>
                <span className="tracking-widest">{c.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Concept detail — 9 cols */}
        <div className="col-span-12 lg:col-span-9">
          <div className="border border-[var(--border)]">
            {/* Header */}
            <div className="bg-black p-6">
              <span className="font-mono text-3xl font-bold text-[var(--primary)] tracking-tighter">
                {concept.number}
              </span>
              <h1 className="text-2xl font-bold tracking-tighter text-white mt-2">
                {concept.title}
              </h1>
              <p className="font-mono text-xs tracking-widest text-gray-400 mt-1">
                {concept.tagline}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Main description */}
              <div>
                <span className="grip-label block mb-2">WHAT IT IS</span>
                <p className="text-[var(--foreground)] leading-relaxed">
                  {concept.description}
                </p>
              </div>

              {/* Metaphor */}
              <div className="border border-[var(--border)] p-4 bg-[var(--secondary)]/30">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-[var(--primary)] mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <span className="font-mono text-[10px] tracking-widest text-[var(--primary)] block mb-1">
                      THINK OF IT THIS WAY
                    </span>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {concept.metaphor}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key points */}
              <div>
                <span className="grip-label block mb-2">KEY POINTS</span>
                <ul className="space-y-2">
                  {concept.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="font-mono text-xs text-[var(--primary)] font-bold mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-[var(--foreground)]">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Try it */}
              <div className="border border-[var(--primary)]/30 p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-[var(--primary)] mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <span className="font-mono text-[10px] tracking-widest text-[var(--primary)] block mb-1">
                      TRY IT NOW
                    </span>
                    <code className="font-mono text-sm text-[var(--foreground)]">
                      {concept.tryItPrompt}
                    </code>
                    <p className="text-xs text-[var(--muted-foreground)] mt-2">
                      Type this in the Engine to see {concept.title.toLowerCase()} in action.
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setActiveConcept(Math.max(0, activeConcept - 1))}
                  disabled={activeConcept === 0}
                  className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> PREVIOUS
                </button>
                <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                  {activeConcept + 1} / {GRIP_CONCEPTS.length}
                </span>
                <button
                  onClick={() => setActiveConcept(Math.min(GRIP_CONCEPTS.length - 1, activeConcept + 1))}
                  disabled={activeConcept === GRIP_CONCEPTS.length - 1}
                  className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors"
                >
                  NEXT <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
