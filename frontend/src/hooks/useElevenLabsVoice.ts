/**
 * useElevenLabsVoice - React hook for ElevenLabs voice synthesis
 * 
 * Provides high-quality AI voice for surgical coaching with:
 * - Automatic fallback to Web Speech API
 * - Voice queue management
 * - Speaking state tracking
 * - Voice selection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ElevenLabsSpeaker,
  isElevenLabsConfigured,
  VOICE_IDS,
  type VoiceId,
  type SpeakOptions,
} from '../services/elevenLabs';

export interface UseElevenLabsVoiceOptions {
  voiceId?: VoiceId | string;
  enabled?: boolean;
  stability?: number;
  similarityBoost?: number;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface UseElevenLabsVoiceReturn {
  // State
  isSpeaking: boolean;
  isConfigured: boolean;
  voiceEnabled: boolean;
  currentVoice: string;
  
  // Actions
  speak: (text: string, priority?: 'normal' | 'high') => Promise<void>;
  stop: () => void;
  skip: () => void;
  setVoice: (voiceId: VoiceId | string) => void;
  setEnabled: (enabled: boolean) => void;
  
  // Available voices
  availableVoices: typeof VOICE_IDS;
}

export function useElevenLabsVoice(options: UseElevenLabsVoiceOptions = {}): UseElevenLabsVoiceReturn {
  const {
    voiceId = 'rachel',
    enabled = true,
    stability = 0.5,
    similarityBoost = 0.75,
    onSpeakStart,
    onSpeakEnd,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(enabled);
  const [currentVoice, setCurrentVoice] = useState<string>(voiceId);

  const speakerRef = useRef<ElevenLabsSpeaker | null>(null);
  const onSpeakStartRef = useRef(onSpeakStart);
  const onSpeakEndRef = useRef(onSpeakEnd);
  const onErrorRef = useRef(onError);

  // Keep callback refs updated
  useEffect(() => {
    onSpeakStartRef.current = onSpeakStart;
    onSpeakEndRef.current = onSpeakEnd;
    onErrorRef.current = onError;
  }, [onSpeakStart, onSpeakEnd, onError]);

  // Initialize speaker
  useEffect(() => {
    speakerRef.current = new ElevenLabsSpeaker({
      voiceId: currentVoice,
      stability,
      similarityBoost,
    });

    console.log(`🎤 ElevenLabs voice initialized (configured: ${isElevenLabsConfigured()})`);

    return () => {
      speakerRef.current?.stop();
    };
  }, []);

  // Update speaker config when voice changes
  useEffect(() => {
    if (speakerRef.current) {
      speakerRef.current.setConfig({
        voiceId: currentVoice,
        stability,
        similarityBoost,
      });
    }
  }, [currentVoice, stability, similarityBoost]);

  // Speak function
  const speak = useCallback(async (text: string, priority: 'normal' | 'high' = 'normal') => {
    if (!voiceEnabled || !speakerRef.current) return;

    // For high priority, stop current speech
    if (priority === 'high') {
      speakerRef.current.skip();
    }

    const speakOptions: SpeakOptions = {
      onStart: () => {
        setIsSpeaking(true);
        onSpeakStartRef.current?.();
      },
      onEnd: () => {
        setIsSpeaking(false);
        onSpeakEndRef.current?.();
      },
      onError: (error) => {
        setIsSpeaking(false);
        onErrorRef.current?.(error);
      },
    };

    try {
      await speakerRef.current.speak(text, speakOptions);
    } catch (error) {
      console.error('[useElevenLabsVoice] Speech error:', error);
      setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  // Stop all speech
  const stop = useCallback(() => {
    speakerRef.current?.stop();
    setIsSpeaking(false);
  }, []);

  // Skip current speech
  const skip = useCallback(() => {
    speakerRef.current?.skip();
  }, []);

  // Set voice
  const setVoice = useCallback((newVoiceId: VoiceId | string) => {
    setCurrentVoice(newVoiceId);
    speakerRef.current?.setVoice(newVoiceId);
  }, []);

  // Set enabled
  const setEnabled = useCallback((newEnabled: boolean) => {
    setVoiceEnabled(newEnabled);
    if (!newEnabled) {
      stop();
    }
  }, [stop]);

  return {
    isSpeaking,
    isConfigured: isElevenLabsConfigured(),
    voiceEnabled,
    currentVoice,
    speak,
    stop,
    skip,
    setVoice,
    setEnabled,
    availableVoices: VOICE_IDS,
  };
}

export default useElevenLabsVoice;
