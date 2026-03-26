'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, Clock, TrendingUp, BookOpen, Play, AlertTriangle,
  Users, Brain, Shield, Eye, Swords, Layers, Send, ChevronRight,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InsightEntry {
  id?: string;
  text?: string;
  content?: string;
  context?: string;
  tags?: string[];
  created_at?: string;
  learning_score?: number;
  source?: string;
  ingested?: boolean;
  consolidated?: boolean;
}

interface InsightsData {
  insights: InsightEntry[];
  total: number;
  lastModified: string | null;
  rulesLastModified: string | null;
  isStale: boolean;
  ageHours: number;
}

// ─── Council roles ──────────────────────────────────────────────────────────

const COUNCIL_ROLES = [
  { id: 'pragmatist', name: 'Pragmatist', llm: 'Opus', icon: Brain, colour: 'text-accent-cyan', desc: 'Practical engineering trade-offs and implementation feasibility' },
  { id: 'theorist', name: 'Theorist', llm: 'Opus', icon: BookOpen, colour: 'text-accent-purple', desc: 'Algorithmic analysis, theoretical foundations, complexity assessment' },
  { id: 'security', name: 'Security Advisor', llm: 'Sonnet', icon: Shield, colour: 'text-accent-green', desc: 'Risk assessment, threat modelling, STRIDE/OWASP analysis' },
  { id: 'ux', name: 'UX Advocate', llm: 'Sonnet', icon: Eye, colour: 'text-[var(--warning)]', desc: 'User experience, API design, developer ergonomics' },
  { id: 'devil', name: "Devil's Advocate", llm: 'Opus', icon: Swords, colour: 'text-[var(--danger)]', desc: 'Challenges assumptions, finds flaws, Popperian falsification' },
  { id: 'integrator', name: 'Integrator', llm: 'Opus', icon: Layers, colour: 'text-[var(--primary)]', desc: 'Synthesises viewpoints into actionable decisions with evidence grades' },
];

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_KEY = 'grip-insights-data';

