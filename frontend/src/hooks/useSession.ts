import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for WebSocket connection to backend
 * Handles real-time communication for grip state and feedback
 */
export function useWebSocket(sessionId: any, options: any = {}) {
    const {
        url = 'ws://localhost:3001/ws',
        onFeedback = () => { },
        autoReconnect = true
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<any>(null);
    const reconnectTimeoutRef = useRef<any>(null);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                setIsConnected(true);
                setError(null);

                // Join session
                if (sessionId) {
                    ws.send(JSON.stringify({ type: 'join', sessionId }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'feedback':
                            onFeedback(data);
                            break;
                        case 'joined':
                            console.log('Joined session:', data.sessionId);
                            break;
                        case 'pong':
                            // Heartbeat response
                            break;
                        default:
                            console.log('Unknown message:', data);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);

                // Auto-reconnect
                if (autoReconnect) {
                    reconnectTimeoutRef.current = setTimeout(connect, 3000);
                }
            };

            ws.onerror = (err: any) => {
                console.error('WebSocket error:', err);
                setError('Connection failed');
            };

            wsRef.current = ws;
        } catch (err: any) {
            setError(err.message);
        }
    }, [url, sessionId, onFeedback, autoReconnect]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    // Send grip state to backend
    const sendGripState = useCallback((gripState: any, landmarks: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'grip_state',
                gripState: gripState.state,
                confidence: gripState.confidence,
                landmarks,
                timestamp: Date.now()
            }));
        }
    }, []);

    // Ping for keepalive
    useEffect(() => {
        if (!isConnected) return;

        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);

        return () => clearInterval(pingInterval);
    }, [isConnected]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        error,
        connect,
        disconnect,
        sendGripState
    };
}

/**
 * Custom hook for voice feedback playback
 * Handles both server-provided audio and Web Speech API fallback
 */
export function useVoiceFeedback() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef(new Audio());
    const synthRef = useRef(window.speechSynthesis);

    // Play feedback audio
    const playFeedback = useCallback(async (feedbackData: any) => {
        setIsSpeaking(true);

        try {
            if (feedbackData.audioData) {
                // Play base64 audio from Smallest.ai
                const audioBlob = base64ToBlob(feedbackData.audioData, 'audio/mp3');
                const audioUrl = URL.createObjectURL(audioBlob);

                audioRef.current.src = audioUrl;
                audioRef.current.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };
                await audioRef.current.play();
            } else {
                // Fallback to Web Speech API
                speakWithWebSpeech(feedbackData.message);
            }
        } catch (err) {
            console.error('Audio playback error:', err);
            // Fallback to Web Speech API
            speakWithWebSpeech(feedbackData.message);
        }
    }, []);

    // Web Speech API fallback
    const speakWithWebSpeech = useCallback((text: any) => {
        if (!synthRef.current) {
            setIsSpeaking(false);
            return;
        }

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a good voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Samantha') ||
            v.name.includes('Google') ||
            v.lang.startsWith('en')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    }, []);

    // Stop speaking
    const stop = useCallback(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        synthRef.current?.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        isSpeaking,
        playFeedback,
        speakWithWebSpeech,
        stop
    };
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: any, mimeType: any) {
    const byteCharacters = atob(base64);
    const byteArrays: any[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new Blob(byteArrays, { type: mimeType });
}
