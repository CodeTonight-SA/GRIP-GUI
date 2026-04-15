'use client';

import ChatInterface from '@/components/Engine/ChatInterface';
import ContextPanel from '@/components/Engine/ContextPanel';
import ChatHistory from '@/components/Engine/ChatHistory';
import GripStatusBar from '@/components/Engine/GripStatusBar';
import FocusMode from '@/components/Engine/FocusMode';
import WelcomeAnimation from '@/components/Engine/WelcomeAnimation';
import MobileToolbar from '@/components/Engine/MobileToolbar';
import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store';
import { isElectronEnv } from '@/lib/grip-session';
import {
  getChatSessions,
  getActiveChatId,
  createChatSession,
  getChatMessages,
  migrateStorageIfNeeded,
  type ChatSession,
} from '@/lib/chat-storage';

interface HealthData {
  skillCount: number;
  generation: number;
  fitness: number;
}

export default function EnginePage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [model, setModel] = useState('sonnet');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0); // Force re-mount ChatInterface on session switch
  const [health, setHealth] = useState<HealthData>({ skillCount: 5, generation: 33, fitness: 0.467 });
  const { rightPanelCollapsed, toggleRightPanel } = useStore();

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

  // Initialise: migrate storage, load or create active chat
  useEffect(() => {
    migrateStorageIfNeeded();

    const existingId = getActiveChatId();
    if (existingId) {
      setActiveChatId(existingId);
    } else {
      const sessions = getChatSessions();
      if (sessions.length > 0) {
        setActiveChatId(sessions[0].id);
      }
      // Don't auto-create — let ChatInterface create on first message
    }
  }, []);

  const handleWelcomeComplete = useCallback(() => setShowWelcome(false), []);
  const handleFocusToggle = useCallback((focused: boolean) => {
    setFocusMode(focused);
  }, []);

  const handleSessionChange = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setChatKey(prev => prev + 1); // Force ChatInterface to re-mount with new session data
  }, []);

  const handleNewChat = useCallback(() => {
    const session = createChatSession(model);
    setActiveChatId(session.id);
    setChatKey(prev => prev + 1);
  }, [model]);

  return (
    <>
      {showWelcome && <WelcomeAnimation onComplete={handleWelcomeComplete} />}

      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col pb-6">
        <div className="flex-1 flex min-h-0">
          {/* Chat Interface — left (main content) */}
          <div className="flex-1 min-w-0">
            <FocusMode onToggle={handleFocusToggle}>
              <ChatInterface
                key={chatKey}
                chatId={activeChatId}
                onModelChange={setModel}
              />
            </FocusMode>
          </div>

          {/* Right Panel — sticky, collapsible, mirrors left sidebar behaviour */}
          {!focusMode && (
            <div
              className={`hidden lg:flex shrink-0 flex-col border-l border-[var(--border)] bg-[var(--card)] sticky top-0 h-screen self-start transition-[width] duration-200 ease-in-out ${rightPanelCollapsed ? 'w-8' : 'w-[280px]'}`}
            >
              {/* Collapse / expand toggle — always visible */}
              <button
                onClick={toggleRightPanel}
                title={rightPanelCollapsed ? 'Expand context panel (\u2318\u21E7B)' : 'Collapse context panel (\u2318\u21E7B)'}
                className="flex items-center justify-center h-8 w-full shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] border-b border-[var(--border)] transition-colors"
              >
                {rightPanelCollapsed
                  ? <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />
                  : <ChevronRight className="w-3 h-3" strokeWidth={1.5} />}
              </button>

              {/* Panel content — hidden when collapsed */}
              {!rightPanelCollapsed && (
                <>
                  {/* Context Panel — fills remaining height */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <ContextPanel />
                  </div>

                  {/* Chat History — pinned to bottom */}
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

        {!focusMode && <GripStatusBar skillCount={health.skillCount} />}
      </div>

      {/* Mobile bottom toolbar — visible on small screens only */}
      {!focusMode && <MobileToolbar />}
    </>
  );
}
