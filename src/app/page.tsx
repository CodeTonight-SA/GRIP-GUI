'use client';

import ChatInterface from '@/components/Engine/ChatInterface';
import GripStatusBar from '@/components/Engine/GripStatusBar';
import FocusMode from '@/components/Engine/FocusMode';
import WelcomeAnimation from '@/components/Engine/WelcomeAnimation';
import MobileToolbar from '@/components/Engine/MobileToolbar';
import ChatTabBar from '@/components/Engine/ChatTabBar';
import ContextGateSlideUp from '@/components/Engine/ContextGateSlideUp';
import { useState, useCallback, useEffect } from 'react';
import { isElectronEnv } from '@/lib/grip-session';
import { APP_VERSION } from '@/lib/app-version';
import { getActiveModes } from '@/lib/grip-modes-client';
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

  // Active-mode poll for the status bar (S2-PR2). Uses the surface-agnostic
  // getActiveModes() helper (IPC in Electron, fetch on web) so the packaged
  // app doesn't 404 on /api/grip/modes (Issue #133).
  useEffect(() => {
    let cancelled = false;
    const fetchModes = async () => {
      const { modes } = await getActiveModes();
      if (cancelled) return;
      setActiveModes(modes);
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

  const handleNewTab = useCallback(() => {
    setOpenTabIdsState(prev => {
      if (prev.length >= MAX_TABS) return prev;
      const session = createChatSession(model);
      setActiveTabId(session.id);
      return [...prev, session.id];
    });
  }, [model]);

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
