'use client';

import ChatInterface from '@/components/Engine/ChatInterface';
import ContextPanel from '@/components/Engine/ContextPanel';
import GripStatusBar from '@/components/Engine/GripStatusBar';
import FocusMode from '@/components/Engine/FocusMode';
import WelcomeAnimation from '@/components/Engine/WelcomeAnimation';
import { useState, useCallback } from 'react';

export default function EnginePage() {
  const [showContext, setShowContext] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  const handleWelcomeComplete = useCallback(() => setShowWelcome(false), []);
  const handleFocusToggle = useCallback((focused: boolean) => {
    setFocusMode(focused);
  }, []);

  return (
    <>
      {/* Welcome animation — plays once for first-time users */}
      {showWelcome && <WelcomeAnimation onComplete={handleWelcomeComplete} />}

      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col">
        <div className="flex-1 flex min-h-0">
          {/* Context Panel — hidden in focus mode and on mobile */}
          {showContext && !focusMode && (
            <div className="hidden lg:block w-[280px] shrink-0">
              <ContextPanel />
            </div>
          )}

          {/* Chat Interface with Focus Mode wrapper */}
          <div className="flex-1 min-w-0">
            <FocusMode onToggle={handleFocusToggle}>
              <ChatInterface />
            </FocusMode>
          </div>
        </div>

        {/* Status Bar — hidden in focus mode */}
        {!focusMode && <GripStatusBar />}
      </div>
    </>
  );
}
