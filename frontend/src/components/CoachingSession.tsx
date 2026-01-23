import { useState, useRef, useEffect, useCallback } from 'react';
import VideoFeed from './VideoFeed';
import ThemeToggle from './ThemeToggle';
import Hand3DVisualization from './Hand3DVisualization';
import VoiceFeedbackDisplay from './VoiceFeedbackDisplay';
import SessionSummaryModal from './SessionSummaryModal';
import { useWebSocket, useVoiceFeedback } from '../hooks/useSession';
import { useMockHandDetection } from '../hooks/useHandDetection';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { startSession, endSession } from '../utils/api';
import { createMetricsWindow, addMetric, computeFrameDifference } from '../utils/reproMetrics';
import type { MotionMetrics } from '../utils/reproMetrics';
import { FeedbackGenerator } from '../utils/reproFeedback';
import { useMediaPipeHands, type HandData, type SurgicalMetrics } from '../hooks/useMediaPipeHands';
import type { ExpertMetrics } from '../hooks/useExpertBaseline';
import { useWebcamRecorder } from '../hooks/useWebcamRecorder';
import { useOvershootLive, type OvershootObservation } from '../hooks/useOvershootLive';
import { isOvershootConfigured } from '../services/overshoot';
import OvershootInsightsPanel from './OvershootInsightsPanel';
import { getSymmetricAngle } from '../utils/surgicalAngles';

// Demo feedback messages (fallback when backend not available)
const DEMO_FEEDBACK = [
    { type: 'correction', message: "Try the pencil grip—thumb and index finger only." },
    { type: 'encouragement', message: "Good grip position. Keep it steady." },
    { type: 'correction', message: "Loosen your grip. Less tension." },
    { type: 'encouragement', message: "Nice angle. Well done." },
    { type: 'correction', message: "Rotate wrist clockwise slightly." },
    { type: 'encouragement', message: "Smooth motion. Excellent." },
    { type: 'correction', message: "Anchor your hand for stability." },
    { type: 'encouragement', message: "Great control there." },
    { type: 'correction', message: "Slower, more controlled movements." },
    { type: 'encouragement', message: "That's the technique." },
];

interface CoachingSessionProps {
    embedded?: boolean;
    expertMetrics?: ExpertMetrics; // Expert baseline for comparison
}

