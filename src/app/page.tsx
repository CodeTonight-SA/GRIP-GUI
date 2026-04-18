'use client';

import ChatInterface from '@/components/Engine/ChatInterface';
import ContextPanel from '@/components/Engine/ContextPanel';
import ChatHistory from '@/components/Engine/ChatHistory';
import GripStatusBar from '@/components/Engine/GripStatusBar';
import FocusMode from '@/components/Engine/FocusMode';
import WelcomeAnimation from '@/components/Engine/WelcomeAnimation';
import MobileToolbar from '@/components/Engine/MobileToolbar';
import ChatTabBar from '@/components/Engine/ChatTabBar';
import ContextGateSlideUp from '@/components/Engine/ContextGateSlideUp';
import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store';
import { isElectronEnv } from '@/lib/grip-session';
import { APP_VERSION } from '@/lib/app-version';
import {
  getChatSessions,
  getActiveChatId,
  createChatSession,
  migrateStorageIfNeeded,
  getOpenTabIds,
  setOpenTabIds,
} from '@/lib/chat-storage';

const MAX_TABS = 8;

interface HealthData {
  skillCount: number;
  generation: number;
  fitness: number;
}

export default function EnginePage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [model, setModel] = useState('sonnet');
  const [openTabIds, setOpenTabIdsState] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData>({ skillCount: 5, generation: 33, fitness: 0.467 });
  const [activeModes, setActiveModes] = useState<string[]>([]);
  const { rightPanelCollapsed, toggleRightPanel } = useStore();

  // Active-mode poll for the status bar (S2-PR2). Matches ModeStackChip's
  // contract — GET /api/grip/modes, 30s poll. Duplicate of the chip fetch
  // today; a shared hook is a YSH candidate once a third caller appears.
  useEffect(() => {
    let cancelled = false;
    const fetchModes = async () => {
      try {
        const res = await fetch('/api/grip/modes');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setActiveModes(
          Array.isArray(data?.modes)
            ? data.modes.filter((m: unknown): m is string => typeof m === 'string')
            : [],
        );
      } catch {
        // Silent — status bar falls back to the default 'code' label.
      }
    };
    fetchModes();
    const interval = setInterval(fetchModes, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Fetch GRIP health data for live status bar
  useEffect(() => {
    const fetchHealth = async () => {
      if (!isElectronEnv()) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await (window as any).electronAPI?.grip?.getHealth();
        if (data?.status === 'healthy') {
          setHealth({
            skillCount: data.skillCount ?? 5,
            generation: data.generation ?? 33,
            fitness: data.fitness ?? 0.467,
          });
        }
      } catch { /* silently fail — status bar shows defaults */ }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialise: migrate, restore or create tabs
  useEffect(() => {
    migrateStorageIfNeeded();

    const sessions = getChatSessions();
    const sessionIds = new Set(sessions.map(s => s.id));

    // Restore persisted open tabs, filtering out deleted sessions
    const persisted = getOpenTabIds().filter(id => sessionIds.has(id));
    if (persisted.length > 0) {
      setOpenTabIdsState(persisted);
      setActiveTabId(persisted[0]);
      return;
    }

    // Fall back to the stored active chat or the first available session
    const activeId = getActiveChatId();
    if (activeId && sessionIds.has(activeId)) {
      setOpenTabIdsState([activeId]);
      setActiveTabId(activeId);
      setOpenTabIds([activeId]);
      return;
    }

    if (sessions.length > 0) {
      const firstId = sessions[0].id;
      setOpenTabIdsState([firstId]);
      setActiveTabId(firstId);
      setOpenTabIds([firstId]);
      return;
    }

    // No sessions yet — create one so there is always an initial tab
    const fresh = createChatSession('sonnet');
    setOpenTabIdsState([fresh.id]);
    setActiveTabId(fresh.id);
    setOpenTabIds([fresh.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist open tabs whenever the list changes
  useEffect(() => {
    if (openTabIds.length > 0) setOpenTabIds(openTabIds);
  }, [openTabIds]);

  const handleWelcomeComplete = useCallback(() => setShowWelcome(false), []);
  const handleFocusToggle = useCallback((focused: boolean) => setFocusMode(focused), []);

  // Called from ChatHistory when the user clicks a past session —
  // opens it as a new tab, or switches to an already-open tab.
  const handleSessionChange = useCallback((chatId: string) => {
    setOpenTabIdsState(prev => {
      if (prev.includes(chatId)) {
        setActiveTabId(chatId);
        return prev;
      }
      const next = prev.length >= MAX_TABS ? prev : [...prev, chatId];
      setActiveTabId(chatId);
      return next;
    });
  }, []);

  const handleNewTab = useCallback(() => {
    setOpenTabIdsState(prev => {
      if (prev.length >= MAX_TABS) return prev;
      const session = createChatSession(model);
      setActiveTabId(session.id);
      return [...prev, session.id];
    });
  }, [model]);

  // ChatHistory's onNewChat — same as opening a new tab
  const handleNewChat = useCallback(() => handleNewTab(), [handleNewTab]);

  const handleTabClose = useCallback((id: string) => {
    setOpenTabIdsState(prev => {
      const next = prev.filter(t => t !== id);
      if (id === activeTabId) {
        const idx = prev.indexOf(id);
        setActiveTabId(next[idx - 1] ?? next[idx] ?? null);
      }
      return next;
    });
  }, [activeTabId]);

  const handleTabSelect = useCallback((id: string) => setActiveTabId(id), []);

  // Keyboard shortcuts: ⌘T = new tab, ⌘W = close tab, ⌘1-9 = switch
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 't' || e.key === 'T') {
        if (openTabIds.length < MAX_TABS) { e.preventDefault(); handleNewTab(); }
      } else if (e.key === 'w' || e.key === 'W') {
        if (openTabIds.length > 1 && activeTabId) { e.preventDefault(); handleTabClose(activeTabId); }
      } else {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          const target = openTabIds[num - 1];
          if (target) { e.preventDefault(); setActiveTabId(target); }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openTabIds, activeTabId, handleNewTab, handleTabClose]);

  return (
    <>
      {showWelcome && <WelcomeAnimation onComplete={handleWelcomeComplete} />}

      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col pb-6">
        <div className="flex-1 flex min-h-0">

          {/* Chat area — left / main column. `relative` anchors the absolute
              ContextGateSlideUp so it respects the column width instead of
              running edge-to-edge and clipping under the left sidebar (#134). */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 relative">

            {/* Tab bar — only rendered when multiple tabs are open */}
            {openTabIds.length > 1 && !focusMode && (
              <ChatTabBar
                openTabIds={openTabIds}
                activeTabId={activeTabId}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                maxTabs={MAX_TABS}
              />
            )}

            {/* Chat instances — all mounted; inactive ones are CSS-hidden to preserve state */}
            <div className="flex-1 min-h-0">
              <FocusMode onToggle={handleFocusToggle}>
                <div className="h-full">
                  {openTabIds.map(tabId => (
                    <div
                      key={tabId}
                      className={tabId === activeTabId ? 'block h-full' : 'hidden'}
                    >
                      <ChatInterface
                        key={tabId}
                        chatId={tabId}
                        onModelChange={setModel}
                        isActive={tabId === activeTabId}
                      />
                    </div>
                  ))}
                  {/* Fallback: show blank ChatInterface if tabs haven't loaded yet */}
                  {openTabIds.length === 0 && (
                    <ChatInterface onModelChange={setModel} />
                  )}
                </div>
              </FocusMode>
            </div>

            {/* Context-gate slide-up (S5) — scoped to the chat column so it
                doesn't clip behind the left sidebar. Triggered by
                grip:context-gate-warning events with { percent }. Renders at >= 85. */}
            {!focusMode && <ContextGateSlideUp />}
          </div>

          {/* Right Panel — collapsible, mirrors left sidebar.
              NOTE: switched from `sticky top-0 h-screen self-start` to flex-native
              `h-full self-stretch` so the panel respects its parent row height in
              windowed mode. The h-screen (100vh) variant clipped / over-extended when
              the window was smaller than the screen because the status bar + pb-6
              reduced the row to less than 100vh. Flex stretch is the honest fit. */}
          {!focusMode && (
            <div
              className={`hidden lg:flex shrink-0 flex-col border-l border-[var(--border)] bg-[var(--card)] h-full self-stretch transition-[width] duration-200 ease-in-out ${rightPanelCollapsed ? 'w-8' : 'w-[280px]'}`}
            >
              {/* Collapse / expand toggle */}
              <button
                onClick={toggleRightPanel}
                title={rightPanelCollapsed ? 'Expand context panel (\u2318\u21E7B)' : 'Collapse context panel (\u2318\u21E7B)'}
                className="flex items-center justify-center h-8 w-full shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] border-b border-[var(--border)] transition-colors"
              >
                {rightPanelCollapsed
                  ? <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />
                  : <ChevronRight className="w-3 h-3" strokeWidth={1.5} />}
              </button>

              {!rightPanelCollapsed && (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <ContextPanel />
                  </div>
                  <div className="h-[240px] shrink-0 border-t border-[var(--border)] p-3 overflow-hidden">
                    <span className="grip-label block mb-2">HISTORY</span>
                    <div className="h-[calc(100%-24px)]">
                      <ChatHistory
                        onSessionChange={handleSessionChange}
                        onNewChat={handleNewChat}
                        currentModel={model}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!focusMode && (
          <GripStatusBar
            skillCount={health.skillCount}
            version={APP_VERSION}
            activeMode={activeModes[0] ?? 'code'}
            // contextPercent omitted deliberately: no authoritative source wired
            // yet. Widget renders "CTX --" per the S2-PR1 council scope rider.
          />
        )}
      </div>

      {/* Mobile bottom toolbar */}
      {!focusMode && <MobileToolbar />}
    </>
  );
}
