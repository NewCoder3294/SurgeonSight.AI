/**
 * useVoiceCoach - Mind-blowing voice coaching with typing animation
 * 
 * Features:
 * - Reliable voice playback with multiple fallbacks
 * - Cool typing animation for feedback text
 * - Voice queue to prevent overlap
 * - Visual speaking indicator
 * - Session performance tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceMessage {
    text: string;
    type: 'coaching' | 'encouragement' | 'warning' | 'summary';
    priority: 'high' | 'normal';
    timestamp: number;
}

export interface SessionStats {
    totalCoachingMessages: number;
    corrections: number;
    encouragements: number;
    avgAngleDiff: number;
    bestStreak: number; // seconds on target
    currentStreak: number;
    overallScore: number; // 0-100
}

const DEFAULT_STATS: SessionStats = {
    totalCoachingMessages: 0,
    corrections: 0,
    encouragements: 0,
    avgAngleDiff: 0,
    bestStreak: 0,
    currentStreak: 0,
    overallScore: 0
};

// Coaching phrases for different scenarios
const COACHING_PHRASES = {
    angleHigh: [
        "Lower your wrist angle!",
        "Bring your hand down, you're too high!",
        "Expert angle is lower, rotate downward!",
    ],
    angleLow: [
        "Raise your wrist angle!",
        "Lift your hand up a bit!",
        "Angle too low, rotate upward!",
    ],
    unstable: [
        "Stabilize your hand!",
        "Too much movement, find your anchor point!",
        "Keep steady, rest your hand if needed!",
    ],
    goodJob: [
        "Perfect technique!",
        "That's it, maintain this position!",
        "Excellent angle, keep going!",
        "Beautiful form!",
    ],
    gripChange: [
        "Switch to pencil grip for precision!",
        "Expert uses pencil grip here!",
    ]
};

export function useVoiceCoach() {
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [displayedText, setDisplayedText] = useState<string>(''); // For typing animation
    const [messageHistory, setMessageHistory] = useState<VoiceMessage[]>([]);
    const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);

    const synthRef = useRef<SpeechSynthesis | null>(null);
    const voiceQueueRef = useRef<VoiceMessage[]>([]);
    const isProcessingRef = useRef(false);
    const typingIntervalRef = useRef<any>(null);
    const lastCoachTimeRef = useRef<number>(0);
    const streakStartRef = useRef<number>(0);
    const angleDiffsRef = useRef<number[]>([]);

    // Initialize speech synthesis
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;

            // Pre-load voices
            const loadVoices = () => {
                const voices = synthRef.current?.getVoices() || [];
                console.log(`🔊 Loaded ${voices.length} voices for coaching`);
            };

            loadVoices();
            synthRef.current?.addEventListener('voiceschanged', loadVoices);

            return () => {
                synthRef.current?.removeEventListener('voiceschanged', loadVoices);
            };
        }
    }, []);

    // Typing animation effect
    const animateTyping = useCallback((text: string, speed: number = 30) => {
        // Clear previous animation
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
        }

        setDisplayedText('');
        let index = 0;

        typingIntervalRef.current = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                clearInterval(typingIntervalRef.current);
            }
        }, speed);
    }, []);

    // Core speak function with fallbacks
    const speak = useCallback((text: string, type: VoiceMessage['type'] = 'coaching', priority: VoiceMessage['priority'] = 'normal') => {
        if (!voiceEnabled) return;

        const message: VoiceMessage = {
            text,
            type,
            priority,
            timestamp: Date.now()
        };

        // Add to queue
        if (priority === 'high') {
            voiceQueueRef.current.unshift(message); // High priority goes first
        } else {
            voiceQueueRef.current.push(message);
        }

        // Process queue if not already processing
        if (!isProcessingRef.current) {
            processQueue();
        }
    }, [voiceEnabled]);

    // Process voice queue
    const processQueue = useCallback(async () => {
        if (isProcessingRef.current || voiceQueueRef.current.length === 0) return;

        isProcessingRef.current = true;
        const message = voiceQueueRef.current.shift()!;

        setCurrentMessage(message.text);
        setIsSpeaking(true);
        animateTyping(message.text, message.priority === 'high' ? 20 : 35);

        // Add to history
        setMessageHistory(prev => [...prev.slice(-9), message]);

        // Update stats
        setStats(prev => ({
            ...prev,
            totalCoachingMessages: prev.totalCoachingMessages + 1,
            corrections: message.type === 'warning' || message.type === 'coaching' ? prev.corrections + 1 : prev.corrections,
            encouragements: message.type === 'encouragement' ? prev.encouragements + 1 : prev.encouragements
        }));

        // Try to speak
        try {
            await speakWithSynthesis(message.text, message.priority === 'high');
        } catch (err) {
            console.error('Speech failed:', err);
        }

        setIsSpeaking(false);
        isProcessingRef.current = false;

        // Process next in queue
        if (voiceQueueRef.current.length > 0) {
            setTimeout(processQueue, 300); // Small gap between messages
        }
    }, [animateTyping]);

    // Speech synthesis with robust fallback
    const speakWithSynthesis = useCallback((text: string, urgent: boolean = false): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!synthRef.current) {
                console.warn('Speech synthesis not available');
                // Still resolve so UI feedback works
                setTimeout(resolve, text.length * 50);
                return;
            }

            // Cancel current speech if urgent
            if (urgent) {
                synthRef.current.cancel();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = urgent ? 0.85 : 0.95; // Slower for clarity
            utterance.pitch = 1.1;
            utterance.volume = 1.0; // MAXIMUM VOLUME

            // Find best voice
            const voices = synthRef.current.getVoices();
            const preferredVoice = voices.find(v =>
                v.name.includes('Samantha') ||
                v.name.includes('Karen') ||
                v.name.includes('Daniel') ||
                v.name.includes('Google') ||
                (v.lang.startsWith('en') && v.localService)
            ) || voices.find(v => v.lang.startsWith('en'));

            if (preferredVoice) {
                utterance.voice = preferredVoice;
                console.log(`🎤 Using voice: ${preferredVoice.name}`);
            }

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                console.error('Speech error:', e);
                resolve(); // Resolve anyway so UI continues
            };

            // Start speaking
            console.log(`🔊 Speaking: "${text}"`);
            synthRef.current.speak(utterance);

            // Fallback timeout in case onend doesn't fire
            const timeout = setTimeout(() => {
                resolve();
            }, (text.length * 60) + 2000);

            utterance.onend = () => {
                clearTimeout(timeout);
                resolve();
            };
        });
    }, []);

    // Coach based on metrics comparison
    const coachOnMetrics = useCallback((current: {
        scalpelAngle: number;
        steadiness: number;
        gripType: string;
    }, expert: {
        angleTarget: number;
        angleTolerance: number;
        steadinessTarget: number;
        expectedGripType: string;
    }) => {
        const now = Date.now();
        const timeSinceLastCoach = now - lastCoachTimeRef.current;

        // Throttle coaching to every 3 seconds minimum
        if (timeSinceLastCoach < 3000) return;

        const angleDiff = current.scalpelAngle - expert.angleTarget;
        const absAngleDiff = Math.abs(angleDiff);

        // Track angle diffs for average
        angleDiffsRef.current.push(absAngleDiff);
        if (angleDiffsRef.current.length > 100) angleDiffsRef.current.shift();

        // Check if on track for streak counting
        const onTrack = absAngleDiff <= expert.angleTolerance &&
            current.steadiness >= expert.steadinessTarget - 10;

        if (onTrack) {
            if (streakStartRef.current === 0) {
                streakStartRef.current = now;
            }
            const streakTime = (now - streakStartRef.current) / 1000;
            setStats(prev => ({
                ...prev,
                currentStreak: streakTime,
                bestStreak: Math.max(prev.bestStreak, streakTime)
            }));

            // Occasional encouragement (every 15+ seconds on track)
            if (timeSinceLastCoach > 15000) {
                const phrase = COACHING_PHRASES.goodJob[Math.floor(Math.random() * COACHING_PHRASES.goodJob.length)];
                speak(phrase, 'encouragement', 'normal');
                lastCoachTimeRef.current = now;
            }
        } else {
            streakStartRef.current = 0;
            setStats(prev => ({ ...prev, currentStreak: 0 }));

            // Determine what needs correction
            if (absAngleDiff > expert.angleTolerance * 2) {
                // Major angle deviation
                const phrases = angleDiff > 0 ? COACHING_PHRASES.angleHigh : COACHING_PHRASES.angleLow;
                const phrase = phrases[Math.floor(Math.random() * phrases.length)];
                const fullMessage = `${phrase} You're at ${Math.round(current.scalpelAngle)} degrees, target is ${expert.angleTarget}!`;
                speak(fullMessage, 'warning', 'high');
                lastCoachTimeRef.current = now;
            } else if (current.steadiness < expert.steadinessTarget - 20) {
                // Steadiness issue
                const phrase = COACHING_PHRASES.unstable[Math.floor(Math.random() * COACHING_PHRASES.unstable.length)];
                speak(phrase, 'coaching', 'high');
                lastCoachTimeRef.current = now;
            } else if (expert.expectedGripType !== 'unknown' &&
                current.gripType !== 'unknown' &&
                current.gripType !== expert.expectedGripType) {
                // Grip mismatch
                speak(COACHING_PHRASES.gripChange[0], 'coaching', 'normal');
                lastCoachTimeRef.current = now;
            }
        }

        // Update average angle diff and score
        const avgDiff = angleDiffsRef.current.reduce((a, b) => a + b, 0) / angleDiffsRef.current.length;
        const score = Math.max(0, Math.min(100, 100 - (avgDiff * 2)));
        setStats(prev => ({
            ...prev,
            avgAngleDiff: avgDiff,
            overallScore: Math.round(score)
        }));
    }, [speak]);

    // Generate session summary
    const generateSummary = useCallback(() => {
        const { totalCoachingMessages, corrections, encouragements, avgAngleDiff, bestStreak, overallScore } = stats;

        let grade = 'C';
        let feedback = '';

        if (overallScore >= 90) {
            grade = 'A+';
            feedback = 'Outstanding performance! You matched the expert technique beautifully.';
        } else if (overallScore >= 80) {
            grade = 'A';
            feedback = 'Excellent work! Your technique is nearly perfect.';
        } else if (overallScore >= 70) {
            grade = 'B';
            feedback = 'Good job! Focus on maintaining your angle for longer stretches.';
        } else if (overallScore >= 60) {
            grade = 'C';
            feedback = 'Decent effort. Practice the angle control exercises before next session.';
        } else {
            grade = 'D';
            feedback = 'Keep practicing! Watch the expert video again and focus on wrist position.';
        }

        return {
            grade,
            score: overallScore,
            feedback,
            corrections,
            encouragements,
            bestStreak: Math.round(bestStreak),
            avgAngleDiff: Math.round(avgAngleDiff),
            totalMessages: totalCoachingMessages
        };
    }, [stats]);

    // Speak end summary
    const speakSummary = useCallback(() => {
        const summary = generateSummary();
        const summaryText = `Session complete! You scored ${summary.score} out of 100, grade ${summary.grade}. ${summary.feedback} Your best streak was ${summary.bestStreak} seconds on target.`;
        speak(summaryText, 'summary', 'high');
        return summary;
    }, [generateSummary, speak]);

    // Toggle voice
    const toggleVoice = useCallback(() => {
        setVoiceEnabled(prev => {
            const newState = !prev;
            if (newState) {
                speak('Voice coaching enabled!', 'encouragement', 'normal');
            }
            return newState;
        });
    }, [speak]);

    // Test voice (for debugging)
    const testVoice = useCallback(() => {
        speak('Testing voice coaching. If you can hear this, voice is working!', 'coaching', 'high');
    }, [speak]);

    // Reset stats
    const resetStats = useCallback(() => {
        setStats(DEFAULT_STATS);
        setMessageHistory([]);
        angleDiffsRef.current = [];
        streakStartRef.current = 0;
        lastCoachTimeRef.current = 0;
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
            synthRef.current?.cancel();
        };
    }, []);

    return {
        // State
        voiceEnabled,
        isSpeaking,
        currentMessage,
        displayedText, // Use this for typing animation display
        messageHistory,
        stats,

        // Actions
        speak,
        coachOnMetrics,
        generateSummary,
        speakSummary,
        toggleVoice,
        testVoice,
        resetStats,
        setVoiceEnabled
    };
}

export default useVoiceCoach;
