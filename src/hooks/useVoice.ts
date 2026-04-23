'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type TranscriptCallback = (text: string, isFinal: boolean) => void;

export function useVoice(onTranscript: TranscriptCallback, onError?: (msg: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [supported, setSupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined'
    );
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      onError?.('Microphone recording not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsListening(false);

        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1000) {
          onError?.('No audio captured');
          return;
        }

        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const json = await res.json();
          if (!res.ok || json.error) {
            onError?.(json.error || `Transcribe failed: ${res.status}`);
          } else if (json.text) {
            onTranscript(json.text, true);
          }
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Transcribe request failed');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorderRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch (err) {
      onError?.(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone access denied'
          : err instanceof Error
            ? err.message
            : 'Failed to start recording'
      );
      setIsListening(false);
    }
  }, [supported, onTranscript, onError]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      setIsListening(false);
    }
  }, []);

  return { isListening, isTranscribing, supported, start, stop };
}

export function speakText(text: string): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// Gemini's 30 prebuilt TTS voices. Names are Greek-mythology themed; the
// descriptors come from Google's voice gallery and help users pick by feel
// rather than guessing from the name.
export const GEMINI_VOICES: { id: string; label: string }[] = [
  { id: 'Aoede', label: 'Aoede — Breezy' },
  { id: 'Zephyr', label: 'Zephyr — Bright' },
  { id: 'Puck', label: 'Puck — Upbeat' },
  { id: 'Charon', label: 'Charon — Informative' },
  { id: 'Kore', label: 'Kore — Firm' },
  { id: 'Fenrir', label: 'Fenrir — Excitable' },
  { id: 'Leda', label: 'Leda — Youthful' },
  { id: 'Orus', label: 'Orus — Firm' },
  { id: 'Callirrhoe', label: 'Callirrhoe — Easy-going' },
  { id: 'Autonoe', label: 'Autonoe — Bright' },
  { id: 'Enceladus', label: 'Enceladus — Breathy' },
  { id: 'Iapetus', label: 'Iapetus — Clear' },
  { id: 'Umbriel', label: 'Umbriel — Easy-going' },
  { id: 'Algieba', label: 'Algieba — Smooth' },
  { id: 'Despina', label: 'Despina — Smooth' },
  { id: 'Erinome', label: 'Erinome — Clear' },
  { id: 'Algenib', label: 'Algenib — Gravelly' },
  { id: 'Rasalgethi', label: 'Rasalgethi — Informative' },
  { id: 'Laomedeia', label: 'Laomedeia — Upbeat' },
  { id: 'Achernar', label: 'Achernar — Soft' },
  { id: 'Alnilam', label: 'Alnilam — Firm' },
  { id: 'Schedar', label: 'Schedar — Even' },
  { id: 'Gacrux', label: 'Gacrux — Mature' },
  { id: 'Pulcherrima', label: 'Pulcherrima — Forward' },
  { id: 'Achird', label: 'Achird — Friendly' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi — Casual' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix — Gentle' },
  { id: 'Sadachbia', label: 'Sadachbia — Lively' },
  { id: 'Sadaltager', label: 'Sadaltager — Knowledgeable' },
  { id: 'Sulafat', label: 'Sulafat — Warm' },
];

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

// Strip markdown, code fences, URLs, and other artefacts so Gemini TTS gets
// clean prose. The TTS model occasionally 502s on raw code blocks and long
// URLs, and even when it accepts them the output is awkward to listen to.
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[#*_>~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

// Cloud TTS via /api/tts (Gemini). Falls back to system speechSynthesis on
// any error so the UI still speaks something rather than silently failing.
export async function speakCloud(
  text: string,
  voice: string = 'Aoede',
  onStart?: () => void,
  onEnd?: () => void,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return;
  stopSpeaking();

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleaned, voice }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[speakCloud] Gemini TTS failed, falling back to system voice:', res.status, body);
      throw new Error(`TTS ${res.status}: ${body.error ?? 'unknown'}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onplay = () => onStart?.();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      onEnd?.();
    };
    await audio.play();
  } catch (err) {
    console.warn('[speakCloud] fallback to system voice:', err);
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.onstart = () => onStart?.();
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }
}