export default function CoachingSession({ embedded = false, expertMetrics }: CoachingSessionProps) {
    const videoFeedRef = useRef(null);

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [_currentFeedback, setCurrentFeedback] = useState<any>(null);
    const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);

    const [backendConnected, setBackendConnected] = useState(false);
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [currentMetrics, setCurrentMetrics] = useState<SurgicalMetrics | null>(null);
    const [detectedHands, setDetectedHands] = useState<HandData[]>([]);
    const [showSummary, setShowSummary] = useState(false);
    const [sessionSummary, setSessionSummary] = useState<any>(null);

    // AI Analysis (Overshoot) state
    const [aiEnabled] = useState(true);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    // Demo mode state
    const [feedbackIndex, setFeedbackIndex] = useState(0);

    const timerRef = useRef<any>(null);
    const feedbackTimeoutRef = useRef<any>(null);

    // Motion metrics state
    const metricsWindowRef = useRef(createMetricsWindow(5, 30));
    const feedbackGeneratorRef = useRef(new FeedbackGenerator());
    const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const prevFrameRef = useRef<ImageData | null>(null);
    const frameIntervalRef = useRef<any>(null);
    const lastFrameTimeRef = useRef<number>(0);

    // Voice feedback hook (legacy - keep for fallback)
    const { playFeedback, speakWithWebSpeech, isSpeaking: _isSpeaking } = useVoiceFeedback();

    // SINGLE voice coach for ALL hands - prevents overlapping speech
    // Uses turn-taking logic to alternate between left/right hands
    const voiceCoach = useVoiceCoach({
        useElevenLabs: true,
        elevenLabsVoice: 'rachel',  // Professional female voice
        elevenLabsStability: 0.35,  // Lower = faster/more dynamic
        elevenLabsSimilarity: 0.8,
    });

    // Track which hand was last critiqued to implement turn-taking
    const lastCritiquedHandRef = useRef<'Left' | 'Right' | null>(null);
    const lastCritiqueTimeRef = useRef<number>(0);
    const HAND_CRITIQUE_COOLDOWN = 5000; // 5 seconds before same hand can be critiqued again

    // Legacy/Global coach for AI observations (keep separate to avoid conflict)
    const globalVoiceCoach = useVoiceCoach({
        useElevenLabs: true,
        elevenLabsVoice: 'adam',  // Deep, clear male voice for AI observations
        elevenLabsStability: 0.4,  // Lower = faster/more dynamic
        elevenLabsSimilarity: 0.85,
    });

    // Handle Overshoot AI observation - use ref to avoid dependency on voiceCoach
    const globalVoiceCoachRef = useRef(globalVoiceCoach);
    useEffect(() => {
        globalVoiceCoachRef.current = globalVoiceCoach;
    }, [globalVoiceCoach]);

    const handleAiObservation = useCallback((observation: OvershootObservation) => {
        console.log('[CoachingSession] AI observation received:', observation.text);

        // Feed to voice coach with appropriate priority
        const priority = observation.category === 'safety' ? 'high' : 'normal';
        globalVoiceCoachRef.current.speak(observation.text, 'ai_observation', priority);
    }, []); // No dependencies - uses ref

    // Overshoot live analysis hook
    const overshootLive = useOvershootLive({
        enabled: aiEnabled && isOvershootConfigured(),
        onObservation: handleAiObservation,
        onError: (error) => {
            console.error('[CoachingSession] Overshoot error:', error.message);
        },
    });

    // Webcam recorder hook - records clips and sends to Overshoot
    const recorderEnabled = aiEnabled && overshootLive.isConfigured && !overshootLive.creditsExhausted;

    const _webcamRecorder = useWebcamRecorder({
        stream: mediaStream,
        clipDurationMs: 5000,  // 5-second clips
        intervalMs: 12000,     // Every 12 seconds
        enabled: recorderEnabled,
        onClipReady: (file) => {
            overshootLive.analyzeClip(file);
        },
    });



    // Handle incoming feedback from backend
    const handleBackendFeedback = useCallback((data: any) => {
        // Map backend category to status (or infer from message tone)
        let status: 'ON_TRACK' | 'WARNING' | 'CRITICAL' = 'ON_TRACK';
        if (data.category === 'correction' || data.category === 'warning') {
            status = 'WARNING';
        } else if (data.category === 'critical' || data.category === 'error') {
            status = 'CRITICAL';
        }

        const feedback = {
            status,
            message: data.message,
            timestamp: data.timestamp,
            id: Date.now(),
        };

        setCurrentFeedback(feedback);
        setFeedbackHistory(prev => [...prev.slice(-4), feedback]); // Keep last 5 for minimal trail
        setIsAnalyzing(false);
        setTimeout(() => setIsAnalyzing(true), 500);

        // Play voice feedback
        playFeedback(data);

        // Clear feedback after delay
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
            setCurrentFeedback(null);
        }, 4000);
    }, [playFeedback]);

    // WebSocket connection
    const { isConnected, connect, sendGripState } = useWebSocket(sessionId, {
        onFeedback: handleBackendFeedback
    });

    // Real MediaPipe hand detection
    const { isLoading: mediaPipeLoading } = useMediaPipeHands({
        videoElement,
        enabled: true,
        targetFps: 60,
        onHandsDetected: (hands) => {
            setDetectedHands(hands);
            if (hands.length > 0) {
                const metrics = hands[0].metrics;
                setCurrentMetrics(metrics);
                // Removed rapid isAnalyzing toggle that caused infinite loop

                // TURN-TAKING: Only coach ONE hand at a time to prevent overlapping speech
                if (voiceCoach.voiceEnabled && !voiceCoach.isSpeaking) {
                    const leftHand = hands.find(h => h.handedness === 'Left');
                    const rightHand = hands.find(h => h.handedness === 'Right');
                    const now = Date.now();

                    // Determine which hand to coach next (alternating turn-taking)
                    let handToCoach: HandData | undefined;
                    let handLabel: 'Left Hand' | 'Right Hand' = 'Right Hand';  // Default
                    let handMetrics: any;

                    // If only one hand, coach that one
                    if (leftHand && !rightHand) {
                        handToCoach = leftHand;
                        handLabel = 'Left Hand';
                        handMetrics = expertMetrics?.leftHand;
                    } else if (rightHand && !leftHand) {
                        handToCoach = rightHand;
                        handLabel = 'Right Hand';
                        handMetrics = expertMetrics?.rightHand;
                    } else if (leftHand && rightHand) {
                        // BOTH hands visible - alternate between them
                        // Priority: coach the hand that WASN'T coached last
                        const timeSinceLastCritique = now - lastCritiqueTimeRef.current;

                        if (lastCritiquedHandRef.current === 'Right' || lastCritiquedHandRef.current === null) {
                            // Last was Right (or none), so coach Left now
                            if (timeSinceLastCritique >= HAND_CRITIQUE_COOLDOWN || lastCritiquedHandRef.current === null) {
                                handToCoach = leftHand;
                                handLabel = 'Left Hand';
                                handMetrics = expertMetrics?.leftHand;
                            }
                        } else {
                            // Last was Left, so coach Right now
                            if (timeSinceLastCritique >= HAND_CRITIQUE_COOLDOWN) {
                                handToCoach = rightHand;
                                handLabel = 'Right Hand';
                                handMetrics = expertMetrics?.rightHand;
                            }
                        }
                    }

                    // Coach the selected hand
                    if (handToCoach) {
                        lastCritiquedHandRef.current = handLabel === 'Left Hand' ? 'Left' : 'Right';
                        lastCritiqueTimeRef.current = now;

                        voiceCoach.coachOnMetrics(
                            {
                                scalpelAngle: handToCoach.metrics.scalpelAngle,
                                steadiness: handToCoach.metrics.steadiness,
                                gripType: handToCoach.metrics.gripType,
                                speed: handToCoach.metrics.speed,
                                handDetected: true
                            },
                            {
                                angleTarget: handMetrics?.angleTarget ?? expertMetrics?.angleTarget ?? 45,
                                angleTolerance: handMetrics?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15,
                                steadinessTarget: handMetrics?.steadinessTarget ?? expertMetrics?.steadinessTarget ?? 70,
                                expectedGripType: handMetrics?.expectedGripType as any ?? expertMetrics?.expectedGripType ?? 'unknown',
                                speedOptimal: handMetrics?.speedOptimal ?? 50,
                                speedTolerance: handMetrics?.speedTolerance ?? 15,
                                contextElements: expertMetrics?.techniqueContext
                            },
                            handLabel
                        );
                    }
                }
            }
        }
    });

    // Mock hand detection (needed for fallback demo feedback)
    useMockHandDetection({
        onGripChange: (grip: any) => {
            if (!backendConnected && detectedHands.length === 0) {
                triggerDemoFeedback();
            } else {
                sendGripState(grip, null);
            }
        }
    });

    // Get video element and stream reference when component mounts
    // Use an interval to poll for the video element since refs don't trigger effects
    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 20; // Try for ~2 seconds

        const checkVideoElement = () => {
            if (videoFeedRef.current) {
                const videoEl = (videoFeedRef.current as any)?.getVideoElement?.();
                if (videoEl) {
                    setVideoElement(videoEl);
                    // Get the MediaStream for Overshoot recording
                    if (videoEl.srcObject instanceof MediaStream) {
                        setMediaStream(videoEl.srcObject);
                    }
                    return true;
                }
            }
            return false;
        };

        // Check immediately
        if (checkVideoElement()) return;

        // Poll for video element
        const intervalId = setInterval(() => {
            attempts++;
            if (checkVideoElement() || attempts >= maxAttempts) {
                clearInterval(intervalId);
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, []); // Run once on mount

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            try {
                const session = await startSession();
                setSessionId(session.sessionId);

                // Try to connect WebSocket
                if (session.sessionId) {
                    setTimeout(() => {
                        connect();
                    }, 500);
                }
            } catch (error) {
                console.log('Backend not available, using demo mode');
            }
        };

        initSession();

        return () => {
            // Cleanup will happen via hook
        };
    }, []);

    // Track WebSocket connection status
    useEffect(() => {
        setBackendConnected(isConnected);
    }, [isConnected]);

    // Format time as MM:SS
    const formatTime = (seconds: any) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Demo mode feedback trigger
    const triggerDemoFeedback = useCallback(() => {
        if (feedbackIndex >= DEMO_FEEDBACK.length) return;

        const demoFeedback = DEMO_FEEDBACK[feedbackIndex];
        // Map demo type to status
        const status: 'ON_TRACK' | 'WARNING' | 'CRITICAL' =
            demoFeedback.type === 'correction' ? 'WARNING' : 'ON_TRACK';

        const feedback = {
            status,
            message: demoFeedback.message,
            timestamp: sessionTime,
            id: Date.now(),
        };

        setCurrentFeedback(feedback);
        setFeedbackHistory(prev => [...prev.slice(-4), feedback]); // Keep last 5 for minimal trail
        setFeedbackIndex(prev => prev + 1);
        setIsAnalyzing(false);
        setTimeout(() => setIsAnalyzing(true), 500);

        // Speak feedback using Web Speech API
        speakWithWebSpeech(feedback.message);

        // Clear feedback after delay
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
            setCurrentFeedback(null);
        }, 4000);
    }, [feedbackIndex, sessionTime, speakWithWebSpeech]);

    // Session timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSessionTime(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        };
    }, []);

    // Fast loop: Frame differencing for motion metrics (runs continuously when video is available)
    useEffect(() => {
        if (!videoFeedRef.current) return;

        const videoEl = (videoFeedRef.current as any)?.getVideoElement?.();
        if (!videoEl) return;

        // Create hidden canvas for frame capture
        const canvas = document.createElement('canvas');
        canvas.width = 160; // Downscaled for performance
        canvas.height = 120;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        frameCanvasRef.current = canvas;

        let frameCount = 0;
        const targetFps = 10; // Sample at 10fps for performance
        const frameIntervalMs = 1000 / targetFps;

        const processFrame = () => {
            if (!videoEl || videoEl.readyState < 2) return; // Not enough data

            const videoWidth = videoEl.videoWidth;
            const videoHeight = videoEl.videoHeight;
            if (!videoWidth || !videoHeight) return;

            // Draw video frame to canvas (grayscale, downscaled)
            ctx.drawImage(videoEl, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);
            const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

            if (prevFrameRef.current) {
                // Compute frame difference
                const { mean, max, jitter } = computeFrameDifference(
                    prevFrameRef.current,
                    currentFrame,
                    canvas.width,
                    canvas.height
                );

                // Compute FPS (simple counter-based)
                const now = Date.now();
                const fps = frameCount > 0 && lastFrameTimeRef.current > 0
                    ? 1000 / (now - lastFrameTimeRef.current)
                    : targetFps;
                lastFrameTimeRef.current = now;
                frameCount++;

                // Create metric
                const metric: MotionMetrics = {
                    time: now,
                    fps,
                    motionMean: mean,
                    motionMax: max,
                    jitter,
                    presenceProxy: mean > 5 ? Math.min(1, mean / 50) : 0,
                };

                // Add to rolling window
                addMetric(metricsWindowRef.current, metric);

                // Fast loop: Generate feedback from metrics (max once per second)
                const feedback = feedbackGeneratorRef.current.generate({
                    motionMean: mean,
                    motionMax: max,
                    jitter,
                    presenceProxy: metric.presenceProxy,
                });

                if (feedback) {
                    // Pass status directly to UI (ON_TRACK, WARNING, CRITICAL)
                    const uiFeedback = {
                        status: feedback.status, // ON_TRACK, WARNING, or CRITICAL
                        message: feedback.text,
                        timestamp: feedback.timestamp / 1000, // Convert to seconds
                        id: feedback.timestamp,
                    };

                    setCurrentFeedback(uiFeedback);
                    setFeedbackHistory(prev => [...prev.slice(-4), uiFeedback]); // Keep last 5 for minimal trail

                    // Speak feedback
                    speakWithWebSpeech(feedback.text);
                }
            }

            prevFrameRef.current = currentFrame;
        };

        // Start frame processing loop (every ~100ms = 10fps)
        frameIntervalRef.current = setInterval(processFrame, frameIntervalMs);

        return () => {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
        };
    }, [videoFeedRef, speakWithWebSpeech]);

    // Coach summary removed - Part 2 focuses on single concise feedback only

    // Demo mode: Periodic feedback (when backend not connected) - keep as fallback
    useEffect(() => {
        if (!backendConnected && sessionTime > 0 && sessionTime % 8 === 0 && feedbackIndex < DEMO_FEEDBACK.length) {
            triggerDemoFeedback();
        }
    }, [sessionTime, backendConnected, feedbackIndex, triggerDemoFeedback]);

    const handleEndSession = async () => {
        // Try to end session on backend
        if (sessionId) {
            try {
                await endSession(sessionId);
            } catch (error) {
                console.log('Backend end session failed, using local data');
            }
        }

        // Generate and speak the summary
        const summary = voiceCoach.speakSummary();
        setSessionSummary({
            ...summary,
            duration: sessionTime
        });
        setShowSummary(true);

        console.log("Session Ended", { duration: sessionTime, events: feedbackHistory, summary });
    };

    return (
        <div className="h-full flex flex-col bg-bg-primary">
            {/* Header */}
            {!embedded && (
                <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle bg-bg-secondary max-[600px]:flex-wrap max-[600px]:gap-2">
                    <div className="flex items-center gap-6 max-[600px]:order-2">
                        <h2 className="text-xl tracking-wider">SurgeonSight AI</h2>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-accent-rust animate-pulse' : 'bg-success'}`} />
                            <span className="font-mono text-xs tracking-wider uppercase text-text-muted">
                                {isAnalyzing ? 'Analyzing' : 'Detected'}
                            </span>
                        </div>
                        {/* Connection status */}
                        <div className={`font-mono text-xs tracking-wider px-1 py-0.5 border ${backendConnected ? 'text-success border-success' : 'text-text-dim border-border-subtle'}`}>
                            {backendConnected ? '● LIVE' : '○ DEMO'}
                        </div>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 max-[600px]:static max-[600px]:transform-none max-[600px]:order-1 max-[600px]:w-full max-[600px]:flex max-[600px]:justify-center">
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[0.55rem] tracking-widest uppercase text-text-dim">Session Time</span>
                            <span className="font-mono text-2xl tracking-wider text-accent-rust">{formatTime(sessionTime)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 max-[600px]:order-3">
                        <ThemeToggle />
                        <button className="px-6 py-2 text-sm font-display tracking-wider text-text-cream bg-error border-2 border-error transition-all duration-250 hover:bg-error/80 hover:border-error/80 whitespace-nowrap" onClick={handleEndSession}>
                            End Session
                        </button>
                    </div>
                </header>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col gap-4 p-4 max-[1000px]:gap-3 max-[1000px]:p-3">
                {/* Top row: Left Hand Metrics | Video Feed | Right Hand Metrics */}
                <div className="flex gap-4 max-[1000px]:flex-col">
                    {/* Left Hand Metrics */}
                    <div className="w-64 shrink-0 bg-bg-secondary border border-border-subtle overflow-hidden max-[1000px]:w-full max-[1000px]:order-2">
                        <h3 className="text-xs tracking-widest px-4 pt-3 pb-2 border-b border-border-subtle text-text-muted uppercase">
                            Left Hand
                        </h3>
                        <div className="p-3 flex flex-col gap-2">
                            {(() => {
                                const leftHand = detectedHands.find(h => h.handedness === 'Left');
                                const leftMetrics = leftHand?.metrics;
                                return (
                                    <>
                                        {/* Expert Target Card Style - Left Hand */}
                                        <div className="bg-bg-tertiary p-4 border border-border-subtle mb-2 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                                            <span className="font-mono text-[0.55rem] text-text-cream tracking-[0.2em] uppercase block mb-3 relative z-10">
                                                Expert Target
                                            </span>

                                            <div className="flex items-center justify-between mb-4 relative z-10 px-1">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-4xl font-mono font-medium text-blue-400 tracking-tighter">
                                                        {getSymmetricAngle(expertMetrics?.leftHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)}°
                                                    </span>
                                                    <span className="text-[0.5rem] uppercase tracking-wider text-blue-400/60 mt-0.5">Expert</span>
                                                </div>

                                                <span className="text-xs font-mono text-text-dim/50 lowercase italic">vs</span>

                                                <div className="flex flex-col items-center">
                                                    <span className={`text-4xl font-mono font-bold tracking-tighter transition-colors duration-300 ${leftMetrics && Math.abs(getSymmetricAngle(leftMetrics.scalpelAngle) - getSymmetricAngle(expertMetrics?.leftHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)) <= (expertMetrics?.leftHand?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15)
                                                        ? 'text-success' : 'text-error'
                                                        }`}>
                                                        {leftMetrics ? `${getSymmetricAngle(leftMetrics.scalpelAngle).toFixed(0)}°` : '--'}
                                                    </span>
                                                    <span className={`text-[0.5rem] uppercase tracking-wider mt-0.5 ${leftMetrics && Math.abs(getSymmetricAngle(leftMetrics.scalpelAngle) - getSymmetricAngle(expertMetrics?.leftHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)) <= (expertMetrics?.leftHand?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15)
                                                        ? 'text-success/60' : 'text-error/60'
                                                        }`}>You</span>
                                                </div>
                                            </div>

                                            <div className="relative z-10 pt-3 border-t border-white/5">
                                                {leftMetrics ? (
                                                    Math.abs(getSymmetricAngle(leftMetrics.scalpelAngle) - getSymmetricAngle(expertMetrics?.leftHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)) <= (expertMetrics?.leftHand?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15) ? (
                                                        <div className="flex items-center justify-center gap-2 bg-success/10 py-1.5 text-success border border-success/20">
                                                            <span className="text-sm">✓</span>
                                                            <span className="font-mono text-xs tracking-wider uppercase font-bold">On Target</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2 bg-error/10 py-1.5 text-error border border-error/20">
                                                            <span className="text-sm">⚠</span>
                                                            <span className="font-mono text-xs tracking-wider uppercase font-bold">Adjust Angle</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex items-center justify-center py-1.5 text-text-dim">
                                                        <span className="font-mono text-xs tracking-wider uppercase animate-pulse">Waiting for hand...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-bg-tertiary p-2 border border-border-subtle">
                                            <span className="font-mono text-[0.55rem] text-text-dim uppercase block mb-0.5">
                                                Steadiness
                                                {expertMetrics?.leftHand?.steadinessTarget && (
                                                    <span className="text-accent-rust ml-1">Target: {expertMetrics.leftHand.steadinessTarget}%</span>
                                                )}
                                            </span>
                                            <span className={`font-mono text-xl text-gray-900`}>
                                                {leftMetrics ? `${leftMetrics.steadiness.toFixed(0)}%` : '--'}
                                            </span>
                                        </div>
                                        <div className="bg-bg-tertiary p-2 border border-border-subtle">
                                            <span className="font-mono text-[0.55rem] text-text-dim uppercase block mb-0.5">Grip Type</span>
                                            <span className={`font-mono text-sm uppercase text-gray-900`}>
                                                {leftMetrics?.gripType || '--'}
                                            </span>
                                        </div>
                                        <div className="bg-bg-tertiary p-2 border border-border-subtle">
                                            <span className="font-mono text-[0.55rem] text-text-dim uppercase block mb-0.5">
                                                Speed (in/s)
                                                {expertMetrics?.leftHand?.speedOptimal && (
                                                    <span className="text-accent-rust ml-1">Target: {expertMetrics.leftHand.speedOptimal.toFixed(2)}</span>
                                                )}
                                            </span>
                                            <span className="font-mono text-xl text-gray-900">
                                                {leftMetrics ? leftMetrics.speed.toFixed(2) : '--'}
                                            </span>
                                        </div>
                                        <div className="text-center mt-1">
                                            <span className={`font-mono text-[0.65rem] ${leftHand ? 'text-success' : 'text-text-dim'}`}>
                                                {leftHand ? '✓ Detected' : '○ Not detected'}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Center: Video Feed */}
                    <div className="flex-1 relative flex flex-col overflow-hidden aspect-video max-h-[55vh] max-[1000px]:order-1">
                        <VideoFeed
                            ref={videoFeedRef}
                            hands={detectedHands}
                            showMetrics={true}
                            metrics={currentMetrics}
                        />
                        {mediaPipeLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="font-mono text-sm text-accent-rust animate-pulse">Loading MediaPipe...</span>
                            </div>
                        )}
                    </div>

                    {/* Right Hand Metrics */}
                    <div className="w-64 shrink-0 bg-bg-secondary border border-border-subtle overflow-hidden max-[1000px]:w-full max-[1000px]:order-3">
                        <h3 className="text-xs tracking-widest px-4 pt-3 pb-2 border-b border-border-subtle text-text-muted uppercase">
                            Right Hand
                        </h3>
                        <div className="p-3 flex flex-col gap-2">
                            {(() => {
                                const rightHand = detectedHands.find(h => h.handedness === 'Right');
                                const rightMetrics = rightHand?.metrics;
                                return (
                                    <>
                                        {/* Expert Target Card Style - Right Hand */}
                                        <div className="bg-bg-tertiary p-4 border border-border-subtle mb-2 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                                            <span className="font-mono text-[0.55rem] text-text-cream tracking-[0.2em] uppercase block mb-3 relative z-10">
                                                Expert Target
                                            </span>

                                            <div className="flex items-center justify-between mb-4 relative z-10 px-1">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-4xl font-mono font-medium text-blue-400 tracking-tighter">
                                                        {getSymmetricAngle(expertMetrics?.rightHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)}°
                                                    </span>
                                                    <span className="text-[0.5rem] uppercase tracking-wider text-blue-400/60 mt-0.5">Expert</span>
                                                </div>

                                                <span className="text-xs font-mono text-text-dim/50 lowercase italic">vs</span>

                                                <div className="flex flex-col items-center">
                                                    <span className={`text-4xl font-mono font-bold tracking-tighter transition-colors duration-300 ${rightMetrics && Math.abs(getSymmetricAngle(rightMetrics.scalpelAngle) - getSymmetricAngle(expertMetrics?.rightHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)) <= (expertMetrics?.rightHand?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15)
                                                        ? 'text-success' : 'text-error'
                                                        }`}>
                                                        {rightMetrics ? `${getSymmetricAngle(rightMetrics.scalpelAngle).toFixed(0)}°` : '--'}
                                                    </span>
                                                    <span className={`text-[0.5rem] uppercase tracking-wider mt-0.5 ${rightMetrics && Math.abs(getSymmetricAngle(rightMetrics.scalpelAngle) - getSymmetricAngle(expertMetrics?.rightHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)) <= (expertMetrics?.rightHand?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15)
                                                        ? 'text-success/60' : 'text-error/60'
                                                        }`}>You</span>
                                                </div>
                                            </div>

                                            <div className="relative z-10 pt-3 border-t border-white/5">
                                                {rightMetrics ? (
                                                    Math.abs(getSymmetricAngle(rightMetrics.scalpelAngle) - getSymmetricAngle(expertMetrics?.rightHand?.angleTarget ?? expertMetrics?.angleTarget ?? 45)) <= (expertMetrics?.rightHand?.angleTolerance ?? expertMetrics?.angleTolerance ?? 15) ? (
                                                        <div className="flex items-center justify-center gap-2 bg-success/10 py-1.5 text-success border border-success/20">
                                                            <span className="text-sm">✓</span>
                                                            <span className="font-mono text-xs tracking-wider uppercase font-bold">On Target</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2 bg-error/10 py-1.5 text-error border border-error/20">
                                                            <span className="text-sm">⚠</span>
                                                            <span className="font-mono text-xs tracking-wider uppercase font-bold">Adjust Angle</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex items-center justify-center py-1.5 text-text-dim">
                                                        <span className="font-mono text-xs tracking-wider uppercase animate-pulse">Waiting for hand...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-bg-tertiary p-2 border border-border-subtle">
                                            <span className="font-mono text-[0.55rem] text-text-dim uppercase block mb-0.5">
                                                Steadiness
                                                {expertMetrics?.rightHand?.steadinessTarget && (
                                                    <span className="text-accent-rust ml-1">Target: {expertMetrics.rightHand.steadinessTarget}%</span>
                                                )}
                                            </span>
                                            <span className={`font-mono text-xl text-gray-900`}>
                                                {rightMetrics ? `${rightMetrics.steadiness.toFixed(0)}%` : '--'}
                                            </span>
                                        </div>
                                        <div className="bg-bg-tertiary p-2 border border-border-subtle">
                                            <span className="font-mono text-[0.55rem] text-text-dim uppercase block mb-0.5">Grip Type</span>
                                            <span className={`font-mono text-sm uppercase text-gray-900`}>
                                                {rightMetrics?.gripType || '--'}
                                            </span>
                                        </div>
                                        <div className="bg-bg-tertiary p-2 border border-border-subtle">
                                            <span className="font-mono text-[0.55rem] text-text-dim uppercase block mb-0.5">
                                                Speed (in/s)
                                                {expertMetrics?.rightHand?.speedOptimal && (
                                                    <span className="text-accent-rust ml-1">Target: {expertMetrics.rightHand.speedOptimal.toFixed(2)}</span>
                                                )}
                                            </span>
                                            <span className="font-mono text-xl text-gray-900">
                                                {rightMetrics ? rightMetrics.speed.toFixed(2) : '--'}
                                            </span>
                                        </div>
                                        <div className="text-center mt-1">
                                            <span className={`font-mono text-[0.65rem] ${rightHand ? 'text-success' : 'text-text-dim'}`}>
                                                {rightHand ? '✓ Detected' : '○ Not detected'}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Bottom row: Overshoot AI | 3D Hand View | Voice Coach - Three columns */}
                <div className="grid grid-cols-3 gap-4 max-[1200px]:grid-cols-2 max-[800px]:grid-cols-1">
                    {/* Overshoot AI Insights Panel - PROMINENTLY FEATURED */}
                    <OvershootInsightsPanel
                        isConfigured={overshootLive.isConfigured}
                        isAnalyzing={overshootLive.isAnalyzing}
                        creditsExhausted={overshootLive.creditsExhausted}
                        lastObservation={overshootLive.lastObservation}
                        observationCount={overshootLive.observationCount}
                        error={overshootLive.error}
                        demoMode={false} // Use real API only
                    />

                    {/* 3D Hand Visualization */}
                    <div className="bg-bg-secondary border border-border-subtle overflow-hidden">
                        <h3 className="text-xs tracking-widest px-4 pt-3 pb-2 border-b border-border-subtle text-text-muted uppercase">3D Hand View</h3>
                        <div className="p-4">
                            <Hand3DVisualization
                                metrics={currentMetrics}
                                hands={detectedHands.map(hand => ({
                                    landmarks: hand.landmarks,
                                    handedness: hand.handedness,
                                    metrics: hand.metrics
                                }))}
                            />
                        </div>
                    </div>

                    {/* AI Coach Voice Feedback - Single Voice Coach (Turn-Taking) */}
                    <VoiceFeedbackDisplay
                        displayedText={globalVoiceCoach.isSpeaking ? globalVoiceCoach.displayedText : voiceCoach.displayedText}
                        currentMessage={globalVoiceCoach.currentMessage || voiceCoach.currentMessage}
                        messageHistory={[...globalVoiceCoach.messageHistory, ...voiceCoach.messageHistory].sort((a, b) => b.timestamp - a.timestamp)}
                        stats={voiceCoach.stats}
                        voiceEnabled={voiceCoach.voiceEnabled}
                        voiceProvider={voiceCoach.voiceProvider}
                        isSpeaking={globalVoiceCoach.isSpeaking || voiceCoach.isSpeaking}
                    />
                </div>
            </main>

            {/* Session Summary Modal */}
            <SessionSummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                summary={sessionSummary}
                onPlayAgain={() => {
                    setShowSummary(false);
                    voiceCoach.resetStats();
                    globalVoiceCoach.resetStats();
                    setSessionTime(0);
                }}
            />
        </div>
    );
}

