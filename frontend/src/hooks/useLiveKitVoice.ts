/**
 * useLiveKitVoice - Real-time voice feedback using LiveKit
 * 
 * Narrates surgical metrics like hand angle, steadiness, and pinch angle
 * Falls back to Web Speech API if LiveKit is unavailable
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, ConnectionState } from 'livekit-client';

export interface SurgicalMetrics {
    scalpelAngle: number;
    pinchAngle: number;
    fingerBend: number;
    steadiness: number;
    speed: number;
    gripType: 'pencil' | 'power' | 'unknown';
    gripConfidence: number;
}

interface UseLiveKitVoiceOptions {
    serverUrl?: string;
    enabled?: boolean;
    speakInterval?: number; // How often to speak metrics (ms)
    onConnectionChange?: (connected: boolean) => void;
}

// Format metrics into natural speech
function formatMetricsForSpeech(metrics: SurgicalMetrics): string {
    const parts: string[] = [];

    // Hand angle
    const angle = Math.abs(metrics.scalpelAngle);
    if (angle < 20) {
        parts.push(`Hand angle ${angle.toFixed(0)} degrees, nearly horizontal.`);
    } else if (angle > 60) {
        parts.push(`Hand angle ${angle.toFixed(0)} degrees, steep angle.`);
    } else {
        parts.push(`Hand angle ${angle.toFixed(0)} degrees.`);
    }

    // Steadiness
    if (metrics.steadiness > 80) {
        parts.push(`Excellent steadiness at ${metrics.steadiness.toFixed(0)} percent.`);
    } else if (metrics.steadiness > 60) {
        parts.push(`Steadiness ${metrics.steadiness.toFixed(0)} percent.`);
    } else {
        parts.push(`Steadiness low at ${metrics.steadiness.toFixed(0)} percent. Try to stabilize.`);
    }

    // Pinch angle (thumb to index)
    if (metrics.pinchAngle < 30) {
        parts.push(`Pinch angle tight at ${metrics.pinchAngle.toFixed(0)} degrees.`);
    } else if (metrics.pinchAngle > 60) {
        parts.push(`Pinch angle wide at ${metrics.pinchAngle.toFixed(0)} degrees.`);
    }

    // Finger bend
    if (metrics.fingerBend > 60) {
        parts.push(`Finger bent ${metrics.fingerBend.toFixed(0)} percent.`);
    }

    // Grip type
    if (metrics.gripType === 'pencil' && metrics.gripConfidence > 0.7) {
        parts.push('Good pencil grip.');
    } else if (metrics.gripType === 'power') {
        parts.push('Power grip detected. Consider switching to pencil grip for precision.');
    }

    return parts.join(' ');
}

export function useLiveKitVoice({
    serverUrl = 'wss://surgeonsight-woirasj6.livekit.cloud',
    enabled = true,
    speakInterval = 5000,
    onConnectionChange
}: UseLiveKitVoiceOptions = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [voiceEnabled, setVoiceEnabled] = useState(true);

    const roomRef = useRef<Room | null>(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const lastSpeakTimeRef = useRef<number>(0);

    // Initialize LiveKit room
    useEffect(() => {
        if (!enabled) return;

        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
        });

        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            const connected = state === ConnectionState.Connected;
            setIsConnected(connected);
            onConnectionChange?.(connected);
        });

        room.on(RoomEvent.Disconnected, () => {
            setIsConnected(false);
            onConnectionChange?.(false);
        });

        roomRef.current = room;

        return () => {
            room.disconnect();
            roomRef.current = null;
        };
    }, [enabled, onConnectionChange]);

    // Connect to LiveKit room
    const connect = useCallback(async (token: string) => {
        if (!roomRef.current) return;

        try {
            await roomRef.current.connect(serverUrl, token);
            console.log('✅ Connected to LiveKit room');
        } catch (err: any) {
            console.error('LiveKit connection error:', err);
            setError(err.message);
        }
    }, [serverUrl]);

    // Disconnect from room
    const disconnect = useCallback(() => {
        roomRef.current?.disconnect();
    }, []);

    // Web Speech API fallback
    const speakWithWebSpeech = useCallback((text: string) => {
        if (!synthRef.current || !voiceEnabled) return;

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1; // Slightly faster for metrics
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Try to find a good voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Samantha') ||
            v.name.includes('Google') ||
            v.name.includes('Daniel') ||
            v.lang.startsWith('en')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    }, [voiceEnabled]);

    // Speak metrics with rate limiting
    const speakMetrics = useCallback((metrics: SurgicalMetrics) => {
        if (!voiceEnabled) return;

        const now = Date.now();
        if (now - lastSpeakTimeRef.current < speakInterval) {
            return; // Rate limit
        }
        lastSpeakTimeRef.current = now;

        const text = formatMetricsForSpeech(metrics);

        // Use Web Speech API (LiveKit TTS would require server-side agent)
        speakWithWebSpeech(text);
    }, [speakInterval, speakWithWebSpeech, voiceEnabled]);

    // Speak arbitrary text
    const speak = useCallback((text: string) => {
        if (!voiceEnabled) return;
        speakWithWebSpeech(text);
    }, [speakWithWebSpeech, voiceEnabled]);

    // Stop speaking
    const stop = useCallback(() => {
        synthRef.current?.cancel();
        setIsSpeaking(false);
    }, []);

    // Toggle voice on/off
    const toggleVoice = useCallback(() => {
        setVoiceEnabled(prev => {
            if (prev) {
                // Turning off - stop any current speech
                synthRef.current?.cancel();
                setIsSpeaking(false);
            }
            return !prev;
        });
    }, []);

    return {
        isConnected,
        isSpeaking,
        voiceEnabled,
        error,
        connect,
        disconnect,
        speakMetrics,
        speak,
        stop,
        toggleVoice,
        setVoiceEnabled
    };
}

export default useLiveKitVoice;