function loadCached(): InsightsData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<'insights' | 'council'>('insights');
  const [data, setData] = useState<InsightsData | null>(() => loadCached());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/grip/insights');
      if (res.ok) {
        const result: InsightsData = await res.json();
        setData(result);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch { /* quota */ }
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data) fetchInsights();
  }, [fetchInsights, data]);

  const insights = data?.insights || [];
  const toStr = (v: unknown): string => (typeof v === 'string' ? v : String(v || 'unknown'));
  const sources = ['all', ...new Set(insights.map(i => toStr(i.source)))];
  const filtered = filter === 'all' ? insights : insights.filter(i => toStr(i.source) === filter);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] pt-4 lg:pt-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            Insights
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {data ? `${data.total} patterns detected` : 'Loading...'}
            {data?.lastModified && (
              <span className="ml-2">
                <Clock className="w-3 h-3 inline" /> {new Date(data.lastModified).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {data?.isStale && (
              <span className="ml-2 inline-flex items-center gap-1 text-[var(--warning)]">
                <AlertTriangle className="w-3 h-3" /> STALE ({data.ageHours}h ago)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[var(--border)] mb-4 shrink-0">
        {([
          { id: 'insights' as const, label: 'Insights', icon: Sparkles },
          { id: 'council' as const, label: 'Research Council', icon: Users },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Insights Tab ── */}
      {activeTab === 'insights' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Action buttons */}
          <div className="flex gap-2 mb-3 shrink-0">
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText('/learn');
                alert('Copied /learn to clipboard. Paste in your Claude Code terminal to run the learning pipeline.');
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] font-mono text-[10px] tracking-widest hover:opacity-90 transition-opacity"
            >
              <Play className="w-3.5 h-3.5" />
              RUN /LEARN
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText('/detect-insights');
                alert('Copied /detect-insights to clipboard. Paste in your Claude Code terminal.');
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] font-mono text-[10px] tracking-widest hover:bg-[var(--primary)]/10 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              RUN /DETECT-INSIGHTS
            </button>
          </div>

          {/* Source filter chips */}
          <div className="flex gap-1.5 mb-3 flex-wrap shrink-0">
            {sources.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2 py-0.5 font-mono text-[10px] tracking-wider border transition-colors ${
                  filter === s
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
                }`}
              >
                {String(s).toUpperCase()}
              </button>
            ))}
          </div>

          {/* Insights list */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {loading && insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
                <RefreshCw className="w-6 h-6 animate-spin mb-3" />
                <span className="font-mono text-xs tracking-widest">ANALYSING PATTERNS...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
                <BookOpen className="w-6 h-6 mb-3" />
                <span className="font-mono text-xs tracking-widest">NO INSIGHTS YET</span>
                <p className="text-xs mt-2 text-center max-w-sm">
                  Click <strong>RUN /LEARN</strong> above, then paste in your Claude Code terminal.
                  Insights are generated from session patterns, false detections, and friction analysis.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.slice(0, 50).map((insight, i) => (
                  <motion.div
                    key={insight.id || `${insight.created_at}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="border border-[var(--border)] bg-[var(--card)] p-3 hover:border-[var(--primary)] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`font-mono text-[10px] tracking-widest px-1.5 py-0.5 border ${
                        insight.source === 'evo' ? 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5' :
                        insight.source === 'skill' ? 'text-accent-purple border-accent-purple/30 bg-accent-purple/5' :
                        insight.consolidated ? 'text-accent-green border-accent-green/30 bg-accent-green/5' :
                        'text-[var(--muted-foreground)] border-[var(--border)]'
                      }`}>
                        {String(insight.source || 'unknown').toUpperCase()}
                      </span>
                      {insight.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="font-mono text-[8px] tracking-wider text-[var(--muted-foreground)] border border-[var(--border)] px-1 py-0.5">
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-accent-green" />
                        <span className="font-mono text-[10px] text-accent-green">
                          {((insight.learning_score || 0.5) * 100).toFixed(0)}%
                        </span>
                      </span>
                      {insight.consolidated && (
                        <span className="font-mono text-[8px] text-accent-green border border-accent-green/30 px-1 py-0.5 bg-accent-green/5">CONSOLIDATED</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {insight.text || insight.content || ''}
                    </p>
                    {insight.created_at && (
                      <span className="font-mono text-[8px] text-[var(--muted-foreground)] mt-1 block">
                        {new Date(insight.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* ── Research Council Tab ── */}
      {activeTab === 'council' && <ResearchCouncilTab />}
    </div>
  );
}

// ─── Research Council ───────────────────────────────────────────────────────

function ResearchCouncilTab() {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-6">
      {/* Description */}
      <div className="border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-display text-lg font-bold tracking-tighter text-[var(--foreground)]">Broly Mesh Council</span>
        </div>
        <p className="text-sm text-[var(--foreground)] leading-relaxed mb-3">
          A multi-LLM deliberation engine. Submit a research question and 6 specialised agents
          analyse it from different perspectives using frontier models. Each agent brings a distinct
          reasoning framework: the <strong>Pragmatist</strong> evaluates feasibility, the <strong>Theorist</strong> analyses
          algorithmic foundations, the <strong>Security Advisor</strong> identifies threats, the <strong>UX Advocate</strong> champions
          the user, the <strong>Devil&apos;s Advocate</strong> falsifies assumptions (Popperian), and the <strong>Integrator</strong> synthesises
          all viewpoints into a coherent decision with evidence grades.
        </p>
        <div className="flex gap-4 text-[10px] font-mono tracking-widest text-[var(--muted-foreground)]">
          <span>PROTOCOL: SMT + POPPER</span>
          <span>MODELS: OPUS + SONNET</span>
          <span>AGENTS: 6</span>
        </div>
      </div>

      {/* Council members */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {COUNCIL_ROLES.map(role => {
          const Icon = role.icon;
          return (
            <div key={role.id} className="border border-[var(--border)] bg-[var(--card)] p-3 hover:border-[var(--primary)] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${role.colour}`} strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-widest text-[var(--foreground)]">{role.name.toUpperCase()}</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">{role.desc}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-mono text-[8px] tracking-wider text-[var(--primary)] border border-[var(--primary)]/30 px-1 py-0.5 bg-[var(--primary)]/5">
                  {role.llm}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prompt input */}
      <div className="border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="font-mono text-xs tracking-widest text-[var(--muted-foreground)] block mb-2">
          RESEARCH PROMPT
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g., Analyse the feasibility of distributed GRIP instances with mesh consensus..."
            className="flex-1 px-3 py-2 bg-[var(--input)] border border-[var(--border)] font-mono text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            onClick={() => {
              if (!prompt.trim()) return;
              const cmd = `/broly mesh "${prompt.trim()}"`;
              navigator.clipboard.writeText(cmd);
              alert(`Copied to clipboard:\n\n${cmd}\n\nPaste in your Claude Code terminal to run the Research Council.`);
            }}
            disabled={!prompt.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--foreground)] text-[var(--background)] font-mono text-[10px] tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
            LAUNCH COUNCIL
          </button>
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
          Copies the <code className="text-[var(--primary)]">/broly mesh</code> command to clipboard.
          Paste in Claude Code to run the 6-agent council with SMT analysis and Popperian falsification.
        </p>
      </div>

      {/* Workflow visualisation */}
      <div className="border border-[var(--border)] bg-[var(--card)] p-4">
        <span className="font-mono text-xs tracking-widest text-[var(--foreground)] block mb-3">COUNCIL WORKFLOW</span>
        <div className="flex items-center gap-2 flex-wrap">
          {['DISCOVERY', 'PARALLEL ANALYSIS', 'FALSIFICATION', 'SYNTHESIS'].map((phase, i) => (
            <div key={phase} className="flex items-center gap-2">
              <div className="px-3 py-1.5 border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--foreground)]">
                <span className="text-[var(--primary)] mr-1">{i + 1}</span>
                {phase}
              </div>
              {i < 3 && <ChevronRight className="w-3 h-3 text-[var(--muted-foreground)]" />}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-[var(--muted-foreground)] space-y-1">
          <p><strong className="text-[var(--foreground)]">Phase 1</strong>: Explore agent fetches and analyses the topic</p>
          <p><strong className="text-[var(--foreground)]">Phase 2</strong>: All 6 council agents analyse in parallel (Opus + Sonnet)</p>
          <p><strong className="text-[var(--foreground)]">Phase 3</strong>: Devil&apos;s Advocate pre-registers and attempts falsification of claims</p>
          <p><strong className="text-[var(--foreground)]">Phase 4</strong>: Integrator synthesises into decision with evidence grades (A-F)</p>
        </div>
      </div>
    </div>
  );
}
