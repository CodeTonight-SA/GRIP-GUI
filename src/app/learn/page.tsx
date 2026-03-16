'use client';

import { GRIP_CONCEPTS } from '@/lib/grip-concepts';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import SystemOverview from '@/components/Engine/SystemOverview';

export default function LearnPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-12">
        <span className="grip-label block mb-3">DOCUMENTATION</span>
        <h1 className="text-4xl font-bold tracking-tighter text-[var(--foreground)] mb-3">
          Understanding GRIP
        </h1>
        <p className="text-[var(--muted-foreground)] max-w-2xl">
          GRIP is built on five core ideas. Each one makes your AI thinking partner
          smarter, safer, and more useful. No jargon — just clear explanations of
          how it works and why it matters.
        </p>
      </div>

      {/* System Overview */}
      <div className="mb-8">
        <SystemOverview />
      </div>

      {/* Quick start */}
      <div className="border border-[var(--border)] p-6 mb-10 bg-[var(--card)]">
        <div className="flex items-start gap-4">
          <BookOpen className="w-5 h-5 text-[var(--primary)] mt-0.5 shrink-0" strokeWidth={1.5} />
          <div>
            <span className="font-mono text-xs tracking-widest text-[var(--primary)] block mb-1">
              FIRST TIME?
            </span>
            <p className="text-sm text-[var(--foreground)] mb-3">
              GRIP is your AI thinking partner. It remembers your preferences,
              learns from your work, and gets better over time. Start with the
              walkthrough or explore the concepts below.
            </p>
            <Link
              href="/learn/walkthrough"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-[var(--primary)] hover:text-[var(--foreground)] transition-colors"
            >
              START WALKTHROUGH <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Concepts — numbered panels */}
      <div className="space-y-6">
        {GRIP_CONCEPTS.map((concept) => (
          <div key={concept.id} className="border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors">
            <div className="grid grid-cols-12 gap-0">
              {/* Number column — 2 cols */}
              <div className="col-span-2 lg:col-span-1 bg-black flex items-center justify-center p-4">
                <span className="font-mono text-2xl font-bold text-[var(--primary)] tracking-tighter">
                  {concept.number}
                </span>
              </div>

              {/* Content — 10 cols */}
              <div className="col-span-10 lg:col-span-11 p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)]">
                      {concept.title}
                    </span>
                    <span className="font-mono text-xs tracking-wider text-[var(--muted-foreground)] ml-3">
                      {concept.tagline}
                    </span>
                  </div>
                  <Link
                    href={concept.link}
                    className="font-mono text-[10px] tracking-widest text-[var(--primary)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1 shrink-0"
                  >
                    EXPLORE <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <p className="text-sm text-[var(--muted-foreground)] mb-4 max-w-2xl leading-relaxed">
                  {concept.description}
                </p>

                {/* Details list */}
                <ul className="space-y-1.5 mb-4">
                  {concept.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-[var(--primary)] mt-1">-</span>
                      <span className="text-xs text-[var(--muted-foreground)]">{detail}</span>
                    </li>
                  ))}
                </ul>

                {/* Try it prompt */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">TRY:</span>
                  <code className="font-mono text-[11px] text-[var(--foreground)] bg-[var(--secondary)] px-2 py-0.5">
                    {concept.tryItPrompt}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats strip */}
      <div className="mt-12 py-4 border-t border-[var(--border)]">
        <div className="flex flex-wrap gap-6 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
          <span>149 SKILLS</span>
          <span>|</span>
          <span>30 MODES</span>
          <span>|</span>
          <span>21 AGENTS</span>
          <span>|</span>
          <span>56 COMMANDS</span>
          <span>|</span>
          <span>10 SAFETY GATES</span>
        </div>
      </div>
    </div>
  );
}
