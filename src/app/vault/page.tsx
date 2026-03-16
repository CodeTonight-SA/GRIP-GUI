'use client';

import { useState } from 'react';
import VaultView from '@/components/VaultView';
import ObsidianVaultView from '@/components/ObsidianVaultView';
import { ObsidianIcon } from '@/components/Settings/ObsidianIcon';
import { Archive } from 'lucide-react';

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState<'grip' | 'obsidian'>('grip');

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] flex flex-col pt-4 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tighter text-[var(--foreground)]">Vault</h1>
          <p className="text-[var(--muted-foreground)] text-xs lg:text-sm mt-1 hidden sm:block font-mono tracking-wider">
            Agent reports, knowledge base & notes
          </p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('grip')}
          className={`
            flex items-center gap-2 px-3 py-2 font-mono text-xs tracking-widest transition-all whitespace-nowrap min-h-[48px]
            ${activeTab === 'grip'
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
            }
          `}
        >
          <Archive className="w-4 h-4" strokeWidth={1.5} />
          GRIP VAULT
        </button>
        <button
          onClick={() => setActiveTab('obsidian')}
          className={`
            flex items-center gap-2 px-3 py-2 font-mono text-xs tracking-widest transition-all whitespace-nowrap min-h-[48px]
            ${activeTab === 'obsidian'
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
            }
          `}
        >
          <ObsidianIcon className={`w-4 h-4 ${activeTab === 'obsidian' ? 'text-[var(--background)]' : 'text-[#A88BFA]'}`} />
          OBSIDIAN
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'grip' ? <VaultView embedded /> : <ObsidianVaultView />}
      </div>
    </div>
  );
}
