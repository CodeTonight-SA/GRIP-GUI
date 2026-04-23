'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Repeat } from 'lucide-react';
import { useVoice, speakCloud, stopSpeaking, GEMINI_VOICES } from '@/hooks/useVoice';

type AssistantMessage = { content: string; streaming: boolean } | null;

interface Props {
  open: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
  assistantMessage: AssistantMessage;
}

const VOICE_STORAGE_KEY = 'grip.voice.geminiVoice';
const CONTINUOUS_STORAGE_KEY = 'grip.voice.continuous';

type Phase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export default function VoiceConversation({ open, onClose, onTranscript, assistantMessage }: Props) {
  const [voiceId, setVoiceId] = useState<string>('Aoede');
  const [continuous, setContinuous] = useState(false);
  const [userText, setUserText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const spokenRef = useRef<string>('');

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return;
    setUserText(text);
    setErrorMsg(null);
    onTranscript(text);
  }, [onTranscript]);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
  }, []);

  const { isListening, isTranscribing, supported, start, stop } = useVoice(handleTranscript, handleError);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedVoice = localStorage.getItem(VOICE_STORAGE_KEY);
    if (savedVoice && GEMINI_VOICES.some((v) => v.id === savedVoice)) {
      setVoiceId(savedVoice);
    }
    const savedContinuous = localStorage.getItem(CONTINUOUS_STORAGE_KEY);
    if (savedContinuous === '1') setContinuous(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
  }, [voiceId]);

  useEffect(() => {
    localStorage.setItem(CONTINUOUS_STORAGE_KEY, continuous ? '1' : '0');
  }, [continuous]);

  // When the modal opens, seed the "already-spoken" marker with whatever
  // assistant content is currently visible. This prevents the modal from
  // re-speaking a message that the main chat has already (or is about to)
  // read aloud, which was causing an echo.
  useEffect(() => {
    if (open) spokenRef.current = assistantMessage?.content ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Speak only NEW assistant messages that arrive while the modal is open.
  useEffect(() => {
    if (!open || !assistantMessage) return;
    if (assistantMessage.streaming) return;
    if (!assistantMessage.content) return;
    if (spokenRef.current === assistantMessage.content) return;
    spokenRef.current = assistantMessage.content;

    speakCloud(
      assistantMessage.content,
      voiceId,
      () => setIsSpeaking(true),
      () => {
        setIsSpeaking(false);
        if (continuous && open) setTimeout(() => start(), 250);
      },
    );
  }, [open, assistantMessage, voiceId, continuous, start]);

  // Cleanup when closing.
  useEffect(() => {
    if (!open) {
      if (isListening) stop();
      stopSpeaking();
      setIsSpeaking(false);
      spokenRef.current = '';
      setUserText('');
      setErrorMsg(null);
    }
  }, [open, isListening, stop]);

  const phase: Phase = useMemo(() => {
    if (isSpeaking) return 'speaking';
    if (isTranscribing) return 'transcribing';
    if (assistantMessage?.streaming) return 'thinking';
    if (isListening) return 'listening';
    return 'idle';
  }, [isSpeaking, isTranscribing, assistantMessage, isListening]);

  const phaseLabel: Record<Phase, string> = {
    idle: 'TAP TO SPEAK',
    listening: 'LISTENING',
    transcribing: 'TRANSCRIBING',
    thinking: 'THINKING',
    speaking: 'SPEAKING',
  };

  const phaseColor: Record<Phase, string> = {
    idle: 'var(--muted-foreground)',
    listening: '#ef4444',
    transcribing: 'var(--primary)',
    thinking: 'var(--primary)',
    speaking: '#22d3ee',
  };

  const toggleMic = () => {
    if (isListening) stop();
    else if (!isTranscribing && !assistantMessage?.streaming && !isSpeaking) start();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col backdrop-blur-md bg-black/80"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        >
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                VOICE MODE
              </span>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs px-3 py-2 max-w-[260px]"
              >
                {GEMINI_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setContinuous((c) => !c)}
                className={`flex items-center gap-2 font-mono text-[10px] tracking-widest px-3 py-2 border transition-colors ${
                  continuous
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
                }`}
                title="Continuous conversation: auto-restart mic after each reply"
              >
                <Repeat className="w-3 h-3" />
                CONTINUOUS
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close voice mode"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8">
            <motion.button
              type="button"
              onClick={toggleMic}
              disabled={!supported}
              whileTap={{ scale: 0.95 }}
              className="relative w-48 h-48 flex items-center justify-center rounded-full disabled:opacity-30"
              style={{ background: 'transparent' }}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${phaseColor[phase]}` }}
                animate={phase === 'listening' || phase === 'speaking'
                  ? { scale: [1, 1.15, 1], opacity: [0.8, 0.3, 0.8] }
                  : { scale: 1, opacity: 0.9 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="absolute inset-4 rounded-full"
                style={{ border: `1px solid ${phaseColor[phase]}`, opacity: 0.5 }}
                animate={phase === 'listening' || phase === 'speaking'
                  ? { scale: [1, 1.25, 1], opacity: [0.5, 0.1, 0.5] }
                  : { scale: 1 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: phaseColor[phase], opacity: phase === 'idle' ? 0.4 : 0.85 }}
              >
                {isListening ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </div>
            </motion.button>

            <div className="flex flex-col items-center gap-2">
              <motion.span
                key={phase}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-xs tracking-[0.3em]"
                style={{ color: phaseColor[phase] }}
              >
                {phaseLabel[phase]}
              </motion.span>
              {errorMsg && (
                <span className="font-mono text-[10px] tracking-wider text-[var(--danger)]">
                  {errorMsg}
                </span>
              )}
            </div>

            <div className="w-full max-w-2xl flex flex-col gap-6">
              {userText && (
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
                    YOU
                  </span>
                  <p className="text-[var(--foreground)] text-base leading-relaxed">
                    {userText}
                  </p>
                </div>
              )}
              {assistantMessage?.content && (
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-widest text-[var(--primary)]">
                    GRIP
                  </span>
                  <p className="text-[var(--foreground)] text-base leading-relaxed">
                    {assistantMessage.content}
                    {assistantMessage.streaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-[var(--primary)] animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 text-center">
            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] opacity-60">
              ESC TO CLOSE | {continuous ? 'AUTO-LOOP ON' : 'TAP MIC TO TALK'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
