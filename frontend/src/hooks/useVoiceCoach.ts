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
    type: 'coaching' | 'encouragement' | 'warning' | 'summary' | 'ai_observation';
    priority: 'high' | 'normal';
    timestamp: number;
    source?: 'mediapipe' | 'overshoot';  // Track feedback source
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

// 100+ Mock LLM-style coaching phrases - simulates AI analysis output
// Organized by category: speed metrics and hand detection states
// Includes POSITIVE, NEGATIVE, and NORMAL feedback for each metric

const COACHING_PHRASES = {
    // =============================================================
    // === SPEED METRICS ===
    // =============================================================

    // Speed: Too Fast - NEGATIVE (25 correction phrases)
    speedTooFast: [
        "Movement too fast. Slow down for precision.",
        "Rushing the motion. Control your tempo.",
        "Accelerating too quickly. Ease into movements.",
        "Speed exceeding optimal range. Decelerate.",
        "Rapid hand motion detected. More deliberate pace.",
        "Too quick. Risk of overshooting target.",
        "Velocity too high. Reduce speed by 30%.",
        "Fast movements compromise accuracy. Slow down.",
        "Hand speed above threshold. Apply brake.",
        "Racing detected. Precision requires patience.",
        "Hurried technique observed. Breathe and slow.",
        "Motion blur in tracking. Decrease velocity.",
        "Fast-twitch movements. Switch to controlled glide.",
        "Speed spike detected. Return to baseline.",
        "Acceleration curve too steep. Gradual changes.",
        "Hand trajectory moving too rapidly. Modulate.",
        "Quick movements reduce control. Slow tempo.",
        "Excessive speed in distal movements. Temper.",
        "Rapid articulation noted. More measured approach.",
        "Speed compromising stability. Dial back 40%.",
        "Too hasty. Surgical precision needs time.",
        "Velocity exceeds safe operating range. Caution.",
        "Swift movements detected. Transition to smooth flow.",
        "High-speed hand displacement. Reduce urgency.",
        "Tempo too aggressive. Adopt gentler pace.",
    ],

    // Speed: Too Slow - NEGATIVE (20 correction phrases)
    speedTooSlow: [
        "Movement too slow. Increase efficiency.",
        "Velocity below optimal. Speed up slightly.",
        "Hand motion too cautious. More confidence.",
        "Sluggish movements. Elevate tempo 20%.",
        "Underspeed detected. Procedure requires pace.",
        "Too deliberate. Find balance with speed.",
        "Hesitant motion. Trust your training.",
        "Movement efficiency low. Accelerate moderately.",
        "Hand speed insufficient. Increase by 25%.",
        "Dragging tempo. Surgical time matters.",
        "Slow trajectory. Maintain steady momentum.",
        "Lethargic hand positioning. More decisive.",
        "Under-paced movements. Time is critical.",
        "Velocity lagging. Step up the rhythm.",
        "Hand motion too tentative. Be assertive.",
        "Slow execution detected. Boost confidence.",
        "Movement rate below standard. Increase.",
        "Prolonged dwell time. Keep motion flowing.",
        "Delayed response. Sharpen reaction speed.",
        "Torpid movements. Inject more energy.",
    ],

    // Speed: Perfect/Steady - POSITIVE (40 phrases)
    speedSteady: [
        "Steady speed. Maintain this pace.",
        "Perfect velocity. Well controlled.",
        "Excellent pacing throughout.",
        "Good rhythm. Keep it consistent.",
        "Optimal speed maintained. Outstanding.",
        "Smooth velocity profile. Textbook execution.",
        "Ideal tempo. This is the standard.",
        "Speed metrics perfect. Continue.",
        "Consistent pace observed. Excellent work.",
        "Balanced velocity. Maintain control.",
        "Precise timing. Keep this cadence.",
        "Speed variance minimal. Very good.",
        "Steady hand motion. Exemplary.",
        "Tempo on target. Sustain rhythm.",
        "Fluid movements at right speed. Nice.",
        "Velocity consistency excellent. Gold standard.",
        "Pacing discipline evident. Keep going.",
        "Speed modulation perfect. Well done.",
        "Controlled tempo throughout. Impressive.",
        "Movement rate ideal. Lock this in.",
        "Steady acceleration curve. Masterful.",
        "Optimal hand velocity achieved. Beautiful.",
        "Consistent speed metrics. Professional grade.",
        "Smooth pace maintained. Textbook.",
        "Perfect rhythm detected. Continue exactly.",
        "Velocity control outstanding. Keep it up.",
        "Tempo discipline remarkable. Very nice.",
        "Speed stability excellent. Maintain.",
        "Balanced pacing achieved. Superb.",
        "Ideal motion velocity. This is it.",
        "Precision pacing locked in. Outstanding.",
        "Movement tempo ideal. Surgical quality.",
        "Speed regulation excellent. Continue.",
        "Optimized velocity tracking. Keep steady.",
        "Perfect motion timing. Expert level.",
        "Calibrated speed maintained. Brilliant.",
        "Smooth tempo execution. Very precise.",
        "Velocity in optimal range. Excellent.",
        "Consistent motion rate. Professional.",
        "Perfect speed control demonstrated.",
    ],

    // =============================================================
    // === HAND DETECTION (Only shown when hand detected) ===
    // =============================================================

    // Hand Stability - POSITIVE (15 phrases)
    handStable: [
        "Hand position stable. Excellent control.",
        "Steady hand tracking. Keep it locked.",
        "Minimal hand shake. Very steady.",
        "Rock-solid hand position. Perfect.",
        "Hand stability optimal. Maintain.",
        "Hand steadiness impressive. Continue.",
        "Stable hand trajectory. Excellent.",
        "Hand hold consistent. Very good.",
        "Zero hand shake detected. Outstanding.",
        "Hand tracking precise. Keep steady.",
        "Stable grip detected. Maintain position.",
        "Excellent hand steadiness observed.",
        "Hand motion controlled. Perfect form.",
        "Steady hand placement. Continue.",
        "Hand stability exceptional. Great work.",
    ],

    // Hand Stability - NEGATIVE (15 correction phrases)
    handUnstable: [
        "Hand tremor detected. Stabilize grip.",
        "Hand oscillation observed. Firm up.",
        "Hand wobble detected. Anchor wrist.",
        "Micro-tremors present. Breathe deeply.",
        "Hand drift detected. Recenter position.",
        "Hand instability rising. Focus grip.",
        "Excessive hand shake. Plant elbow firmly.",
        "Hand wavering. Find your anchor point.",
        "Unsteady grip detected. Stabilize now.",
        "Hand trembling observed. Relax and steady.",
        "Erratic hand motion. Smooth it out.",
        "Hand jitter detected. Control breathing.",
        "Shaky hand positioning. Ground yourself.",
        "Hand movement erratic. Focus on control.",
        "Unstable hand trajectory. Recalibrate.",
    ],

    // Hand Positioning - POSITIVE (15 phrases)
    handPositioning: [
        "Hand angle optimal. Good positioning.",
        "Proper hand alignment maintained.",
        "Hand pose correct. Keep this form.",
        "Perfect hand articulation. Well done.",
        "Hand geometry ideal. Maintain position.",
        "Hand orientation locked. Excellent.",
        "Hand posture textbook. Very nice.",
        "Hand configuration perfect. Continue.",
        "Optimal hand angle achieved.",
        "Hand placement precise. Excellent.",
        "Perfect hand orientation. Maintain.",
        "Hand alignment excellent. Keep going.",
        "Proper hand pose. Professional level.",
        "Hand geometry correct. Outstanding.",
        "Perfect hand positioning detected.",
    ],

    // Hand Positioning - NEGATIVE (15 correction phrases)
    handPositioningBad: [
        "Hand orientation off. Adjust 15 degrees.",
        "Hand tilt excessive. Level out.",
        "Hand rotation needed. Clockwise 10 degrees.",
        "Hand elevation too high. Lower slightly.",
        "Hand angle suboptimal. Adjust ergonomics.",
        "Hand placement off-center. Recalibrate.",
        "Hand pitch incorrect. Tilt adjustment needed.",
        "Improper hand angle detected. Correct now.",
        "Hand misaligned. Rotate to proper position.",
        "Hand position drifting. Return to center.",
        "Awkward hand posture. Adjust for comfort.",
        "Hand geometry off. Reposition palm.",
        "Suboptimal wrist angle. Straighten out.",
        "Hand configuration needs work. Adjust.",
        "Hand positioning inefficient. Optimize angle.",
    ],

    // Hand Movement Quality - POSITIVE (10 phrases)
    handMovement: [
        "Smooth hand transition. Excellent.",
        "Fluid hand movement. Keep going.",
        "Hand motion trajectory perfect.",
        "Coordinated hand movement. Great.",
        "Hand displacement optimal. Continue.",
        "Precise hand movement detected.",
        "Hand motion smooth. Professional.",
        "Controlled hand transition. Maintain.",
        "Hand movement efficiency high.",
        "Optimal hand motion pattern.",
    ],

    // Hand Movement Quality - NEGATIVE (10 phrases)
    handMovementBad: [
        "Jerky hand movement. Smooth it out.",
        "Erratic hand displacement. Control needed.",
        "Hand transitions choppy. Needs work.",
        "Abrupt hand motion. More fluid approach.",
        "Hand movement inconsistent. Standardize.",
        "Uncoordinated hand motion. Focus.",
        "Hand tracking irregular. Improve rhythm.",
        "Rough hand transitions. Need smoothing.",
        "Hand motion efficiency low. Optimize.",
        "Discontinuous hand movement. Flow needed.",
    ],

    // =============================================================
    // === GENERAL FEEDBACK ===
    // =============================================================

    // General Encouragement - POSITIVE (15 phrases)
    goodJob: [
        "Perfect technique!",
        "That's it, maintain this position!",
        "Excellent form, keep going!",
        "Beautiful execution!",
        "Outstanding performance!",
        "Textbook technique observed!",
        "Professional quality work!",
        "Keep up this excellent pace!",
        "Remarkable precision shown!",
        "Exceptional control demonstrated!",
        "Superb technique maintained!",
        "Excellent metrics across the board!",
        "Perfect form achieved!",
        "Outstanding stability and control!",
        "Continue this excellent work!",
    ],

    // Angle Adjustments - NEGATIVE (compatibility phrases)
    angleHigh: [
        "Lower your wrist angle!",
        "Bring your hand down, you're too high!",
        "Expert angle is lower, rotate downward!",
        "Angle exceeding target. Lower by 10 degrees.",
        "Wrist elevation too high. Adjust down.",
    ],
    angleLow: [
        "Raise your wrist angle!",
        "Lift your hand up a bit!",
        "Angle too low, rotate upward!",
        "Insufficient angle detected. Raise by 10 degrees.",
        "Wrist position too low. Elevate slightly.",
    ],

    // Steadiness - NEGATIVE (compatibility phrases)
    unstable: [
        "Stabilize your hand!",
        "Too much movement, find your anchor point!",
        "Keep steady, rest your hand if needed!",
        "Excessive motion detected. Lock in position.",
        "Steadiness compromised. Focus and stabilize.",
    ],

    // Grip Feedback
    gripChange: [
        "Switch to pencil grip for precision!",
        "Expert uses pencil grip here!",
        "Grip adjustment recommended.",
        "Consider changing grip type.",
        "Grip optimization possible.",
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
        return new Promise((resolve) => {
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

    // Coach based on metrics comparison - Enhanced with speed tracking
    // Hand-related feedback only shown when handDetected is true
    const coachOnMetrics = useCallback((current: {
        scalpelAngle: number;
        steadiness: number;
        gripType: string;
        speed?: number; // Optional speed metric (0-100, 50 is optimal)
        handDetected?: boolean; // Whether hand is currently detected
    }, expert: {
        angleTarget: number;
        angleTolerance: number;
        steadinessTarget: number;
        expectedGripType: string;
        speedOptimal?: number; // Optimal speed target (default 50)
        speedTolerance?: number; // Tolerance for speed (default 15)
    }) => {
        const now = Date.now();
        const timeSinceLastCoach = now - lastCoachTimeRef.current;

        // Throttle coaching to every 3 seconds minimum
        if (timeSinceLastCoach < 3000) return;

        const angleDiff = current.scalpelAngle - expert.angleTarget;
        const absAngleDiff = Math.abs(angleDiff);

        // Speed metrics with defaults
        const speedOptimal = expert.speedOptimal ?? 50;
        const speedTolerance = expert.speedTolerance ?? 15;
        const currentSpeed = current.speed ?? 50;
        const speedDiff = currentSpeed - speedOptimal;
        const handDetected = current.handDetected ?? true;

        // Track angle diffs for average
        angleDiffsRef.current.push(absAngleDiff);
        if (angleDiffsRef.current.length > 100) angleDiffsRef.current.shift();

        // Helper to get random phrase from array
        const getRandomPhrase = (phrases: string[]) =>
            phrases[Math.floor(Math.random() * phrases.length)];

        // Check if on track for streak counting
        const onTrack = absAngleDiff <= expert.angleTolerance &&
            current.steadiness >= expert.steadinessTarget - 10 &&
            Math.abs(speedDiff) <= speedTolerance;

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

            // Occasional encouragement (every 10-15 seconds on track)
            if (timeSinceLastCoach > 10000) {
                // Mix of speed and general positive feedback
                const feedbackOptions: string[] = [...COACHING_PHRASES.goodJob];

                // Add speed steady phrases
                feedbackOptions.push(...COACHING_PHRASES.speedSteady.slice(0, 10));

                // Add hand-related positive feedback only if hand detected
                if (handDetected) {
                    feedbackOptions.push(...COACHING_PHRASES.handStable.slice(0, 5));
                    feedbackOptions.push(...COACHING_PHRASES.handPositioning.slice(0, 5));
                    feedbackOptions.push(...COACHING_PHRASES.handMovement.slice(0, 5));
                }

                speak(getRandomPhrase(feedbackOptions), 'encouragement', 'normal');
                lastCoachTimeRef.current = now;
            }
        } else {
            streakStartRef.current = 0;
            setStats(prev => ({ ...prev, currentStreak: 0 }));

            // Determine what needs correction - prioritize by severity

            // 1. Speed issues (highest priority for surgical procedures)
            if (currentSpeed > speedOptimal + speedTolerance * 1.5) {
                // Too fast - negative feedback
                const phrase = getRandomPhrase(COACHING_PHRASES.speedTooFast);
                speak(phrase, 'warning', 'high');
                lastCoachTimeRef.current = now;
            } else if (currentSpeed < speedOptimal - speedTolerance * 1.5) {
                // Too slow - negative feedback
                const phrase = getRandomPhrase(COACHING_PHRASES.speedTooSlow);
                speak(phrase, 'coaching', 'high');
                lastCoachTimeRef.current = now;
            }
            // 2. Angle deviation (only if hand detected)
            else if (absAngleDiff > expert.angleTolerance * 2 && handDetected) {
                const phrases = angleDiff > 0 ? COACHING_PHRASES.angleHigh : COACHING_PHRASES.angleLow;
                const phrase = getRandomPhrase(phrases);
                const fullMessage = `${phrase} You're at ${Math.round(current.scalpelAngle)} degrees, target is ${expert.angleTarget}!`;
                speak(fullMessage, 'warning', 'high');
                lastCoachTimeRef.current = now;
            }
            // 3. Steadiness issue (only if hand detected)
            else if (current.steadiness < expert.steadinessTarget - 20 && handDetected) {
                // Use handUnstable phrases
                const phrase = getRandomPhrase(COACHING_PHRASES.handUnstable);
                speak(phrase, 'coaching', 'high');
                lastCoachTimeRef.current = now;
            }
            // 4. Hand positioning issues (only if hand detected)
            else if (handDetected && absAngleDiff > expert.angleTolerance) {
                const phrase = getRandomPhrase(COACHING_PHRASES.handPositioningBad);
                speak(phrase, 'coaching', 'normal');
                lastCoachTimeRef.current = now;
            }
            // 5. Grip mismatch
            else if (expert.expectedGripType !== 'unknown' &&
                current.gripType !== 'unknown' &&
                current.gripType !== expert.expectedGripType) {
                speak(getRandomPhrase(COACHING_PHRASES.gripChange), 'coaching', 'normal');
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
