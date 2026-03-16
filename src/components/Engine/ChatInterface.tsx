'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Terminal as TerminalIcon } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  detectedMode?: string;
  detectedSkills?: string[];
}

const SUGGESTED_PROMPTS = [
  { text: 'What can GRIP help me with?', icon: '?' },
  { text: 'Review this code for security issues', icon: 'S' },
  { text: 'Help me write a project proposal', icon: 'W' },
  { text: 'Analyse this business decision', icon: 'D' },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate GRIP response with auto-detection
    setTimeout(() => {
      const detectedMode = detectMode(userMessage.content);
      const detectedSkills = detectSkills(userMessage.content);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: generateResponse(userMessage.content, detectedMode),
        timestamp: new Date(),
        detectedMode,
        detectedSkills,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

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
            <h1 className="text-3xl font-bold tracking-tighter text-[var(--foreground)] mb-2">
              GRIP
            </h1>
            <p className="font-mono text-xs tracking-widest text-[var(--muted-foreground)] mb-8">
              KNOWLEDGE WORK ENGINE
            </p>
            <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-md">
              Your AI thinking partner. It adapts to how you work — whether
              you are writing code, drafting contracts, or making strategic decisions.
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
              CMD+K FOR COMMANDS | 149 SKILLS | 30 MODES
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                  {/* Auto-detection badges */}
                  {msg.detectedMode && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                      <span className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
                        GRIP DETECTED: /{msg.detectedMode.toUpperCase()}
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
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  <span className="font-mono text-[9px] tracking-wider text-[var(--muted-foreground)] mt-1 block">
                    {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="border border-[var(--border)] p-4">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-3 h-3 text-[var(--primary)] animate-pulse" />
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      GRIP is thinking...
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
                className="w-full resize-none bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none placeholder:text-[var(--muted-foreground)] min-h-[48px] max-h-[200px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] p-3 min-h-[48px] min-w-[48px] flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] mt-2 opacity-50">
            ENTER TO SEND | SHIFT+ENTER FOR NEW LINE | CMD+K FOR COMMANDS
          </p>
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

function generateResponse(userMessage: string, detectedMode?: string): string {
  if (userMessage.toLowerCase().includes('what can grip help')) {
    return `GRIP is a cross-domain knowledge work engine. Here is what I can help with:

DEVELOPMENT — Write, review, test, and architect software with built-in design principles (SOLID, GRASP, DRY, KISS).

STRATEGY — Make structured decisions, run red-team analyses, and lock in strategic choices.

CONTENT — Write articles, marketing copy, and educational content with anti-fluff enforcement.

RESEARCH — Synthesise evidence, evaluate sources, and validate hypotheses.

LEGAL — Draft contracts, simplify legal language, and manage compliance workflows.

SECURITY — Detect vulnerabilities, model threats, and review code for security issues.

Try telling me what you are working on, and I will activate the right mode and skills automatically.`;
  }

  const modeLabel = detectedMode ? `I have activated ${detectedMode.toUpperCase()} mode for this task. ` : '';
  return `${modeLabel}I understand your request. In a full GRIP session, I would connect to Claude Code's backend to process this with the appropriate skills and verification gates.\n\nThis is the GRIP Knowledge Work Engine GUI preview. The chat interface demonstrates how GRIP auto-detects the right mode and skills based on your input.`;
}
