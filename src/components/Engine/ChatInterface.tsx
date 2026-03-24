'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Terminal as TerminalIcon, Square } from 'lucide-react';
import { sendToGrip, type GripMessage, type GripMetrics } from '@/lib/grip-session';
import {
  getChatMessages,
  saveChatMessages,
  createChatSession,
  updateChatTitle,
  updateSessionId,
  generateTitle,
  getActiveChatId,
  setActiveChatId,
  getChatSessions,
} from '@/lib/chat-storage';
import MarkdownContent from './MarkdownContent';
import ModelSelector from './ModelSelector';

const SUGGESTED_PROMPTS = [
  { text: 'What can GRIP help me with?', icon: '?' },
  { text: 'Review this code for security issues', icon: 'S' },
  { text: 'Help me write a project proposal', icon: 'W' },
  { text: 'Analyse this business decision', icon: 'D' },
];

interface ChatInterfaceProps {
  chatId?: string | null;
  onModelChange?: (model: string) => void;
}

export default function ChatInterface({ chatId, onModelChange }: ChatInterfaceProps) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  const [messages, setMessages] = useState<GripMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [model, setModel] = useState('sonnet');

  // Load persisted messages on mount or chat switch
  useEffect(() => {
    if (currentChatId) {
      const stored = getChatMessages(currentChatId);
      setMessages(stored);
      // Restore session ID for --resume
      const sessions = getChatSessions();
      const session = sessions.find(s => s.id === currentChatId);
      if (session?.sessionId) setSessionId(session.sessionId);
    }
  }, [currentChatId]);

  // Update currentChatId when prop changes
  useEffect(() => {
    if (chatId !== undefined) setCurrentChatId(chatId);
  }, [chatId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    // Ensure we have a chat session
    let chatId = currentChatId;
    if (!chatId) {
      const session = createChatSession(model);
      chatId = session.id;
      setCurrentChatId(chatId);
      setActiveChatId(chatId);
    }

    const userMessage: GripMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: GripMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };

    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Persist and auto-title
    if (chatId) {
      saveChatMessages(chatId, newMessages);
      if (messages.length === 0) {
        updateChatTitle(chatId, generateTitle(input.trim()));
      }
    }

    // Stream response from real GRIP backend
    let fullText = '';
    let metrics: GripMetrics | undefined;

    try {
      for await (const event of sendToGrip(input.trim(), sessionId, model)) {
        if (event.type === 'text') {
          fullText += event.data as string;
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = fullText;
            }
            return [...updated];
          });
        } else if (event.type === 'metrics') {
          metrics = event.data as GripMetrics;
          if (metrics.sessionId) {
            setSessionId(metrics.sessionId);
          }
        } else if (event.type === 'error') {
          fullText += `\n[GRIP Error: ${event.data}]`;
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = fullText;
            }
            return [...updated];
          });
        }
      }
    } catch (err) {
      fullText += `\n[Connection error: ${err instanceof Error ? err.message : String(err)}]`;
    }

    // Finalise the message and persist
    setMessages(prev => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg.role === 'assistant') {
        lastMsg.content = fullText || '[No response from GRIP]';
        lastMsg.streaming = false;
        lastMsg.metrics = metrics;
        lastMsg.detectedMode = detectMode(userMessage.content);
        lastMsg.detectedSkills = detectSkills(userMessage.content);
      }
      if (chatId) saveChatMessages(chatId, updated);
      return [...updated];
    });
    // Store session ID for --resume ultra-fast responses
    if (metrics?.sessionId && chatId) {
      updateSessionId(chatId, metrics.sessionId);
    }
    setIsStreaming(false);
  }, [input, isStreaming, sessionId, model, currentChatId, messages]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto">
            <div className="w-12 h-12 bg-[var(--primary)] mb-6" />
            <h1 className="text-3xl font-bold tracking-tighter text-[var(--foreground)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              GRIP
            </h1>
            <p className="font-mono text-xs tracking-widest text-[var(--muted-foreground)] mb-8">
              KNOWLEDGE WORK ENGINE
            </p>
            <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-md">
              Your AI thinking partner. Connected to your local GRIP instance
              with all skills, modes, and safety gates active.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => handleSuggestedPrompt(prompt.text)}
                  className="flex items-start gap-3 p-4 border border-[var(--border)] hover:border-[var(--primary)] transition-colors text-left group"
                >
                  <span className="font-mono text-xs text-[var(--primary)] mt-0.5 shrink-0 w-4">
                    {prompt.icon}
                  </span>
                  <span className="text-sm text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
                    {prompt.text}
                  </span>
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] mt-8 opacity-60">
              CMD+K FOR COMMANDS | LOCAL GRIP BACKEND | REAL-TIME STREAMING
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {/* Auto-detection badges */}
                  {msg.detectedMode && !msg.streaming && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                      <span className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
                        GRIP: /{msg.detectedMode.toUpperCase()}
                      </span>
                      {msg.detectedSkills?.map(skill => (
                        <span key={skill} className="font-mono text-[10px] tracking-wider text-[var(--muted-foreground)] border border-[var(--border)] px-1.5 py-0.5">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`p-4 ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'border border-[var(--border)] text-[var(--foreground)]'
                  }`}>
                    <MarkdownContent content={msg.content} />
                    {msg.streaming && (
                      <span className="inline-block w-2 h-4 bg-[var(--primary)] animate-pulse ml-0.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-[9px] tracking-wider text-[var(--muted-foreground)]">
                      {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.metrics && (
                      <>
                        {msg.metrics.totalDurationMs && (
                          <span className="font-mono text-[8px] tracking-wider text-[var(--muted-foreground)] opacity-50">
                            {(msg.metrics.totalDurationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {msg.metrics.model && (
                          <span className="font-mono text-[8px] tracking-wider text-[var(--muted-foreground)] opacity-50">
                            {msg.metrics.model}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="border border-[var(--border)] p-4">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-3 h-3 text-[var(--primary)] animate-pulse" />
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      GRIP is processing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] bg-[var(--card)] p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)] min-h-[48px] max-h-[200px] disabled:opacity-50"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
              />
            </div>
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="bg-[var(--danger)] text-white p-3 min-h-[48px] min-w-[48px] flex items-center justify-center hover:opacity-90 transition-opacity"
                title="Stop generation"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-[var(--primary)] text-[var(--primary-foreground)] p-3 min-h-[48px] min-w-[48px] flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <ModelSelector value={model} onChange={setModel} compact />
              <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] opacity-50">
                ENTER TO SEND | CMD+K
              </span>
            </div>
            {sessionId && (
              <span className="font-mono text-[8px] tracking-wider text-[var(--primary)] opacity-60">
                SESSION: {sessionId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple mode detection based on keywords
function detectMode(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('code') || lower.includes('function') || lower.includes('bug') || lower.includes('implement')) return 'code';
  if (lower.includes('security') || lower.includes('vulnerability') || lower.includes('threat')) return 'security';
  if (lower.includes('review') || lower.includes('pr ') || lower.includes('pull request')) return 'review';
  if (lower.includes('strategy') || lower.includes('decision') || lower.includes('business')) return 'strategy';
  if (lower.includes('write') || lower.includes('article') || lower.includes('blog')) return 'writing';
  if (lower.includes('research') || lower.includes('analyse') || lower.includes('investigate')) return 'research';
  if (lower.includes('contract') || lower.includes('legal') || lower.includes('compliance')) return 'legal';
  if (lower.includes('plan') || lower.includes('schedule') || lower.includes('prioriti')) return 'planning';
  if (lower.includes('teach') || lower.includes('explain') || lower.includes('learn')) return 'teaching';
  return undefined;
}

function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const skills: string[] = [];
  if (lower.includes('security') || lower.includes('vulnerability')) skills.push('vulnerability-detection');
  if (lower.includes('test') || lower.includes('e2e')) skills.push('e2e-test-generation');
  if (lower.includes('design') || lower.includes('architect')) skills.push('design-principles');
  if (lower.includes('pr ') || lower.includes('pull request')) skills.push('pr-automation');
  if (lower.includes('contract')) skills.push('contract-formal');
  return skills.slice(0, 3);
}
