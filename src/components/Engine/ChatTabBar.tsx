'use client';

import { Plus, X, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getChatSessions, type ChatSession } from '@/lib/chat-storage';

interface ChatTabBarProps {
  openTabIds: string[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  maxTabs?: number;
}

/**
 * Tab bar for switching between concurrent chat sessions.
 * Shown only when more than one tab is open.
 * Swiss Nihilism: monospace labels, sharp borders, no decoration.
 */
export default function ChatTabBar({
  openTabIds,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  maxTabs = 8,
}: ChatTabBarProps) {
  const [sessionMap, setSessionMap] = useState<Record<string, ChatSession>>({});

  // Refresh session titles whenever the tab list changes
  useEffect(() => {
    const all = getChatSessions();
    const map: Record<string, ChatSession> = {};
    for (const s of all) map[s.id] = s;
    setSessionMap(map);
  }, [openTabIds]);

  return (
    <div className="flex items-stretch border-b border-[var(--border)] bg-[var(--card)] overflow-x-auto shrink-0 min-h-[32px]">
      {openTabIds.map((id) => {
        const session = sessionMap[id];
        const title = session?.title ?? 'New Chat';
        const isActive = id === activeTabId;

        return (
          <div
            key={id}
            role="tab"
            tabIndex={0}
            aria-selected={isActive}
            onClick={() => onTabSelect(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTabSelect(id); }
            }}
            className={`flex items-center gap-1.5 px-3 shrink-0 cursor-pointer border-r border-[var(--border)] transition-colors select-none group max-w-[160px] min-w-[80px] ${
              isActive
                ? 'bg-[var(--background)] text-[var(--foreground)] border-b-2 border-b-[var(--primary)] -mb-px'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
            }`}
          >
            <MessageSquare className="w-3 h-3 shrink-0 opacity-40" strokeWidth={1.5} />
            <span className="font-mono text-[10px] tracking-wider truncate flex-1 py-2">
              {title.toUpperCase().slice(0, 20)}
            </span>
            {openTabIds.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onTabClose(id); }}
                className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 -mr-1 hover:text-[var(--danger)]"
                aria-label={`Close tab: ${title}`}
              >
                <X className="w-2.5 h-2.5" strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}

      {/* New tab button — hidden when at max */}
      {openTabIds.length < maxTabs && (
        <button
          onClick={onNewTab}
          title="New chat tab (⌘T)"
          aria-label="New chat tab"
          className="flex items-center justify-center w-8 shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors border-r border-[var(--border)]"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
