'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import {
  getChatSessions,
  getActiveChatId,
  setActiveChatId,
  createChatSession,
  deleteChatSession,
  type ChatSession,
} from '@/lib/chat-storage';
import {
  isHalBackend,
  listSessions as halListSessions,
  createSession as halCreateSession,
  deleteSession as halDeleteSession,
  type HalSession,
} from '@/lib/hal-client';

/** Convert HAL session to ChatSession shape for unified rendering. */
function halToChatSession(h: HalSession): ChatSession {
  return {
    id: h.id,
    title: h.title,
    createdAt: new Date(h.created_at * 1000).toISOString(),
    updatedAt: new Date(h.updated_at * 1000).toISOString(),
    messageCount: h.message_count,
    model: h.model,
    sessionId: h.id,
  };
}

interface ChatHistoryProps {
  onSessionChange: (chatId: string) => void;
  onNewChat: () => void;
  currentModel: string;
}

/**
 * Chat history sidebar showing previous conversations.
 * Each session shows title, timestamp, and message count.
 * Swiss Nihilism: monospace, sharp borders, minimal hover states.
 */
export default function ChatHistory({ onSessionChange, onNewChat, currentModel }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const halActive = isHalBackend();

  // Load sessions from HAL or localStorage
  useEffect(() => {
    if (halActive) {
      halListSessions().then(halSessions => {
        setSessions(halSessions.map(halToChatSession));
      });
    } else {
      setSessions(getChatSessions());
    }
    setActiveId(getActiveChatId());
  }, [halActive]);

  const handleNewChat = async () => {
    if (halActive) {
      const id = await halCreateSession(currentModel);
      if (id) {
        setActiveChatId(id);
        setActiveId(id);
        onSessionChange(id);
        const updated = await halListSessions();
        setSessions(updated.map(halToChatSession));
      }
    } else {
      const session = createChatSession(currentModel);
      setSessions(getChatSessions());
      setActiveId(session.id);
      setActiveChatId(session.id);
      onSessionChange(session.id);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setActiveId(chatId);
    onSessionChange(chatId);
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (halActive) {
      await halDeleteSession(chatId);
      const updated = await halListSessions();
      const mapped = updated.map(halToChatSession);
      setSessions(mapped);
      if (activeId === chatId) {
        const newActive = mapped[0]?.id || null;
        setActiveId(newActive);
        if (newActive) onSessionChange(newActive);
        else onNewChat();
      }
    } else {
      deleteChatSession(chatId);
      const updated = getChatSessions();
      setSessions(updated);
      if (activeId === chatId) {
        const newActive = updated[0]?.id || null;
        setActiveId(newActive);
        if (newActive) onSessionChange(newActive);
        else onNewChat();
      }
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'JUST NOW';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* New chat button */}
      <button
        onClick={handleNewChat}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-[var(--border)] hover:border-[var(--primary)] transition-colors mb-2"
      >
        <Plus className="w-3.5 h-3.5 text-[var(--primary)]" strokeWidth={1.5} />
        <span className="font-mono text-[10px] tracking-widest text-[var(--foreground)]">NEW CHAT</span>
      </button>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-5 h-5 text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" />
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] opacity-50">
              NO CHATS YET
            </span>
          </div>
        ) : (
          <AnimatePresence initial={!reduceMotion}>
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.03 }}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectChat(session.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectChat(session.id); } }}
              className={`w-full text-left px-3 py-2 group transition-colors cursor-pointer ${
                session.id === activeId
                  ? 'border-l-2 border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--foreground)]'
                  : 'border-l-2 border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs truncate flex-1 pr-2">
                  {session.title}
                </span>
                <button
                  onClick={(e) => handleDeleteChat(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] tracking-wider text-[var(--muted-foreground)] opacity-60">
                  {formatTime(session.updatedAt)}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-[var(--muted-foreground)] opacity-40">
                  {session.messageCount} MSG
                </span>
                <span className="font-mono text-[9px] tracking-wider text-[var(--muted-foreground)] opacity-30">
                  {session.model.toUpperCase()}
                </span>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
