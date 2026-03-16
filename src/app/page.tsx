'use client';

import ChatInterface from '@/components/Engine/ChatInterface';
import ContextPanel from '@/components/Engine/ContextPanel';
import { useState } from 'react';

export default function EnginePage() {
  const [showContext, setShowContext] = useState(true);

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen flex">
      {/* Context Panel — 3 cols on desktop, hidden on mobile */}
      {showContext && (
        <div className="hidden lg:block w-[280px] shrink-0">
          <ContextPanel />
        </div>
      )}

      {/* Chat Interface — fills remaining space */}
      <div className="flex-1 min-w-0">
        <ChatInterface />
      </div>
    </div>
  );
}
