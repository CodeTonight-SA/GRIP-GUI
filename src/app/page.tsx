'use client';

import ChatInterface from '@/components/Engine/ChatInterface';
import ContextPanel from '@/components/Engine/ContextPanel';
import ChatHistory from '@/components/Engine/ChatHistory';
import GripStatusBar from '@/components/Engine/GripStatusBar';
import FocusMode from '@/components/Engine/FocusMode';
import WelcomeAnimation from '@/components/Engine/WelcomeAnimation';
import { useState, useCallback, useEffect } from 'react';
import {
  getChatSessions,
  getActiveChatId,
  createChatSession,
  getChatMessages,
  type ChatSession,
} from '@/lib/chat-storage';

export default function EnginePage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [model, setModel] = useState('sonnet');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0); // Force re-mount ChatInterface on session switch

  // Initialise: load or create active chat
  useEffect(() => {
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

      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col">
        <div className="flex-1 flex min-h-0">
          {/* Left Panel — Context + Chat History, hidden in focus mode */}
          {!focusMode && (
            <div className="hidden lg:flex w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
              {/* Context Panel — top half */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ContextPanel />
              </div>

              {/* Chat History — bottom section */}
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
            </div>
          )}

          {/* Chat Interface */}
          <div className="flex-1 min-w-0">
            <FocusMode onToggle={handleFocusToggle}>
              <ChatInterface
                key={chatKey}
                chatId={activeChatId}
                onModelChange={setModel}
              />
            </FocusMode>
          </div>
        </div>

        {!focusMode && <GripStatusBar />}
      </div>
    </>
  );
}
