'use client';

import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, Sparkles, Shield } from 'lucide-react';
import { GRIP_SKILLS, SKILL_CATEGORIES, type SkillCategory, searchSkills, getParamountSkills } from '@/lib/grip-skills';
import SkillPill from '@/components/Engine/SkillPill';

/**
 * GRIP-native skill browser.
 * Shows all 149 skills organised by category with search and filtering.
 * PARAMOUNT skills are highlighted with cyan accent.
 *
 * Swiss Nihilism: sharp borders, monospace categories, asymmetric layout.
 */
export default function SkillBrowser() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all');
  const reduceMotion = useReducedMotion();

  const filteredSkills = useMemo(() => {
    let skills = query ? searchSkills(query) : GRIP_SKILLS;
    if (activeCategory !== 'all') {
      skills = skills.filter(s => s.category === activeCategory);
    }
    return skills;
  }, [query, activeCategory]);

  const paramountSkills = getParamountSkills();
  const categories = Object.entries(SKILL_CATEGORIES) as [SkillCategory, { label: string; count: number }][];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-[var(--foreground)]">
          Skills
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          149 specialised abilities. PARAMOUNT skills are always active.
        </p>
      </div>

      {/* PARAMOUNT skills strip */}
      <div className="border border-[var(--primary)]/30 p-4 mb-6 bg-[var(--primary)]/5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-[var(--primary)]" strokeWidth={1.5} />
          <span className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
            PARAMOUNT — ALWAYS ACTIVE
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {paramountSkills.map(skill => (
            <SkillPill key={skill.id} name={skill.name} paramount active />
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 border border-[var(--border)] px-4 py-2.5 mb-4 bg-[var(--card)]">
        <Search className="w-4 h-4 text-[var(--muted-foreground)]" strokeWidth={1.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills..."
          className="flex-1 bg-transparent border-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-0"
          style={{ boxShadow: 'none' }}
        />
        <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
          {filteredSkills.length} RESULTS
        </span>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors min-h-[36px] ${
            activeCategory === 'all'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          ALL
        </button>
        {categories.map(([key, { label, count }]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`font-mono text-[10px] tracking-widest px-3 py-1.5 border transition-colors min-h-[36px] ${
              activeCategory === key
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Skill grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSkills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: reduceMotion ? 0 : Math.min(index * 0.015, 0.3) }}
            whileHover={reduceMotion ? undefined : { y: -1, borderColor: 'var(--primary)' }}
            className={`p-4 border transition-colors ${
              skill.paramount
                ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5'
                : 'border-[var(--border)] hover:border-[var(--primary)]/50'
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="font-mono text-xs font-bold tracking-wider text-[var(--foreground)]">
                {skill.name}
              </span>
              {skill.paramount && (
                <Sparkles className="w-3 h-3 text-[var(--primary)] shrink-0" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed mb-2">
              {skill.description}
            </p>
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] opacity-60">
              {SKILL_CATEGORIES[skill.category]?.label || skill.category.toUpperCase()}
            </span>
          </motion.div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="text-center py-12">
          <span className="font-mono text-xs tracking-widest text-[var(--muted-foreground)]">
            NO SKILLS MATCH &quot;{query}&quot;
          </span>
        </div>
      )}
    </div>
  );
}
