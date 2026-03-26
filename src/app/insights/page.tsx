'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Clock, TrendingUp, Zap, BookOpen } from 'lucide-react';

interface InsightEntry {
  timestamp: string;
  type: string;
  source: string;
  score: number;
  content: string;
}

const CACHE_KEY = 'grip-insights-cache';

function loadCached(): InsightEntry[] {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch { return []; }
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightEntry[]>(() => loadCached());
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      // Read from GRIP learning pipeline output
      if (window.electronAPI?.grip?.runCommand) {
        const result = await window.electronAPI.grip.runCommand('cat ~/.claude/learning/insights.jsonl 2>/dev/null | tail -50');
        if (result) {
          const lines = result.trim().split('\n').filter(Boolean);
          const parsed: InsightEntry[] = lines.map(line => {
            try {
              const obj = JSON.parse(line);
              return {
                timestamp: obj.timestamp || obj.date || new Date().toISOString(),
                type: obj.type || obj.category || 'pattern',
                source: obj.source || obj.skill || 'unknown',
                score: obj.score || obj.confidence || 0.5,
                content: obj.content || obj.insight || obj.description || obj.rule || JSON.stringify(obj),
              };
            } catch {
              return { timestamp: new Date().toISOString(), type: 'raw', source: 'pipeline', score: 0.5, content: line };
            }
          }).reverse();
          setInsights(parsed);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
        }
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (insights.length === 0) fetchInsights();
  }, [fetchInsights, insights.length]);

  const types = ['all', ...new Set(insights.map(i => i.type))];
  const filtered = filter === 'all' ? insights : insights.filter(i => i.type === filter);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] pt-4 lg:pt-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            Insights
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Patterns detected from {insights.length} learning pipeline entries
            {lastRefresh && (
              <span className="ml-2">
                <Clock className="w-3 h-3 inline" /> {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] font-mono text-xs tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-2 py-0.5 font-mono text-[10px] tracking-wider border transition-colors ${
              filter === t
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
            }`}
          >
            {t.toUpperCase()}
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
            <p className="text-xs mt-2">Run <code className="text-[var(--primary)]">/learn</code> or <code className="text-[var(--primary)]">/detect-insights</code> to generate insights.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((insight, i) => (
              <motion.div
                key={`${insight.timestamp}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border border-[var(--border)] bg-[var(--card)] p-3 hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`font-mono text-[10px] tracking-widest px-1.5 py-0.5 border ${
                    insight.type === 'pattern' ? 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5' :
                    insight.type === 'skill' ? 'text-accent-purple border-accent-purple/30 bg-accent-purple/5' :
                    insight.type === 'red-team' ? 'text-[var(--danger)] border-[var(--danger)]/30 bg-[var(--danger)]/5' :
                    'text-[var(--muted-foreground)] border-[var(--border)]'
                  }`}>
                    {insight.type.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--muted-foreground)]">{insight.source}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-accent-green" />
                    <span className="font-mono text-[10px] text-accent-green">{(insight.score * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{insight.content}</p>
                <span className="font-mono text-[8px] text-[var(--muted-foreground)] mt-1 block">
                  {new Date(insight.timestamp).toLocaleDateString('en-GB')}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
