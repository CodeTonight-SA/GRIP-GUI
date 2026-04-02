'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  ExternalLink,
  Heart,
  Monitor,
  GitBranch,
  Layers,
  Shield,
  Sparkles,
  Users,
  Globe,
  Cpu,
  Workflow,
  Wrench,
  CheckCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type RoadmapStatus = 'open' | 'in-progress' | 'shipped';
type RoadmapCategory = 'platform' | 'agents' | 'integrations' | 'ecosystem' | 'infrastructure';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  sponsorPrice: number | null;
  issueNumber: number | null;
  issueUrl: string | null;
  sponsor: string | null;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CATEGORIES: { id: RoadmapCategory; label: string; icon: typeof Map }[] = [
  { id: 'platform', label: 'PLATFORM', icon: Monitor },
  { id: 'agents', label: 'AGENTS', icon: Cpu },
  { id: 'integrations', label: 'INTEGRATIONS', icon: Workflow },
  { id: 'ecosystem', label: 'ECOSYSTEM', icon: Users },
  { id: 'infrastructure', label: 'INFRA', icon: Shield },
];

const STATUS_CONFIG: Record<RoadmapStatus, { label: string; colour: string; bg: string }> = {
  'open': { label: 'OPEN', colour: 'text-[var(--muted-foreground)]', bg: 'bg-[var(--muted)]/20' },
  'in-progress': { label: 'IN PROGRESS', colour: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10' },
  'shipped': { label: 'SHIPPED', colour: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
};

const ROADMAP_ITEMS: RoadmapItem[] = [
  // From real GitHub issues
  {
    id: 'ubuntu-windows',
    title: 'Ubuntu and Windows Support',
    description: 'Cross-platform Electron builds for Linux and Windows. Currently macOS-only.',
    category: 'platform',
    status: 'open',
    sponsorPrice: 2500,
    issueNumber: 15,
    issueUrl: 'https://github.com/CodeTonight-SA/GRIP-GUI/issues/15',
    sponsor: null,
  },
  {
    id: 'linear-support',
    title: 'Linear Integration',
    description: 'Add Linear harness alongside JIRA for issue tracking and agent automation.',
    category: 'integrations',
    status: 'open',
    sponsorPrice: 1500,
    issueNumber: 26,
    issueUrl: 'https://github.com/CodeTonight-SA/GRIP-GUI/issues/26',
    sponsor: null,
  },
  {
    id: 'bitbucket-support',
    title: 'Bitbucket Integration',
    description: 'Support Bitbucket repositories alongside GitHub for project detection and PR automation.',
    category: 'integrations',
    status: 'open',
    sponsorPrice: 1500,
    issueNumber: 31,
    issueUrl: 'https://github.com/CodeTonight-SA/GRIP-GUI/issues/31',
    sponsor: null,
  },
  {
    id: 'agent-dispatch-consistency',
    title: 'Agent Dispatch and Kanban Consistency',
    description: 'Fix agent dispatch reliability and Kanban task auto-completion on agent finish.',
    category: 'agents',
    status: 'in-progress',
    sponsorPrice: null,
    issueNumber: 45,
    issueUrl: 'https://github.com/CodeTonight-SA/GRIP-GUI/issues/45',
    sponsor: null,
  },
  // Additional roadmap items
  {
    id: 'cloud-sync',
    title: 'GRIP Commander Pro: Cloud Config Sync',
    description: 'Sync your GRIP configuration, sessions, and knowledge graph across machines. The foundation of Commander Pro.',
    category: 'infrastructure',
    status: 'open',
    sponsorPrice: 3000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'team-workspaces',
    title: 'Team Workspaces',
    description: 'Shared agent configurations, skill libraries, and task boards for teams. Multi-seat management.',
    category: 'ecosystem',
    status: 'open',
    sponsorPrice: 5000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'skills-marketplace',
    title: 'Skills Marketplace with Auto-Updates',
    description: 'Browse, install, and receive automatic updates for community and premium skills from a central registry.',
    category: 'ecosystem',
    status: 'open',
    sponsorPrice: 4000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'guild-certification',
    title: 'Guild Certification Portal',
    description: 'Evidence-backed developer certification using real GitHub activity. Public directory of certified practitioners.',
    category: 'ecosystem',
    status: 'open',
    sponsorPrice: 2000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'multi-provider-routing',
    title: 'Multi-Provider Agent Routing',
    description: 'Route agents across Claude, GPT, Gemini, and local models with cost-aware fallback and quality scoring.',
    category: 'agents',
    status: 'open',
    sponsorPrice: 4000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'agent-mesh',
    title: 'Agent Mesh Networking',
    description: 'Agents communicate peer-to-peer across machines and GRIP instances. Distributed task execution.',
    category: 'agents',
    status: 'open',
    sponsorPrice: 5000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'auto-update',
    title: 'Auto-Update System',
    description: 'Seamless in-app updates with delta downloads. No manual DMG re-installation.',
    category: 'platform',
    status: 'open',
    sponsorPrice: 1000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'signed-builds',
    title: 'Signed and Notarised Builds',
    description: 'Apple Developer signed builds. No more xattr workarounds. Gatekeeper-approved.',
    category: 'platform',
    status: 'open',
    sponsorPrice: 500,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'vault-obsidian-sync',
    title: 'Vault to Obsidian Two-Way Sync',
    description: 'Bidirectional sync between GRIP Vault and Obsidian.md. Agent reports appear in your knowledge graph.',
    category: 'integrations',
    status: 'open',
    sponsorPrice: 1500,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'safety-dashboard',
    title: 'Safety Gates Dashboard',
    description: 'Visual monitoring of all safety hooks, gate fires, and blocked actions. Audit trail for compliance.',
    category: 'infrastructure',
    status: 'open',
    sponsorPrice: 2000,
    issueNumber: null,
    issueUrl: null,
    sponsor: null,
  },
  {
    id: 'video-guides',
    title: 'Video Guide Series',
    description: 'Multi-project best practices, agent orchestration patterns, and getting-started walkthrough videos.',
    category: 'ecosystem',
    status: 'open',
    sponsorPrice: 1000,
    issueNumber: 31,
    issueUrl: 'https://github.com/CodeTonight-SA/GRIP-GUI/issues/31',
    sponsor: null,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `$${(cents).toLocaleString()}`;
}

const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/CodeTonight-SA';
const REPO_URL = 'https://github.com/CodeTonight-SA/GRIP-GUI';

// ─── Component ──────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [filter, setFilter] = useState<RoadmapCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RoadmapStatus | 'all'>('all');

  const filtered = ROADMAP_ITEMS.filter(item => {
    if (filter !== 'all' && item.category !== filter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const totalValue = ROADMAP_ITEMS.reduce((sum, i) => sum + (i.sponsorPrice || 0), 0);
  const openCount = ROADMAP_ITEMS.filter(i => i.status === 'open').length;
  const sponsorable = ROADMAP_ITEMS.filter(i => i.sponsorPrice && !i.sponsor);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] pt-4 lg:pt-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Map className="w-5 h-5 text-[var(--primary)]" />
            Roadmap
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {ROADMAP_ITEMS.length} items &middot; {openCount} open &middot; {sponsorable.length} sponsorable
          </p>
        </div>
        <a
          href={GITHUB_SPONSORS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
        >
          <Heart className="w-3 h-3" />
          SPONSOR
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Sponsor banner */}
      <div className="border border-[var(--border)] bg-[var(--card)] p-4 mb-4 shrink-0">
        <div className="flex items-start gap-3">
          <GitBranch className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Sponsor features, ship to everyone</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Every feature ships MIT-licensed to all users. Sponsors get logo on release notes and early access during development.
              Proven model &mdash; used by Astro, Svelte, and curl.
            </p>
            <div className="flex items-center gap-4 mt-2 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              <span>{sponsorable.length} ITEMS AVAILABLE</span>
              <span>&middot;</span>
              <span>{formatPrice(totalValue)} TOTAL ROADMAP VALUE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 font-mono text-[10px] tracking-wider border transition-colors ${
            filter === 'all'
              ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
          }`}
        >
          ALL
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] tracking-wider border transition-colors ${
              filter === cat.id
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
            }`}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </button>
        ))}
        <div className="w-px bg-[var(--border)] mx-1" />
        {(['all', 'open', 'in-progress', 'shipped'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2 py-0.5 font-mono text-[10px] tracking-wider border transition-colors ${
              statusFilter === s
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
            }`}
          >
            {s === 'all' ? 'ANY STATUS' : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, i) => {
            const status = STATUS_CONFIG[item.status];
            const cat = CATEGORIES.find(c => c.id === item.category);
            const CatIcon = cat?.icon || Layers;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--primary)] transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Category icon */}
                  <div className="w-8 h-8 flex items-center justify-center border border-[var(--border)] shrink-0">
                    <CatIcon className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      {item.issueNumber && (
                        <a
                          href={item.issueUrl || `${REPO_URL}/issues/${item.issueNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                        >
                          #{item.issueNumber}
                        </a>
                      )}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] tracking-widest ${status.colour} ${status.bg}`}>
                        {item.status === 'shipped' && <CheckCircle className="w-3 h-3" />}
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{item.description}</p>

                    {/* Footer: category + sponsor price */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                        {cat?.label}
                      </span>
                      {item.sponsorPrice && !item.sponsor ? (
                        <a
                          href={GITHUB_SPONSORS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-0.5 border border-[var(--border)] font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                        >
                          <Heart className="w-3 h-3" />
                          SPONSOR {formatPrice(item.sponsorPrice)}
                        </a>
                      ) : item.sponsor ? (
                        <span className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-[var(--success)]">
                          <Heart className="w-3 h-3 fill-current" />
                          SPONSORED BY {item.sponsor.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
            <Wrench className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No items match these filters</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 pt-3 mt-3 border-t border-[var(--border)] shrink-0 font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
        <span>{filtered.length} SHOWING</span>
        <span>&middot;</span>
        <span>{ROADMAP_ITEMS.filter(i => i.status === 'shipped').length} SHIPPED</span>
        <span>&middot;</span>
        <span>{ROADMAP_ITEMS.filter(i => i.status === 'in-progress').length} IN PROGRESS</span>
        <span>&middot;</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[var(--primary)] transition-colors"
        >
          <Globe className="w-3 h-3" />
          GITHUB
        </a>
      </div>
    </div>
  );
}
