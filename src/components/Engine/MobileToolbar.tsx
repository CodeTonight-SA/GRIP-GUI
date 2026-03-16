'use client';

import { Layers, Sparkles, History, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mobile bottom toolbar for quick access to key features.
 * Shows on screens < 1024px. Replaces the desktop context panel.
 *
 * Swiss Nihilism: sharp, monospace, minimal, 48px touch targets.
 * Uses safe area insets for notched devices.
 */
export default function MobileToolbar() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs = [
    { id: 'modes', icon: Layers, label: 'MODES', action: () => router.push('/modes') },
    { id: 'skills', icon: Sparkles, label: 'SKILLS', action: () => router.push('/skills') },
    { id: 'history', icon: History, label: 'HISTORY', action: () => {} },
    { id: 'learn', icon: BookOpen, label: 'LEARN', action: () => router.push('/learn') },
  ];

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); tab.action(); }}
            className="flex flex-col items-center gap-1 py-2 px-4 min-h-[48px] min-w-[48px] transition-colors"
          >
            <tab.icon
              className={`w-4 h-4 ${activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
              strokeWidth={1.5}
            />
            <span className={`font-mono text-[8px] tracking-widest ${
              activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
            }`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
