'use client';

import { useState, useRef, useEffect, useCallback, type ClipboardEvent, type DragEvent } from 'react';
import { Send, Sparkles, Square, X, Image as ImageIcon, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { sendToGrip, filterResponseMetadata, detectGateInText, type GripMessage, type GripMetrics, type ToolUseEvent, type ToolResultEvent, type GateEvent } from '@/lib/grip-session';
import TypingIndicator from './TypingIndicator';
import ThinkingIndicator from './ThinkingIndicator';
import ToolUseBlock from './ToolUseBlock';
import GateIndicator from './GateIndicator';
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

// Module-level: tracks active streams across component mount/unmount cycles.
// Enables session persistence when user switches tabs during streaming.
const activeStreams = new Map<string, string | null>(); // chatId -> promptSessionId

function persistStreamContent(
  chatId: string,
  content: string,
  streaming: boolean,
  metrics?: GripMetrics,
): void {
  try {
    const messages = getChatMessages(chatId);
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      lastMsg.content = content;
      lastMsg.streaming = streaming;
      if (metrics) lastMsg.metrics = metrics;
    }
    saveChatMessages(chatId, messages);
  } catch { /* ignore persist errors */ }
}

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
  const [showSpinner, setShowSpinner] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [model, setModel] = useState('sonnet');
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted messages on mount or chat switch, reconnect active streams
  useEffect(() => {
    if (currentChatId) {
      const stored = getChatMessages(currentChatId);
      setMessages(stored);
      const sessions = getChatSessions();
      const session = sessions.find(s => s.id === currentChatId);
      if (session?.sessionId) setSessionId(session.sessionId);

      // Reconnect to active stream after tab switch
      if (activeStreams.has(currentChatId)) {
        setIsStreaming(true);
        activePromptSessionRef.current = activeStreams.get(currentChatId) ?? null;
        const poll = setInterval(() => {
          const latest = getChatMessages(currentChatId);
          setMessages(latest);
          if (!activeStreams.has(currentChatId)) {
            setIsStreaming(false);
            setShowSpinner(false);
            clearInterval(poll);
          }
        }, 250);
        return () => clearInterval(poll);
      }
    }
  }, [currentChatId]);

  // Update currentChatId when prop changes
  useEffect(() => {
    if (chatId !== undefined) setCurrentChatId(chatId);
  }, [chatId]);
  const [pastedImage, setPastedImage] = useState<{ dataUrl: string; tempPath?: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const reduceMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Tracks the Electron IPC prompt session ID so the stop button can kill it
  const activePromptSessionRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingContentRef = useRef('');
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [messages]);

  // Scroll-to-bottom button: show when user scrolls up more than 200px from bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollButton(distanceFromBottom > 200);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const flushStreamUpdate = useCallback(() => {
    rafIdRef.current = null;
    const text = pendingContentRef.current;
    setMessages(prev => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.role === 'assistant') {
        lastMsg.content = text;
      }
      return updated;
    });
  }, []);

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

    const imageContext = pastedImage?.tempPath
      ? `\n\n[Attached image: ${pastedImage.tempPath}]`
      : '';

    const userMessage: GripMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim() + (pastedImage ? ' [image attached]' : ''),
      timestamp: new Date(),
      imageDataUrl: pastedImage?.dataUrl,
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
    setPastedImage(null);
    setIsStreaming(true);
    if (chatId) activeStreams.set(chatId, null);
    spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), 200);

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
    let receivedFirstToken = false;
    let lastPersistTime = 0;
    const toolUses: ToolUseEvent[] = [];
    const toolResults: ToolResultEvent[] = [];
    const gates: GateEvent[] = [];

    const promptText = input.trim() + imageContext;
    try {
      for await (const event of sendToGrip(
        promptText,
        sessionId,
        model,
        (id) => { activePromptSessionRef.current = id; if (chatId) activeStreams.set(chatId, id); },
      )) {
        if (event.type === 'thinking') {
          // Show thinking indicator — extended reasoning in progress
          setIsThinking(true);
          if (spinnerTimerRef.current) {
            clearTimeout(spinnerTimerRef.current);
            spinnerTimerRef.current = null;
          }
          setShowSpinner(false);
        } else if (event.type === 'text') {
          // Text arrived — thinking phase is over
          setIsThinking(false);
          if (!receivedFirstToken) {
            receivedFirstToken = true;
            if (spinnerTimerRef.current) {
              clearTimeout(spinnerTimerRef.current);
              spinnerTimerRef.current = null;
            }
            setShowSpinner(false);
          }
          const textChunk = event.data as string;
          fullText += textChunk;
          pendingContentRef.current = filterResponseMetadata(fullText);
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushStreamUpdate);
          }
          // Detect GRIP gate patterns in text chunks
          const gate = detectGateInText(textChunk);
          if (gate) {
            gates.push(gate);
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last?.streaming) {
                return [...prev.slice(0, -1), { ...last, gates: [...gates] }];
              }
              return prev;
            });
          }
          // Periodic persist for tab-switch resilience
          const now = Date.now();
          if (chatId && now - lastPersistTime > 500) {
            lastPersistTime = now;
            persistStreamContent(chatId, pendingContentRef.current, true);
          }
        } else if (event.type === 'tool_use') {
          if (!receivedFirstToken) {
            receivedFirstToken = true;
            if (spinnerTimerRef.current) {
              clearTimeout(spinnerTimerRef.current);
              spinnerTimerRef.current = null;
            }
            setShowSpinner(false);
          }
          const toolUse = event.data as ToolUseEvent;
          toolUses.push(toolUse);
          // Force a re-render to show tool use blocks in real-time
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && last?.streaming) {
              return [...prev.slice(0, -1), { ...last, toolUses: [...toolUses] }];
            }
            return prev;
          });
        } else if (event.type === 'tool_result') {
          const toolResult = event.data as ToolResultEvent;
          toolResults.push(toolResult);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && last?.streaming) {
              return [...prev.slice(0, -1), { ...last, toolResults: [...toolResults] }];
            }
            return prev;
          });
        } else if (event.type === 'metrics') {
          metrics = event.data as GripMetrics;
          if (metrics.sessionId) {
            setSessionId(metrics.sessionId);
          }
        } else if (event.type === 'error') {
          fullText += `\n[GRIP Error: ${event.data}]`;
          pendingContentRef.current = filterResponseMetadata(fullText);
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushStreamUpdate);
          }
        }
      }
    } catch (err) {
      fullText += `\n[Connection error: ${err instanceof Error ? err.message : String(err)}]`;
    }

    // Flush any pending RAF update before finalising
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Finalise the message and persist
    const filteredFinal = filterResponseMetadata(fullText) || '[No response from GRIP]';
    setMessages(prev => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg.role === 'assistant') {
        lastMsg.content = filteredFinal;
        lastMsg.streaming = false;
        lastMsg.metrics = metrics;
        lastMsg.detectedMode = detectMode(userMessage.content);
        lastMsg.detectedSkills = detectSkills(userMessage.content);
        if (toolUses.length) lastMsg.toolUses = toolUses;
        if (toolResults.length) lastMsg.toolResults = toolResults;
        if (gates.length) lastMsg.gates = gates;
      }
      if (chatId) saveChatMessages(chatId, updated);
      return [...updated];
    });
    // Direct persist — works even if component is unmounted after tab switch
    if (chatId) {
      persistStreamContent(chatId, filteredFinal, false, metrics);
      activeStreams.delete(chatId);
    }
    // Store session ID for --resume ultra-fast responses
    if (metrics?.sessionId && chatId) {
      updateSessionId(chatId, metrics.sessionId);
    }
    activePromptSessionRef.current = null;
    setIsStreaming(false);
    setIsThinking(false);
    setShowSpinner(false);
    if (spinnerTimerRef.current) {
      clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = null;
    }
  }, [input, isStreaming, sessionId, model, currentChatId, messages, flushStreamUpdate, pastedImage]);

  const handleStop = useCallback(() => {
    const id = activePromptSessionRef.current;
    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI?.grip?.killPrompt?.(id);
      activePromptSessionRef.current = null;
      // Clean up module-level stream tracking
      for (const [cId, promptId] of activeStreams) {
        if (promptId === id) { activeStreams.delete(cId); break; }
      }
    }
    setIsStreaming(false);
    setShowSpinner(false);
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

  // Shared helper for processing image files (paste or drag-and-drop)
  const processImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.saveTemp) {
        electronAPI.saveTemp(dataUrl).then((tempPath: string) => {
          setPastedImage({ dataUrl, tempPath });
        });
      } else {
        setPastedImage({ dataUrl });
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) processImageFile(file);
  }, [processImageFile]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) processImageFile(imageFile);
  }, [processImageFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 relative">
        {messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full max-w-xl mx-auto relative"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, var(--info-muted) 0%, transparent 60%)',
            }}
          >
            {/* Animated pulse bars as centrepiece */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-end gap-1 h-12 mb-6"
            >
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-2 bg-[var(--primary)]"
                  animate={{ height: ['8px', '48px', '8px'] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.6,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-3xl font-bold tracking-tighter text-[var(--foreground)] mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              GRIP
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="font-mono text-xs tracking-widest text-[var(--muted-foreground)] mb-8"
            >
              KNOWLEDGE WORK ENGINE
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-center text-[var(--muted-foreground)] mb-8 max-w-md"
            >
              Your AI thinking partner. Connected to your local GRIP instance
              with all skills, modes, and safety gates active.
            </motion.p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={prompt.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => handleSuggestedPrompt(prompt.text)}
                  className="flex items-start gap-3 p-4 border border-[var(--border)] hover:border-[var(--primary)] hover:-translate-y-px transition-all text-left group"
                >
                  <span className="font-mono text-xs text-[var(--primary)] mt-0.5 shrink-0 w-4">
                    {prompt.icon}
                  </span>
                  <span className="text-sm text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
                    {prompt.text}
                  </span>
                </motion.button>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] mt-8"
            >
              CMD+K FOR COMMANDS | LOCAL GRIP BACKEND | REAL-TIME STREAMING
            </motion.p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={reduceMotion ? false : { opacity: 0, x: msg.role === 'user' ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
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
                    {msg.imageDataUrl && (
                      <div className="mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.imageDataUrl}
                          alt="Attached"
                          className="max-h-48 w-auto border border-[var(--border)]"
                        />
                      </div>
                    )}
                    <MarkdownContent content={msg.content} />
                    {/* Gate indicators — show when GRIP safety gates fire */}
                    {msg.gates && msg.gates.length > 0 && (
                      <GateIndicator gates={msg.gates} />
                    )}
                    {/* Tool use blocks — show what the agent is doing */}
                    {msg.toolUses && msg.toolUses.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {msg.toolUses.map((tu, i) => (
                          <ToolUseBlock
                            key={tu.toolId || i}
                            toolUse={tu}
                            result={msg.toolResults?.find(r => r.toolId === tu.toolId)}
                          />
                        ))}
                      </div>
                    )}
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
              </motion.div>
            ))}
            </AnimatePresence>
            {isStreaming && isThinking && (
              <ThinkingIndicator />
            )}
            {isStreaming && showSpinner && !isThinking && messages[messages.length - 1]?.content === '' && (
              <TypingIndicator />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom floating button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors font-mono text-[9px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)]"
          >
            <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
            LATEST
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        className="border-t border-[var(--border)] bg-[var(--card)] p-4 pb-10 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Drag-and-drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/10">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--primary)]" />
              <span className="font-mono text-xs tracking-widest text-[var(--primary)]">
                DROP IMAGE HERE
              </span>
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          {/* Image preview strip */}
          {pastedImage && (
            <div className="flex items-center gap-3 mb-2 p-2 border border-[var(--border)] bg-[var(--background)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pastedImage.dataUrl}
                alt="Pasted"
                className="max-h-16 w-auto border border-[var(--border)]"
              />
              <span className="font-mono text-[9px] tracking-widest text-[var(--muted-foreground)]">
                IMAGE ATTACHED
              </span>
              <button
                onClick={() => setPastedImage(null)}
                className="ml-auto p-1 hover:bg-[var(--secondary)] transition-colors"
                title="Remove image"
              >
                <X className="w-3 h-3 text-[var(--muted-foreground)]" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Type your message..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)] min-h-[48px] max-h-[200px] disabled:opacity-50 chat-input-glow"
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
            <div className="flex items-center gap-3">
              {input.length > 0 && (
                <span className={`font-mono text-[8px] tracking-wider transition-colors ${
                  input.length > 4000 ? 'text-[var(--warning)]' : 'text-[var(--muted-foreground)] opacity-40'
                }`}>
                  {input.length.toLocaleString()}
                </span>
              )}
              {sessionId && (
                <span className="font-mono text-[8px] tracking-wider text-[var(--primary)] opacity-60">
                  SESSION: {sessionId.slice(0, 8)}
                </span>
              )}
            </div>
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
